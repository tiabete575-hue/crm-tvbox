import { execFileSync } from 'node:child_process';
import { neon } from '@neondatabase/serverless';

const apply = process.argv.includes('--apply');
const pdfPath = process.argv.find((arg) => arg.toLowerCase().endsWith('.pdf'));
if (!pdfPath) throw new Error('Informe o caminho do PDF de contatos.');

const python = `${process.env.USERPROFILE}\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe`;
const pythonCode = String.raw`
import json, sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
print(json.dumps([page.extract_text() or "" for page in reader.pages], ensure_ascii=False))
`;
const pages = JSON.parse(execFileSync(python, ['-c', pythonCode, pdfPath], {
  encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
}));

function extractContacts(textPages) {
  const contacts = [];
  for (const page of textPages) {
    let pending = [];
    for (const rawLine of page.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('•') || /about:blank|^\d{2}\/\d{2}\/\d{4},/.test(line)) continue;
      const phoneMatch = line.match(/^Telefone\s+(.+)$/i);
      if (phoneMatch) {
        const candidates = pending.filter((value) => !/^(?:\+?\d[\d\s()-]+|E-mail\b)/i.test(value));
        if (candidates.length) contacts.push({ title: candidates[0], phone: phoneMatch[1].trim() });
        pending = [];
      } else pending.push(line);
    }
  }
  return contacts;
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();
}

function phoneDigits(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1);
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  return digits;
}

function formatPhone(value) {
  const digits = phoneDigits(value);
  return digits ? `+${digits}` : null;
}

const months = [null, 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const monthNumbers = new Map(months.slice(1).flatMap((name, index) => {
  const key = normalize(name);
  return [[key, index + 1], ...(key === 'fevereiro' ? [['feveiro', 2]] : [])];
}));

function isoDate(year, month, day) {
  const y = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  const m = Number(month); const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function extractDate(title) {
  const candidates = [];
  const wordPattern = /(\d{1,2})\s+de\s+(janeiro|fevereiro|feveiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de)?\s+(\d{2,4})/gi;
  const slashPattern = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g;
  for (const match of title.matchAll(wordPattern)) candidates.push({ index: match.index, value: isoDate(match[3], monthNumbers.get(normalize(match[2])), match[1]) });
  for (const match of title.matchAll(slashPattern)) candidates.push({ index: match.index, value: isoDate(match[3], match[2], match[1]) });
  return candidates.filter((item) => item.value).sort((a, b) => b.index - a.index)[0]?.value ?? null;
}

function activationFrom(expiration, plan) {
  if (!expiration || plan === 'vitalicio') return null;
  const date = new Date(`${expiration}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - (plan === 'semestral' ? 6 : 12));
  return date.toISOString().slice(0, 10);
}

function customerName(title) {
  const marker = title.search(/\s+(?:tv\s*box|tv\s+anual|login\s+tv|semestral)\b/i);
  return (marker > 0 ? title.slice(0, marker) : title).replace(/\s+/g, ' ').trim();
}

function classify(title) {
  const normalized = normalize(title);
  if (/\bpor fechar\b/.test(normalized)) return { label: 'Novo Cliente', plan: 'anual', expiration: null, reason: 'por-fechar' };
  if (/\bvitalicio\b/.test(normalized) && !/\banual\b/.test(normalized)) return { label: 'Vitalício', plan: 'vitalicio', expiration: null, reason: 'vitalicio' };
  const expiration = extractDate(title);
  if (expiration) return { label: months[Number(expiration.slice(5, 7))], plan: /\bsemestral\b/.test(normalized) ? 'semestral' : /\bvitalicio\b/.test(normalized) ? 'vitalicio' : 'anual', expiration, reason: 'data-completa' };
  const monthYear = title.match(/\b(0?[1-9]|1[0-2])\/(\d{2})\b/);
  if (monthYear) return { label: months[Number(monthYear[1])], plan: 'anual', expiration: null, reason: 'mes-e-ano' };
  return null;
}

const contacts = extractContacts(pages);
const sql = neon(process.env.DATABASE_URL);
const clients = await sql`SELECT id, name, phone, source_ref FROM clients ORDER BY id`;
const labels = await sql`SELECT id, name FROM labels`;
const labelIds = new Map(labels.map((row) => [row.name, row.id]));
const existingTitles = new Map(clients.map((row) => [normalize(String(row.source_ref ?? '').replace(/^whatsapp:/i, '')), row]));

const updated = [];
const inserted = [];
const uncertain = [];
const conflicts = [];

for (const contact of contacts) {
  const phone = formatPhone(contact.phone);
  const existing = existingTitles.get(normalize(contact.title));
  if (existing) {
    if (phoneDigits(existing.phone) !== phoneDigits(phone)) {
      const owner = (await sql`SELECT id, name FROM clients WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g')=${phoneDigits(phone)} AND id<>${existing.id} LIMIT 1`)[0];
      if (owner) conflicts.push({ title: contact.title, phone, reason: `telefone já usado por ${owner.name}` });
      else {
        if (apply) await sql`UPDATE clients SET phone=${phone}, updated_at=now() WHERE id=${existing.id}`;
        updated.push({ title: contact.title, phone });
      }
    }
    continue;
  }

  const classification = classify(contact.title);
  if (!classification) {
    uncertain.push({ title: contact.title, phone, reason: 'sem data, vitalício ou indicação Por Fechar' });
    continue;
  }
  const labelId = labelIds.get(classification.label);
  const activation = activationFrom(classification.expiration, classification.plan);
  const status = classification.expiration && classification.expiration < new Date().toISOString().slice(0, 10) ? 'vencido' : 'ativo';
  const sourceRef = `whatsapp:${contact.title}`;
  const notes = `Importado do Google Contatos. Nome original: ${contact.title}. Etiqueta definida por ${classification.reason}.` + (!classification.expiration && classification.plan !== 'vitalicio' ? ' Data completa não identificada; revisar.' : '');
  const owner = (await sql`SELECT id, name FROM clients WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g')=${phoneDigits(phone)} LIMIT 1`)[0];
  if (owner) {
    conflicts.push({ title: contact.title, phone, reason: `telefone já usado por ${owner.name}` });
    continue;
  }
  if (apply) {
    const saved = (await sql`
      INSERT INTO clients(name, phone, plan_type, plan_value, activation_date, expiration_date, status, label_id, notes, source_ref)
      VALUES(${customerName(contact.title)}, ${phone}, ${classification.plan}, 0, ${activation}, ${classification.expiration}, ${status}, ${labelId}, ${notes}, ${sourceRef})
      RETURNING id
    `)[0];
    await sql`INSERT INTO client_labels(client_id, label_id) VALUES(${saved.id}, ${labelId}) ON CONFLICT DO NOTHING`;
  }
  inserted.push({ title: contact.title, phone, label: classification.label, expiration: classification.expiration, reason: classification.reason });
}

console.log(JSON.stringify({ mode: apply ? 'aplicado' : 'simulacao', contacts: contacts.length, updated, inserted, uncertain, conflicts }, null, 2));

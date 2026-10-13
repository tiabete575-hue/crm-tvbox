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
  encoding: 'utf8',
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
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
        if (candidates.length) contacts.push({ title: candidates[0], aliases: candidates.slice(1), phone: phoneMatch[1].trim() });
        pending = [];
      } else {
        pending.push(line);
      }
    }
  }
  return contacts;
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function baseName(value) {
  return normalize(value)
    .split(/\b(?:tv|box|stick|iptv|login|anual|semestral|vitalicio|por fechar|\d{1,2}[\/.-]\d{1,2}|\d{4})\b/)[0]
    .replace(/\b\d+\s+pontos?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

const contacts = extractContacts(pages);
const sql = neon(process.env.DATABASE_URL);
const clients = await sql`
  SELECT c.id, c.name, c.phone, c.source_ref, l.name AS label_name
  FROM clients c
  LEFT JOIN labels l ON l.id = c.label_id
  ORDER BY c.id
`;

const exactTitle = new Map();
for (const contact of contacts) {
  const titleKey = normalize(contact.title);
  if (titleKey) exactTitle.set(titleKey, [...(exactTitle.get(titleKey) ?? []), contact]);
}

const matches = [];
const ambiguous = [];
for (const client of clients) {
  const sourceTitle = String(client.source_ref ?? '').replace(/^whatsapp:/i, '');
  const byTitle = exactTitle.get(normalize(sourceTitle)) ?? [];
  const candidates = byTitle;
  const method = 'titulo-exato';
  if (candidates.length === 1) {
    const contact = candidates[0];
    matches.push({ client, contact, method, phone: formatPhone(contact.phone) });
  } else if (candidates.length > 1) {
    ambiguous.push({ id: client.id, client: sourceTitle, label: client.label_name, candidates: candidates.map((item) => item.title) });
  }
}

let updated = 0;
let alreadyCorrect = 0;
let conflicts = 0;
const applied = [];
for (const match of matches) {
  if (!match.phone) continue;
  if (phoneDigits(match.client.phone) === phoneDigits(match.phone)) {
    alreadyCorrect++;
    continue;
  }
  const owner = (await sql`
    SELECT id, name FROM clients
    WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = ${phoneDigits(match.phone)}
      AND id <> ${match.client.id}
    LIMIT 1
  `)[0];
  if (owner) {
    conflicts++;
    ambiguous.push({ id: match.client.id, client: match.client.name, label: match.client.label_name, phone: match.phone, reason: `telefone já usado por ${owner.name}` });
    continue;
  }
  if (apply) {
    await sql`UPDATE clients SET phone = ${match.phone}, updated_at = now() WHERE id = ${match.client.id}`;
  }
  updated++;
  applied.push({ id: match.client.id, client: match.client.name, label: match.client.label_name, phone: match.phone, method: match.method });
}

const byLabel = Object.values(applied.reduce((acc, item) => {
  const label = item.label ?? 'Sem etiqueta';
  acc[label] ??= { label, count: 0 };
  acc[label].count++;
  return acc;
}, {})).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

console.log(JSON.stringify({
  mode: apply ? 'aplicado' : 'simulacao',
  pdfContacts: contacts.length,
  crmClients: clients.length,
  safeMatches: matches.length,
  updated,
  alreadyCorrect,
  conflicts,
  byLabel,
  applied,
  ambiguous,
}, null, 2));

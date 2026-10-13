import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
const sql = neon(process.env.DATABASE_URL);
const packed = readFileSync(new URL('../database/whatsapp-import.json.gz.b64', import.meta.url), 'utf8').trim();
const groups = JSON.parse(gunzipSync(Buffer.from(packed, 'base64')).toString('utf8'));

// A etiqueta Setembro estava vazia; o WhatsApp manteve visualmente os itens de Agosto.
if (JSON.stringify(groups.setembro) === JSON.stringify(groups.agosto)) groups.setembro = [];

const monthNumbers = new Map([
  ['janeiro', 1], ['fevereiro', 2], ['feveiro', 2], ['março', 3], ['marco', 3],
  ['abril', 4], ['maio', 5], ['junho', 6], ['julho', 7], ['agosto', 8],
  ['setembro', 9], ['outubro', 10], ['novembro', 11], ['dezembro', 12],
]);

function isoDate(year, month, day) {
  const y = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  const m = Number(month); const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function extractDate(title) {
  const dates = [];
  const words = /(\d{1,2})\s+de\s+(janeiro|fevereiro|feveiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de)?\s+(\d{2,4})/gi;
  const slashes = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g;
  for (const match of title.matchAll(words)) dates.push({ index: match.index, value: isoDate(match[3], monthNumbers.get(match[2].toLocaleLowerCase('pt-BR')), match[1]) });
  for (const match of title.matchAll(slashes)) dates.push({ index: match.index, value: isoDate(match[3], match[2], match[1]) });
  return dates.filter(item => item.value).sort((a, b) => b.index - a.index)[0]?.value ?? null;
}

function customerName(title) {
  const marker = title.search(/\s+(?:tv\s*box|tv\s+anual|login\s+tv|semestral)\b/i);
  return (marker > 0 ? title.slice(0, marker) : title).replace(/\s+/g, ' ').trim();
}

function activationFrom(expiration, plan) {
  if (!expiration || plan === 'vitalicio') return null;
  const date = new Date(`${expiration}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - (plan === 'semestral' ? 6 : 12));
  return date.toISOString().slice(0, 10);
}

const labels = await sql`SELECT id, lower(name) AS name FROM labels`;
const labelIds = new Map(labels.map(row => [row.name, row.id]));
let inserted = 0; let updated = 0; let incompleteDates = 0;

const startLabel = process.argv[2]?.toLocaleLowerCase('pt-BR');
let reachedStart = !startLabel;
for (const [rawLabel, titles] of Object.entries(groups)) {
  if (!reachedStart && rawLabel.toLocaleLowerCase('pt-BR') === startLabel) reachedStart = true;
  if (!reachedStart) continue;
  const labelName = rawLabel.toLocaleLowerCase('pt-BR');
  const labelId = labelIds.get(labelName);
  for (const title of titles) {
    const plan = /vitalicio/i.test(title) ? 'vitalicio' : /semestral/i.test(title) ? 'semestral' : 'anual';
    const expiration = plan === 'vitalicio' ? null : extractDate(title);
    const activation = activationFrom(expiration, plan);
    const phoneMatch = title.match(/\+55\s*\d{2}\s*\d{4,5}-?\d{4}/);
    const phone = phoneMatch?.[0] ?? null;
    const sourceRef = `whatsapp:${title}`;
    const notes = `Importado do WhatsApp Business. Nome original: ${title}. Etiqueta original: ${rawLabel}.` + (!expiration && plan !== 'vitalicio' ? ' Data completa não identificada; revisar.' : '');
    if (!expiration && plan !== 'vitalicio') incompleteDates++;
    const existed = (await sql`SELECT id FROM clients WHERE source_ref=${sourceRef}`)[0];
    if (existed) {
      await sql`UPDATE clients SET name=${customerName(title)}, phone=COALESCE(${phone},phone), plan_type=${plan}, activation_date=${activation},
        expiration_date=${expiration}, status=${expiration && expiration < '2026-10-12' ? 'vencido' : 'ativo'}, label_id=${labelId}, notes=${notes}, updated_at=now()
        WHERE source_ref=${sourceRef}`;
    } else {
      await sql`INSERT INTO clients (name, phone, plan_type, plan_value, activation_date, expiration_date, status, label_id, notes, source_ref)
        VALUES (${customerName(title)}, ${phone}, ${plan}, 0, ${activation}, ${expiration}, ${expiration && expiration < '2026-10-12' ? 'vencido' : 'ativo'}, ${labelId}, ${notes}, ${sourceRef})`;
    }
    if (existed) updated++;
    else inserted++;
    const saved = (await sql`SELECT id FROM clients WHERE source_ref=${sourceRef}`)[0];
    if (saved && labelId) await sql`INSERT INTO client_labels(client_id,label_id) VALUES(${saved.id},${labelId}) ON CONFLICT DO NOTHING`;
  }
}

console.log(JSON.stringify({ inserted, updated, incompleteDates }, null, 2));

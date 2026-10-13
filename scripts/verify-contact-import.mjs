import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const byLabel = await sql`
  SELECT l.name AS label,
         COUNT(c.id)::int AS clients,
         COUNT(c.phone)::int AS with_phone,
         COUNT(c.expiration_date)::int AS with_expiration_date
  FROM labels l
  LEFT JOIN clients c ON c.label_id = l.id
  GROUP BY l.id, l.name
  ORDER BY l.id
`;
const totals = (await sql`
  SELECT COUNT(*)::int AS clients,
         COUNT(phone)::int AS with_phone,
         COUNT(expiration_date)::int AS with_expiration_date,
         COUNT(*) FILTER (WHERE phone IS NOT NULL AND expiration_date IS NOT NULL)::int AS complete
  FROM clients
`)[0];
const duplicatePhones = await sql`
  SELECT regexp_replace(phone, '\\D', '', 'g') AS phone, COUNT(*)::int AS count
  FROM clients
  WHERE phone IS NOT NULL
  GROUP BY 1
  HAVING COUNT(*) > 1
`;

console.log(JSON.stringify({ totals, byLabel, duplicatePhones }, null, 2));

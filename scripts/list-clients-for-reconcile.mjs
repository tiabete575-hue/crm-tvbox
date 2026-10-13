import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT c.id, c.name, c.phone, c.source_ref, c.activation_date,
         c.expiration_date, c.plan_type, l.name AS label_name
  FROM clients c
  LEFT JOIN labels l ON l.id = c.label_id
  ORDER BY c.id
`;

console.log(JSON.stringify(rows, null, 2));

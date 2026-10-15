import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
const statements = readFileSync(new URL('../database/002-operations.sql', import.meta.url), 'utf8').split(';').map(s => s.trim()).filter(Boolean);
await sql.transaction(statements.map(statement => sql.query(statement)));
console.log('Migração de operações aplicada.');

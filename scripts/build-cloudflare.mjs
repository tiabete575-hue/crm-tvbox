import { existsSync, readdirSync, renameSync, mkdtempSync, rmdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// OpenNext embeds dotenv files in the Worker. Keep secrets out of build artifacts.
const root=resolve('.');
const temporary=mkdtempSync(join(tmpdir(),'crm-build-env-'));
const moved=[];
try {
  for(const file of readdirSync(root).filter(f=>/^\.env(?:\.|$)/.test(f)&&f!=='.env.example')) {
    renameSync(join(root,file),join(temporary,file));moved.push(file);
  }
  const environment={...process.env};
  for(const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED','NEON_AUTH_COOKIE_SECRET','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY'])delete environment[key];
  const result=spawnSync(process.execPath,['node_modules/@opennextjs/cloudflare/dist/cli/index.js','build'],{stdio:'inherit',env:environment});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
}finally {
  for(const file of moved) {
    if(existsSync(join(root,file)))throw new Error(`Restauração interrompida: ${file} já existe; backup preservado em ${temporary}`);
    renameSync(join(temporary,file),join(root,file));
  }
  rmdirSync(temporary);
}

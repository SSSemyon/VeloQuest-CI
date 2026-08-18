import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { parse } = require('libpg-query');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationRoot = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(migrationRoot).filter((file) => file.endsWith('.sql')).sort();
const databaseTestRoot = path.join(root, 'supabase', 'tests', 'database');
const databaseTests = fs.existsSync(databaseTestRoot)
  ? fs.readdirSync(databaseTestRoot).filter((file) => file.endsWith('.sql')).sort()
  : [];

async function parseSqlFile(filePath) {
  try {
    await parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    error.message = `${path.relative(root, filePath)}: ${error.message}`;
    throw error;
  }
}

for (const file of files) {
  await parseSqlFile(path.join(migrationRoot, file));
}

for (const file of databaseTests) {
  await parseSqlFile(path.join(databaseTestRoot, file));
}

console.log(JSON.stringify({ valid: true, migrations: files, databaseTests }, null, 2));

#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default configuration
const config = {
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || '5432',
  DB_NAME: process.env.DB_NAME || process.argv[2] || 'restaurant_discounts',
  DB_USER: process.env.DB_USER || process.argv[3] || 'restaurant_user',
  DB_PASSWORD: process.env.DB_PASSWORD || process.argv[4] || 'restaurant_pass',
  ENV_FILE: process.env.ENV_FILE || join(__dirname, '..', '.env'),
  PGUSER: process.env.PGUSER || 'postgres',
  PGPASSWORD: process.env.PGPASSWORD || '',
};

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

function log(msg) {
  console.log(`${colors.green}[info]${colors.reset} ${msg}`);
}

function warn(msg) {
  console.log(`${colors.yellow}[warn]${colors.reset} ${msg}`);
}

function fail(msg) {
  console.error(`${colors.red}[error]${colors.reset} ${msg}`);
}

function die(msg) {
  fail(msg);
  process.exit(1);
}

function showUsage() {
  console.log(`
Usage: node setup-db.mjs [DB_NAME [DB_USER [DB_PASSWORD]]]

Environment overrides:
  DB_HOST (default: localhost)
  DB_PORT (default: 5432)
  DB_NAME (default: restaurant_discounts)
  DB_USER (default: restaurant_user)
  DB_PASSWORD (default: restaurant_pass)
  ENV_FILE (default: apps/web/.env)
  PGUSER / PGPASSWORD for superuser access
`);
}

if (process.argv.includes('-h') || process.argv.includes('--help')) {
  showUsage();
  process.exit(0);
}

function checkPsql() {
  try {
    execSync('psql --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runPsql(sql) {
  const env = {
    ...process.env,
    PGPASSWORD: config.PGPASSWORD,
  };

  const args = [
    '--username', config.PGUSER,
    '--host', config.DB_HOST,
    '--port', config.DB_PORT,
    '--tuples-only',
    '--no-align',
    '--command', sql,
    'postgres'
  ];

  try {
    execSync(`psql ${args.map(a => `"${a}"`).join(' ')}`, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      encoding: 'utf-8',
    });
  } catch (error) {
    fail(`psql failed while executing: ${sql}`);
    if (error.stderr) {
      fail(`PostgreSQL error: ${error.stderr.toString().trim()}`);
    }
    fail('\nTroubleshooting:');
    fail('1. Test connection: psql -U postgres -c "SELECT 1;"');
    fail('2. Set password: set PGPASSWORD=your_postgres_password (Windows) or export PGPASSWORD=... (Mac/Linux)');
    fail('3. Windows: Check pg_hba.conf uses "md5" or "trust" for localhost');
    fail(`4. Manual test: psql -U ${config.PGUSER} -h ${config.DB_HOST} -p ${config.DB_PORT} postgres`);
    process.exit(1);
  }
}

function ensureUser() {
  log(`Ensuring PostgreSQL role '${config.DB_USER}' exists`);
  const sql = `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${config.DB_USER}') THEN CREATE ROLE "${config.DB_USER}" LOGIN PASSWORD '${config.DB_PASSWORD}'; ELSE ALTER ROLE "${config.DB_USER}" WITH PASSWORD '${config.DB_PASSWORD}'; END IF; END $$;`;
  runPsql(sql);
}

function ensureDatabase() {
  log(`Ensuring database '${config.DB_NAME}' exists`);
  const sql = `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${config.DB_NAME}') THEN CREATE DATABASE "${config.DB_NAME}" OWNER "${config.DB_USER}"; END IF; END $$;`;
  runPsql(sql);
}

function grantPrivileges() {
  log(`Granting privileges on '${config.DB_NAME}' to '${config.DB_USER}'`);
  try {
    const sql = `GRANT ALL PRIVILEGES ON DATABASE "${config.DB_NAME}" TO "${config.DB_USER}";`;
    runPsql(sql);
  } catch {
    warn('Could not grant privileges. You may not have permission.');
  }
}

function updateEnvFile() {
  const envPath = config.ENV_FILE;
  const targetDir = dirname(envPath);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const dbUrl = `postgresql://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}?schema=public`;
  log(`Writing DATABASE_URL to ${envPath}`);

  let content = '';
  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf-8');
  }

  const lines = content.split('\n');
  let replaced = false;
  const newLines = lines.map(line => {
    if (line.startsWith('DATABASE_URL=')) {
      replaced = true;
      return `DATABASE_URL=${dbUrl}`;
    }
    return line;
  });

  if (!replaced) {
    newLines.push(`DATABASE_URL=${dbUrl}`);
  }

  writeFileSync(envPath, newLines.join('\n'));
}

async function main() {
  if (!checkPsql()) {
    die('psql command not found. Install PostgreSQL CLI tools first.');
  }

  warn('This script expects superuser access to Postgres (defaults to PGUSER=postgres).');
  warn('Set PGUSER/PGPASSWORD if your superuser credentials differ.');

  ensureUser();
  ensureDatabase();
  grantPrivileges();
  updateEnvFile();

  log(`Setup complete. DATABASE_URL saved to ${config.ENV_FILE}`);
  log('Next steps: cd apps/web && npm run db:migrate && npm run db:seed');
}

main().catch((err) => {
  fail(err.message);
  process.exit(1);
});

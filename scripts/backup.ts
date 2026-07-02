// Backup script: copy dev.db to /backups/backup-dev-{date}.db
// Run with: npm run backup
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'prisma', 'dev.db');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

function backup() {
  // Check source database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Error: Database file not found at ${DB_PATH}`);
    console.error('Run "npx prisma db push" first to create the database.');
    process.exit(1);
  }

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backupPath = path.join(BACKUP_DIR, `backup-dev-${date}.db`);

  // Copy the database file (idempotent: overwrites same-day backup)
  fs.copyFileSync(DB_PATH, backupPath);

  console.log(`Backup created: ${backupPath}`);
}

backup();
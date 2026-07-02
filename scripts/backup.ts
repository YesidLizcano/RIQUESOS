// Backup script: copy dev.db, verify integrity, gzip compress, and rotate old backups
// Run with: npm run backup
import fs from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { PrismaClient } from '@prisma/client';

const DB_PATH = path.resolve(process.cwd(), 'prisma', 'dev.db');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const MAX_BACKUP_AGE_DAYS = 30;

async function checkIntegrity(backupPath: string): Promise<void> {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: `file:${backupPath}` },
    },
  });

  try {
    const result: Array<{ integrity_check: string }> =
      await prisma.$queryRaw`PRAGMA integrity_check`;
    const status = result[0]?.integrity_check;

    if (status !== 'ok') {
      console.error(`Integrity check FAILED: ${status}`);
      // Delete corrupted backup
      fs.unlinkSync(backupPath);
      throw new Error(`Database integrity check failed: ${status}`);
    }

    console.log('[OK] Integrity check passed');
  } finally {
    await prisma.$disconnect();
  }
}

async function compressBackup(backupPath: string): Promise<string> {
  const gzipPath = backupPath + '.gz';

  try {
    const source = createReadStream(backupPath);
    const gzip = createGzip();
    const destination = createWriteStream(gzipPath);

    await pipeline(source, gzip, destination);

    // Delete the uncompressed backup after successful compression
    fs.unlinkSync(backupPath);

    console.log(`[OK] Backup compressed: ${gzipPath}`);
    return gzipPath;
  } catch (error) {
    console.error(`Compression failed, keeping uncompressed backup: ${backupPath}`);
    // If compression fails, keep the uncompressed copy as fallback
    throw error;
  }
}

function rotateOldBackups(): void {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const now = Date.now();
  const maxAgeMs = MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(BACKUP_DIR);
  const backupPattern = /^backup-dev-\d{4}-\d{2}-\d{2}\.db\.gz$/;

  for (const file of files) {
    if (!backupPattern.test(file)) continue;

    const filePath = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(filePath);

    if (now - stat.mtimeMs > maxAgeMs) {
      fs.unlinkSync(filePath);
      console.log(`[ROTATE] Deleted old backup: ${file}`);
    }
  }
}

async function backup(): Promise<void> {
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
  console.log(`[OK] Database copied: ${backupPath}`);

  // Step 1: Integrity check on the backup
  await checkIntegrity(backupPath);

  // Step 2: Compress the backup
  await compressBackup(backupPath);

  // Step 3: Rotate old backups
  rotateOldBackups();

  console.log('Backup completed successfully.');
}

backup().catch((error) => {
  console.error('Backup failed:', error);
  process.exit(1);
});
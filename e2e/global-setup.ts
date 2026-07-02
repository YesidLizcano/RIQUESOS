import { execSync } from 'child_process';

async function globalSetup() {
  console.log('Resetting database...');
  execSync('npx prisma db push --force-reset --accept-data-loss', {
    stdio: 'inherit',
  });

  console.log('Seeding database...');
  execSync('npx prisma db seed', {
    stdio: 'inherit',
  });

  console.log('Global setup complete.');
}

export default globalSetup;
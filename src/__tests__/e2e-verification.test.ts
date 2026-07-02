import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * E2E Verification — structural and integration checks
 * 
 * Full E2E browser testing (login → protected route → Server Action → dashboard)
 * requires a running Next.js server and browser automation (Playwright/Cypress).
 * Here we verify the structural components that enable the E2E flow:
 * 
 * 1. Middleware protects routes (file exists, config correct)
 * 2. Auth configuration is wired up (Auth.js credentials provider)
 * 3. Login page exists and renders a form
 * 4. Dashboard page exists and imports metricas
 * 5. Server Actions exist and use requireSession
 */
describe('E2E structural verification', () => {
  const srcDir = path.resolve(__dirname, '..');

  describe('Middleware — route protection', () => {
    it('should have middleware.ts that protects routes', () => {
      const middlewarePath = path.join(srcDir, 'middleware.ts');
      expect(fs.existsSync(middlewarePath)).toBe(true);

      const content = fs.readFileSync(middlewarePath, 'utf-8');
      // Middleware should check for auth session/token
      expect(content).toMatch(/getToken|getServerSession|session/);
      // Should exclude /login and /api/auth from protection
      expect(content).toMatch(/login/);
      expect(content).toMatch(/api\/auth/);
    });
  });

  describe('Auth — Credentials provider', () => {
    it('should have Auth.js config with Credentials provider', () => {
      const authPath = path.join(srcDir, 'infrastructure', 'auth.ts');
      expect(fs.existsSync(authPath)).toBe(true);

      const content = fs.readFileSync(authPath, 'utf-8');
      expect(content).toMatch(/CredentialsProvider/);
      expect(content).toMatch(/bcrypt/);
      expect(content).toMatch(/authorize/);
    });

    it('should have the NextAuth API route handler', () => {
      const routePath = path.join(srcDir, 'app', 'api', 'auth', '[...nextauth]', 'route.ts');
      expect(fs.existsSync(routePath)).toBe(true);
    });
  });

  describe('Login page', () => {
    it('should have a login page with a form', () => {
      const loginPath = path.join(srcDir, 'app', 'login', 'page.tsx');
      expect(fs.existsSync(loginPath)).toBe(true);

      const content = fs.readFileSync(loginPath, 'utf-8');
      expect(content).toMatch(/signIn|credentials/i);
    });
  });

  describe('Dashboard page', () => {
    it('should have a dashboard page that fetches metrics', () => {
      const dashPath = path.join(srcDir, 'app', 'page.tsx');
      expect(fs.existsSync(dashPath)).toBe(true);

      const content = fs.readFileSync(dashPath, 'utf-8');
      expect(content).toMatch(/metricas|getMetricas|dashboard/i);
    });
  });

  describe('Server Actions — session guards', () => {
    it('should have auth action with requireSession', () => {
      const authActionPath = path.join(srcDir, 'presentation', 'actions', 'auth.ts');
      expect(fs.existsSync(authActionPath)).toBe(true);

      const content = fs.readFileSync(authActionPath, 'utf-8');
      expect(content).toMatch(/requireSession|getServerSession/);
    });

    it('should have lotes, ventas, clientes, gastos, dashboard actions', () => {
      const actionsDir = path.join(srcDir, 'presentation', 'actions');
      expect(fs.existsSync(path.join(actionsDir, 'lotes.ts'))).toBe(true);
      expect(fs.existsSync(path.join(actionsDir, 'ventas.ts'))).toBe(true);
      expect(fs.existsSync(path.join(actionsDir, 'clientes.ts'))).toBe(true);
      expect(fs.existsSync(path.join(actionsDir, 'gastos.ts'))).toBe(true);
      expect(fs.existsSync(path.join(actionsDir, 'dashboard.ts'))).toBe(true);
    });
  });

  describe('Seed script — admin user available', () => {
    it('should seed admin@riquesos.com user', () => {
      const seedPath = path.resolve(__dirname, '..', '..', 'prisma', 'seed.ts');
      expect(fs.existsSync(seedPath)).toBe(true);

      const content = fs.readFileSync(seedPath, 'utf-8');
      expect(content).toMatch(/admin@riquesos\.com/);
      expect(content).toMatch(/bcrypt/);
      expect(content).toMatch(/upsert/);
    });
  });
});
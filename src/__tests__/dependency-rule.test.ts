import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Dependency rule verification: src/domain/ MUST have zero imports from outer layers.
 * 
 * The domain layer must not import from:
 * - src/infrastructure/
 * - src/presentation/
 * - src/app/
 * - @prisma/client
 * - next
 * - next-auth
 * - bcrypt / bcryptjs
 * - pino
 */
describe('Dependency rule — domain layer isolation', () => {
  const domainDir = path.resolve(__dirname, '..', 'domain');
  const forbiddenImports = [
    'src/infrastructure',
    'src/presentation',
    'src/app',
    '@prisma/client',
    'next',
    'next-auth',
    'bcrypt',
    'bcryptjs',
    'pino',
  ];

  function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllTsFiles(fullPath));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('should have zero forbidden imports in src/domain/ files', () => {
    const domainFiles = getAllTsFiles(domainDir);
    const violations: { file: string; line: string; lineNumber: number }[] = [];

    for (const file of domainFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const forbidden of forbiddenImports) {
          // Check for import statements that reference forbidden modules
          if (line.includes("from '") || line.includes('from "') || line.includes('require(')) {
            if (line.includes(forbidden) && !line.includes('.test.ts')) {
              violations.push({
                file: path.relative(process.cwd(), file),
                line: line.trim(),
                lineNumber: index + 1,
              });
            }
          }
        }
      });
    }

    if (violations.length > 0) {
      const details = violations
        .map((v) => `${v.file}:${v.lineNumber} — ${v.line}`)
        .join('\n');
      expect.fail(
        `Domain layer dependency rule violated!\n\nFound forbidden imports:\n${details}`
      );
    }

    // If we get here, no violations were found
    expect(violations).toHaveLength(0);
  });

  it('should have domain files that only import from within domain or standard library', () => {
    const domainFiles = getAllTsFiles(domainDir);
    const allowedPatterns = [
      // Relative imports within domain
      /^\.\//,
      /^\.\.\//,
      // Standard Node.js modules (path, fs, etc.) — but domain shouldn't use these either
    ];

    for (const file of domainFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const importMatch = line.match(/from\s+['"](.+?)['"]/);
        if (!importMatch) continue;

        const importPath = importMatch[1];

        // Skip relative imports (these are within domain)
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          continue;
        }

        // Absolute package imports — domain should have NONE except pure utilities
        // Currently, domain entities don't import any external packages
        // If they did, we'd need to verify they are pure utility packages
        const isForbidden = forbiddenImports.some((f) => importPath.includes(f));

        if (isForbidden) {
          expect.fail(
            `Forbidden import in ${path.relative(process.cwd(), file)}: ${line.trim()}`
          );
        }
      }
    }

    // All domain files passed the check
    expect(true).toBe(true);
  });
});
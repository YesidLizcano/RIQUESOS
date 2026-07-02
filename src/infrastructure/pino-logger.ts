// Pino logger setup — writes to logs/app.log, auto-creates logs/ directory
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Multi-channel: write to file at info level, console at debug level in dev
const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: LOG_FILE, mkdir: true },
      level: 'info',
    },
    ...(process.env.NODE_ENV !== 'production'
      ? [
          {
            target: 'pino-pretty',
            level: 'debug' as const,
          },
        ]
      : []),
  ],
});

export const logger = pino(transport);

export default logger;
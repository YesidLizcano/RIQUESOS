// Pino logger setup — rotates logs via pino-roll (10 MB, daily, 10 files)
import pino from 'pino';
import path from 'path';

const LOG_FILE = path.resolve(process.cwd(), 'logs', 'app');

// Multi-channel: write to rotated file at info level, console at debug level in dev
const transport = pino.transport({
  targets: [
    {
      target: 'pino-roll',
      options: {
        file: LOG_FILE,
        size: 10,
        frequency: 'daily',
        extension: '.log',
        limit: { count: 10 },
        mkdir: true,
      },
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
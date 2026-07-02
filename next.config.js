/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    'bcryptjs',
    'pino',
    'pino-roll',
    'thread-stream',
  ],
};

module.exports = nextConfig;
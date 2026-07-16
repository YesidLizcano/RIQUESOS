/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    'bcryptjs',
    'pdfmake',
    'pino',
    'pino-roll',
    'thread-stream',
  ],
  allowedDevOrigins: [
    'localhost',
    '192.168.1.47',
  ],
};

module.exports = nextConfig;
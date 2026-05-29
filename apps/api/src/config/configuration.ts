export default () => ({
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    db: process.env.POSTGRES_DB || 'sheetops',
    user: process.env.POSTGRES_USER || 'sheetops',
    password: process.env.POSTGRES_PASSWORD || 'changeme',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  app: {
    apiPort: parseInt(process.env.API_PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    uploadDir: process.env.UPLOAD_DIR || '/data/uploads',
    tempDir: process.env.TEMP_DIR || '/data/temp',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_BYTES || '2147483648', 10),
    jwtSecret: process.env.JWT_SECRET || 'changeme-long-secret',
    allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  }
});

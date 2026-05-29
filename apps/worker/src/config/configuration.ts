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
    uploadDir: process.env.UPLOAD_DIR || '/data/uploads',
  }
});

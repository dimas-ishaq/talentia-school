// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

const isPostgres = process.env.DATABASE_URL?.startsWith('postgres')

export default defineConfig({
  out: isPostgres ? './drizzle-postgresql' : './drizzle',
  schema: isPostgres ? './server/database/schema.postgres.ts' : './server/database/schema.sqlite.ts',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: isPostgres
    ? { url: process.env.DATABASE_URL! }
    : { url: process.env.SQLITE_PATH || './server/database/local.db' },
})
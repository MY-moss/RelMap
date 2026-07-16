import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/db/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/relmap.db',
  },
})

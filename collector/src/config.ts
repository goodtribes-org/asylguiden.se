import { z } from 'zod';

const configSchema = z.object({
  STRAPI_URL: z.string().url().default('http://strapi:1337'),
  STRAPI_API_TOKEN: z.string().min(1, 'STRAPI_API_TOKEN is required'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

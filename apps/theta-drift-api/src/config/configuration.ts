import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  ARTICLES_PROVIDER_API_KEY: z.string().default(''),
  ARTICLES_PROVIDER_BASE_URL: z.string().min(1),
  ARTICLES_PROVIDER_CATEGORY: z.string().default('business'),
  ARTICLES_PROVIDER_LANG: z.string().default('en'),
  ARTICLES_PROVIDER_COUNTRY: z.string().default('us'),
  ARTICLES_PROVIDER_MAX: z.coerce.number().int().min(1).max(100).default(10),
  ARTICLES_PROVIDER_TIMEOUT_MS: z.coerce.number().int().default(10_000),

  QUOTE_API_KEY: z.string().default(''),
  QUOTE_BASE_URL: z.string().min(1),
  QUOTE_TIMEOUT_MS: z.coerce.number().int().default(10_000),
  QUOTE_TTL_MS: z.coerce.number().int().default(60_000),

  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().min(1),
  LLM_CURATE_MODEL: z.string().min(1),

  INGEST_ENABLED: bool.default(false),
  INGEST_INTERVAL_MIN_SECONDS: z.coerce.number().int().default(120),
  INGEST_INTERVAL_MAX_SECONDS: z.coerce.number().int().default(360),
  RATING_ENABLED: bool.default(false),
  RATING_INTERVAL_SECONDS: z.coerce.number().int().default(20),

  RATING_BATCH_SIZE: z.coerce.number().int().default(5),
  RATING_CANDIDATE_LIMIT: z.coerce.number().int().default(16),

  PORT: z.coerce.number().int().default(3000),
});

export type Env = z.infer<typeof envSchema>;


export const ENV = Symbol('ENV');

let validated: Env | null = null;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  validated = parsed.data;
  return validated;
}


export function loadedEnv(): Env {
  if (validated === null) {
    throw new Error('Env read before ConfigModule.forRoot validated it');
  }
  return validated;
}

import { z } from 'zod';

// Only what Phase 1 needs is required. Later-phase keys are optional so the
// app boots now, and get promoted to required when their module lands.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'CLERK_WEBHOOK_SECRET must start with whsec_'),
  REDIS_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
  AI_MOCK_DELAY_MS: z.coerce.number().int().min(0).default(800),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Used as ConfigModule's `validate`. Runs once at boot and fails fast with a readable list.
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}

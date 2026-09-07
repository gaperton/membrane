import * as z from 'zod/v4'

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3_000),
  PGLITE_DATA_DIR: z.string().min(1).default('./data/pglite'),
  MCP_ALLOWED_HOSTS: z
    .string()
    .default('localhost,127.0.0.1,[::1]')
    .transform((value) =>
      value
        .split(',')
        .map((host) => host.trim())
        .filter((host) => host.length > 0),
    )
    .pipe(z.array(z.string().min(1)).min(1)),
})

export type AppConfig = z.infer<typeof environmentSchema>

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  return environmentSchema.parse(environment)
}

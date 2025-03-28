import { z } from "zod";

// Define the schema for environment variables
const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),

  // Better auth
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string(),

  // Drizzle
  DB_FILE_NAME: z.string(),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
});

// Infer the TypeScript type from the schema
export type Env = z.infer<typeof EnvSchema>;

// Parse and validate the environment variables
const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment variables detected:");
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  console.error("Please check your .env file or environment configuration.");
  process.exit(1);
}

const env = result.data;
console.log("✅ Environment variables successfully validated.");
console.log(`Running in ${env.NODE_ENV} mode.`);

export default env;

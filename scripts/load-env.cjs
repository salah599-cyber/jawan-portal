/**
 * Load .env files for local CLI runs. On Vercel, env vars are injected and
 * dotenv is not installed in the production serverless bundle.
 */
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: ".env.local" });
  dotenv.config();
} catch {
  // dotenv unavailable — rely on process.env (Vercel, CI, etc.)
}

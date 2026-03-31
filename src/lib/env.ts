function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    if (process.env.CI === "true" && process.env.GITHUB_ACTIONS === "true") {
      return "";
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name: string, fallback: string = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Waraqhur",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  databaseUrl: optionalEnv("DATABASE_URL"),
  appSessionSecret: requireEnv("APP_SESSION_SECRET"),
  mailProvider: process.env.MAIL_PROVIDER ?? "console",
  mailFromName: requireEnv("MAIL_FROM_NAME"),
  mailFromEmail: requireEnv("MAIL_FROM_EMAIL"),
  postmarkServerToken: optionalEnv("POSTMARK_SERVER_TOKEN"),
  emailVerificationUrlBase: requireEnv("EMAIL_VERIFICATION_URL_BASE"),
  passwordResetUrlBase: requireEnv("PASSWORD_RESET_URL_BASE"),
};

export function isProduction() {
  return env.nodeEnv === "production";
}

// Central place to read environment variables, failing loudly when one is missing.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: () =>
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  showDemoLogins: () => process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true",
};

/** Server-only secrets. Never import this from a client component. */
export const serverEnv = {
  supabaseSecretKey: () =>
    required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  aiProvider: () => process.env.AI_PROVIDER ?? "mock",
};

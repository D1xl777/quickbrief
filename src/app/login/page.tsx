import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { publicEnv } from "@/lib/env";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "no-membership": "Your account is not a member of any organisation. Ask your admin.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const errorKey = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-zinc-950 p-10 text-zinc-100 lg:flex">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-5 text-brand-500" aria-hidden />
          Creative Compliance Hub
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            One place for every creative, check and approval.
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Marketing teams submit creatives before publication. Automated first-pass checks
            against your configured policies flag potential issues. A Compliance Reviewer always
            makes the final decision, and every step is recorded as evidence.
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          Automated checks support, and never replace, human compliance review.
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-sm font-semibold lg:hidden">
            <ShieldCheck className="size-5 text-brand-600" aria-hidden />
            Creative Compliance Hub
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 mb-6 text-sm text-ink-muted">Use your work account to continue.</p>
          <LoginForm
            next={next}
            initialError={errorKey ? ERRORS[errorKey] : undefined}
            demoAccounts={publicEnv.showDemoLogins() ? DEMO_ACCOUNTS : []}
          />
        </div>
      </div>
    </div>
  );
}

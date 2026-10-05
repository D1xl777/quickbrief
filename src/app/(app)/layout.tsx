import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { requirePageMember } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await requirePageMember();

  let pendingReviewCount = 0;
  if (member.role === "compliance" || member.role === "admin") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review");
    pendingReviewCount = count ?? 0;
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        role={member.role}
        organizationName={member.organization.name}
        pendingReviewCount={pendingReviewCount}
        user={{
          name: member.profile.full_name,
          email: member.email,
          roleLabel: ROLE_LABELS[member.role],
        }}
        logoutSlot={
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-muted hover:bg-zinc-200/50 hover:text-ink"
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        }
      />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

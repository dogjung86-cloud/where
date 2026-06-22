import { MapPin } from "lucide-react";
import Link from "next/link";

import { AdminDashboard } from "@/components/admin-dashboard";
import { AuthActions } from "@/components/auth-actions";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#171717]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8d0c2] pb-4">
          <Link className="flex items-center gap-3" href="/">
            <div className="grid size-10 place-items-center rounded-lg bg-[#171717] text-white">
              <MapPin size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#776e62]">SomeWhere</p>
              <p className="text-lg font-semibold">Admin</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#d8d0c2] bg-white px-3 text-sm font-semibold"
              href="/stats"
            >
              Stats
            </Link>
            <AuthActions compact />
          </div>
        </header>

        <AdminDashboard />
      </section>
    </main>
  );
}

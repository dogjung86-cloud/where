import {
  Camera,
  Globe2,
  MapPin,
  Send,
  Share2,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AdminNavLink } from "@/components/admin-nav-link";
import { AuthActions } from "@/components/auth-actions";
import { getAppStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

function StatCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <article className="rounded-lg border border-[#d8d0c2] bg-white p-5">
      <Icon className="mb-5 text-[#0d6b4f]" size={24} strokeWidth={1.8} />
      <p className="text-sm font-medium text-[#776e62]">{label}</p>
      <p className="mt-2 text-4xl font-semibold">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#776e62]">{detail}</p>
    </article>
  );
}

export default async function StatsPage() {
  const stats = await getAppStats();
  const shareTargets = [
    ["X", stats.shareBreakdown.x ?? 0],
    ["Instagram", stats.shareBreakdown.instagram ?? 0],
    ["Native", stats.shareBreakdown.native ?? 0],
    ["Copy link", stats.shareBreakdown.copy_link ?? 0],
    ["Save", stats.shareBreakdown.save ?? 0],
  ];

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
              <p className="text-lg font-semibold">Stats</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <AdminNavLink />
            <AuthActions compact />
          </div>
        </header>

        <section className="rounded-lg border border-[#d8d0c2] bg-[#17231f] p-6 text-white">
          <p className="text-sm font-medium text-[#b9d3c8]">Live app stats</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold">
            The photo loop, measured without exposing exact locations.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#cfe1d8]">
            Counts come from Supabase production data. Cities are counted from
            displayed city/country pairs only; exact GPS is not used.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            detail="Profiles created after Google or Phantom sign-in."
            icon={Users}
            label="Signed-up users"
            value={stats.signedUpUsers.toLocaleString()}
          />
          <StatCard
            detail="Accepted photos that made it through upload processing."
            icon={Camera}
            label="Photos sent"
            value={stats.sentPhotos.toLocaleString()}
          />
          <StatCard
            detail="Unique city/country pairs unlocked by accepted photos."
            icon={Globe2}
            label="Cities unlocked"
            value={stats.citiesUnlocked.toLocaleString()}
          />
          <StatCard
            detail="Share actions from arrival share buttons and share links."
            icon={Share2}
            label="Shares"
            value={stats.shares.toLocaleString()}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.7fr_1fr]">
          <article className="rounded-lg border border-[#d8d0c2] bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <Send size={22} strokeWidth={1.8} />
              <h2 className="text-2xl font-semibold">Exchange flow</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#f7f3ec] p-4">
                <p className="text-sm font-semibold">Delivered arrivals</p>
                <p className="mt-2 text-3xl font-semibold">
                  {stats.deliveredArrivals.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-[#f7f3ec] p-4">
                <p className="text-sm font-semibold">Open reports</p>
                <p className="mt-2 text-3xl font-semibold">
                  {stats.openReports.toLocaleString()}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-[#d8d0c2] bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <ShieldAlert size={22} strokeWidth={1.8} />
              <h2 className="text-2xl font-semibold">Share breakdown</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {shareTargets.map(([label, value]) => (
                <div className="rounded-lg bg-[#f7f3ec] p-3" key={label}>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

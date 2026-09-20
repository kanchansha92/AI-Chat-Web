import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService, type MetricsResponse } from "../../services/adminService";
import { formatINR } from "../../services/plans";
import { StatCard, PlanBadge, Avatar } from "./ui";

function shortDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    .toLowerCase();
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // One /admin/metrics call feeds every tile and the table below.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminService
      .metrics()
      .then((m) => alive && (setData(m), setError(null)))
      .catch((e) => alive && setError(e?.message ?? "Couldn't load metrics."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <p className="font-serif  text-muted">loading the numbers…</p>;
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-hairline bg-cream-light p-6 font-serif text-ink-soft">
        {error ?? "No data."}
      </div>
    );
  }

  const { cards, totals, recentUsers } = data;
  const paid =
    (totals.planCounts.BASIC ?? 0) + (totals.planCounts.PLUS ?? 0) + (totals.planCounts.ULTRA ?? 0);

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-[2rem] leading-none">Dashboard</h1>
          <p className="font-serif text-muted text-[0.9rem] mt-1.5">
            {totals.users.toLocaleString("en-IN")} users · {paid.toLocaleString("en-IN")} paying · updated{" "}
            {new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="signups today"
          value={cards.signupsToday.value.toLocaleString("en-IN")}
          sub="last 14 days"
          series={cards.signupsToday.series}
        />
        <StatCard
          label="MRR"
          value={formatINR(cards.mrr.value)}
          sub="monthly run-rate, current plans"
          series={cards.mrr.series}
        />
        <StatCard
          label="active conversations"
          value={cards.activeConversations.value.toLocaleString("en-IN")}
          sub={cards.activeConversations.seriesLabel ?? "last 24 hours"}
          series={cards.activeConversations.series}
        />
        <StatCard
          label="moderation events"
          value={cards.moderationEvents.value.toLocaleString("en-IN")}
          sub={`today · ${cards.moderationEvents.total.toLocaleString("en-IN")} all-time`}
          series={cards.moderationEvents.series}
        />
      </div>

      <section className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-ink text-[1.35rem]">Recent users</h2>
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="font-serif text-[0.9rem] text-rust hover:text-rust-hover transition"
          >
            view all →
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-hairline/70 bg-cream-light overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-hairline/70 font-serif text-muted text-[0.8rem]">
                <th className="py-2.5 px-4 font-medium">Name</th>
                <th className="py-2.5 px-4 font-medium">Email</th>
                <th className="py-2.5 px-4 font-medium">Plan</th>
                <th className="py-2.5 px-4 font-medium text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => navigate(`/admin/users?focus=${u.id}`)}
                  className="border-b border-hairline/40 last:border-0 hover:bg-cream-dark/40 cursor-pointer transition"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} src={u.avatar} size={30} />
                      <span className="font-serif text-ink text-[0.95rem]">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-serif text-ink-soft text-[0.9rem]">{u.email}</td>
                  <td className="py-2.5 px-4">
                    <PlanBadge plan={u.plan} />
                  </td>
                  <td className="py-2.5 px-4 font-serif text-muted text-[0.88rem] text-right">
                    {shortDate(u.createdAt)}
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 font-serif  text-muted text-center">
                    no users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  adminService,
  type UsersListResponse,
  type UserDetailResponse,
} from "../../services/adminService";
import { PlanBadge, Avatar } from "./ui";

const PLAN_FILTERS = [
  { key: "", label: "all" },
  { key: "FREE", label: "free" },
  { key: "PLUS", label: "plus" },
  { key: "PRO", label: "pro" },
];

function longDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toLowerCase();
}

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError(null);
    adminService
      .user(id)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError(e?.message ?? "Couldn't load this user."));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-charcoal/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[420px] h-full bg-cream-light border-l-2 border-charcoal overflow-y-auto no-scrollbar">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <h2 className="font-display text-ink text-[1.4rem]">User</h2>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full border border-hairline text-ink-soft hover:bg-cream-dark/60 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {error && <p className="mt-6 font-serif text-rust">{error}</p>}
          {!detail && !error && <p className="mt-6 font-serif  text-muted">loading…</p>}

          {detail && (
            <div className="mt-5">
              <div className="flex items-center gap-3">
                <Avatar name={detail.user.name} src={detail.user.avatar} size={48} />
                <div className="min-w-0">
                  <div className="font-display text-ink text-[1.2rem] leading-tight truncate">
                    {detail.user.name}
                  </div>
                  <div className="font-serif text-muted text-[0.88rem] truncate">{detail.user.email}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <PlanBadge plan={detail.user.plan} />
                <span className="font-serif text-muted text-[0.8rem]">
                  theme {detail.user.theme.toLowerCase()}
                </span>
                {!detail.user.onboardingDone && (
                  <span className="font-serif text-rust text-[0.8rem]">· onboarding pending</span>
                )}
              </div>

              <hr className="dashed-divider" />

              <dl className="grid grid-cols-2 gap-y-3 gap-x-4">
                {[
                  ["characters", detail.stats.characters],
                  ["messages", detail.stats.messages],
                  ["journal threads", detail.stats.journalThreads],
                  ["groups", detail.stats.groups],
                  ["blocked messages", detail.stats.blockedMessages],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="font-serif text-muted text-[0.8rem]">{label}</dt>
                    <dd className="font-display text-ink text-[1.3rem] leading-none mt-0.5">
                      {(value as number).toLocaleString("en-IN")}
                    </dd>
                  </div>
                ))}
              </dl>

              <hr className="dashed-divider" />

              <div className="font-serif text-[0.9rem] text-ink-soft space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">joined</span>
                  <span>{longDate(detail.user.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">last active</span>
                  <span>{detail.stats.lastActiveAt ? longDate(detail.stats.lastActiveAt) : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">intent</span>
                  <span>{detail.user.intent ? detail.user.intent.toLowerCase() : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">language</span>
                  <span>{detail.user.language}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ?focus=<id> is how the dashboard deep-links a row straight into the panel.
  const [focusId, setFocusId] = useState<string | null>(searchParams.get("focus"));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, plan]);

  // Returns its own cleanup, so the effect below can discard a response that is
  // no longer wanted. Without this, typing "an" then "anna" - or clicking page 2
  // then page 3 - applied whichever request happened to finish LAST: the slower,
  // broader query overwrote the newer one, leaving the table showing page 2 while
  // the pager read 3, and results for "an" under a search box reading "anna".
  // DetailPanel in this same file already does it this way.
  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    adminService
      .users({ q: debouncedQ, plan, page, pageSize: 20 })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (alive) setError(e?.message ?? "Couldn't load users.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debouncedQ, plan, page]);

  useEffect(() => load(), [load]);

  const closeDetail = () => {
    setFocusId(null);
    if (searchParams.has("focus")) {
      searchParams.delete("focus");
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <div>
      <header>
        <h1 className="font-display text-ink text-[2rem] leading-none">Users</h1>
        <p className="font-serif text-muted text-[0.9rem] mt-1.5">
          {data ? `${data.total.toLocaleString("en-IN")} total` : "…"}
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="flex-1 min-w-[220px] rounded-xl border border-hairline bg-cream-light px-4 py-2.5 font-serif text-ink text-[0.95rem] placeholder:text-muted focus:outline-none focus:border-rust/60"
        />
        <div className="inline-flex rounded-xl border border-hairline bg-cream-light p-1">
          {PLAN_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setPlan(f.key)}
              className={`rounded-lg px-3.5 py-1.5 font-serif text-[0.9rem] transition ${plan === f.key ? "bg-charcoal text-cream-light" : "text-ink-soft hover:text-rust"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-hairline/70 bg-cream-light overflow-hidden">
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
            {data?.users.map((u) => (
              <tr
                key={u.id}
                onClick={() => setFocusId(u.id)}
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
                  {longDate(u.createdAt)}
                </td>
              </tr>
            ))}
            {data && data.users.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="py-8 px-4 font-serif  text-muted text-center">
                  no users match that.
                </td>
              </tr>
            )}
            {loading && !data && (
              <tr>
                <td colSpan={4} className="py-8 px-4 font-serif  text-muted text-center">
                  loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 font-serif text-rust text-[0.9rem]">{error}</p>}

      {data && data.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="font-serif text-[0.9rem] text-ink-soft disabled:opacity-40 hover:text-rust transition"
          >
            ← prev
          </button>
          <span className="font-serif text-muted text-[0.9rem]">
            {data.page} / {data.pageCount}
          </span>
          <button
            type="button"
            disabled={page >= data.pageCount}
            onClick={() => setPage((p) => Math.min(data.pageCount, p + 1))}
            className="font-serif text-[0.9rem] text-ink-soft disabled:opacity-40 hover:text-rust transition"
          >
            next →
          </button>
        </div>
      )}

      {focusId && <DetailPanel id={focusId} onClose={closeDetail} />}
    </div>
  );
}

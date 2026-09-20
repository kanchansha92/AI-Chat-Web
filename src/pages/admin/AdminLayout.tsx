import { useEffect, useState } from "react";
import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../hook/hooks";
import { logout } from "../../redux/authSlice";
import { adminService } from "../../services/adminService";

type Gate = "checking" | "ok" | "denied";

const NAV = [
  { to: "/admin", end: true, label: "Dashboard" },
  { to: "/admin/users", end: false, label: "Users" },
  { to: "/admin/billing", end: false, label: "Billing" },
  { to: "/admin/plans", end: false, label: "Plans" },
  { to: "/admin/providers", end: false, label: "Providers" },
];

export default function AdminLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [gate, setGate] = useState<Gate>("checking");

  // Access guard: a 403 here (not on the ADMIN_EMAILS allowlist) bounces to /home
  // before any child screen gets a chance to fetch admin data.
  useEffect(() => {
    let alive = true;
    adminService
      .session()
      .then(() => alive && setGate("ok"))
      .catch(() => alive && setGate("denied"));
    return () => {
      alive = false;
    };
  }, []);

  if (gate === "denied") return <Navigate to="/home" replace />;

  if (gate === "checking") {
    return (
      <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center">
        <p className="font-serif  text-muted text-[1rem]">checking access…</p>
      </div>
    );
  }

  const onLogout = async () => {
    await dispatch(logout());
    navigate("/signin", { replace: true });
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 font-serif text-[0.98rem] transition ${isActive
      ? "bg-rust text-cream-light shadow-[2px_2.5px_0_0_var(--color-charcoal)] border-2 border-charcoal"
      : "text-ink-soft hover:bg-cream-dark/60 border-2 border-transparent"
    }`;

  return (
    <div className="min-h-[100dvh] w-full app-gradient flex">
      <aside className="w-60 shrink-0 border-r border-hairline/70 bg-cream-light flex flex-col">
        <div className="px-5 py-6">
          <div className="font-display text-ink text-[1.35rem] leading-none">Privateaile</div>
          <div className="font-caveat text-rust text-[1rem] mt-0.5">admin</div>
        </div>

        <nav className="px-3 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-4 py-5 border-t border-hairline/70">
          <div className="font-serif text-ink text-[0.88rem] truncate">{user?.name ?? "admin"}</div>
          <div className="font-serif text-muted text-[0.78rem] truncate">{user?.email}</div>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="text-left font-serif text-[0.85rem] text-ink-soft hover:text-rust transition"
            >
              ← back to the app
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="text-left font-serif text-[0.85rem] text-muted hover:text-rust transition"
            >
              sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-6 md:px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const navigate = useNavigate();

  // Full reload, not an SPA navigation: a 500 usually clears on a retry, and
  // this resets whatever client state got wedged alongside it.
  const tryAgain = () => window.location.reload();

  return (
    <div className="min-h-[100dvh] w-full app-gradient flex flex-col">
      <div className="pt-[max(1.25rem,env(safe-area-inset-top))] px-6 text-center">
        <p className="font-caveat  text-muted text-[1rem]">Privateaile</p>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-6 text-center">
        <h1 className="font-instrument text-rust leading-none text-[6rem] sm:text-[7rem] select-none">
          500
        </h1>

        <h2 className="font-instrument text-ink text-[2rem] sm:text-[2.3rem] leading-tight mt-2">
          Something on our <span className=" text-rust">end</span>.
        </h2>

        <p className="font-caveat  text-muted text-[1rem] mt-3 leading-snug">
          we know. we're looking.
          <br />
          it's probably a few minutes.
        </p>
      </main>

      <div className="w-full max-w-[420px] mx-auto px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
        <button
          type="button"
          onClick={tryAgain}
          className="w-full rounded-2xl bg-rust text-cream-soft font-serif  text-[1.05rem] py-3.5 border-2 border-charcoal shadow-[2px_2.5px_0_0_var(--color-charcoal)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--color-charcoal)] hover:brightness-105 cursor-pointer"
        >
          Try again
        </button>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full rounded-2xl bg-cream-light text-ink font-serif text-[1rem] py-3.5 border-2 border-charcoal shadow-[2px_2.5px_0_0_var(--color-charcoal)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--color-charcoal)] hover:bg-cream-dark cursor-pointer"
        >
          Home &rarr;
        </button>
      </div>
    </div>
  );
}

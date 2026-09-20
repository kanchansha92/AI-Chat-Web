import { useNavigate } from "react-router-dom";
import { serverErrorCopy } from "../copy";

export default function RateLimitedPage() {
  const navigate = useNavigate();
  const { headline, body } = serverErrorCopy.rateLimited;

  return (
    <div className="min-h-[100dvh] w-full app-gradient flex flex-col">
      <div className="pt-[max(1.25rem,env(safe-area-inset-top))] px-6 text-center">
        <p className="font-caveat  text-muted text-[1rem]">privateaile</p>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-6 text-center">
        <div
          aria-hidden="true"
          className="font-instrument text-rust leading-none text-[5rem] sm:text-[6rem] select-none"
        >
          ⏳
        </div>

        <h2 className="font-instrument text-ink text-[2rem] sm:text-[2.3rem] leading-tight mt-2">
          Slow down a <span className=" text-rust">moment</span>.
        </h2>

        <p className="font-caveat  text-muted text-[1rem] mt-3 leading-snug">
          {body}
        </p>
        <span className="sr-only">{headline}</span>
      </main>

      <div className="w-full max-w-[420px] mx-auto px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
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

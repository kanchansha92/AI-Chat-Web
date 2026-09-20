import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  const goBack = () => {
    // history.length is 1 when the tab opened straight onto this URL.
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="min-h-[100dvh] w-full app-gradient flex flex-col">
      <div className="pt-[max(1.25rem,env(safe-area-inset-top))] px-6 text-center">
        <p className="font-caveat  text-muted text-[1rem]">privateaile</p>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-6 text-center">
        <h1 className="font-instrument text-rust leading-none text-[6rem] sm:text-[7rem] select-none">
          404
        </h1>

        <h2 className="font-instrument text-ink text-[2rem] sm:text-[2.3rem] leading-tight mt-2">
          That page <span className=" text-rust">isn't here</span>.
        </h2>

        <p className="font-caveat  text-muted text-[1rem] mt-3">
          try going home. or just go back.
        </p>
      </main>

      <div className="w-full max-w-[420px] mx-auto px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full rounded-2xl bg-rust text-cream-soft font-serif  text-[1.05rem] py-3.5 border-2 border-charcoal shadow-[2px_2.5px_0_0_var(--color-charcoal)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--color-charcoal)] hover:brightness-105 cursor-pointer"
        >
          Home &ndash;
        </button>

        <button
          type="button"
          onClick={goBack}
          className="w-full rounded-2xl bg-cream-light text-ink font-serif text-[1rem] py-3.5 border-2 border-charcoal shadow-[2px_2.5px_0_0_var(--color-charcoal)] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--color-charcoal)] hover:bg-cream-dark cursor-pointer"
        >
          &larr; back
        </button>
      </div>
    </div>
  );
}

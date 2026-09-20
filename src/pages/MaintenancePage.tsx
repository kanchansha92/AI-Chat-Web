import { serverErrorCopy } from "../copy";

export default function MaintenancePage() {
  const { headline, body } = serverErrorCopy.maintenance;

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
          ☾
        </div>

        <h2 className="font-instrument text-ink text-[2rem] sm:text-[2.3rem] leading-tight mt-2">
          We're <span className=" text-rust">patching</span> things.
        </h2>

        <p className="font-caveat  text-muted text-[1rem] mt-3 leading-snug">
          {body}
        </p>
        <span className="sr-only">{headline}</span>
      </main>

      <div className="pb-[max(1.75rem,env(safe-area-inset-bottom))]" />
    </div>
  );
}

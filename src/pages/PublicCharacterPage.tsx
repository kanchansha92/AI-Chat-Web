import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { request } from "../services/authService";
import CharacterFace from "../components/CharacterFace";

// A shared character, as a stranger sees it. No sign-in, and deliberately
// almost nothing: the server sends a name, a colour or photo, a one-line bio
// and the tone tags. Never the owner, their conversations, the character's
// memories or its source files.

interface PublicCharacter {
  id: string;
  name: string;
  colour: string;
  avatar: string | null;
  quickLine: string;
  tones: string[];
  publicSlug: string;
  createdAt: string;
}

export default function PublicCharacterPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<PublicCharacter | null>(null);
  const [status, setStatus] = useState<"loading" | "here" | "gone">("loading");

  useEffect(() => {
    let cancelled = false;
    request<{ character: PublicCharacter }>(`/public/characters/${encodeURIComponent(slug ?? "")}`)
      .then((r) => {
        if (cancelled) return;
        setCharacter(r.character);
        setStatus("here");
      })
      .catch(() => {
        if (!cancelled) setStatus("gone");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center px-5">
        <p className="font-caveat text-muted text-[1rem]">looking…</p>
      </div>
    );
  }

  if (status === "gone" || !character) {
    return (
      <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center px-5">
        <div className="text-center max-w-[380px]">
          <h1 className="font-display text-ink text-[1.8rem] leading-tight">— that isn't here.</h1>
          <p className="font-serif text-muted text-[0.98rem] mt-2">
            this character isn't shared any more, or the link has a typo in it.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-6 rounded-full bg-rust text-cream-soft font-serif text-[0.92rem] px-5 py-2.5 hover:bg-rust-hover transition cursor-pointer"
          >
            see privateaile →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[420px] text-center">
        <div className="mx-auto h-24 w-24">
          <CharacterFace name={character.name} colour={character.colour} avatar={character.avatar} />
        </div>
        <h1 className="font-display text-ink text-[2rem] leading-tight mt-4">{character.name}</h1>
        {character.quickLine && (
          <p className="font-serif text-ink-soft text-[1rem] mt-2">{character.quickLine}</p>
        )}
        {character.tones.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {character.tones.map((t) => (
              <span
                key={t}
                className="rounded-full border border-hairline/70 bg-cream-light px-3 py-0.5 font-caveat text-muted text-[0.85rem]"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="dotted-rule my-7" />

        <p className="font-serif text-muted text-[0.95rem]">
          someone made {character.name} on privateaile. you can make your own.
        </p>
        <button
          type="button"
          onClick={() => navigate("/signup")}
          className="mt-4 rounded-full bg-rust text-cream-soft font-serif text-[0.95rem] px-6 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
        >
          start free →
        </button>
        <p className="mt-2 font-caveat text-muted/70 text-[0.8rem]">free forever · no card</p>
      </div>
    </div>
  );
}

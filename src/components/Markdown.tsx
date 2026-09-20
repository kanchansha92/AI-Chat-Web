import { useState, type ReactNode } from "react";

// Dependency-free block-then-inline Markdown parser, sized to what a chat
// assistant actually emits. Anything it can't classify falls through as text.

// A generated picture reaches the UI as its own `imageUrl` field, never as
// markdown inside the reply text - the model has no way to know a real file
// path, so any ![alt](url) it writes is invented and 404s when clicked. The
// server strips these too (lib/chat.js), but stripping here as well cleans up
// chats that were already saved before that guard existed.
const IMAGE_MARKDOWN_RE = /!\[[^\]]*\]\([^)]*\)/g;

function stripImageMarkdown(src: string): string {
  if (!src) return src;
  return src
    .replace(IMAGE_MARKDOWN_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function Markdown({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={`font-serif text-[0.95rem] text-ink ${className}`}>
      {renderBlocks(stripImageMarkdown(text))}
    </div>
  );
}

function renderBlocks(src: string): ReactNode[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/);
    if (fence) {
      const marker = fence[1][0];
      const lang = fence[2] || "";
      const body: string[] = [];
      i++;
      while (
        i < lines.length &&
        !new RegExp(`^\\s{0,3}${marker === "`" ? "`" : "~"}{3,}\\s*$`).test(lines[i])
      ) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push(<CodeBlock key={key++} lang={lang} code={body.join("\n")} />);
      continue;
    }

    const h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (h) {
      out.push(
        <Heading key={key++} level={h[1].length} text={h[2].replace(/\s+#+\s*$/, "")} />
      );
      i++;
      continue;
    }

    if (isRule(line)) {
      out.push(<hr key={key++} className="my-5 border-0 h-px bg-hairline" />);
      i++;
      continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i++;
      }
      out.push(
        <blockquote
          key={key++}
          className="my-3 border-l-[3px] border-rust/40 pl-4 text-ink-soft "
        >
          {renderBlocks(body.join("\n"))}
        </blockquote>
      );
      continue;
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map(cellAlign);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(<Table key={key++} header={header} align={align} rows={rows} />);
      continue;
    }

    if (isBullet(line) || isOrdered(line)) {
      const block: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        // the opening line always joins the list; without this the guards
        // below can bounce straight back out and `i` never advances
        if (block.length) {
          if (/^\s{0,3}#{1,6}\s/.test(lines[i])) break;
          if (/^\s{0,3}(`{3,}|~{3,})/.test(lines[i])) break;
          if (isRule(lines[i])) break;
          if (isTableStart(lines, i)) break;
        }
        if (
          block.length &&
          indentOf(lines[i]) === 0 &&
          !isBullet(lines[i]) &&
          !isOrdered(lines[i])
        )
          break;
        block.push(lines[i]);
        i++;
      }
      out.push(<List key={key++} lines={block} />);
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isBullet(lines[i]) &&
      !isOrdered(lines[i]) &&
      !isRule(lines[i]) &&
      !/^\s{0,3}#{1,6}\s/.test(lines[i]) &&
      !/^\s{0,3}(`{3,}|~{3,})/.test(lines[i]) &&
      !/^\s{0,3}>/.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) {
      out.push(
        <p key={key++} className="my-2.5 leading-[1.75] first:mt-0 last:mb-0">
          {inline(para.join("\n"))}
        </p>
      );
    } else {
      i++; // safety valve: never spin on a line we can't classify
    }
  }

  return out;
}

function Heading({ level, text }: { level: number; text: string }) {
  const size =
    level <= 1
      ? "text-[1.3rem]"
      : level === 2
        ? "text-[1.12rem]"
        : level === 3
          ? "text-[1.02rem]"
          : "text-[0.95rem]";
  const spacing = level <= 2 ? "mt-5 mb-2.5" : "mt-4 mb-2";
  return (
    <div
      className={`font-display font-semibold text-ink leading-snug ${size} ${spacing} first:mt-0`}
    >
      {inline(text)}
      {level <= 2 && <span className="mt-2 block h-px w-full bg-hairline/70" />}
    </div>
  );
}

type Item = { text: string; children: string[] };

function List({ lines }: { lines: string[] }) {
  const real = lines.filter((l) => l.trim());
  if (!real.length) return null;

  const base = Math.min(...real.map(indentOf));
  const ordered = isOrdered(real[0]);
  const startAt = ordered ? Number(real[0].match(/^\s*(\d+)/)?.[1] ?? 1) : 1;

  const items: Item[] = [];
  for (const l of lines) {
    if (!l.trim()) {
      if (items.length) items[items.length - 1].children.push("");
      continue;
    }
    const marker = l.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (marker && indentOf(l) <= base + 1) {
      items.push({ text: marker[1], children: [] });
    } else if (items.length) {
      items[items.length - 1].children.push(l);
    } else if (marker) {
      items.push({ text: marker[1], children: [] });
    }
  }

  return (
    <ul className="my-2.5 flex flex-col gap-1.5 list-none pl-0">
      {items.map((it, idx) => (
        <li key={idx} className="relative pl-6 leading-[1.7]">
          <span
            className={`absolute left-0 top-0 select-none text-rust ${ordered
                ? "font-display text-[0.82rem] font-semibold tabular-nums leading-[1.9]"
                : "text-[1.1rem] leading-[1.45]"
              }`}
            aria-hidden="true"
          >
            {ordered ? `${startAt + idx}.` : "•"}
          </span>
          {inline(it.text)}
          {it.children.some((c) => c.trim()) && (
            <div className="mt-1">{renderBlocks(dedent(it.children))}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Table({
  header,
  align,
  rows,
}: {
  header: string[];
  align: Array<"left" | "center" | "right">;
  rows: string[][];
}) {
  const cols = Math.max(header.length, ...rows.map((r) => r.length), 1);
  const at = (i: number) => align[i] ?? "left";
  const pad = (r: string[]) =>
    Array.from({ length: cols }, (_, i) => r[i] ?? "");

  return (
    <div className="my-3.5 w-full overflow-x-auto rounded-xl border border-hairline quiet-scrollbar">
      <table className="w-full border-collapse text-[0.88rem]">
        <thead>
          <tr className="bg-cream-dark/70">
            {pad(header).map((c, i) => (
              <th
                key={i}
                style={{ textAlign: at(i) }}
                className="px-3.5 py-2.5 font-display font-semibold text-ink whitespace-nowrap border-b border-hairline"
              >
                {inline(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr
              key={ri}
              className="border-b border-hairline/60 last:border-0 hover:bg-rust/[0.04] transition-colors"
            >
              {pad(r).map((c, ci) => (
                <td
                  key={ci}
                  style={{ textAlign: at(ci) }}
                  className="px-3.5 py-2.5 align-top text-ink-soft leading-[1.6]"
                >
                  {inline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; the code is still selectable by hand */
    }
  };

  return (
    <div className="group/code my-3.5 overflow-hidden rounded-xl border border-hairline bg-cream-dark/50">
      <div className="flex items-center justify-between border-b border-hairline/70 px-3.5 py-1.5">
        <span className="font-serif text-[0.7rem] uppercase tracking-[0.08em] text-muted">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-md px-2 py-0.5 font-serif text-[0.72rem] text-muted opacity-0 transition hover:bg-ink/5 hover:text-rust focus:opacity-100 group-hover/code:opacity-100 cursor-pointer"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 quiet-scrollbar">
        <code className="font-mono text-[0.82rem] leading-[1.65] text-ink whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

// One pass, earliest match wins. Held as a source string and compiled fresh on
// every call rather than shared: inline() recurses into the contents of each
// match, and one shared /g regex would come back with its lastIndex rewound by
// the inner call, leaving the outer loop re-matching from the top forever.
const INLINE_SRC =
  "`([^`\\n]+)`|\\*\\*\\*([\\s\\S]+?)\\*\\*\\*|\\*\\*([\\s\\S]+?)\\*\\*|__([\\s\\S]+?)__|~~([\\s\\S]+?)~~|\\*([^*\\n]+?)\\*|_([^_\\n]+?)_|\\[([^\\]\\n]*)\\]\\(([^)\\s]+)\\)|(https?:\\/\\/[^\\s<>()\\[\\]]+)";

function inline(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(INLINE_SRC, "g");
  let last = 0;
  let key = 0;

  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // `*` or `_` inside a word (snake_case, a*b) is not emphasis; skipping it
    // keeps identifiers intact.
    if ((m[6] !== undefined || m[7] !== undefined) && touchesWord(src, m)) {
      continue;
    }

    if (m.index > last) pushText(out, src.slice(last, m.index), key++);
    last = m.index + m[0].length;

    if (m[1] !== undefined) {
      out.push(
        <code
          key={key++}
          className="rounded-[5px] bg-ink/[0.07] px-1.5 py-[1px] font-mono text-[0.84em] text-rust"
        >
          {m[1]}
        </code>
      );
    } else if (m[2] !== undefined) {
      out.push(
        <strong key={key++} className="font-semibold  text-ink">
          {inline(m[2])}
        </strong>
      );
    } else if (m[3] !== undefined || m[4] !== undefined) {
      out.push(
        <strong key={key++} className="font-semibold text-ink">
          {inline(m[3] ?? m[4])}
        </strong>
      );
    } else if (m[5] !== undefined) {
      out.push(
        <span key={key++} className="line-through opacity-60">
          {inline(m[5])}
        </span>
      );
    } else if (m[6] !== undefined || m[7] !== undefined) {
      out.push(
        <em key={key++} className="">
          {inline(m[6] ?? m[7])}
        </em>
      );
    } else if (m[9] !== undefined) {
      out.push(
        <a
          key={key++}
          href={m[9]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-rust underline decoration-rust/30 underline-offset-2 hover:decoration-rust transition"
        >
          {inline(m[8] || m[9])}
        </a>
      );
    } else if (m[10] !== undefined) {
      out.push(
        <a
          key={key++}
          href={m[10]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-rust underline decoration-rust/30 underline-offset-2 hover:decoration-rust transition break-all"
        >
          {m[10]}
        </a>
      );
    }
  }

  if (last < src.length) pushText(out, src.slice(last), key++);
  return out;
}

// Keep line breaks inside a text run; the assistant's breaks are meaningful.
function pushText(out: ReactNode[], str: string, key: number) {
  const parts = str.split("\n");
  parts.forEach((p, i) => {
    if (i > 0) out.push(<br key={`br-${key}-${i}`} />);
    if (p) out.push(<span key={`t-${key}-${i}`}>{p}</span>);
  });
}

function touchesWord(src: string, m: RegExpExecArray): boolean {
  const before = src[m.index - 1];
  const after = src[m.index + m[0].length];
  return /[\w]/.test(before ?? "") || /[\w]/.test(after ?? "");
}

function indentOf(l: string): number {
  return (l.match(/^\s*/)?.[0].replace(/\t/g, "  ").length) ?? 0;
}

function isBullet(l: string): boolean {
  return /^\s*[-*+]\s+\S/.test(l) && !isRule(l);
}

function isOrdered(l: string): boolean {
  return /^\s*\d+[.)]\s+\S/.test(l);
}

function isRule(l: string): boolean {
  return /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
}

function isTableStart(lines: string[], i: number): boolean {
  return (
    lines[i].includes("|") &&
    i + 1 < lines.length &&
    /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1]) &&
    lines[i + 1].includes("-")
  );
}

function splitRow(row: string): string[] {
  let s = row.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function cellAlign(spec: string): "left" | "center" | "right" {
  const s = spec.trim();
  if (s.startsWith(":") && s.endsWith(":")) return "center";
  if (s.endsWith(":")) return "right";
  return "left";
}

function dedent(lines: string[]): string {
  const real = lines.filter((l) => l.trim());
  if (!real.length) return "";
  const pad = Math.min(...real.map(indentOf));
  return lines.map((l) => l.slice(Math.min(pad, indentOf(l)))).join("\n");
}

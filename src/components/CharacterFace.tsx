import { useEffect, useState, type CSSProperties } from "react";

export default function CharacterFace({
  name,
  colour,
  avatar,
  className = "",
  title,
  style,
}: {
  name?: string | null;
  colour?: string | null;
  avatar?: string | null;
  className?: string;
  title?: string;
  style?: CSSProperties;
}) {
  const [broken, setBroken] = useState(false);
  // a different member can land in the same slot, so re-arm the image
  useEffect(() => setBroken(false), [avatar]);

  const showPhoto = Boolean(avatar) && !broken;
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "·";

  return (
    <span
      style={{ backgroundColor: colour ?? "#a8b08c", ...style }}
      className={`relative rounded-full flex items-center justify-center overflow-hidden text-cream-soft ${className}`}
      title={title}
    >
      {showPhoto ? (
        <img
          src={avatar as string}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

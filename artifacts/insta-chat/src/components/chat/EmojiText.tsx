import { ReactNode, useMemo } from "react";
import emojiRegex from "emoji-regex";
import { useEmojiStyle, EmojiStyleKey } from "@/lib/emojiStyle";

function toUnified(seg: string): string {
  const cps: string[] = [];
  for (const ch of seg) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if (cp === 0xfe0f) continue;
    cps.push(cp.toString(16));
  }
  return cps.join("-");
}

function emojiUrl(unified: string, style: Exclude<EmojiStyleKey, "native">): string {
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-${style}@15.1.2/img/${style}/64/${unified}.png`;
}

const onErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};

export function EmojiText({ text, size = 20 }: { text?: string | null; size?: number }) {
  const style = useEmojiStyle((s) => s.style);
  const safe = typeof text === "string" ? text : "";

  const parts = useMemo<ReactNode[]>(() => {
    const text = safe;
    if (!text) return [];
    if (style === "native") return [text];
    const regex = emojiRegex();
    const out: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const unified = toUnified(m[0]);
      if (unified) {
        out.push(
          <img
            key={`e-${key++}`}
            src={emojiUrl(unified, style)}
            alt={m[0]}
            draggable={false}
            onError={onErr}
            style={{
              display: "inline-block",
              height: `${size}px`,
              width: `${size}px`,
              verticalAlign: "-0.2em",
              margin: "0 0.5px",
            }}
          />,
        );
      } else {
        out.push(m[0]);
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }, [text, style, size]);

  // Detect "jumbo" emoji-only short messages (like Instagram)
  const isJumbo = useMemo(() => {
    if (!safe) return false;
    const stripped = safe.replace(emojiRegex(), "").trim();
    if (stripped.length > 0) return false;
    const count = (safe.match(emojiRegex()) || []).length;
    return count > 0 && count <= 3;
  }, [safe]);

  if (isJumbo && style !== "native") {
    const regex = emojiRegex();
    const jumbo: ReactNode[] = [];
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = regex.exec(safe)) !== null) {
      const unified = toUnified(m[0]);
      if (unified) {
        jumbo.push(
          <img
            key={`j-${key++}`}
            src={emojiUrl(unified, style as Exclude<EmojiStyleKey, "native">)}
            alt={m[0]}
            draggable={false}
            onError={onErr}
            style={{ height: 56, width: 56, display: "inline-block" }}
          />,
        );
      }
    }
    return <span style={{ lineHeight: 1 }}>{jumbo}</span>;
  }
  if (isJumbo && style === "native") {
    return <span style={{ fontSize: 56, lineHeight: 1 }}>{safe}</span>;
  }

  return <>{parts}</>;
}

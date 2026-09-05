import type { ReactNode } from 'react';

const URL_RE = /(https?:\/\/[^\s)]+|http:\/\/bit\.ly\/[^\s)]+)/g;

export function linkifyText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE);
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const url = match[0].replace(/[.,;:!?]+$/, '');
    const trailing = match[0].slice(url.length);
    parts.push(
      <a
        key={`u-${i++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-sky-600 underline decoration-sky-200 underline-offset-2 hover:text-sky-700"
      >
        {url}
      </a>,
    );
    if (trailing) parts.push(trailing);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Description({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-600">
      {paragraphs.map((p, idx) => (
        <p key={idx} className="whitespace-pre-wrap">
          {linkifyText(p)}
        </p>
      ))}
    </div>
  );
}

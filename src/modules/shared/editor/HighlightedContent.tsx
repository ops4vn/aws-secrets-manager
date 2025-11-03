import { decodeBase64, isValidBase64 } from "../utils/base64Utils";

type Props = {
  content: string;
  wrap: boolean;
  isBinary: boolean;
  isDecoded: boolean;
};

export function HighlightedContent({ content, wrap, isBinary, isDecoded }: Props) {
  if (!content) return null;

  if (!isBinary) {
    try {
      const parsed = JSON.parse(content);
      const pretty = JSON.stringify(parsed, null, 2);
      return (
        <pre className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm ${wrap ? "whitespace-pre-wrap break-words" : ""}`}>
          {renderJsonHighlighted(pretty)}
        </pre>
      );
    } catch {}

    return (
      <pre className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm ${wrap ? "whitespace-pre-wrap break-words" : ""}`}>
        {content}
      </pre>
    );
  }

  if (isBinary) {
    if (isValidBase64(content)) {
      if (isDecoded) {
        try {
          const decodedContent = decodeBase64(content);
          return (
            <pre className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm ${wrap ? "whitespace-pre-wrap break-words" : ""}`}>
              {decodedContent}
            </pre>
          );
        } catch (error) {
          return (
            <pre className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm text-error ${wrap ? "whitespace-pre-wrap break-words" : ""}`}>
              Error decoding base64: {error instanceof Error ? error.message : "Unknown error"}
            </pre>
          );
        }
      }
      return (
        <pre className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-xs leading-5 ${wrap ? "whitespace-pre-wrap break-words" : ""}`}>
          {chunkBase64(content).map((seg, idx) => (
            <span key={idx} className={idx % 2 === 0 ? "text-primary" : "text-base-content/70"}>
              {seg}
            </span>
          ))}
        </pre>
      );
    }

    return (
      <pre className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-xs leading-5 ${wrap ? "whitespace-pre-wrap break-words" : ""}`}>
        {chunkBase64(content).map((seg, idx) => (
          <span key={idx} className={idx % 2 === 0 ? "text-primary" : "text-base-content/70"}>
            {seg}
          </span>
        ))}
      </pre>
    );
  }

  return null;
}

function renderJsonHighlighted(json: string) {
  const lines = json.split("\n");
  return (
    <code className="block font-mono">
      {lines.map((line, i) => (
        <div key={i}>{highlightJsonLine(line)}</div>
      ))}
    </code>
  );
}

function highlightJsonLine(line: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /(\s*".*?"\s*:)|(\".*?\")|(-?\b\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;
  for (let m; (m = regex.exec(line)); ) {
    if (m.index > lastIndex) {
      parts.push(
        <span key={parts.length}>{line.slice(lastIndex, m.index)}</span>
      );
    }
    const key = m[1];
    const str = m[2];
    const num = m[3];
    const boolnull = m[4];
    if (key)
      parts.push(
        <span key={parts.length} className="text-sky-600">
          {key}
        </span>
      );
    else if (str)
      parts.push(
        <span key={parts.length} className="text-emerald-600">
          {str}
        </span>
      );
    else if (num)
      parts.push(
        <span key={parts.length} className="text-amber-600">
          {num}
        </span>
      );
    else if (boolnull)
      parts.push(
        <span key={parts.length} className="text-fuchsia-600">
          {boolnull}
        </span>
      );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length)
    parts.push(<span key={parts.length}>{line.slice(lastIndex)}</span>);
  return parts;
}

function chunkBase64(s: string) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += 4) out.push(s.slice(i, i + 4));
  return out;
}

export default HighlightedContent;



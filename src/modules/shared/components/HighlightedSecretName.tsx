import { memo } from "react";

// Highlights environment keywords (dev/uat/staging/stg/prod) and the current
// search query inside a secret name. Shared by the right-panel search/tree and
// the global search dialog so highlighting stays consistent.

function getEnvStyleClass(text: string): string | null {
  const lowerText = text.toLowerCase();
  if (lowerText === "uat" || lowerText === "dev") {
    return "font-bold text-warning";
  } else if (lowerText === "staging" || lowerText === "stg") {
    return "font-bold text-info";
  } else if (lowerText === "prod") {
    return "font-bold text-error";
  }
  return null;
}

export const HighlightedSecretName = memo(function HighlightedSecretName({
  name,
  searchQuery,
}: {
  name: string;
  searchQuery: string;
}) {
  const envKeywords = "dev|uat|staging|stg|prod";
  const escapedQuery = searchQuery
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern = escapedQuery
    ? `(${envKeywords}|${escapedQuery})`
    : `(${envKeywords})`;
  const regex = new RegExp(pattern, "gi");

  const parts = name.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        const envClass = getEnvStyleClass(part);
        if (envClass) {
          return (
            <span key={index} className={envClass}>
              {part}
            </span>
          );
        }

        if (
          escapedQuery &&
          part.toLowerCase() === searchQuery.trim().toLowerCase()
        ) {
          return (
            <span
              key={index}
              className="text-primary font-semibold underline underline-offset-2"
            >
              {part}
            </span>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
});

export default HighlightedSecretName;

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({
  content,
  className = "",
  emptyLabel = "No description available.",
}: {
  content: string;
  className?: string;
  emptyLabel?: string;
}) {
  const normalized = content.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return <p className={`markdown-content markdown-content-empty ${className}`.trim()}>{emptyLabel}</p>;
  }

  return (
    <div className={`markdown-content ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children, ...props }) => (
            <a {...props} href={href} rel="noreferrer" target="_blank">
              {children}
            </a>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

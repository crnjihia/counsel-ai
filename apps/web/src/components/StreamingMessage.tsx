import React from "react";
import ReactMarkdown from "react-markdown";

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
  onPageClick?: (page: number) => void;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  isStreaming = false,
  onPageClick,
}) => {
  // Enhance citation rendering [p. N]
  const renderMarkdownWithCitations = (text: string) => {
    return text;
  };

  return (
    <div className="relative text-sm leading-relaxed text-slate-200">
      <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:text-slate-100 prose-strong:text-emerald-400 prose-ul:my-2 prose-li:my-0.5">
        <ReactMarkdown
          components={{
            // Intercept text nodes to make citations [p. N] clickable
            p: ({ children }) => {
              return (
                <p className="my-2">
                  {React.Children.map(children, (child) => {
                    if (typeof child === "string") {
                      const regex = /\[p\.\s*(\d+)\]/gi;
                      const parts = [];
                      let lastIndex = 0;
                      let match;

                      while ((match = regex.exec(child)) !== null) {
                        if (match.index > lastIndex) {
                          parts.push(child.substring(lastIndex, match.index));
                        }
                        const pageNum = parseInt(match[1], 10);
                        parts.push(
                          <button
                            key={`${match.index}-${pageNum}`}
                            onClick={(e) => {
                              e.preventDefault();
                              onPageClick?.(pageNum);
                            }}
                            className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 hover:text-white transition-colors cursor-pointer"
                            title={`Jump to Page ${pageNum}`}
                          >
                            [p. {pageNum}]
                          </button>
                        );
                        lastIndex = regex.lastIndex;
                      }

                      if (lastIndex < child.length) {
                        parts.push(child.substring(lastIndex));
                      }

                      return parts.length > 0 ? parts : child;
                    }
                    return child;
                  })}
                </p>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 align-middle animate-pulse" />
      )}
    </div>
  );
};

export default StreamingMessage;

import React, { useState } from "react";
import { Copy, Check, ChevronUp } from "lucide-react";

interface CodeViewerProps {
  code: string;
  language?: string;
  highlightedLine?: string | number | null;
  title?: string;
}

export function CodeViewer({
  code,
  language = "javascript",
  highlightedLine,
  title,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const lines = code.split("\n");

  // Determine if a line should be highlighted.
  const isLineHighlighted = (index: number) => {
    if (!highlightedLine) return false;
    const lineStr = String(highlightedLine).toLowerCase();
    const currLineNum = index + 1;

    // Check if line matches range (e.g., "14-18" or "14")
    if (lineStr.includes("-")) {
      const [start, end] = lineStr.split("-").map(Number);
      return currLineNum >= start && currLineNum <= end;
    }
    
    // Extract any integers from the string
    const match = lineStr.match(/\d+/);
    if (match) {
      return Number(match[0]) === currLineNum;
    }

    return false;
  };

  return (
    <div className="relative flex flex-col h-full bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden font-mono text-sm text-[#c9d1d9]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#21262d]">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#f56565]/80" />
            <span className="w-3 h-3 rounded-full bg-[#ed8936]/80" />
            <span className="w-3 h-3 rounded-full bg-[#48bb78]/80" />
          </div>
          <span className="text-xs text-[#8b949e] font-sans font-medium px-2 py-0.5 bg-[#21262d] rounded ml-2 uppercase">
            {language}
          </span>
          {title && (
            <span className="text-xs text-[#8b949e] italic font-sans max-w-[200px] truncate">
              {title}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          id="btn-copy-code"
          className="flex items-center space-x-1.5 py-1 px-2.5 rounded bg-[#21262d] hover:bg-[#30363d] text-xs font-sans text-gray-300 hover:text-white transition duration-150 border border-[#30363d] cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code contents with line numbers */}
      <div className="flex-1 overflow-auto p-4 leading-relaxed max-h-[600px]">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineText, idx) => {
              const highlighted = isLineHighlighted(idx);
              return (
                <tr
                  key={idx}
                  className={`group transition-colors duration-150 ${
                    highlighted
                      ? "bg-[#382c0c]/40 border-l-2 border-[#e3b341]"
                      : "hover:bg-[#161b22]/50"
                  }`}
                >
                  {/* Line Number */}
                  <td className="w-10 pr-4 text-right select-none text-[#484f58] border-r border-[#21262d] text-[11px] font-sans">
                    {idx + 1}
                  </td>
                  {/* Code Line Content */}
                  <td className="pl-4 whitespace-pre text-left align-middle break-all">
                    <span 
                      className={
                        highlighted 
                          ? "text-[#f8e3a1] font-semibold" 
                          : "text-[#c9d1d9]"
                      }
                    >
                      {lineText || " "}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

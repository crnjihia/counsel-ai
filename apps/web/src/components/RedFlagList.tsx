import React from "react";
import { useDocumentRedFlags } from "../hooks/useApi";
import { RedFlag } from "../api/client";
import { AlertCircle, AlertTriangle, Info, ArrowRight, BookOpen, Loader2 } from "lucide-react";

interface RedFlagListProps {
  documentId: number;
  onSelectFlag?: (page: number, text: string) => void;
}

export const RedFlagList: React.FC<RedFlagListProps> = ({ documentId, onSelectFlag }) => {
  const { data: redFlags, isLoading, error, refetch } = useDocumentRedFlags(documentId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <span className="text-sm font-medium">Scanning document for high-risk clauses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-950/40 border border-red-900/60 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-200 text-sm font-medium">Could not load red-flag analysis.</p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-4 py-1.5 text-xs font-semibold bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!redFlags || redFlags.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400">
        <p className="text-sm">No critical red flags detected in this agreement.</p>
      </div>
    );
  }

  const getSeverityBadge = (sev: string) => {
    const s = sev.toLowerCase();
    if (s === "high") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-300 border border-red-800/80 uppercase">
          <AlertCircle className="w-3 h-3 text-red-400" /> High Risk
        </span>
      );
    }
    if (s === "med" || s === "medium") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 uppercase">
          <AlertTriangle className="w-3 h-3 text-amber-400" /> Caution
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-800/80 uppercase">
        <Info className="w-3 h-3 text-blue-400" /> Advisory
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
        <span>Click any clause card to inspect its exact position in the PDF.</span>
        <span className="font-semibold text-slate-300">{redFlags.length} Clauses Flagged</span>
      </div>

      <div className="space-y-3">
        {redFlags.map((flag: RedFlag, idx: number) => (
          <div
            key={idx}
            onClick={() => onSelectFlag?.(flag.page, flag.clause_text)}
            className="group relative rounded-xl p-4 bg-slate-900/80 border border-slate-800 hover:border-amber-600/60 hover:bg-slate-900 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-950/20"
          >
            {/* Header: Severity & Page */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getSeverityBadge(flag.severity)}
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Page {flag.page}
                </span>
              </div>
              <button
                className="text-xs font-semibold text-slate-400 group-hover:text-amber-400 flex items-center gap-1 transition-colors"
                title="View in PDF"
              >
                Jump to p.{flag.page} <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Clause Excerpt */}
            <blockquote className="text-xs italic text-slate-300 border-l-2 border-slate-700 pl-3 py-1 my-2 bg-slate-950/40 rounded-r font-mono">
              "{flag.clause_text}"
            </blockquote>

            {/* Plain explanation */}
            <p className="text-sm text-slate-200 mt-2 font-medium leading-relaxed">
              {flag.explanation}
            </p>

            {/* Suggestion / Negotiation advice */}
            <div className="mt-3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-200">
              <span className="font-bold text-emerald-300">How to Negotiate: </span>
              {flag.suggestion}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RedFlagList;

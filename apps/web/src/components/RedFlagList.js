import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDocumentRedFlags } from "../hooks/useApi";
import { AlertCircle, AlertTriangle, Info, ArrowRight, BookOpen, Loader2 } from "lucide-react";
export const RedFlagList = ({ documentId, onSelectFlag }) => {
    const { data: redFlags, isLoading, error, refetch } = useDocumentRedFlags(documentId);
    if (isLoading) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center p-12 space-y-3 text-slate-400", children: [_jsx(Loader2, { className: "w-8 h-8 text-amber-400 animate-spin" }), _jsx("span", { className: "text-sm font-medium", children: "Scanning document for high-risk clauses..." })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "p-6 rounded-xl bg-red-950/40 border border-red-900/60 text-center", children: [_jsx(AlertCircle, { className: "w-8 h-8 text-red-400 mx-auto mb-2" }), _jsx("p", { className: "text-red-200 text-sm font-medium", children: "Could not load red-flag analysis." }), _jsx("button", { onClick: () => refetch(), className: "mt-3 px-4 py-1.5 text-xs font-semibold bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors", children: "Try Again" })] }));
    }
    if (!redFlags || redFlags.length === 0) {
        return (_jsx("div", { className: "p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400", children: _jsx("p", { className: "text-sm", children: "No critical red flags detected in this agreement." }) }));
    }
    const getSeverityBadge = (sev) => {
        const s = sev.toLowerCase();
        if (s === "high") {
            return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-300 border border-red-800/80 uppercase", children: [_jsx(AlertCircle, { className: "w-3 h-3 text-red-400" }), " High Risk"] }));
        }
        if (s === "med" || s === "medium") {
            return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 uppercase", children: [_jsx(AlertTriangle, { className: "w-3 h-3 text-amber-400" }), " Caution"] }));
        }
        return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-800/80 uppercase", children: [_jsx(Info, { className: "w-3 h-3 text-blue-400" }), " Advisory"] }));
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-slate-400 pb-1", children: [_jsx("span", { children: "Click any clause card to inspect its exact position in the PDF." }), _jsxs("span", { className: "font-semibold text-slate-300", children: [redFlags.length, " Clauses Flagged"] })] }), _jsx("div", { className: "space-y-3", children: redFlags.map((flag, idx) => (_jsxs("div", { onClick: () => onSelectFlag?.(flag.page, flag.clause_text), className: "group relative rounded-xl p-4 bg-slate-900/80 border border-slate-800 hover:border-amber-600/60 hover:bg-slate-900 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-950/20", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [getSeverityBadge(flag.severity), _jsxs("span", { className: "text-xs font-medium text-slate-400 flex items-center gap-1", children: [_jsx(BookOpen, { className: "w-3.5 h-3.5 text-slate-500" }), " Page ", flag.page] })] }), _jsxs("button", { className: "text-xs font-semibold text-slate-400 group-hover:text-amber-400 flex items-center gap-1 transition-colors", title: "View in PDF", children: ["Jump to p.", flag.page, " ", _jsx(ArrowRight, { className: "w-3 h-3" })] })] }), _jsxs("blockquote", { className: "text-xs italic text-slate-300 border-l-2 border-slate-700 pl-3 py-1 my-2 bg-slate-950/40 rounded-r font-mono", children: ["\"", flag.clause_text, "\""] }), _jsx("p", { className: "text-sm text-slate-200 mt-2 font-medium leading-relaxed", children: flag.explanation }), _jsxs("div", { className: "mt-3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-200", children: [_jsx("span", { className: "font-bold text-emerald-300", children: "How to Negotiate: " }), flag.suggestion] })] }, idx))) })] }));
};
export default RedFlagList;

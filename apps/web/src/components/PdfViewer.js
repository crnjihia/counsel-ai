import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertTriangle, FileText } from "lucide-react";
// Configure pdfjs worker to reliable CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
export const PdfViewer = ({ fileUrl, targetPage, highlightText, onPageChange, }) => {
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.1);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const containerRef = useRef(null);
    // Synchronize targetPage changes from red flags or citations
    useEffect(() => {
        if (targetPage && targetPage >= 1 && (!numPages || targetPage <= numPages)) {
            setCurrentPage(targetPage);
        }
    }, [targetPage, numPages]);
    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
        if (targetPage && targetPage <= numPages) {
            setCurrentPage(targetPage);
        }
    };
    const onDocumentLoadError = (err) => {
        console.error("PDF load error:", err);
        setLoadError("Failed to load PDF document.");
        setLoading(false);
    };
    const goToPrevPage = () => {
        if (currentPage > 1) {
            const p = currentPage - 1;
            setCurrentPage(p);
            onPageChange?.(p);
        }
    };
    const goToNextPage = () => {
        if (currentPage < numPages) {
            const p = currentPage + 1;
            setCurrentPage(p);
            onPageChange?.(p);
        }
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-slate-300 text-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FileText, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { className: "font-medium text-white", children: "Document Viewer" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60", children: [_jsx("button", { id: "prev-pdf-page-btn", onClick: goToPrevPage, disabled: currentPage <= 1, className: "p-1 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors", title: "Previous Page", children: _jsx(ChevronLeft, { className: "w-4 h-4" }) }), _jsxs("span", { className: "text-xs font-semibold px-2 text-slate-200", children: ["Page ", currentPage, " of ", numPages || "..."] }), _jsx("button", { id: "next-pdf-page-btn", onClick: goToNextPage, disabled: currentPage >= numPages, className: "p-1 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors", title: "Next Page", children: _jsx(ChevronRight, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60", children: [_jsx("button", { onClick: () => setScale((s) => Math.max(0.6, s - 0.15)), className: "p-1 hover:text-white transition-colors", title: "Zoom Out", children: _jsx(ZoomOut, { className: "w-4 h-4" }) }), _jsxs("span", { className: "text-xs px-1 text-slate-400", children: [Math.round(scale * 100), "%"] }), _jsx("button", { onClick: () => setScale((s) => Math.min(2.0, s + 0.15)), className: "p-1 hover:text-white transition-colors", title: "Zoom In", children: _jsx(ZoomIn, { className: "w-4 h-4" }) })] })] })] }), highlightText && (_jsxs("div", { className: "px-4 py-2 bg-amber-950/40 border-b border-amber-800/40 text-amber-200 text-xs flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2 truncate", children: [_jsx(AlertTriangle, { className: "w-3.5 h-3.5 text-amber-400 shrink-0" }), _jsxs("span", { className: "font-semibold text-amber-300", children: ["Target Clause (p. ", currentPage, "):"] }), _jsx("span", { className: "italic truncate", children: highlightText })] }), _jsx("span", { className: "text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded uppercase font-bold shrink-0", children: "Referenced" })] })), _jsx("div", { ref: containerRef, className: "flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/50", children: loadError ? (_jsxs("div", { className: "text-center p-8 text-red-400 text-sm", children: [_jsx("p", { children: loadError }), _jsx("p", { className: "text-xs text-slate-500 mt-2", children: "Check document upload status" })] })) : (_jsx(Document, { file: fileUrl, onLoadSuccess: onDocumentLoadSuccess, onLoadError: onDocumentLoadError, loading: _jsxs("div", { className: "flex flex-col items-center justify-center p-12 space-y-3 text-slate-400", children: [_jsx("div", { className: "w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-sm", children: "Rendering PDF pages..." })] }), children: _jsx(Page, { pageNumber: currentPage, scale: scale, renderTextLayer: false, renderAnnotationLayer: false, className: "transition-transform duration-200" }) })) })] }));
};
export default PdfViewer;

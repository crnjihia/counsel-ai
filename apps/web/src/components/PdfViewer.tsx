import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertTriangle, FileText } from "lucide-react";

// Configure pdfjs worker to reliable CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
  targetPage?: number;
  highlightText?: string;
  onPageChange?: (page: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  fileUrl,
  targetPage,
  highlightText,
  onPageChange,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize targetPage changes from red flags or citations
  useEffect(() => {
    if (targetPage && targetPage >= 1 && (!numPages || targetPage <= numPages)) {
      setCurrentPage(targetPage);
    }
  }, [targetPage, numPages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    if (targetPage && targetPage <= numPages) {
      setCurrentPage(targetPage);
    }
  };

  const onDocumentLoadError = (err: Error) => {
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

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-slate-300 text-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-white">Document Viewer</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            <button
              id="prev-pdf-page-btn"
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-200">
              Page {currentPage} of {numPages || "..."}
            </span>
            <button
              id="next-pdf-page-btn"
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
              className="p-1 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs px-1 text-slate-400">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
              className="p-1 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Highlight alert if clause is selected */}
      {highlightText && (
        <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-800/40 text-amber-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300">Target Clause (p. {currentPage}):</span>
            <span className="italic truncate">{highlightText}</span>
          </div>
          <span className="text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded uppercase font-bold shrink-0">
            Referenced
          </span>
        </div>
      )}

      {/* PDF Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/50"
      >
        {loadError ? (
          <div className="text-center p-8 text-red-400 text-sm">
            <p>{loadError}</p>
            <p className="text-xs text-slate-500 mt-2">Check document upload status</p>
          </div>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center p-12 space-y-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Rendering PDF pages...</span>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="transition-transform duration-200"
            />
          </Document>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;

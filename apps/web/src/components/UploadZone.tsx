import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { documentApi } from "../api/client";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onUploadComplete?: (id: number) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("Please upload a valid PDF document (.pdf).");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setProgress(10);

      const doc = await documentApi.upload(file, 1, (pct) => {
        setProgress(pct);
      });

      setProgress(100);
      if (onUploadComplete) {
        onUploadComplete(doc.id);
      } else {
        navigate(`/documents/${doc.id}`);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to upload document.";
      setError(detail);
      setIsUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
          isDragActive
            ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-900/20"
            : "border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900/80"
        } ${isUploading ? "opacity-90 pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-300">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">
              {isDragActive ? "Drop your PDF here..." : "Upload your Kenyan legal document"}
            </h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              Drag & drop non-disclosure agreements, commercial leases, tenancy agreements, or employment contracts.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>PDF format only (up to 25MB)</span>
          </div>

          {isUploading && (
            <div className="w-full max-w-md mt-4 space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span>Extracting clauses with pdfplumber...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Upload failed:</span> {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;

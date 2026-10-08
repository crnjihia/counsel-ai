import React from "react";
import { Link } from "react-router-dom";
import UploadZone from "../components/UploadZone";
import { useDocuments } from "../hooks/useApi";
import {
  Scale,
  ShieldAlert,
  FileCheck2,
  MessageSquareText,
  Clock,
  ArrowRight,
  Sparkles,
  BarChart3,
} from "lucide-react";

export const HomePage: React.FC = () => {
  const { data: documents, isLoading } = useDocuments();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">Counsel AI</span>
            <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 uppercase font-semibold">
              Kenyan SMEs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/usage"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700/80 hover:border-slate-600 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Token Usage</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="text-center max-w-3xl space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI Legal & Commercial Document Assistant</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Protect your Kenyan business before you sign.
          </h1>

          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Upload non-disclosure agreements, commercial leases, tenancy contracts, or supplier agreements.
            Get plain-English summaries, red flags with page references, and lawyer-ready questions.
          </p>

          <div className="pt-2 text-xs text-amber-300/80 bg-amber-950/30 border border-amber-900/40 rounded-xl py-2 px-4 inline-block">
            ⚖️ <strong>Legal Notice:</strong> Counsel is an AI assistant, not an Advocate of the High Court of Kenya. Information is for negotiation preparation.
          </div>
        </div>

        {/* Upload Zone */}
        <div className="w-full mb-16">
          <UploadZone />
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full mb-16">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Plain-English Summaries</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decodes dense legal jargon into straightforward business terms, parties, and obligations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Red-Flag Highlighting</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pins predatory liability clauses, unilateral termination terms, and non-competes to exact pages.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Ask Your Lawyer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides 5–10 high-impact questions to ask an advocate to slash legal consultation costs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Multi-Turn Streaming Chat</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interactive consultation with document memory and citation-aware page jumping.
            </p>
          </div>
        </div>

        {/* Recent Documents Section */}
        {documents && documents.length > 0 && (
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Recently Uploaded Documents
              </h3>
              <span className="text-xs text-slate-400">{documents.length} available</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all flex items-center justify-between group shadow-md"
                >
                  <div className="truncate mr-4">
                    <h4 className="text-sm font-medium text-white group-hover:text-emerald-400 truncate transition-colors">
                      {doc.filename}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-1">
                      {doc.preview || `${doc.page_count} pages`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 group-hover:text-emerald-400 transition-colors">
                    <span className="text-xs">{doc.page_count}p</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
        <p>Counsel AI — Empowering Kenyan Micro, Small & Medium Enterprises with Legal Document Intelligence</p>
      </footer>
    </div>
  );
};

export default HomePage;

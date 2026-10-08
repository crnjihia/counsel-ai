import React, { useState, Suspense, lazy } from "react";
import { useParams, Link } from "react-router-dom";
import { useDocument, useDocumentSummary, useDocumentQuestions, useDocumentConversation } from "../hooks/useApi";
import RedFlagList from "../components/RedFlagList";
import ChatPanel from "../components/ChatPanel";
import {
  FileText,
  FileCheck,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
  Scale,
  Copy,
  Check,
  Loader2,
  Calendar,
  Users,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

// Code-split heavy react-pdf component
const PdfViewer = lazy(() => import("../components/PdfViewer"));

export const DocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const docId = Number(id);

  const { data: doc, isLoading: isLoadingDoc, error: docError } = useDocument(docId);
  const { data: conv } = useDocumentConversation(docId);

  // Active tab state: 'summary' | 'red-flags' | 'questions' | 'chat'
  const [activeTab, setActiveTab] = useState<"summary" | "red-flags" | "questions" | "chat">("summary");
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [highlightText, setHighlightText] = useState<string>("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Queries for Summary and Questions
  const { data: summary, isLoading: isLoadingSummary } = useDocumentSummary(docId);
  const { data: questions, isLoading: isLoadingQuestions } = useDocumentQuestions(docId);

  const handleSelectFlag = (page: number, text: string) => {
    setSelectedPage(page);
    setHighlightText(text);
  };

  const handleCopyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isLoadingDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium">Loading document and legal extracts...</p>
        </div>
      </div>
    );
  }

  if (docError || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Document Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">
            The requested document could not be retrieved. Please check the ID or upload a new agreement.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Upload
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm md:text-base truncate max-w-xs md:max-w-md">
                {doc.filename}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {doc.page_count} {doc.page_count === 1 ? "Page" : "Pages"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Kenyan SME Document Review</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/usage"
            className="text-xs text-slate-300 hover:text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-colors"
          >
            Token Usage
          </Link>
        </div>
      </header>

      {/* Mandatory Kenyan Legal Disclaimer Banner */}
      <div className="bg-amber-950/40 border-b border-amber-900/40 px-4 py-1.5 text-center text-[11px] text-amber-200/90 flex items-center justify-center gap-2">
        <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          <strong>Legal Disclaimer:</strong> Counsel is an AI legal assistant, not an advocate of the High Court of Kenya. Information provided is for negotiation preparation and SME guidance only.
        </span>
      </div>

      {/* Main Two-Pane Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 md:p-4 gap-4">
        {/* Left Pane: PDF Viewer */}
        <div className="lg:w-1/2 h-[500px] lg:h-[calc(100vh-8.5rem)] flex flex-col">
          <Suspense
            fallback={
              <div className="h-full rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center text-slate-400 text-sm">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-emerald-400" />
                Loading PDF Engine...
              </div>
            }
          >
            <PdfViewer
              fileUrl={doc.fileUrl || `/api/documents/${doc.id}/file`}
              targetPage={selectedPage}
              highlightText={highlightText}
              onPageChange={(p) => setSelectedPage(p)}
            />
          </Suspense>
        </div>

        {/* Right Pane: Tabs & Analysis */}
        <div className="lg:w-1/2 h-[600px] lg:h-[calc(100vh-8.5rem)] flex flex-col bg-slate-900/70 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* Tabs Navigation Header */}
          <div className="flex border-b border-slate-800 bg-slate-900/90 p-1.5 gap-1 shrink-0">
            <button
              id="tab-summary-btn"
              onClick={() => setActiveTab("summary")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === "summary"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Summary</span>
            </button>

            <button
              id="tab-redflags-btn"
              onClick={() => setActiveTab("red-flags")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === "red-flags"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Red Flags</span>
            </button>

            <button
              id="tab-questions-btn"
              onClick={() => setActiveTab("questions")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === "questions"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Ask Lawyer</span>
            </button>

            <button
              id="tab-chat-btn"
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === "chat"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Clarification Chat</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Tab 1: Summary */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                {isLoadingSummary ? (
                  <div className="p-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium">Extracting plain-English summary for SME owner...</p>
                  </div>
                ) : summary ? (
                  <div className="space-y-5">
                    {/* Plain English summary */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                        Plain-English Overview
                      </h4>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {summary.plain_summary}
                      </p>
                    </div>

                    {/* Parties & Term */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Parties Involved</span>
                        </div>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {summary.parties.map((p, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>Term / Duration</span>
                        </div>
                        <p className="text-xs text-slate-300">{summary.term}</p>
                      </div>
                    </div>

                    {/* Key Obligations */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Key SME Obligations
                      </h4>
                      <ul className="text-xs text-slate-300 space-y-2">
                        {summary.obligations.map((ob, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{ob}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Commercial Risks */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-900/30">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Commercial Risks to Watch
                      </h4>
                      <ul className="text-xs text-slate-300 space-y-2">
                        {summary.risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 text-slate-400 text-sm">
                    No summary available.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Red Flags */}
            {activeTab === "red-flags" && (
              <RedFlagList documentId={docId} onSelectFlag={handleSelectFlag} />
            )}

            {/* Tab 3: Questions */}
            {activeTab === "questions" && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400 pb-1">
                  Questions specifically prepared for an Advocate of the High Court of Kenya prior to signing:
                </div>

                {isLoadingQuestions ? (
                  <div className="p-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium">Generating prioritized questions for your lawyer...</p>
                  </div>
                ) : questions && questions.length > 0 ? (
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-blue-400">Q{idx + 1}</span>
                              <h5 className="text-sm font-semibold text-white">
                                {q.question}
                              </h5>
                            </div>
                            {q.why_it_matters && (
                              <p className="text-xs text-slate-400 italic pl-5">
                                Why it matters: {q.why_it_matters}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleCopyQuestion(q.question, idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                            title="Copy Question"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-slate-400 text-sm">
                    No questions available.
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Clarification Chat */}
            {activeTab === "chat" && (
              <div className="h-full">
                {conv ? (
                  <ChatPanel
                    conversationId={conv.id}
                    onPageClick={(p) => setSelectedPage(p)}
                  />
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Connecting to Counsel session...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPage;

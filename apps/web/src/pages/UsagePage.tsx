import React from "react";
import { Link } from "react-router-dom";
import UsageMeter from "../components/UsageMeter";
import { ArrowLeft, Shield, Cpu, Scale } from "lucide-react";

export const UsagePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">Observability & Usage Controls</h1>
            <p className="text-xs text-slate-400">Token Tracking, Cost Estimation & Rate Quotas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full">
          <Cpu className="w-3.5 h-3.5" />
          <span>Claude 3.5 Sonnet Engine</span>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Daily & Monthly Consumption</h2>
          <p className="text-sm text-slate-400 mt-1">
            Mshauri AI enforces strict per-user daily token caps (100,000 tokens) to eliminate unexpected LLM cost spikes.
          </p>
        </div>

        {/* Usage Meter Component */}
        <UsageMeter />

        {/* Informational Guidance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Cost Transparency</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every summary, red-flag analysis, and chat turn is tracked and measured using tiktoken encoders and logged to the UsageLog table. Costs reflect current Anthropic API pricing ($3.00/M input, $15.00/M output).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>SME Friendly Quotas</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The default 100,000 daily token cap supports approximately 15–20 comprehensive document analyses per day, sufficient for active Kenyan enterprise operations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UsagePage;

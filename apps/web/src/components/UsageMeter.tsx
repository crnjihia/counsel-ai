import React from "react";
import { useUsage } from "../hooks/useApi";
import { Gauge, DollarSign, Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export const UsageMeter: React.FC = () => {
  const { data: usage, isLoading, error } = useUsage();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        <Activity className="w-6 h-6 animate-pulse mx-auto mb-2 text-emerald-400" />
        Loading token usage metrics...
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-center text-sm">
        Could not retrieve real-time token metrics.
      </div>
    );
  }

  const percentUsed = Math.min(
    100,
    Math.round((usage.daily_tokens_used / (usage.daily_token_cap || 100000)) * 100)
  );

  const isNearCap = percentUsed >= 80;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Token Gauge */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider">Today's Token Quota</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {usage.daily_tokens_used.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">
              / {usage.daily_token_cap.toLocaleString()}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                isNearCap ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{percentUsed}% consumed</span>
            <span>Resets daily at 00:00 UTC</span>
          </div>
        </div>

        {/* Monthly Tokens */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider">Month to Date Tokens</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {usage.total_tokens_month.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Aggregated input & output Claude tokens
          </p>
        </div>

        {/* Estimated Cost */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider">Estimated Cost</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ${usage.total_cost_usd_month.toFixed(4)}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Calculated at Claude 3.5 Sonnet token rates
          </p>
        </div>
      </div>

      {isNearCap && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center gap-3 text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            You have used {percentUsed}% of your daily quota. Once reaching 100,000 tokens, API requests will temporarily pause until tomorrow.
          </span>
        </div>
      )}

      {/* Activity Log Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" /> Recent API Invocations
          </h3>
          <span className="text-xs text-slate-400">{usage.logs.length} logged calls</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Endpoint</th>
                <th className="px-4 py-3 font-semibold">Input Tokens</th>
                <th className="px-4 py-3 font-semibold">Output Tokens</th>
                <th className="px-4 py-3 font-semibold">Cost (USD)</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {usage.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                    No API usage logged yet.
                  </td>
                </tr>
              ) : (
                usage.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-emerald-400">{log.endpoint}</td>
                    <td className="px-4 py-3">{log.tokens_in.toLocaleString()}</td>
                    <td className="px-4 py-3">{log.tokens_out.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono">${log.cost_usd.toFixed(6)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsageMeter;

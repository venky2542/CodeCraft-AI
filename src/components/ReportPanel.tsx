import React, { useState } from "react";
import Markdown from "react-markdown";
import { ReviewReport, Vulnerability, Optimization } from "../types";
import { ShieldAlert, Shield, Zap, RefreshCw, FileCode, CheckCircle2, AlertTriangle, Info, Copy, Check } from "lucide-react";
import { CodeViewer } from "./CodeViewer";

interface ReportPanelProps {
  report: ReviewReport;
  reviewer: string;
  watsonx_active: boolean;
  onSelectVulnerabilityLine: (line: string | null) => void;
  selectedLine: string | number | null;
  originalCode: string;
}

export function ReportPanel({
  report,
  reviewer,
  watsonx_active,
  onSelectVulnerabilityLine,
  selectedLine,
  originalCode,
}: ReportPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "vulnerabilities" | "optimizations" | "refactored">("overview");
  const [copied, setCopied] = useState(false);

  // Safely extract arrays with defaults if LLM did not pack them or structure differed
  const vulnerabilities = report.vulnerabilities || [];
  const optimizations = report.optimizations || [];

  const handleCopyRefactored = async () => {
    try {
      await navigator.clipboard.writeText(report.refactoredCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  // Map severity levels to appropriate styling
  const getSeverityBadge = (severity: string) => {
    const s = severity.trim().toLowerCase();
    if (s.includes("high")) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ffebe9] text-[#ff3333] border border-[#ff3333]/20">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>High Severity</span>
        </span>
      );
    } else if (s.includes("medium")) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fff8e6] text-[#b07d00] border border-[#b07d00]/20">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Medium Severity</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ddf4ff] text-[#0969da] border border-[#0969da]/20">
          <Info className="w-3.5 h-3.5" />
          <span>Low Severity</span>
        </span>
      );
    }
  };

  // Map optimization categories to appropriate styling
  const getCategoryBadge = (category: string) => {
    const c = category.trim().toLowerCase();
    if (c.includes("performance") || c.includes("speed")) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30">
          <Zap className="w-3 h-3" />
          <span>Speed</span>
        </span>
      );
    } else if (c.includes("smell") || c.includes("clean")) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
          <Shield className="w-3 h-3" />
          <span>Code Smell</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span>Standards</span>
        </span>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl">
      
      {/* Model attribution header */}
      <div className="flex flex-wrap items-center justify-between dark:bg-[#161b22] px-6 py-4 border-b border-[#30363d] gap-3">
        <div>
          <h3 className="text-base font-semibold text-white font-display">Code Audit Report</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Analyzed securely under server encryption
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold font-mono bg-[#21262d] px-2.5 py-1 rounded-md border border-[#30363d]">
            Engine: {reviewer}
          </span>
          {watsonx_active ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="flex bg-[#0d1117] border-b border-[#21262d] px-2 overflow-x-auto select-none scrollbar-none">
        <button
          onClick={() => { setActiveTab("overview"); onSelectVulnerabilityLine(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "border-[#ea4aaa] text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Overview Report
        </button>
        <button
          onClick={() => { setActiveTab("vulnerabilities"); onSelectVulnerabilityLine(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition duration-200 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
            activeTab === "vulnerabilities"
              ? "border-[#ea4aaa] text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <span>Vulnerability Analysis</span>
          {vulnerabilities.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-[#ff3333]/20 text-[#ff3333] font-bold rounded-full border border-red-500/10 scale-90">
              {vulnerabilities.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("optimizations"); onSelectVulnerabilityLine(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition duration-200 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
            activeTab === "optimizations"
              ? "border-[#ea4aaa] text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <span>Performance & Cleanups</span>
          {optimizations.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 font-bold rounded-full scale-90">
              {optimizations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("refactored"); onSelectVulnerabilityLine(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition duration-200 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
            activeTab === "refactored"
              ? "border-[#ea4aaa] text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <span>Refactored Code</span>
        </button>
      </div>

      {/* Pane content container */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#0d1117] min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-6 text-[#c9d1d9] prose prose-invert max-w-none">
            {/* Executive summary block */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-900/30 relative overflow-hidden backdrop-blur-sm">
              <h4 className="text-white text-base font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                Executive Summary
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed font-sans">{report.summary}</p>
            </div>

            {/* Markdown details */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 font-sans">
              <h4 className="text-white text-base font-semibold mb-4 pb-2 border-b border-[#21262d]">Detailed Review Log</h4>
              <div className="markdown-body text-sm leading-relaxed text-gray-300 space-y-4">
                <Markdown>{report.explanation}</Markdown>
              </div>
            </div>
          </div>
        )}

        {activeTab === "vulnerabilities" && (
          <div className="space-y-4">
            {vulnerabilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-12 h-12 text-[#44e397] mb-3" />
                <h4 className="text-white font-semibold">No Secure Exploits Detected</h4>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  The AI reviewed the file structure and found zero matching patterns representing severe OWASP vulnerabilities.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-2 font-sans">
                  💡 Hint: Select any card to target and highlight the exact error block in the original code on your left.
                </p>
                {vulnerabilities.map((vuln, i) => {
                  const isSelected = selectedLine === vuln.line;
                  return (
                    <div
                      key={i}
                      onClick={() => onSelectVulnerabilityLine(vuln.line)}
                      className={`group p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-[#2c1d1a]/50 border-[#f85149] shadow-lg translate-x-1"
                          : "bg-[#161b22] border-[#30363d] hover:border-red-500/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
                        <h4 className="text-white font-semibold text-sm group-hover:text-red-400 transition-colors font-sans">{vuln.pattern}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono text-gray-400 bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                            Line: {vuln.line || "N/A"}
                          </span>
                          {getSeverityBadge(vuln.severity)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 mb-3 font-sans leading-relaxed">
                        {vuln.description}
                      </p>
                      <div className="p-3 rounded-lg bg-[#0d1117]/80 text-xs text-slate-300 border border-[#21262d]">
                        <strong className="text-indigo-400 font-sans block mb-1">Recommendation Fix:</strong>
                        <span className="font-sans leading-relaxed">{vuln.recommendation}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeTab === "optimizations" && (
          <div className="space-y-4">
            {optimizations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Zap className="w-12 h-12 text-yellow-500 mb-3" />
                <h4 className="text-white font-semibold flex items-center space-x-1.5">No Optimization Issues Marked</h4>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  The syntax follows clean architecture patterns, demonstrating robust memory limits and efficiency.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-2 font-sans">
                  The model identified the following opportunities to clean dependencies and structural patterns:
                </p>
                {optimizations.map((opt, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300 font-semibold font-sans">{opt.issue}</span>
                      {getCategoryBadge(opt.category)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 pt-1.5">
                      <div className="p-3 rounded-lg bg-[#0d1117] border border-[#21262d] text-xs">
                        <strong className="text-emerald-400 block mb-1 font-sans">Actionable Fix:</strong>
                        <span className="text-gray-300 font-mono text-[11px] block overflow-x-auto whitespace-pre-wrap">{opt.suggestion}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0d1117] border border-[#21262d] text-xs">
                        <strong className="text-[#a5d6ff] block mb-1 font-sans">Performance Outcome:</strong>
                        <span className="text-gray-300 font-sans leading-relaxed">{opt.benefit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "refactored" && (
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h4 className="text-white font-semibold text-sm font-sans">Refactored Code Output</h4>
                <p className="text-xs text-gray-400 font-sans">The recommended production version with active fixes implemented.</p>
              </div>
              <button
                onClick={handleCopyRefactored}
                className="flex items-center space-x-1 py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs text-white rounded-lg transition duration-200 shadow-md cursor-pointer font-sans"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Whole File"}</span>
              </button>
            </div>
            
            <div className="flex-1 bg-[#0d1117] rounded-xl overflow-hidden min-h-[300px]">
              <CodeViewer
                code={report.refactoredCode || "// Refactored content could not be unpacked"}
                language="typescript"
                title="CodeCraft AI Recommended Architecture"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

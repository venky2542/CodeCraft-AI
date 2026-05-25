import React, { useState, useEffect, useRef } from "react";

// For standalone export portability, code highlight and copy capabilities are built-in elegantly.
const LANGUAGES = [
  "Auto-Detect",
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "Go",
  "Rust",
  "HTML",
  "CSS",
  "SQL",
  "Shell Script"
];

export default function App() {
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("snippet.py");
  const [selectedLanguage, setSelectedLanguage] = useState("Auto-Detect");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorStatus, setErrorStatus] = useState(null);
  const [reviewResult, setReviewResult] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedLine, setSelectedLine] = useState(null);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedRefactored, setCopiedRefactored] = useState(false);

  // Sync scroll refs
  const lineNoRef = useRef(null);
  const textareaRef = useRef(null);

  const steps = [
    "Analyzing syntax & modules...",
    "Scanning dependencies...",
    "Running OWASP Top 10 script rules...",
    "Mapping logic performance profiles...",
    "Implementing custom refactorings...",
    "Packaging analysis report..."
  ];

  const syncScroll = () => {
    if (textareaRef.current && lineNoRef.current) {
      lineNoRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineNumbers = code.split("\n").map((_, i) => i + 1);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setErrorStatus("File is too large. Max 2MB allowed.");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCode(event.target.result);
          setErrorStatus(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const executeReview = async () => {
    if (!code.trim()) {
      setErrorStatus("Provide some code text or upload a file first.");
      return;
    }

    setIsAnalyzing(true);
    setErrorStatus(null);
    setLoadingStep(0);
    setReviewResult(null);

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          fileName: fileName,
          language: selectedLanguage
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || "Auditing process was interrupted.");
      }

      const resJson = await response.json();
      setReviewResult(resJson);
    } catch (err) {
      setErrorStatus(err.message || "Failed to contact CodeCraft AI Review engine.");
    } finally {
      clearInterval(interval);
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setReviewResult(null);
    setCode("");
    setFileName("snippet.py");
    setSelectedLanguage("Auto-Detect");
    setErrorStatus(null);
    setSelectedLine(null);
  };

  const handleCopyOriginal = async () => {
    await navigator.clipboard.writeText(code);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2000);
  };

  const handleCopyRefactored = async () => {
    if (reviewResult?.report?.refactoredCode) {
      await navigator.clipboard.writeText(reviewResult.report.refactoredCode);
      setCopiedRefactored(true);
      setTimeout(() => setCopiedRefactored(false), 2000);
    }
  };

  const isLineHighlighted = (index) => {
    if (!selectedLine) return false;
    const lineStr = String(selectedLine).toLowerCase();
    const currLineNum = index + 1;

    if (lineStr.includes("-")) {
      const [start, end] = lineStr.split("-").map(Number);
      return currLineNum >= start && currLineNum <= end;
    }
    const match = lineStr.match(/\d+/);
    return match ? Number(match[0]) === currLineNum : false;
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }} className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col">
      {/* Navbar header */}
      <header className="border-b border-[#21262d] bg-[#161b22] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-purple-600 to-indigo-600 p-2 rounded-xl text-white font-bold text-sm">
            CC
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white font-sans">
              CodeCraft AI
            </span>
            <span className="ml-2 text-[10px] text-indigo-400 font-mono bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded-full">
              Standalone React App
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col justify-start">
        {errorStatus && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/20 rounded-xl text-xs text-red-300">
            <strong>Review Operation Halted:</strong> {errorStatus}
          </div>
        )}

        {/* Form Input Frame */}
        {!reviewResult && !isAnalyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Upload Code Document
                </h3>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center ${
                    isDragActive ? "border-indigo-500 bg-indigo-500/5" : "border-[#30363d] bg-[#0d1117]"
                  }`}
                >
                  <span className="text-xl block mb-2">📁</span>
                  <p className="text-xs text-gray-300 font-semibold">Drag & Drop file to start</p>
                  <label className="inline-block mt-4 cursor-pointer px-3 py-1 bg-[#21262d] text-[11px] rounded hover:bg-[#30363d]">
                    Browse File
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFileName(e.target.files[0].name);
                          const r = new FileReader();
                          r.onload = (ev) => ev.target?.result && setCode(ev.target.result);
                          r.readAsText(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Target Language
                </h3>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs text-gray-300 focus:outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input Editor */}
            <div className="lg:col-span-8 bg-[#161b22] border border-[#21262d] rounded-2xl p-5 flex flex-col">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Source Code Editor
              </h3>
              <div className="relative flex flex-1 min-h-[350px] bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden font-mono text-xs">
                <div ref={lineNoRef} className="w-10 bg-[#0d1117] border-r border-[#21262d] text-right py-3.5 pr-2.5 text-gray-600 select-none overflow-y-hidden">
                  {lineNumbers.map((num) => (
                    <div key={num} className="h-5 leading-5">{num}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onScroll={syncScroll}
                  placeholder="// Paste scripts to audit logic vulnerabilities..."
                  className="flex-1 bg-transparent border-0 outline-none resize-none px-4 py-3.5 text-[#c9d1d9] leading-5 focus:ring-0 placeholder:text-gray-700 font-mono"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={executeReview}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow"
                >
                  Analyze Code Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loader Panel */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-20 max-w-sm mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4" />
            <h4 className="font-semibold text-white">Running Analysis pipeline...</h4>
            <span className="text-xs text-indigo-400 font-mono mt-1">{steps[loadingStep]}</span>
          </div>
        )}

        {/* Report Output results */}
        {reviewResult && !isAnalyzing && (
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-[#161b22] border border-[#21262d] rounded-2xl">
              <div>
                <h4 className="text-sm font-semibold text-white">Audit Operations Finalized</h4>
                <p className="text-xs text-gray-400">{reviewResult.fileName}</p>
              </div>
              <button onClick={handleReset} className="px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded hover:bg-[#30363d] text-xs text-white">
                Re-Audit
              </button>
            </div>

            {/* Side-by-Side Outputs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch font-sans">
              
              {/* Left pane: Original code highlights */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center pb-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-gray-500">Original script file</span>
                  <button onClick={handleCopyOriginal} className="text-[10px] text-gray-400 hover:text-white bg-[#21262d] px-2 py-0.5 rounded">
                    {copiedOriginal ? "Copied!" : "Copy Code"}
                  </button>
                </div>
                <div className="flex-1 bg-[#0d1117] border border-[#21262d] rounded-xl overflow-auto p-4 font-mono text-xs max-h-[500px]">
                  <table className="w-full">
                    <tbody>
                      {code.split("\n").map((line, idx) => {
                        const hl = isLineHighlighted(idx);
                        return (
                          <tr key={idx} className={hl ? "bg-[#382c0c]/40 border-l-2 border-yellow-500" : ""}>
                            <td className="w-8 pr-3 text-right select-none text-gray-600 border-r border-[#21262d] text-[10px]">{idx + 1}</td>
                            <td className="pl-3 whitespace-pre text-[#c9d1d9]">{line || " "}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right pane: Organized evaluation reports */}
              <div className="flex flex-col bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden shadow">
                <div className="flex bg-[#161b22] border-b border-[#21262d] text-xs">
                  {["overview", "vulnerabilities", "optimizations", "refactored"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`px-4 py-3 cursor-pointer capitalize font-semibold ${
                        activeTab === t ? "border-b-2 border-indigo-500 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="p-5 flex-1 min-h-[300px] overflow-y-auto text-xs">
                  {activeTab === "overview" && (
                    <div className="space-y-4">
                      <div className="bg-indigo-950/20 p-3 rounded border border-indigo-900/30 text-gray-300">
                        {reviewResult.report?.summary}
                      </div>
                      <div className="text-gray-400 leading-relaxed whitespace-pre-wrap font-sans">
                        {reviewResult.report?.explanation}
                      </div>
                    </div>
                  )}

                  {activeTab === "vulnerabilities" && (
                    <div className="space-y-3">
                      {(reviewResult.report?.vulnerabilities || []).map((v, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedLine(v.line)}
                          className="p-3 rounded bg-[#161b22] border border-[#21262d] cursor-pointer hover:border-red-500/20"
                        >
                          <div className="flex justify-between mb-1">
                            <strong className="text-white text-sm">{v.pattern}</strong>
                            <span className="text-red-400 font-mono text-[10px]">Line {v.line}</span>
                          </div>
                          <p className="text-gray-350 leading-relaxed">{v.description}</p>
                          <div className="mt-2 text-[11px] bg-[#0d1117] p-2 rounded text-[#a5d6ff]">
                            <strong>Fix:</strong> {v.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "optimizations" && (
                    <div className="space-y-3">
                      {(reviewResult.report?.optimizations || []).map((o, i) => (
                        <div key={i} className="p-3 rounded bg-[#161b22] border border-[#21262d]">
                          <strong className="text-white block">{o.issue}</strong>
                          <div className="grid grid-cols-2 gap-3 mt-1 text-[11px]">
                            <div className="bg-[#0d1117] p-2 rounded text-emerald-400"><strong>Recommendation:</strong> {o.suggestion}</div>
                            <div className="bg-[#0d1117] p-2 rounded text-indigo-300"><strong>Benefit:</strong> {o.benefit}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "refactored" && (
                    <div className="space-y-4 h-full flex flex-col">
                      <div className="flex justify-end">
                        <button onClick={handleCopyRefactored} className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 text-[10px]">
                          {copiedRefactored ? "Copied!" : "Copy Full Code"}
                        </button>
                      </div>
                      <pre className="p-4 bg-[#0d1117] rounded border border-[#21262d] font-mono text-xs text-[#c9d1d9] overflow-auto max-h-[300px]">
                        {reviewResult.report?.refactoredCode || "// Empty output"}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

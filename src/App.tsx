import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Code, Settings, Terminal, Shield, Sparkles, RefreshCw, AlertCircle, Check, Play, FileText, Globe } from "lucide-react";
import { ReviewResult, ReviewReport } from "./types";
import { CodeViewer } from "./components/CodeViewer";
import { ReportPanel } from "./components/ReportPanel";

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

// File types supported for drag and drop
const FILE_MIMES: { [key: string]: string } = {
  "py": "Python",
  "js": "JavaScript",
  "jsx": "JavaScript",
  "ts": "TypeScript",
  "tsx": "TypeScript",
  "java": "Java",
  "cpp": "C++",
  "cc": "C++",
  "go": "Go",
  "rs": "Rust",
  "html": "HTML",
  "css": "CSS",
  "sql": "SQL",
  "sh": "Shell Script"
};

export default function App() {
  // Application states
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("snippet.py");
  const [selectedLanguage, setSelectedLanguage] = useState("Auto-Detect");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [selectedVulnerabilityLine, setSelectedVulnerabilityLine] = useState<string | number | null>(null);

  // Health state
  const [healthInfo, setHealthInfo] = useState<{
    status: string;
    watsonx_configured: boolean;
    gemini_configured: boolean;
  } | null>(null);

  // Scroll synchronization refs
  const lineNoRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Animation intervals for multi-step loader
  const steps = [
    "Analyzing syntax & modules...",
    "Scanning dependencies...",
    "Running OWASP Top 10 script rules...",
    "Mapping logic performance profiles...",
    "Implementing custom refactorings...",
    "Packaging analysis report..."
  ];

  // Load initial backend health checks
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHealthInfo(data);
      })
      .catch((err) => {
        console.warn("Could not query server health:", err);
      });
  }, []);

  // Sync scrolling of textarea and line numbers
  const handleTextareaScroll = () => {
    if (textareaRef.current && lineNoRef.current) {
      lineNoRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Adjust line numbers as text changes
  const lineNumbers = code.split("\n").map((_, i) => i + 1);

  // Drag handles
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Limit to 2MB as mandated
      if (file.size > 2 * 1024 * 1024) {
        setErrorStatus("File is too large. Maximum size is 2MB.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (FILE_MIMES[ext]) {
        setSelectedLanguage(FILE_MIMES[ext]);
      } else {
        setSelectedLanguage("Auto-Detect");
      }

      setFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCode(event.target.result as string);
          setErrorStatus(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleManualFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setErrorStatus("File is too large. Maximum file size is 2MB.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (FILE_MIMES[ext]) {
        setSelectedLanguage(FILE_MIMES[ext]);
      } else {
        setSelectedLanguage("Auto-Detect");
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCode(event.target.result as string);
          setErrorStatus(null);
        }
      };
      reader.readAsText(file);
    }
  };

  // Submit and run analysis
  const executeCodeReview = async () => {
    if (!code.trim()) {
      setErrorStatus("Please upload a file or write some source code to review.");
      return;
    }

    setIsAnalyzing(true);
    setErrorStatus(null);
    setLoadingStep(0);
    setReviewResult(null);

    // Increment loading message steps periodically
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          fileName: fileName,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Auditing process was interrupted.");
      }

      const result = await response.json() as ReviewResult;
      setReviewResult(result);
    } catch (err: any) {
      console.error("Analysis failure:", err);
      setErrorStatus(err.message || "The code analysis server encountered an issue. Check your connection.");
    } finally {
      clearInterval(interval);
      setIsAnalyzing(false);
    }
  };

  // Quick reset
  const handleReset = () => {
    setReviewResult(null);
    setSelectedVulnerabilityLine(null);
    setCode("");
    setFileName("snippet.py");
    setSelectedLanguage("Auto-Detect");
    setErrorStatus(null);
  };

  // Quick paste code template for easy evaluation
  const loadDemoCode = () => {
    const demo = `// Vulnerable Node.js User Authentication Module
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

function authenticateUser(username, password, callback) {
  // HIGH BUG EXPLOIT: SQL Injection Vulnerability (Concatenates strings natively)
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  
  db.get(query, (err, row) => {
    if (err) {
      // CODE SMELL: Leaking system backend trace logs to the front
      return callback(err);
    }
    
    // FORMAT RISK: Use of Loose Equals for password checking
    if (row == null) {
      return callback(new Error("Unknown record"));
    }
    
    // SECURITY EXPOSURE: Hardcoded credentials
    const hardcodedSecret = "SECRET_TOKEN_XYZ_1583920";
    console.log("Authentication initiated with token: " + hardcodedSecret);
    
    callback(null, row);
  });
}`;
    setCode(demo);
    setFileName("auth_controller.js");
    setSelectedLanguage("JavaScript");
    setErrorStatus(null);
  };

  return (
    <div id="home-root" className="min-h-screen bg-[#0d1117] text-gray-100 font-sans antialiased flex flex-col selection:bg-indigo-500/30 selection:text-white">
      
      {/* Dynamic Ambient Blur Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-24 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-[#21262d] bg-[#161b22]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/10 border border-indigo-400/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-indigo-300 bg-clip-text text-transparent">
              CodeCraft AI
            </span>
            <span className="ml-2 text-[10px] text-indigo-400 font-semibold font-mono bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded-full">
              v1.0.0 Stable
            </span>
          </div>
        </div>

        {/* Engine Credentials Checker */}
        {healthInfo && (
          <div className="flex items-center space-x-3 text-xs bg-[#0d1117]/80 px-4 py-2 border border-[#21262d] rounded-full">
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${healthInfo.watsonx_configured ? "bg-indigo-400" : "bg-zinc-600"}`} />
              <span className="text-gray-400 font-sans">
                {healthInfo.watsonx_configured ? "IBM Watsonx Connected" : "Local Gemini Active"}
              </span>
            </div>
            <span className="text-gray-600 font-sans">|</span>
            <span className="text-gray-400 font-sans text-[11px]">
              Ready for analysis
            </span>
          </div>
        )}
      </header>

      {/* Dashboard Sub-Info Alerts */}
      {!reviewResult && !isAnalyzing && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-6">
          <div className="p-4 rounded-xl border border-indigo-950 bg-gradient-to-r from-indigo-950/20 to-slate-900/40 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-300 leading-relaxed">
              <span className="font-semibold text-white">Full-Stack Capability Alert:</span> CodeCraft AI operates two secure engines. By default, with zero API key configuration from you, it initiates a native deployment of Google's powerful <strong className="text-indigo-300">gemini-3.5-flash</strong> model. If you wish to utilize IBM Watsonx's code logic model (<strong className="text-indigo-300">ibm/granite-20b-code-instruct</strong>), simply set <code className="bg-[#21262d] px-1 py-0.5 rounded text-indigo-200">IBM_WATSONX_APIKEY</code> inside the project environment.
            </div>
          </div>
        </div>
      )}

      {/* Core Body Frame */}
      <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col justify-start">
        
        {/* Error Banners */}
        {errorStatus && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/20 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-white">Review Operation Halted</h5>
              <p className="text-xs text-gray-300 mt-1">{errorStatus}</p>
            </div>
          </div>
        )}

        {/* 1. Initial State Editor Inputs */}
        {!reviewResult && !isAnalyzing && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COMPONENT: File Uploader, Lang Options, Instructions */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Box 1: File Zone */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5 font-display">
                  <UploadCloud className="w-4 h-4 text-gray-400" />
                  Code File Attachment
                </h3>

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`mt-1 border-2 border-dashed rounded-xl p-6 text-center transition duration-150 relative ${
                    isDragActive
                      ? "border-indigo-500 bg-indigo-500/5"
                      : "border-[#30363d] bg-[#0d1117] hover:border-[#4b5563]"
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-300 font-semibold">
                    Drag & Drop File Here
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Python, JS, C++, Go, Rust, Java, etc. (Max 2MB)
                  </p>

                  <div className="mt-4">
                    <label className="inline-block cursor-pointer px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[11px] font-semibold text-gray-300 border border-[#30363d] rounded-lg transition duration-150">
                      Browse Files
                      <input
                        type="file"
                        onChange={handleManualFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {fileName !== "snippet.py" && (
                  <div className="mt-4 flex items-center justify-between p-2 rounded bg-indigo-950/20 border border-indigo-900/30 text-xs">
                    <div className="flex items-center space-x-1.5 truncate">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-slate-300 font-semibold font-mono truncate">{fileName}</span>
                    </div>
                    <button
                      onClick={() => {
                        setFileName("snippet.py");
                        setSelectedLanguage("Auto-Detect");
                      }}
                      className="text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Box 2: Metadata Configuration */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 pb-2 border-b border-[#21262d] font-display">
                  <Settings className="w-4 h-4 text-gray-400" />
                  Analysis Parameters
                </h3>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Programming Language
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 select-none appearance-none cursor-pointer"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <Globe className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={loadDemoCode}
                    className="w-full text-center py-2 px-3 bg-[#21262d] text-gray-400 hover:bg-[#30363d] hover:text-white transition duration-150 text-xs font-semibold rounded-lg border border-[#30363d] cursor-pointer"
                  >
                    Load Insecure Sample Code
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COMPONENT: Raw Text Area Editor */}
            <div className="lg:col-span-8 bg-[#161b22] border border-[#21262d] rounded-2xl p-5 flex flex-col shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#21262d] mb-4">
                <div className="flex items-center space-x-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white font-display">Source Code Playground</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {code.length > 0 ? `${code.length} characters` : "Empty Playground"}
                </span>
              </div>

              {/* Code input stack */}
              <div className="relative flex flex-1 min-h-[350px] bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden font-mono text-xs">
                {/* Scroll Synchronized Line Gutter */}
                <div
                  ref={lineNoRef}
                  className="w-10 bg-[#0d1117] border-r border-[#21262d] text-right py-3.5 pr-2.5 text-[#484f58] select-none overflow-y-hidden text-[11px]"
                >
                  {lineNumbers.map((num) => (
                    <div key={num} className="leading-5 h-5">
                      {num}
                    </div>
                  ))}
                </div>

                {/* Textarea Field */}
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onScroll={handleTextareaScroll}
                  placeholder="// Paste your raw backend or frontend scripts here... (e.g. SQL Injection vulnerabilities, loose authentication scripts to audit)"
                  className="flex-1 bg-transparent border-0 outline-none resize-none px-4 py-3.5 select-text text-[#c9d1d9] leading-5 h-full focus:ring-0 placeholder:text-gray-600 focus:outline-none focus:border-0 font-mono"
                  spellCheck="false"
                />
              </div>

              {/* Submit Execution Button */}
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={executeCodeReview}
                  id="btn-analyze-code"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2.5 shadow-lg shadow-indigo-600/10 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Play className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>Execute Analysis Audit</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* 2. Loading State Animation Panel */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-20 px-6 max-w-xl mx-auto text-center">
            
            {/* Spinning Radar Indicator */}
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-indigo-500/40 animate-pulse" />
              <div className="relative bg-[#161b22] border border-[#21262d] p-6 rounded-2xl shadow-xl flex items-center justify-center">
                <Shield className="w-10 h-10 text-indigo-400 animate-bounce" />
              </div>
            </div>

            <h3 className="text-lg font-bold font-display text-white mb-1 glow-text">
              CodeCraft AI Auditing Suite
            </h3>
            <p className="text-sm text-indigo-400 font-semibold font-mono mb-4">
              Step: {steps[loadingStep]}
            </p>

            {/* Custom Glowing Slider Progress Bar */}
            <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden mb-6 border border-[#30363d]">
              <div
                className="bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-md"
                style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
              />
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-sans max-w-sm">
              We extract files safely, review logical variables against structural signatures, evaluate OWASP safety configurations, and draft high-fidelity refactored replacements.
            </p>
          </div>
        )}

        {/* 3. Successful Side-by-Side Review Results Pane */}
        {reviewResult && !isAnalyzing && (
          <div className="space-y-6">
            
            {/* Split Screen Control Panel Banner */}
            <div className="flex flex-wrap items-center justify-between bg-[#161b22] border border-[#21262d] p-4 rounded-2xl gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white font-display">Analysis Completed Successfully</h4>
                  <p className="text-xs text-gray-400 font-sans">
                    Core module reviewed: <strong className="text-gray-300 font-mono">{reviewResult.fileName}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={handleReset}
                id="btn-re-audit"
                className="flex items-center space-x-1.5 py-2 px-4 bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-white border border-[#30363d] rounded-xl transition duration-150 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Audit Another Block</span>
              </button>
            </div>

            {/* Side-by-Side Panel Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Pane: Original Source Code with Line Highlight control link */}
              <div className="lg:col-span-5 flex flex-col h-full min-h-[500px]">
                <div className="flex items-center justify-between pb-2 mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">
                    Original Code File
                  </span>
                  {selectedVulnerabilityLine && (
                    <button
                      onClick={() => setSelectedVulnerabilityLine(null)}
                      className="text-[10px] text-gray-400 hover:text-white bg-[#21262d] border border-[#30363d] px-2 py-0.5 rounded cursor-pointer font-sans"
                    >
                      Clear Highlights
                    </button>
                  )}
                </div>
                <div className="flex-1 bg-[#0d1117] rounded-xl overflow-hidden shadow-inner h-full">
                  <CodeViewer
                    code={code}
                    language={reviewResult.language}
                    highlightedLine={selectedVulnerabilityLine}
                    title={reviewResult.fileName}
                  />
                </div>
              </div>

              {/* Right Pane: Report Result Tabs */}
              <div className="lg:col-span-7 flex flex-col h-full">
                <div className="pb-2 mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">
                    AI Audit Feedback
                  </span>
                  <div className="flex space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  </div>
                </div>

                <div className="flex-1">
                  <ReportPanel
                    report={reviewResult.report}
                    reviewer={reviewResult.reviewer}
                    watsonx_active={reviewResult.watsonx_active}
                    selectedLine={selectedVulnerabilityLine}
                    originalCode={code}
                    onSelectVulnerabilityLine={(line) => setSelectedVulnerabilityLine(line)}
                  />
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Humble Footer Block */}
      <footer className="relative z-10 border-t border-[#21262d] py-6 text-center text-xs text-gray-500 font-sans mt-auto">
        <p>© 2026 CodeCraft AI • Powered securely using server encryption standards</p>
      </footer>

    </div>
  );
}

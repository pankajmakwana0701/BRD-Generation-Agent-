import React, { useState } from "react";
import axios from "axios";

function App() {
  const [textPrompt, setTextPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [brdOutput, setBrdOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ====== LIVE RENDER BACKEND CONFIGURATION ======
  const RENDER_BACKEND_URL = "https://brd-generation-agent.onrender.com";

  // File selection handler
  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  // Main Generation Handler
  const handleGenerateBRD = async (e) => {
    e.preventDefault();
    
    if (!textPrompt.trim()) {
      setErrorMessage("Please enter your project requirements first!");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setBrdOutput("");

    // FIX: Correctly instantiate Multipart FormData with capital 'F'
    const formData = new FormData();
    formData.append("textPrompt", textPrompt);

    // Append files if selected by user
    if (selectedFiles.length > 0) {
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
    }

    try {
      // POST network streaming to production cloud backend
      const response = await axios.post(
        `${RENDER_BACKEND_URL}/api/generate-brd`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setBrdOutput(response.data.brd);
      } else {
        setErrorMessage(response.data.error || "Failed to generate BRD Document.");
      }
    } catch (error) {
      console.error("❌ FRONTEND CONNECTION ERROR:", error);
      
      // Detailed user-friendly state mapping for network crashes
      const serverErrorMsg = error.response?.data?.error || error.message;
      setErrorMessage(
        serverErrorMsg.includes("demand") 
          ? "Server is busy with high demand. Please click generate again in 1 minute!"
          : `AI Server Error: ${serverErrorMsg}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] text-gray-100 font-sans antialiased selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Professional Header Navigation */}
      <header className="border-b border-gray-800 bg-[#0f121d]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-xl font-bold text-white">✨</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              BRD Generation Agent
            </h1>
            <p className="text-xs text-gray-500 font-medium">HackDays Delhi - Track: Google Gemini AI</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">AI Agent Online</span>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: Input Workflow Control Panel */}
        <section className="bg-[#121624] border border-gray-800/80 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div>
            <label className="block text-sm font-semibold tracking-wide uppercase text-gray-400 mb-2">
              Project Requirements & Description
            </label>
            <textarea
              className="w-full h-48 bg-[#0a0d16] text-gray-200 placeholder-gray-600 border border-gray-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all resize-none text-sm leading-relaxed"
              placeholder="Describe your app concept, user flows, payment gateways, or key features here..."
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
            />
          </div>

          {/* Wireframes Upload Container */}
          <div>
            <label className="block text-sm font-semibold tracking-wide uppercase text-gray-400 mb-2">
              Attach Wireframes / Screenshots (Multi-modal Input)
            </label>
            <div className="border-2 border-dashed border-gray-800 hover:border-purple-500/50 bg-[#0a0d16] rounded-xl p-6 transition-colors text-center relative cursor-pointer group/upload">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <div className="text-2xl text-gray-500 group-hover/upload:text-purple-400 transition-colors">📤</div>
                <p className="text-sm text-gray-400 font-medium">Click to upload sketch or app design images</p>
                {selectedFiles.length > 0 && (
                  <p className="text-xs text-purple-400 font-semibold bg-purple-500/10 inline-block px-2.5 py-1 rounded-md mt-2">
                    📎 {selectedFiles.length} files staged for analysis
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Functional Dynamic Errors Window */}
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium rounded-xl p-4 leading-relaxed animate-fadeIn">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Submission CTA Trigger Button */}
          <button
            onClick={handleGenerateBRD}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold tracking-wide transition-all shadow-xl transform active:scale-[0.99] flex items-center justify-center space-x-2 ${
              loading
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-purple-900/20 hover:shadow-purple-500/20"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="animate-pulse tracking-widest text-sm text-purple-300">ANALYZING SPECIFICATIONS...</span>
              </>
            ) : (
              <>
                <span>📄</span>
                <span>Generate BRD Document</span>
              </>
            )}
          </button>
        </section>

        {/* Right Side: Professional Generated BRD Workspace View */}
        <section className="bg-[#121624] border border-gray-800/80 rounded-2xl p-6 shadow-2xl h-[calc(100vh-140px)] min-h-[500px] flex flex-col justify-between relative group">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-purple-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
            <h2 className="text-xs font-bold tracking-widest uppercase text-purple-400">
              Generated BRD Output (Markdown View)
            </h2>
            {brdOutput && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(brdOutput);
                  alert("BRD Markdown copied to clipboard!");
                }}
                className="text-xs bg-gray-800/60 border border-gray-700 hover:bg-gray-700 hover:text-white px-2.5 py-1 rounded-md transition-colors font-medium text-gray-300"
              >
                📋 Copy Markdown
              </button>
            )}
          </div>

          {/* Output Content Streaming Box */}
          <div className="flex-1 overflow-y-auto bg-[#0a0d16] border border-gray-900 rounded-xl p-5 font-mono text-xs leading-relaxed text-gray-300 whitespace-pre-wrap select-text custom-scrollbar">
            {brdOutput ? (
              brdOutput
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 space-y-3">
                <span className="text-4xl filter grayscale opacity-40">📄</span>
                <p className="max-w-xs font-sans text-sm font-medium">
                  Your structured Business Requirement Document will render here once generation completes.
                </p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
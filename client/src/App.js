import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';

export default function BrdDashboard() {
  const [textPrompt, setTextPrompt] = useState('');
  const [brd, setBrd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Core API Request handler
  // 1. Core API Request handler (FIXED FOR MULTIPART / FORM-DATA)
  const handleGenerateBRD = async () => {
    if (!textPrompt.trim()) {
      setError('Please enter your project requirements first.');
      return;
    }

    setLoading(true);
    setError('');
    setBrd('');

    try {
      // Create FormData instance so Multer can parse it perfectly
      const formData = new FormData();
      formData.append('textPrompt', textPrompt);

      // If you implement files later, they will hook in here smoothly
      
      console.log("Sending FormData request to backend...");
      const response = await axios.post('https://brd-agent-backend.onrender.com/api/generate-brd', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success) {
        setBrd(response.data.brd);
      } else {
        setError('Failed to fetch structured requirements.');
      }
    } catch (err) {
      console.error("Frontend Error Details:", err);
      setError(err.response?.data?.error || 'Server error. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // 2. High-Fidelity PDF Export Engine
  const downloadPDF = () => {
    const element = document.getElementById('brd-rendered-content');
    if (!element) return;

    const opt = {
      margin:       [0.5, 0.5, 0.5, 0.5], // Standard corporate padding
      filename:     'Business_Requirements_Document.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6 flex flex-col items-center">
      
      {/* Header Accent */}
      <header className="w-full max-w-7xl border-b border-neutral-900 pb-4 mb-8 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
          BRD Generation Agent <span className="text-xs text-neutral-500 font-mono">v1.1</span>
        </h1>
        <div className="flex items-center gap-2 text-xs bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-neutral-400 font-mono">AI Agent Online</span>
        </div>
      </header>

      {/* Main Multi-Column Split Workspace */}
      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls & Input Channels */}
        <section className="space-y-6">
          <div className="bg-neutral-900/40 border border-neutral-900 p-6 rounded-2xl shadow-xl">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Project Requirements & Description
            </h2>
            <textarea
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="e.g., me ek hr hu mere liye ek portfolio website banni hai..."
              className="w-full h-48 bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="bg-neutral-900/40 border border-neutral-900 p-6 rounded-2xl shadow-xl">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Attach Wireframes / Screenshots (Multi-modal Input)
            </h2>
            <div className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer gap-2 group">
              <svg className="w-8 h-8 text-neutral-600 group-hover:text-neutral-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-xs text-neutral-500 group-hover:text-neutral-400 font-medium">Click to upload sketch or app design images</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-4 rounded-xl font-mono">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleGenerateBRD}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Assembling Agent Knowledge...
              </>
            ) : 'Generate BRD Document'}
          </button>
        </section>

        {/* RIGHT COLUMN: Real-time Markdown Layout Viewer */}
        <section className="bg-neutral-900/20 border border-neutral-900 rounded-2xl p-6 min-h-[600px] flex flex-col relative shadow-2xl">
          <div className="flex justify-between items-center border-b border-neutral-900 pb-4 mb-4">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Generated BRD Output (Markdown View)
            </h2>
            
            {/* Dynamic PDF Trigger Action Button */}
            {brd && (
              <button
                onClick={downloadPDF}
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-amber-400 font-medium py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                📥 Download BRD PDF
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[550px] pr-2">
            {!brd && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 gap-3 py-20">
                <svg className="w-12 h-12 stroke-current opacity-40" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-xs font-mono">Your structured Business Requirements Document will appear here after clicking generation.</p>
              </div>
            )}

            {loading && (
              <div className="space-y-4 py-6 animate-pulse">
                <div className="h-4 bg-neutral-800 rounded w-2/3"></div>
                <div className="h-3 bg-neutral-800 rounded w-full"></div>
                <div className="h-3 bg-neutral-800 rounded w-5/6"></div>
                <div className="h-3 bg-neutral-800 rounded w-4/5"></div>
              </div>
            )}

            {/* REACT MARKDOWN STYLING LAYER */}
            {brd && (
              <div 
                id="brd-rendered-content" 
                className="p-6 text-left border border-neutral-800/80 bg-neutral-950 rounded-xl relative overflow-hidden text-sm"
              >
                {/* Visual Pinterest Golden Ambient Glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white border-b border-neutral-900 pb-2 mb-4 tracking-tight" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-semibold text-amber-400 mt-6 mb-2 tracking-wide" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-medium text-neutral-200 mt-4 mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="text-neutral-300 leading-relaxed mb-3 text-xs" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 text-neutral-300 space-y-1 mb-3 text-xs" {...props} />,
                    li: ({node, ...props}) => <li className="marker:text-amber-500" {...props} />,
                    code: ({node, inline, className, children, ...props}) => {
                      return (
                        <code className="bg-neutral-900 text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {brd}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { Upload, FileText, Loader2, Sparkles } from 'lucide-react';

function App() {
  const [textPrompt, setTextPrompt] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatedBrd, setGeneratedBrd] = useState('');
  const [error, setError] = useState('');

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  // Submit handler to call our Backend API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!textPrompt.trim()) {
      setError('Please provide a brief project description.');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedBrd('');

    // Prepare Multipart Form Data for Multi-modal upload
    const formData = new FormData();
    formData.append('textPrompt', textPrompt);
    selectedFiles.forEach((file) => {
      formData.append('files', file); // Matches backend multer array field 'files'
    });

    try {
     const response = await axios.post('https://brd-generation-agent.onrender.com/api/generate-brd', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
      if (response.data.success) {
        setGeneratedBrd(response.data.brd);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to connect to the AI Server.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const element = document.getElementById('brd-content');
    if (!element) return;

    const opt = {
      margin: [0.5, 0.5],
      filename: 'Business_Requirements_Document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">BRD Generation Agent</h1>
            <p className="text-xs text-slate-400">HackDays Delhi - Track: Google Gemini AI</p>
          </div>
        </div>
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold">
          AI Agent Online
        </span>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Input Panel */}
        <section className="bg-slate-800/50 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Requirements & Description
              </label>
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="Describe your app concept, user flows, payment gateways, or core features here..."
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition resize-none text-sm"
              />
            </div>

            {/* File Upload Box */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Attach Wireframes / Screenshots (Multi-modal Input)
              </label>
              <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mb-2 transition" />
                <span className="text-xs text-slate-400 group-hover:text-slate-300">
                  Click to upload sketch or app design images
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Selected file preview names */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-indigo-400">Selected Files:</p>
                  {selectedFiles.map((file, idx) => (
                    <p key={idx} className="text-xs text-slate-400 flex items-center gap-1">
                      📁 {file.name}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Inputs & Generating BRD...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate BRD Document
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right Side: Output Panel */}
        <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl min-h-[600px] flex flex-col">
          <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">
              Generated BRD Output (Markdown View)
            </h2>
            {generatedBrd && (
              <button
                onClick={downloadPDF}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-md transition"
              >
                Download PDF
              </button>
            )}
          </div>

          <div id="brd-content" className="flex-1 overflow-y-auto text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-900">
            {generatedBrd ? (
              <ReactMarkdown 
                components={{
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4 text-white" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-6 mb-2 text-indigo-400" {...props} />,
                  p: ({node, ...props}) => <p className="mb-3" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3" {...props} />,
                }}
              >
                {generatedBrd}
              </ReactMarkdown>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center">
                <FileText className="w-12 h-12 mb-2 stroke-[1]" />
                <p className="text-xs">Your structured Business Requirements Document will appear here after clicking generation.</p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:3000",
];

app.use(cors({
  origin: function (origin, callback) {
    // Agar local call hai ya direct fetch (no origin), allow it
    if (!origin) return callback(null, true);
    
    // Check if origin matches localhost OR contains your vercel domain identity
    const isVercelSubdomain = origin.endsWith("pankajmakwana070127.vercel.app");
    const isLocal = allowedOrigins.includes(origin);

    if (isLocal || isVercelSubdomain) {
      return callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Gemini AI Engine
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. ROUTE: GENERATE BRD SPECS
app.post("/api/generate-brd", upload.array("files"), async (req, res) => {
  try {
    const { textPrompt } = req.body;

    if (!textPrompt) {
      return res.status(400).json({ success: false, error: "Project requirements are missing." });
    }

    // Fixed the syntax error here and shifted to stable gemini-2.5-flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash" 
    });

    const systemPrompt = `You are an elite Business Analyst AI. Generate a professional and comprehensive Business Requirement Document (BRD) based on the user's requirements. Use clean structure with Markdown. Requirements: ${textPrompt}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const brdText = response.text();

    return res.json({
      success: true,
      brd: brdText
    });

  } catch (error) {
    console.error("Gemini API Engine Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error during data compile."
    });
  }
});

// 2. SAFE NATIVE PDF RETRIEVAL / BACKUP ROUTE
app.post("/api/download-brd-pdf", (req, res) => {
  try {
    const { title, textPrompt, generatedBrd } = req.body;

    // Setting standard text headers for download backup
    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename=BRD_${Date.now()}.md`);
    
    const outputContent = `# ${title || 'BRD Specifications'}\n\n## Requirements\n${textPrompt}\n\n## Specification Details\n${generatedBrd}`;
    return res.send(outputContent);

  } catch (error) {
    console.error("Download Error:", error);
    return res.status(500).json({ success: false, error: "Failed to download document compilation." });
  }
});

// SAFE CATCH-ALL ROUTE MIDDLEWARE (Express 5 Safe)
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint route not found." });
});

// START BACKEND SYSTEM
app.listen(PORT, () => {
  console.log(`🚀 Server operating on: http://localhost:${PORT}`);
});
// ====== IMPORTANT: LOAD ENV AT THE VERY TOP ======
require("dotenv").config(); 

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;

// ====== CORS CONFIGURATION FOR VERCEL SUBDOMAINS ======
const allowedOrigins = [
  "http://localhost:3000",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Auto-match any dynamic preview or production URL from your Vercel project
    const isVercelSubdomain = origin.endsWith("pankajmakwana070127.vercel.app");
    const isLocal = allowedOrigins.includes(origin);

    if (isLocal || isVercelSubdomain) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS policy block'), false);
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Gemini safely by passing the key explicitly from process.env
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// 1. ROUTE: GENERATE BRD SPECS
app.post("/api/generate-brd", upload.array("files"), async (req, res) => {
  try {
    const { textPrompt } = req.body;

    if (!textPrompt) {
      return res.status(400).json({ success: false, error: "Project requirements are missing." });
    }

    // Double check if API key loaded fine inside runtime environment
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "Backend missing GEMINI_API_KEY in environment configuration." });
    }

    // Call dynamic model safely
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
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

// 2. ROUTE: DOWNLOAD REPORT PDF / MARKDOWN
app.post("/api/download-brd-pdf", (req, res) => {
  try {
    const { title, textPrompt, generatedBrd } = req.body;

    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename=BRD_${Date.now()}.md`);
    
    const outputContent = `# ${title || 'BRD Specifications'}\n\n## Requirements\n${textPrompt}\n\n## Specification Details\n${generatedBrd}`;
    return res.send(outputContent);

  } catch (error) {
    console.error("Download Error:", error);
    return res.status(500).json({ success: false, error: "Failed to download document compilation." });
  }
});

// SAFE CATCH-ALL MIDDLEWARE
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint route not found." });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server successfully operating on target port: http://localhost:${PORT}`);
});
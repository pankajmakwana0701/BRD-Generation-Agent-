const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Official Google SDK
require('dotenv').config();

const app = express();

// Global CORS Policy
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.options('*', cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MAIN GENERATION ENDPOINT
app.post('/api/generate-brd', upload.array('files', 5), async (req, res) => {
    try {
        console.log("📥 Request Received on SDK Router.");
        const { textPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ GEMINI_API_KEY missing in Render Settings!");
            return res.status(500).json({ error: "API Key missing on server configuration." });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            return res.status(400).json({ error: "Please provide a valid text prompt." });
        }

        // Initialize Official SDK safely
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `You are an expert Enterprise Business Analyst. Your job is to analyze the user description and any attached wireframes, then generate a highly detailed, professional Business Requirements Document (BRD) formatted beautifully in Markdown.
        CRITICAL REQUIREMENT: You MUST include a visual system architecture flowchart or data flow diagram using Mermaid.js syntax inside a code block tagged with 'mermaid'.
        Ensure it contains: Executive Summary, Functional Requirements, Non-Functional Requirements, User Personas, and the Mermaid Flowchart.`;

        // Build the contents array for the SDK seamlessly
        const contentsArray = [];
        
        // 1. Append the text prompt context
        contentsArray.push(`${systemPrompt}\n\nUser Project Description: ${textPrompt}`);

        // 2. Append images ONLY if the user uploaded them
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                contentsArray.push({
                    inlineData: {
                        data: file.buffer.toString("base64"),
                        mimeType: file.mimetype
                    }
                });
            });
        }

        console.log("🚀 Calling Google Gemini SDK Engine (gemini-1.5-flash)...");
        const result = await model.generateContent(contentsArray);
        const response = await result.response;
        const resultText = response.text();

        console.log("🎯 BRD Compiled Successfully via SDK!");
        return res.json({ success: true, brd: resultText });

    } catch (error) {
        console.error("--- SDK ACTIVE ERROR LOG ---");
        console.error(error.message);
        res.status(500).json({ error: `AI Execution Error: ${error.message}` });
    }
});

app.get('/', (req, res) => {
    res.send("Backend Server Status: Operational");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server operational on port ${PORT}`));
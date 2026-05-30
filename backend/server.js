const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // CORRECTION: Correct SDK Class Name
require('dotenv').config();

const app = express();

// Global CORS Policy - allows frontend to communicate seamlessly
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.options('*', cors());

// Multer memory storage configuration for handling array of files
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Google Generative AI safely
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// MAIN ENDPOINT: Generate BRD
app.post('/api/generate-brd', upload.array('files', 5), async (req, res) => {
    try {
        console.log("📥 Request Received on Backend Router.");
        const { textPrompt } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ CRITICAL: GEMINI_API_KEY is missing from Render Env Settings!");
            return res.status(500).json({ error: "Backend Configuration Error: API Key missing on server." });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            return res.status(400).json({ error: "Please provide a valid text prompt description." });
        }

        // Initialize model engine layer using official SDK methods
        const aiInstance = genAI || new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = aiInstance.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `You are an expert Enterprise Business Analyst. Your job is to analyze the user request and generate a professional, highly comprehensive Business Requirements Document (BRD) in Markdown format.
Include sections: Executive Summary, Functional Requirements, Non-Functional Requirements, User Personas, and a system flow using Mermaid.js inside a 'mermaid' tagged code block.`;

        // Setting up standard parts array content layer for multimodal generation
        const contentsArray = [`${systemPrompt}\n\nUser Project Description: ${textPrompt}`];

        // Safely parse uploaded wireframe/screenshot image files into base64 mapping if present
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

        console.log("🚀 Requesting content generation from stable gemini-1.5-flash engine...");
        const result = await model.generateContent(contentsArray);
        const response = await result.response;
        const resultText = response.text();

        console.log("🎯 BRD Compiled and verified successfully!");
        return res.json({ success: true, brd: resultText });

    } catch (error) {
        console.error("--- ACTIVE REJECTION LOG ---");
        console.error(error);
        res.status(500).json({ error: error.message || "Failed to process AI document tree generation." });
    }
});

// Root route check
app.get('/', (req, res) => {
    res.send("BRD Agent Backend is live and healthy!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server fully operational on port ${PORT}`));
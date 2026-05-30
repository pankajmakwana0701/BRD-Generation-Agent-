const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/generative-ai'); // Official Google SDK
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

// Initialize Google AI with API Key safely
const aiKey = process.env.GEMINI_API_KEY;
let ai;
if (aiKey) {
    ai = new GoogleGenAI({ apiKey: aiKey });
}

app.post('/api/generate-brd', upload.array('files', 5), async (req, res) => {
    try {
        console.log("📥 Request Received on SDK Router.");
        const { textPrompt } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "API Key missing in environment settings." });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            return res.status(400).json({ error: "Please provide a valid text prompt." });
        }

        // Fallback initialization if needed
        if (!ai) {
            ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        }

        const systemPrompt = `You are an expert Enterprise Business Analyst. Your job is to analyze the user request and generate a professional, highly comprehensive Business Requirements Document (BRD) in Markdown format.
        Include sections: Executive Summary, Functional Requirements, Non-Functional Requirements, User Personas, and a system flow using Mermaid.js inside a 'mermaid' tagged code block.`;

        // Array structures for multi-modal context mapping
        const contentsArray = [];

        // 1. Text description parsing
        contentsArray.push({
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Project Description: ${textPrompt}` }]
        });

        // 2. Image files parsing if uploaded
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                contentsArray.push({
                    role: 'user',
                    parts: [{
                        inlineData: {
                            data: file.buffer.toString("base64"),
                            mimeType: file.mimetype
                        }
                    }]
                });
            });
        }

        console.log("🚀 Calling Official Google SDK Instance (gemini-1.5-flash)...");
        
        // Strictly using stable flash model engine layer via standard SDK method
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: contentsArray
        });

        if (response && response.text) {
            console.log("🎯 BRD Compiled Successfully!");
            return res.json({ success: true, brd: response.text });
        } else {
            throw new Error("Empty text stream from Google SDK wrapper.");
        }

    } catch (error) {
        console.error("--- BACKEND ERROR LOG ---");
        console.error(error.message);
        res.status(500).json({ error: "Internal Server Error during AI sequence execution." });
    }
});

app.get('/', (req, res) => {
    res.send("Backend Server Status: Operational");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server fully live on port ${PORT}`));
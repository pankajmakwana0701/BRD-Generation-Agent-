const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();

// Global CORS Config
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
        console.log("📥 Request Received on Backend!");
        const { textPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ GEMINI_API_KEY is missing in Env Settings!");
            return res.status(500).json({ error: "Backend Configuration Error: API Key missing." });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            return res.status(400).json({ error: "Please provide a valid text description." });
        }

        const systemPrompt = `You are an expert Enterprise Business Analyst. Generate a professional Business Requirements Document (BRD) in Markdown format. Include a system architecture flowchart using Mermaid.js syntax inside a code block tagged with 'mermaid'.`;

        const partsArray = [
            { text: `${systemPrompt}\n\nUser Project Description: ${textPrompt}` }
        ];

        // Process files if available
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                partsArray.push({
                    inlineData: {
                        data: file.buffer.toString("base64"),
                        mimeType: file.mimetype
                    }
                });
            });
        }

        console.log("🚀 Generating content via Gemini SDK...");
        const result = await model.generateContent({ contents: [{ role: 'user', parts: partsArray }] });
        const response = await result.response;
        const resultText = response.text();
        
        console.log("🎯 BRD Successfully generated!");
        return res.json({ success: true, brd: resultText });

    } catch (error) {
        console.error("--- ERROR LOG ---");
        if (error.response) {
            console.error("Status Code:", error.response.status);
            console.error("Details:", JSON.stringify(error.response.data));
            res.status(500).json({ error: `Gemini Refused: ${error.response.data.error?.message || "Check Logs"}` });
        } else {
            console.error("Reason:", error.message);
            res.status(500).json({ error: error.message });
        }
    }
});

app.get('/', (req, res) => {
    res.send("BRD Agent Backend is live!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Operational on port ${PORT}`));
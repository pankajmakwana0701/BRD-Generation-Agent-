const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Global CORS config
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer Config: Array uploads handle karne ke liye (Max 5 files)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MAIN ENDPOINT: Generate BRD (Supports Multi-modal input)
app.post('/api/generate-brd', upload.array('files', 5), async (req, res) => {
    try {
        console.log("📥 Incoming Request Body:", req.body);
        console.log(`📸 Total Uploaded Files: ${req.files ? req.files.length : 0}`);

        const { textPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Server Configuration Error: API Key not loaded." });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            return res.status(400).json({ error: "Please provide a valid text prompt description." });
        }

        const systemPrompt = `
You are an expert Enterprise Business Analyst. Your job is to analyze the provided text description and any provided wireframe/screenshot images, then generate a highly detailed, professional Business Requirements Document (BRD).

The output MUST be formatted beautifully in Markdown format with clear sections.
CRITICAL REQUIREMENT: You MUST include a visual system architecture flowchart or data flow diagram using Mermaid.js syntax inside a code block tagged with 'mermaid'. 

Example:
\`\`\`mermaid
graph TD
    A[User] -->|Inputs Idea| B(React Frontend)
    B -->|API Request| C{Express Backend}
    C -->|REST Call| D[Gemini AI Engine]
\`\`\`

Ensure the BRD contains: Executive Summary, Functional Requirements, Non-Functional Requirements, User Personas, and the Mermaid Flowchart.
`;

        // 1. Initial part setup with text prompt
        const partsArray = [
            { text: `${systemPrompt}\n\nUser Project Description: ${textPrompt}` }
        ];

        // 2. Loop through all files and add them to Gemini parts array if available
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

        // Strict nested structured payload for Gemini API
        const payload = {
            contents: [
                {
                    parts: partsArray
                }
            ]
        };

       console.log("Hitting Google Gemini Production Endpoint (gemini-1.5-flash)...");

// URL ko v1beta se v1 mein change kiya hai:
const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
            const resultText = response.data.candidates[0].content.parts[0].text;
            console.log("🚀 BRD Successfully generated!");
            return res.json({ success: true, brd: resultText });
        } else {
            throw new Error("Unexpected response structure from Google API tree");
        }

    } catch (error) {
        console.error("--- ACTIVE REJECTION LOG ---");
        if (error.response) {
            console.error("Status Code:", error.response.status);
            console.error("Details:", JSON.stringify(error.response.data));
        } else {
            console.error("Reason:", error.message);
        }
        console.error("----------------------------");
        res.status(500).json({ error: "Failed to generate BRD. Check server logs." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 BRD AI Backend running on port ${PORT}`));
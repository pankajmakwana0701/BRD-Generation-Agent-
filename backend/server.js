const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Robust CORS Policy to allow everything smoothly
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors());

// Multer Config for parsing file buffers safely
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MAIN GENERATION ENDPOINT
app.post('/api/generate-brd', upload.array('files', 5), async (req, res) => {
    try {
        console.log("📥 Incoming Request Verified.");
        const { textPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ CRITICAL: GEMINI_API_KEY is missing from Render Env Settings!");
            return res.status(500).json({ error: "Backend Configuration Error: API Key missing." });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            return res.status(400).json({ error: "Please provide a valid text description." });
        }

        const systemPrompt = `You are an expert Enterprise Business Analyst. Your job is to analyze the provided text description and any provided wireframe/screenshot images, then generate a highly detailed, professional Business Requirements Document (BRD).
The output MUST be formatted beautifully in Markdown format with clear sections.
Include a visual system architecture flowchart or data flow diagram using Mermaid.js syntax inside a code block tagged with 'mermaid'.

Ensure the BRD contains: Executive Summary, Functional Requirements, Non-Functional Requirements, User Personas, and the Mermaid Flowchart.`;

        // Setting up the rigid structural parts payload for standard v1 architecture
        const partsArray = [
            { text: `${systemPrompt}\n\nUser Project Description: ${textPrompt}` }
        ];

        // Process images if uploaded by user
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

        const payload = {
            contents: [
                {
                    parts: partsArray
                }
            ]
        };

        console.log("🚀 Hitting Google Gemini v1 Production Standard Endpoint...");
        
        // Using v1 production architecture path with valid API query injection
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        // Nested conditional structure mapping
        if (response.data && response.data.candidates && response.data.candidates[0].content && response.data.candidates[0].content.parts) {
            const resultText = response.data.candidates[0].content.parts[0].text;
            console.log("🎯 BRD Successfully compiled and pushed back!");
            return res.json({ success: true, brd: resultText });
        } else {
            console.error("❌ Unexpected Payload Structure Received:", JSON.stringify(response.data));
            throw new Error("Invalid structure tree inside Google candidate array response.");
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
        res.status(500).json({ error: "Failed to process AI document tree generation." });
    }
});

// Default Root Route for status pings
app.get('/', (req, res) => {
    res.send("BRD Agent Backend is active and running fine!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server fully operational on port ${PORT}`));
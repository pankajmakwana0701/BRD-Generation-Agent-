const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

// Load environment variables from .env
dotenv.config();

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Handles standard form layouts

// Memory storage setup for multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MAIN ENDPOINT: Generate BRD (Using upload.none() if we only want text fields parsing securely)
app.post('/api/generate-brd', upload.none(), async (req, res) => {
    try {
        // Log to see what is exactly reaching the server lines
        console.log("📥 Incoming Request Body:", req.body);

        const { textPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ ERROR: GEMINI_API_KEY is missing from .env!");
            return res.status(500).json({ error: "Server Configuration Error: API Key not loaded." });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            console.error("❌ ERROR: textPrompt arrived empty or undefined!");
            return res.status(400).json({ error: "Please provide a valid text prompt description." });
        }

        console.log(`📝 Processing requirements for input: "${textPrompt.substring(0, 30)}..."`);

        const systemPrompt = `
You are an expert Enterprise Business Analyst. Your job is to analyze the provided text description and generate a highly detailed, professional Business Requirements Document (BRD).

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

        // Strict nested structured payload for Gemini API
        const payload = {
            contents: [
                {
                    parts: [
                        { text: `${systemPrompt}\n\nUser Project Description: ${textPrompt}` }
                    ]
                }
            ]
        };

        console.log("Hitting Google Gemini Latest Production Endpoint (gemini-2.5-flash)...");
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
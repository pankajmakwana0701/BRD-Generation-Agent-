const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Robust CORS Policy
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

app.post('/api/generate-brd', upload.array('files', 5), async (req, res) => {
    try {
        console.log("📥 Request Received.");
        const { textPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "API Key missing on server configuration." });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            return res.status(400).json({ error: "Please provide a valid text prompt." });
        }

        const systemPrompt = `You are an expert Enterprise Business Analyst. Generate a professional Business Requirements Document (BRD) in Markdown. Include a system architecture flowchart using Mermaid.js syntax inside a code block tagged with 'mermaid'.`;

        const partsArray = [
            { text: `${systemPrompt}\n\nUser Project Description: ${textPrompt}` }
        ];

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
                    role: "user",
                    parts: partsArray
                }
            ]
        };

        console.log("🚀 Hitting Gemini API Fixed Endpoint...");
        
        // FIX: URL se '/models/' ko correct pattern mein set kiya hai taaki 404 na aaye
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data && response.data.candidates && response.data.candidates[0].content && response.data.candidates[0].content.parts) {
            const resultText = response.data.candidates[0].content.parts[0].text;
            return res.json({ success: true, brd: resultText });
        } else {
            throw new Error("Unexpected API schema response.");
        }

    } catch (error) {
        console.error("--- ACTIVE REJECTION LOG ---");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data));
        } else {
            console.error("Message:", error.message);
        }
        res.status(500).json({ error: "Internal Server Error during compilation." });
    }
});

app.get('/', (req, res) => {
    res.send("Backend Server Status: Operational");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Live on port ${PORT}`));
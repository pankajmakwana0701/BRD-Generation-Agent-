const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();

// 🔥 FIXED: CORS config jo Vercel frontend ko access dega
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/generate-brd', upload.array('files', 5), async (req, res) => {
    try {
        console.log("📥 Request body textPrompt:", req.body.textPrompt);
        const { textPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Server Configuration Error: API Key missing." });
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

        console.log("🚀 Hitting Google Gemini Endpoint...");
        // API URL for standard REST invocation without redundant models tree mapping
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data && response.data.candidates && response.data.candidates[0].content && response.data.candidates[0].content.parts) {
            const resultText = response.data.candidates[0].content.parts[0].text;
            return res.json({ success: true, brd: resultText });
        } else {
            throw new Error("Unexpected schema tree inside API response.");
        }

    } catch (error) {
        console.error("--- ERROR LOG ---");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data));
        } else {
            console.error("Message:", error.message);
        }
        res.status(500).json({ error: "Internal Server Error during data compile." });
    }
});

app.get('/', (req, res) => {
    res.send("Backend Server is Active!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Live on port ${PORT}`));
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

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
            return res.status(500).json({ error: "❌ [VERSION 2 LIVE] API Key missing on Render Env Settings!" });
        }

        if (!textPrompt || textPrompt.trim() === "") {
            return res.status(400).json({ error: "Please provide a valid text prompt." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `You are an expert Enterprise Business Analyst. Generate a professional Business Requirements Document (BRD) in Markdown. Include a system architecture flowchart using Mermaid.js syntax inside a code block tagged with 'mermaid'.`;

        const contentsArray = [`${systemPrompt}\n\nUser Project Description: ${textPrompt}`];

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

        const result = await model.generateContent(contentsArray);
        const response = await result.response;
        return res.json({ success: true, brd: response.text() });

    } catch (error) {
        console.error("--- LOG ---");
        console.error(error);
        // This will tell us if version 2 is successfully running!
        res.status(500).json({ error: `❌ [VERSION 2 LIVE] Gemini API Error: ${error.message}` });
    }
});

app.get('/', (req, res) => {
    res.send("Backend Server Status: Operational");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Live on port ${PORT}`));
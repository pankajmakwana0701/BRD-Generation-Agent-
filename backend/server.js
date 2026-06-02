require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
});

console.log("================================");
console.log("🚀 BRD SERVER STARTED");
console.log("🔑 API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
console.log("================================");

app.get("/", (req, res) => {
  res.send("✅ BRD Backend Running");
});

app.get("/test", (req, res) => {
  res.json({
    success: true,
    apiKeyFound: !!process.env.GEMINI_API_KEY,
  });
});

// ====== FIXED GEMINI-TEST ROUTE ======
app.get("/gemini-test", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "GEMINI_API_KEY is missing in .env" });
    }

    // Direct HTTP Request to stable production v1 endpoint with correct model mapping
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: "Say: Gemini API working successfully" }] }]
    };

    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    const text = response.data.candidates[0].content.parts[0].text;

    res.json({
      success: true,
      response: text,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message,
    });
  }
});

// ====== FIXED MAIN BRD GENERATION ROUTE ======
app.post("/api/generate-brd", upload.array("files", 5), async (req, res) => {
  try {
    const { textPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!textPrompt) {
      return res.status(400).json({
        success: false,
        error: "Project requirements missing",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Server environment missing GEMINI_API_KEY token.",
      });
    }

    const prompt = `
You are an expert Business Analyst.
Create a professional BRD in Markdown.
Include:
# Executive Summary
# Project Overview
# Business Objectives
# Functional Requirements
# Non Functional Requirements
# User Stories
# Risks
# Assumptions
# Success Metrics

Project Description:
${textPrompt}`;

    // FIXED PRODUCTION ENDPOINT: Force stable network matching
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const googleResponse = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" }
    });

    const brd = googleResponse.data.candidates[0].content.parts[0].text;

    return res.json({
      success: true,
      brd,
    });
  } catch (error) {
    console.error("❌ BRD ERROR:");
    console.error(error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
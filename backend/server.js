require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

console.log("================================");
console.log("🚀 BRD SERVER STARTED");
console.log("🔑 GEMINI API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
console.log("================================");

app.get("/", (req, res) => res.send("✅ BRD Backend Running"));

app.get("/test", (req, res) => {
  res.json({ success: true, geminiKeyFound: !!process.env.GEMINI_API_KEY });
});

app.get("/gemini-test", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: "GEMINI_API_KEY missing." });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: "Say: Gemini API working successfully" }] }] };
    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    const text = response.data.candidates[0].content.parts[0].text;
    res.json({ success: true, response: text });
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
});

// ====== BRD GENERATION ROUTE ======
app.post("/api/generate-brd", upload.array("files", 5), async (req, res) => {
  try {
    const { textPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!textPrompt) return res.status(400).json({ success: false, error: "Project requirements missing" });
    if (!apiKey) return res.status(500).json({ success: false, error: "Server missing GEMINI_API_KEY." });

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const googleResponse = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    const brd = googleResponse.data.candidates[0].content.parts[0].text;
    return res.json({ success: true, brd });
  } catch (error) {
    console.error("❌ BRD ERROR:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
});

// ====== DIET PLAN GENERATION ROUTE ======
app.post("/api/generate-diet", async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!prompt) return res.status(400).json({ success: false, error: "Prompt missing" });
    if (!apiKey) return res.status(500).json({ success: false, error: "Server missing GEMINI_API_KEY." });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    const rawText = response.data.candidates[0].content.parts[0].text;

    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No valid JSON found");
    const plan = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));
    return res.json({ success: true, plan });
  } catch (error) {
    console.error("❌ DIET ERROR:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
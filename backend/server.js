// 1. SECURE ENVIRONMENT VARIABLES CONFIGURATION
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

// FIX: gemini-1.5-flash aur gemini-2.0-flash dono ab shutdown ho chuke hain.
// gemini-2.5-flash use kar rahe hain - fast, free-tier friendly, aur BRD/diet
// jaise text tasks ke liye 2.5 Pro jaisa hi accha. Sirf yahan model name badlo
// agar future me change karna ho (e.g. "gemini-2.5-pro").
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

console.log("================================");
console.log("🚀 BRD SERVER STARTED");
console.log("🔑 GEMINI API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
console.log("🤖 MODEL:", GEMINI_MODEL);
console.log("================================");

app.get("/", (req, res) => res.send("✅ BRD Backend Running"));

app.get("/test", (req, res) => {
  res.json({
    success: true,
    geminiKeyFound: !!process.env.GEMINI_API_KEY,
  });
});

// ====== LIST AVAILABLE MODELS (debugging helper) ======
// Browser me kholo: /list-models  -> ye dikhayega aapki key ke saath kaunse
// models available hain aur kaun generateContent support karta hai.
app.get("/list-models", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: "GEMINI_API_KEY missing." });

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await axios.get(url);

    const models = (response.data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name);

    res.json({ success: true, usableModels: models });
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
});

// ====== GEMINI TEST ROUTE ======
app.get("/gemini-test", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: "GEMINI_API_KEY missing." });

    const url = `${GEMINI_BASE}?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: "Say: Gemini API working successfully" }] }] };

    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    const text = response.data.candidates[0].content.parts[0].text;
    res.json({ success: true, response: text });
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
});

// ====== BRD GENERATION ROUTE (Gemini) ======
app.post("/api/generate-brd", upload.array("files", 5), async (req, res) => {
  try {
    const { textPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!textPrompt) return res.status(400).json({ success: false, error: "Project requirements missing" });
    if (!apiKey) return res.status(500).json({ success: false, error: "Server missing GEMINI_API_KEY." });

    const prompt = `
You are an expert Business Analyst.
Create a professional BRD in Markdown.
Include exact sections:
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

    const url = `${GEMINI_BASE}?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    const googleResponse = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });

    if (!googleResponse.data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid structure or empty content from Gemini API");
    }

    const brd = googleResponse.data.candidates[0].content.parts[0].text;
    return res.json({ success: true, brd });
  } catch (error) {
    console.error("❌ BRD ERROR:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
});

// ====== DIET PLAN GENERATION ROUTE (Gemini) ======
// Frontend ek poora `prompt` bhejta hai. responseMimeType se clean JSON milega
// jo frontend ke meals/tips/avoid structure se match karega.
app.post("/api/generate-diet", async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt missing for diet generation." });
    }
    if (!apiKey) return res.status(500).json({ success: false, error: "Server missing GEMINI_API_KEY." });

    const url = `${GEMINI_BASE}?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });

    const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Failed to capture structured JSON content from Gemini response context.");
    }

    // Because responseMimeType is enforced, this is clean JSON. No slicing needed.
    const plan = JSON.parse(rawText);

    return res.json({ success: true, plan });
  } catch (error) {
    console.error("❌ DIET ERROR:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
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

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

console.log("================================");
console.log("🚀 BRD SERVER STARTED");
console.log("🔑 GEMINI API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
console.log("🤖 MODEL:", GEMINI_MODEL);
console.log("================================");

app.get("/", (req, res) => res.send("✅ BRD Backend Running"));

app.get("/test", (req, res) => {
  res.json({ success: true, geminiKeyFound: !!process.env.GEMINI_API_KEY });
});

// ====== LIST AVAILABLE MODELS (debugging helper) ======
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

// ====== HELPER: Gemini ke response se clean JSON nikaalo ======
function safeParseJSON(rawText) {
  if (!rawText) throw new Error("Empty text from Gemini, parse nahi kar sakte.");

  try {
    return JSON.parse(rawText);
  } catch (e) {
    // continue to cleanup
  }

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return JSON.parse(cleaned);
}

// ====== DIET PLAN GENERATION ROUTE (Gemini) ======
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
        temperature: 0.7,
        maxOutputTokens: 4096,
        // FIX: gemini-2.5-flash ek "thinking" model hai. Kabhi-kabhi saara output
        // thinking tokens me chala jaata hai aur asli text khaali aata hai -> 500.
        // thinkingBudget: 0 se thinking band ho jaati hai -> seedha JSON milta hai.
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    };

    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });

    // Detailed logging taaki Render logs me exact problem dikhe
    const candidate = response.data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error("❌ DIET: No text. finishReason =", candidate?.finishReason);
      console.error("❌ DIET: full response =", JSON.stringify(response.data));
      throw new Error(
        `Gemini se text nahi mila. finishReason: ${candidate?.finishReason || "unknown"}`
      );
    }

    const plan = safeParseJSON(rawText);
    return res.json({ success: true, plan });
  } catch (error) {
    console.error("❌ DIET ERROR:", error.response?.data || error.message);
    return res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
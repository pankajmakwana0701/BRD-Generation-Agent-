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

console.log("================================");
console.log("🚀 BRD SERVER STARTED");
console.log("🔑 GEMINI API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
console.log("================================");

app.get("/", (req, res) => res.send("✅ BRD Backend Running"));

app.get("/test", (req, res) => {
  res.json({
    success: true,
    geminiKeyFound: !!process.env.GEMINI_API_KEY,
  });
});

// ====== GEMINI TEST ROUTE ======
app.get("/gemini-test", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: "GEMINI_API_KEY missing." });

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
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

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
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

// ====== DIET PLAN GENERATION ROUTE (Gemini - Structured & Safe) ======
app.post("/api/generate-diet", async (req, res) => {
  try {
    const { age, weight, height, gender, goal, dietType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Direct object key validation to avoid messy string operations
    if (!age || !weight || !height || !gender || !goal || !dietType) {
      return res.status(400).json({ success: false, error: "Missing required profile metrics for diet generation." });
    }
    if (!apiKey) return res.status(500).json({ success: false, error: "Server missing GEMINI_API_KEY." });

    const systemPrompt = `You are an expert nutritionist. Generate a detailed, culturally tailored Indian diet plan matching the user's bodily metrics and fitness goals. Provide exact food suggestions suitable for Indian households.`;
    const userPrompt = `Metrics: Age ${age}, Weight ${weight}kg, Height ${height}cm, Gender ${gender}, Goal ${goal}, Preference: ${dietType}.`;

    // REST base URL using the exact model configuration
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    // REST API Object matching strict Google schema rules
    const payload = {
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            totalCalories: { type: "NUMBER" },
            macroSplit: {
              type: "OBJECT",
              properties: {
                protein: { type: "STRING" },
                carbs: { type: "STRING" },
                fats: { type: "STRING" }
              },
              required: ["protein", "carbs", "fats"]
            },
            dietPlan: {
              type: "OBJECT",
              properties: {
                breakfast: { type: "STRING" },
                lunch: { type: "STRING" },
                snack: { type: "STRING" },
                dinner: { type: "STRING" }
              },
              required: ["breakfast", "lunch", "snack", "dinner"]
            },
            foodsToAvoid: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["totalCalories", "macroSplit", "dietPlan", "foodsToAvoid"]
        }
      }
    };

    const response = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    
    if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Failed to capture structured JSON content from Gemini response context.");
    }

    // Because responseMimeType is enforced, this is 100% clean JSON string. No slicing needed!
    const rawText = response.data.candidates[0].content.parts[0].text;
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
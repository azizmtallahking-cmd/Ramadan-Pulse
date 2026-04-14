import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// AI Proxy Route
app.post("/api/ai/generate", async (req, res) => {
  const { model, contents, config } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  try {
    const genAI = new GoogleGenAI({ apiKey }) as any;
    const aiModel = genAI.getGenerativeModel({ 
      model: model || "gemini-1.5-flash",
      systemInstruction: config?.systemInstruction,
      tools: config?.tools
    });

    const result = await aiModel.generateContent({
      contents: contents
    });

    const response = await result.response;
    res.json(response);
  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during AI generation." });
  }
});

export default app;

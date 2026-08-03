import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { articleText, userApiKey } = req.body;
    const apiKeyHeader = req.headers["x-gemini-api-key"] as string;

    const apiKey = userApiKey || apiKeyHeader || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "Gemini API Key missing. Please provide your API Key in Settings.",
      });
    }

    if (!articleText || articleText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: "Article text is too short or missing.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `
You are an expert CAT Verbal Ability (VARC) mentor, reading comprehension specialist, and educator.

Your task is to read the article below and generate EXACTLY FIVE CAT-level Reading Comprehension multiple-choice questions.

The questions should closely resemble the style, quality, and difficulty of recent CAT examinations.

DO NOT test factual recall.
Instead, evaluate the reader's comprehension and reasoning ability.

Focus primarily on:
• Inference
• Author's assumptions
• Argument evaluation
• Strengthening / Weakening arguments
• Author's intent
• Tone of the author
• Central idea
• Logical conclusion
• Vocabulary in context
• Paragraph purpose
• Critical reasoning

Question Distribution:
Generate exactly one question from each of the following categories:
1. Main Idea
2. Inference
3. Assumption
4. Strengthen / Weaken
5. Author's Intent OR Vocabulary in Context

Difficulty Distribution:
• 1 Easy question
• 2 Medium questions
• 2 Hard questions

Option Guidelines:
• Each question MUST contain EXACTLY four options (Option A, Option B, Option C, Option D).
• Every incorrect option should be plausible distractors (trapping common errors like over-generalization, misinterpreting tone, confusing correlation/causation).
• Only ONE option should be unquestionably correct.

Explanation Guidelines:
• Provide a detailed explanation (3-6 sentences) explaining WHY the correct answer is correct and WHY EACH incorrect option is incorrect.

Reference Guidelines:
• Include a short supporting reference from the article (max 25 words quote or short summary).

JSON FORMAT REQUIREMENTS:
Return ONLY a valid JSON array containing EXACTLY 5 question objects.
No markdown code fences outside JSON if possible, but return pure valid JSON.

JSON Structure per object:
{
  "type": "Inference",
  "difficulty": "Medium",
  "question": "Which of the following...",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "answer": "B",
  "explanation": "Detailed explanation...",
  "reference": "Short quote or summary from the passage."
}

Article:
${articleText}
`;

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const rawText = geminiResponse.text ? geminiResponse.text.trim() : "";
    let questions = [];

    try {
      questions = JSON.parse(rawText);
    } catch (parseErr) {
      const cleanedText = rawText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      questions = JSON.parse(cleanedText);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid response structure from AI model.");
    }

    questions = questions.map((q: any) => ({
      type: q.type || "Inference",
      difficulty: q.difficulty || "Medium",
      question: q.question || "",
      options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer || "A",
      explanation: q.explanation || "No explanation provided.",
      reference: q.reference || "No reference provided.",
    }));

    res.json({ success: true, questions });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate RC questions",
    });
  }
}

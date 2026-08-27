import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  timeout: 8000,
});

const RSS_SOURCES: Record<string, string[]> = {
  "Business & Economics": [
    "https://www.econlib.org/feed/",
    "https://blogs.imf.org/feed/",
    "https://theconversation.com/global/business-and-economy/articles.atom",
    "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://www.realclearmarkets.com/index.xml",
  ],
  "Science & Technology": [
    "https://www.quantamagazine.org/feed/",
    "https://rss.sciam.com/ScientificAmerican-Global",
    "https://theconversation.com/global/topics/science-416.rss",
    "https://theconversation.com/global/topics/technology-245.rss",
    "https://www.space.com/feeds/all",
    "https://nautil.us/feed/",
    "https://feeds.arstechnica.com/arstechnica/index",
    "https://phys.org/rss-feed/",
  ],
  "Philosophy & Psychology": [
    "https://aeon.co/feed.rss",
    "https://psyche.co/feed/",
    "https://www.psychologytoday.com/us/front/feed",
    "https://theconversation.com/global/topics/philosophy-7801.rss",
  ],
  "History • Society • Culture": [
    "https://daily.jstor.org/feed/",
    "https://www.smithsonianmag.com/rss/latest_articles/",
    "https://theconversation.com/us/articles.atom",
    "https://aldaily.com/feed/",
  ],
};

// Known paywalled domains to filter out completely
const PAYWALLED_DOMAINS = [
  "economist.com", "ft.com", "wsj.com", "dj.com", "nytimes.com", 
  "bloomberg.com", "barrons.com", "theatlantic.com", "hbr.org",
];

function getCleanPublisherSource(feedTitle: string | undefined, feedUrl: string, itemLink?: string): string {
  const genericList = ["latest updates", "rss feed", "latest articles", "feed", "uncategorized", "latest", "news source", "articles"];
  
  let host = "";
  try {
    const targetUrl = itemLink || feedUrl;
    const parsed = new URL(targetUrl);
    host = parsed.hostname.replace(/^www\./, "");
  } catch (e) {}

  const domainMap: Record<string, string> = {
    "economist.com": "Economist.com", "econlib.org": "Econlib.org", "imf.org": "IMF Blogs",
    "indiatimes.com": "Economic Times", "dj.com": "Wall Street Journal", "ft.com": "Financial Times",
    "sciam.com": "Scientific American", "nature.com": "Nature.com", "quantamagazine.org": "Quanta Magazine",
    "space.com": "Space.com", "theconversation.com": "The Conversation", "nautil.us": "Nautilus",
    "technologyreview.com": "MIT Tech Review", "arstechnica.com": "Ars Technica", "aeon.co": "Aeon.co",
    "psyche.co": "Psyche.co", "psychologytoday.com": "Psychology Today", "jstor.org": "JSTOR Daily",
    "smithsonianmag.com": "Smithsonian Magazine", "aldaily.com": "Arts & Letters Daily",
  };

  if (host) {
    for (const [d, name] of Object.entries(domainMap)) {
      if (host.includes(d)) return name;
    }
  }

  const cleanTitle = (feedTitle || "").trim();
  if (cleanTitle && !genericList.includes(cleanTitle.toLowerCase())) {
    return cleanTitle;
  }

  if (host) {
    return host.charAt(0).toUpperCase() + host.slice(1);
  }

  return "News Source";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Fetch RSS News Feeds
  app.get("/api/rss", async (_req, res) => {
    try {
      const results: Record<string, Array<{ title: string; link: string; source: string; snippet?: string }>> = {};

      for (const [category, urls] of Object.entries(RSS_SOURCES)) {
        const seen = new Set<string>();
        const articles: Array<{ title: string; link: string; source: string; snippet?: string }> = [];

        for (const url of urls) {
          try {
            const feed = await parser.parseURL(url);

            for (const item of feed.items || []) {
              if (!item.title || !item.link) continue;
              const itemLink = item.link.trim();
              if (PAYWALLED_DOMAINS.some((domain) => itemLink.toLowerCase().includes(domain))) continue;

              const cleanTitle = item.title.trim();
              if (seen.has(cleanTitle)) continue;
              seen.add(cleanTitle);

              const itemSource = getCleanPublisherSource(feed.title, url, itemLink);

              articles.push({
                title: cleanTitle,
                link: itemLink,
                source: itemSource,
                snippet: item.contentSnippet || item.summary || "",
              });
            }
          } catch (err) {
            // Silently continue if an individual feed fails
          }
        }

        results[category] = articles.slice(0, 15);
      }

      res.json({ success: true, categories: results, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Scrape Article Text for Reading & Quiz Generation
  app.post("/api/scrape-article", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: "URL is required" });

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch article`);

      const html = await response.text();

      let title = "";
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();

      let clean = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
        .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "");

      const pMatches = clean.match(/<p\b[^>]*>(.*?)<\/p>/gi);
      let articleText = "";

      if (pMatches && pMatches.length > 0) {
        const textLines = pMatches
          .map((p) => p.replace(/<[^>]+>/g, "").trim())
          .filter((text) => text.length > 30 && !/cookie|subscribe|sign up|newsletter|privacy policy|terms/i.test(text));
        articleText = textLines.join("\n\n");
      }

      if (!articleText || articleText.length < 150) {
        articleText = clean.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }

      const wordCount = articleText.split(/\s+/).filter(Boolean).length;

      res.json({ success: true, title: title || "Article", text: articleText, wordCount });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Generate CAT RC Questions using Gemini
  app.post("/api/generate-questions", async (req, res) => {
    try {
      const { articleText, userApiKey } = req.body;
      const apiKeyHeader = req.headers["x-gemini-api-key"] as string;

      const apiKey = userApiKey || apiKeyHeader || process.env.GEMINI_API_KEY;

      if (!apiKey) return res.status(400).json({ success: false, error: "Gemini API Key missing." });
      if (!articleText || articleText.trim().length < 50) return res.status(400).json({ success: false, error: "Article text is too short." });

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const prompt = `You are an expert CAT Verbal Ability (VARC) mentor... (Prompt content unchanged)`;

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: { temperature: 0.4, responseMimeType: "application/json" },
      });

      const rawText = geminiResponse.text ? geminiResponse.text.trim() : "";
      let questions = [];

      try {
        questions = JSON.parse(rawText);
      } catch (parseErr) {
        const cleanedText = rawText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
        questions = JSON.parse(cleanedText);
      }

      if (!Array.isArray(questions) || questions.length === 0) throw new Error("Invalid response structure from AI model.");

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
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // -----------------------------------------
  // NEW FIXED BLOCK: Serve the AI-Generated Daily Puzzle
  // -----------------------------------------
  app.get("/puzzle.json", (req, res) => {
    console.log("--> GET /puzzle.json hit!"); // Check terminal for this!
    const puzzlePath = path.resolve(process.cwd(), "public/puzzle.json");
    console.log("Looking for file at:", puzzlePath);
    console.log("File exists?", fs.existsSync(puzzlePath));

    if (!fs.existsSync(puzzlePath)) {
      return res.status(404).json({ error: "Puzzle file not found" });
    }

    const puzzleData = fs.readFileSync(puzzlePath, 'utf-8');
    if (!puzzleData || puzzleData.length === 0) {
      return res.status(500).json({ error: "Puzzle file is empty. Please regenerate it." });
    }

    // Set headers to disable caching completely
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "application/json");

    // Verify file exists to prevent fallthrough to Vite
    // Send the file directly
    return res.send(puzzleData);
  });

  // Static files
  
  // 3. Vite middleware (Must stay below all API / JSON routes)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }


  app.use(express.static(path.join(process.cwd(), "public")));

  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aether Focus Server running on http://localhost:${PORT}`);
  });
}

startServer();
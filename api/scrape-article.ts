import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch article`);
    }

    const html = await response.text();

    let title = "";
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

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
        .filter(
          (text) =>
            text.length > 30 &&
            !/cookie|subscribe|sign up|newsletter|privacy policy|terms/i.test(text)
        );
      articleText = textLines.join("\n\n");
    }

    if (!articleText || articleText.length < 150) {
      articleText = clean.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    const wordCount = articleText.split(/\s+/).filter(Boolean).length;

    res.json({
      success: true,
      title: title || "Article",
      text: articleText,
      wordCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

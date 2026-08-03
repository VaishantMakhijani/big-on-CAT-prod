import type { VercelRequest, VercelResponse } from '@vercel/node';
import Parser from 'rss-parser';

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

const PAYWALLED_DOMAINS = [
  "economist.com",
  "ft.com",
  "wsj.com",
  "dj.com",
  "nytimes.com",
  "bloomberg.com",
  "barrons.com",
  "theatlantic.com",
  "hbr.org",
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
    "economist.com": "Economist.com",
    "econlib.org": "Econlib.org",
    "imf.org": "IMF Blogs",
    "indiatimes.com": "Economic Times",
    "dj.com": "Wall Street Journal",
    "ft.com": "Financial Times",
    "sciam.com": "Scientific American",
    "nature.com": "Nature.com",
    "quantamagazine.org": "Quanta Magazine",
    "space.com": "Space.com",
    "theconversation.com": "The Conversation",
    "nautil.us": "Nautilus",
    "technologyreview.com": "MIT Tech Review",
    "arstechnica.com": "Ars Technica",
    "aeon.co": "Aeon.co",
    "psyche.co": "Psyche.co",
    "psychologytoday.com": "Psychology Today",
    "jstor.org": "JSTOR Daily",
    "smithsonianmag.com": "Smithsonian Magazine",
    "aldaily.com": "Arts & Letters Daily",
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

            if (PAYWALLED_DOMAINS.some((domain) => itemLink.toLowerCase().includes(domain))) {
              continue;
            }

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
}

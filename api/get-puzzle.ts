// api/get-puzzle.ts
import { head } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  try {
    const existingBlob = await head(`puzzles/${today}.json`, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    if (!existingBlob) {
      return res.status(404).json({ error: "Puzzle not generated yet. Please try again." });
    }

    // CRITICAL: Add the Authorization header so we can fetch the private blob!
    const response = await fetch(existingBlob.url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch puzzle: ${response.status}`);
    }

    const puzzleData = await response.json();
    res.status(200).json(puzzleData);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

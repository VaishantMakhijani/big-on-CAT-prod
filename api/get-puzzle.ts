// api/get-puzzle.ts
import { head } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  try {
    const existingBlob = await head(`puzzles/${today}.json`, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

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
    // If the file doesn't exist yet, tell the user nicely
    console.error("Puzzle not found:", error.message);
    res.status(404).json({ error: "Today's puzzle isn't generated yet. Please try again shortly." });
  }
}

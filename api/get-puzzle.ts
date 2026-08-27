// api/get-puzzle.ts
import { head } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  
  const existingBlob = await head(`puzzles/${today}.json`, {
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  if (!existingBlob) {
    return res.status(404).json({ error: "Puzzle not generated yet. Try after 12:00 AM IST." });
  }

  const response = await fetch(existingBlob.url);
  const puzzleData = await response.json();
  res.status(200).json(puzzleData);
}
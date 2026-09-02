import { head, put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BLOB_NAME = 'usercount.json';

function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
  return istTime.toISOString().split('T')[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body;
  if (type !== 'visit' && type !== 'wordpower') {
    return res.status(400).json({ error: 'Invalid tracking type' });
  }

  try {
    const today = getTodayIST();
    let data: Record<string, { visits: number; wordpower: number }> = {};

    // 1. Fetch existing blob if it exists
    try {
      const existingBlob = await head(BLOB_NAME, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      const response = await fetch(existingBlob.url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      if (response.ok) {
        data = await response.json();
      }
    } catch (e) {
      // Blob doesn't exist yet – treat as empty
    }

    // 2. Initialize today's entry if missing
    if (!data[today]) {
      data[today] = { visits: 0, wordpower: 0 };
    }

    // 3. Increment the appropriate counter
    if (type === 'visit') {
      data[today].visits += 1;
    } else if (type === 'wordpower') {
      data[today].wordpower += 1;
    }

    // 4. Write back to blob – with allowOverwrite: true
    await put(BLOB_NAME, JSON.stringify(data, null, 2), {
      access: 'private',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json',
      allowOverwrite: true, // ✅ FIXED
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Tracking error:', error);
    return res.status(500).json({ error: error.message || 'Tracking failed' });
  }
}
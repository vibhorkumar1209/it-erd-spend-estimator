import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateDesktop } from './utils/calc.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });

    const body = req.body || {};
    const { companyName, revenue, industry, country } = body;
    if (!companyName || revenue === undefined || !industry || !country) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = calculateDesktop(String(companyName), Number(revenue), String(industry), String(country));
        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(500).json({ error: 'Calculation failed', message: error.message });
    }
}

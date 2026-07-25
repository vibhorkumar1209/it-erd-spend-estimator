import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });

    const body = req.body || {};
    const { companyName, companyDomain, geo } = body;

    if (!companyName) {
        return res.status(400).json({ error: 'Missing required field: companyName' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error (missing API key).' });
    }

    const prompt = `You are an expert financial analyst and corporate intelligence researcher. Your task is to extract three specific metrics for ${companyName} and ${companyName} OR ${geo || 'Global'}.
Specifically, you must look for the projected or announced budget for the upcoming fiscal year 2026 (or the most recent forward-looking strategic budget explicitly announced).

The three metrics to extract are: IT Spend/Budget, R&D Spend/Budget, and AI Spend/Budget.

CRITICAL CONSTRAINT: You must only report these values if they are explicitly published by the company itself or by a top-tier analyst firm. Do not estimate, guess, or extrapolate.

1. PERMITTED SOURCES:
- Official company disclosures (Annual Reports/10-K, Investor Relations presentations, earnings call transcripts, or senior executive interviews).
- Top-tier analyst firms (e.g., Gartner, IDC, Forrester, Everest Group).

2. DATA CATEGORIES TO EXTRACT:
- IT Spend/Budget: The total overall annual corporate spend on information technology, software, cloud infrastructure, and digital systems. CRITICAL: This is the GROSS total technology budget. DO NOT subtract AI or R&D spend from this number. (e.g., if total tech budget is $20B and AI is $2B, report IT Spend as 20000).
- R&D Spend/Budget: The total annual expense allocated to Research, Development, and Product Engineering.
- AI Spend/Budget: The specific subset of budget allocated to Artificial Intelligence, Machine Learning, or generative AI initiatives.

3. REPORTING FORMAT:
Respond ONLY with a valid JSON object. Do not include any markdown formatting (like \`\`\`json) or additional text.
The JSON must have this exact schema:
{
  "it_spend": {
    "value": number | null, // Exact numeric figure in millions of USD if found, else null. For example, 19.8 billion is 19800.
    "sourceType": string, // "Company Disclosure", "Top Analyst Firm", or "N/A"
    "context": string // 1-2 sentence description or exact quote if found, else brief explanation.
  },
  "rd_spend": {
    "value": number | null,
    "sourceType": string,
    "context": string
  },
  "ai_spend": {
    "value": number | null,
    "sourceType": string,
    "context": string
  }
}

Company Domain context: ${companyDomain ? companyDomain : 'Not provided'}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ googleSearch: {} }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return res.status(500).json({ error: 'Failed to fetch AI data', details: data.error });
        }

        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsedData = JSON.parse(textContent);

        return res.status(200).json(parsedData);
    } catch (error: any) {
        console.error("Extraction error:", error);
        return res.status(500).json({ error: 'Calculation failed', message: error.message });
    }
}

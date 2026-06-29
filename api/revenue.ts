import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const companyName = req.query.companyName;
    const companyDomain = req.query.companyDomain || '';
    const industry = req.query.industry || '';
    const country = req.query.country || '';
    if (!companyName) {
        return res.status(400).json({ error: 'Missing companyName query parameter' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set' });
    }

    try {
        const domainText = companyDomain ? ` (website/domain: ${companyDomain})` : '';
        const industryText = industry ? ` in the ${industry} industry` : '';
        const countryText = country ? `, headquartered in ${country}` : '';
        
        const prompt = `You are a financial data API. Return the latest annual revenue (2024/2025) of ${companyName}${domainText}${industryText}${countryText} in USD.
Respond ONLY with a valid JSON object in this exact format:
{ "revenue_in_millions": 1500 }
If the revenue is 1.5 billion USD, the value should be 1500. If it's 500 million, the value should be 500.
Do not include markdown blocks or any other text, just the raw JSON object.`;
        
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
        
        let revenueNum: number;
        try {
            const parsed = JSON.parse(text);
            revenueNum = parsed.revenue_in_millions;
        } catch (e) {
            return res.status(500).json({ error: 'Failed to parse JSON response from Gemini', raw: text });
        }
        
        if (typeof revenueNum !== 'number' || isNaN(revenueNum)) {
             return res.status(500).json({ error: 'Could not extract numerical revenue', raw: text });
        }

        res.status(200).json({ revenue: revenueNum });
    } catch (error: any) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: 'Failed to fetch from Gemini', message: error.message });
    }
}

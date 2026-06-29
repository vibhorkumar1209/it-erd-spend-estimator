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
        
        const prompt = `What is the latest annual revenue (i.e. 2024/2025 revenue) of ${companyName}${domainText}${industryText}${countryText} in USD? Please provide ONLY the numerical value in millions of USD (e.g., if it's $1.5 billion, return 1500. If it's $500 million, return 500). Do not include any text, symbols like $ or commas. Just the number. If you are unsure, just return a reasonable estimate and only the number.`;
        
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        
        // Extract just the number
        const revenueNum = parseFloat(text.replace(/[^0-9.]/g, ''));
        
        if (isNaN(revenueNum)) {
             return res.status(500).json({ error: 'Could not parse revenue', raw: text });
        }

        res.status(200).json({ revenue: revenueNum });
    } catch (error: any) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: 'Failed to fetch from Gemini', message: error.message });
    }
}

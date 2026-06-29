import express from 'express';
import cors from 'cors';
import { calculateSpend, getIndustries, getCountries } from './src/services/calculationEngine';

const app = express();
app.use(cors());
app.use(express.json());

// Load environment variables for Gemini API key if needed
import { config } from 'dotenv';
config();

const PORT = process.env.PORT || 3000;

app.post('/api/calculate', (req, res) => {
    const { companyName, revenue, industry, country } = req.body;

    if (!companyName || !revenue || !industry || !country) {
        return res.status(400).json({ error: 'Missing required parameters (companyName, revenue, industry, country)' });
    }

    try {
        const result = calculateSpend(companyName, Number(revenue), industry, country);
        res.json(result);
    } catch (error) {
        console.error('Calculation error:', error);
        res.status(500).json({ error: 'Internal server error during calculation' });
    }
});

app.get('/api/revenue', async (req, res) => {
    const { companyName, companyDomain, industry, country } = req.query;
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

        res.json({ revenue: revenueNum });
    } catch (error: any) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: 'Failed to fetch from Gemini', message: error.message });
    }
});

app.get('/api/industries', (req, res) => {
    res.json({ industries: getIndustries() });
});

app.get('/api/countries', (req, res) => {
    res.json({ countries: getCountries() });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`\n--- Example API Usage ---`);
    console.log(`curl -X POST http://localhost:${PORT}/api/calculate \\
  -H "Content-Type: application/json" \\
  -d '{"companyName": "Tech Corp", "revenue": 1000, "industry": "Software", "country": "Norway"}'`);
});

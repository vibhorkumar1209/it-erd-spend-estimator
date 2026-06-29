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

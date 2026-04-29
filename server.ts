import express from 'express';
import cors from 'cors';
import { calculateSpend, getIndustries, getCountries } from './src/services/calculationEngine';

const app = express();
app.use(cors());
app.use(express.json());

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

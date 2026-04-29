import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateSpend } from '../src/services/calculationEngine';

export default function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    const { companyName, revenue, industry, country } = req.body;

    if (!companyName || revenue === undefined || !industry || !country) {
        return res.status(400).json({
            error: 'Missing required fields',
            required: ['companyName', 'revenue', 'industry', 'country'],
            example: {
                companyName: 'Equinor',
                revenue: 5000,
                industry: 'Energy (Oil & Gas)',
                country: 'Norway'
            }
        });
    }

    try {
        const result = calculateSpend(String(companyName), Number(revenue), String(industry), String(country));
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Calculation error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}

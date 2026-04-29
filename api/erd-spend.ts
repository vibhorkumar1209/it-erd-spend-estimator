import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load data at cold-start
const dataPath = join(process.cwd(), 'src', 'data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

function calculateERDSpend(companyName: string, revenue: number, industry: string, country: string) {
    const region: string = data.countries[country] || 'ROW2';
    const regionAdj: number = data.lookups.region_adj[region] || 0;

    let revenueTier = '<$10M';
    if (revenue > 5000) revenueTier = '>$5B';
    else if (revenue > 1000) revenueTier = '$1B-$5B';
    else if (revenue > 500) revenueTier = '$500M-$1B';
    else if (revenue > 100) revenueTier = '$100M-$500M';
    else if (revenue > 10) revenueTier = '$10M-$100M';

    const revenueAdj: number = data.lookups.revenue_adj[revenueTier] || 0;

    const years = Object.keys(data.multiyear.erd[industry] || {}).map(Number).sort((a: number, b: number) => a - b);
    const trends = years.map((year: number, index: number) => {
        const erdBase = (data.multiyear.erd[industry]?.[year] || 0) / 100;
        const erdFinal = erdBase * (1 + regionAdj) * (1 + revenueAdj);
        const erdSpend = revenue * erdFinal;
        let erdYoY = 0;
        if (index > 0) {
            const prevYear = years[index - 1];
            const prevErdBase = (data.multiyear.erd[industry]?.[prevYear] || 0) / 100;
            const prevErdFinal = prevErdBase * (1 + regionAdj) * (1 + revenueAdj);
            const prevErdSpend = revenue * prevErdFinal;
            if (prevErdSpend > 0) erdYoY = ((erdSpend / prevErdSpend) - 1) * 100;
        }
        return { year, erdSpend, erdPercent: erdFinal * 100, erdYoY };
    });

    const getCAGR = (startVal: number, endVal: number, yrs: number) => {
        if (startVal <= 0 || endVal <= 0) return 0;
        return (Math.pow(endVal / startVal, 1 / yrs) - 1) * 100;
    };

    const val2022_ERD = trends.find((t: any) => t.year === 2022)?.erdSpend || 0;
    const val2024_ERD = trends.find((t: any) => t.year === 2024)?.erdSpend || 0;
    const val2030_ERD = trends.find((t: any) => t.year === 2030)?.erdSpend || 0;

    const baselineERD = trends.find((t: any) => t.year === 2026)?.erdSpend || val2024_ERD;

    // ERD Breakdown
    const erdBreakdown: any[] = [];
    const erdIndustryData = data.erd_breakdown[industry];
    if (erdIndustryData) {
        Object.entries(erdIndustryData).forEach(([cat, weight]: [string, any]) => {
            erdBreakdown.push({ id: cat, name: cat, value: baselineERD * weight, percentage: weight * 100, level: 0 });
        });
    }

    return {
        companyName, revenue, industry, country, region,
        trends,
        erdCAGR_Historical: getCAGR(val2022_ERD, val2024_ERD, 2),
        erdCAGR_Forecast: getCAGR(val2024_ERD, val2030_ERD, 6),
        erdBreakdown
    };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });

    const { companyName, revenue, industry, country } = req.body;
    if (!companyName || revenue === undefined || !industry || !country) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = calculateERDSpend(String(companyName), Number(revenue), String(industry), String(country));
        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(500).json({ error: 'Calculation failed', message: error.message });
    }
}

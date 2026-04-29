import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load data at cold-start
const dataPath = join(process.cwd(), 'src', 'data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

function calculateITSpend(companyName: string, revenue: number, industry: string, country: string) {
    const region: string = data.countries[country] || 'ROW2';
    const regionAdj: number = data.lookups.region_adj[region] || 0;

    let revenueTier = '<$10M';
    if (revenue > 5000) revenueTier = '>$5B';
    else if (revenue > 1000) revenueTier = '$1B-$5B';
    else if (revenue > 500) revenueTier = '$500M-$1B';
    else if (revenue > 100) revenueTier = '$100M-$500M';
    else if (revenue > 10) revenueTier = '$10M-$100M';

    const revenueAdj: number = data.lookups.revenue_adj[revenueTier] || 0;

    const years = Object.keys(data.multiyear.it[industry] || {}).map(Number).sort((a: number, b: number) => a - b);
    const trends = years.map((year: number, index: number) => {
        const itBase = (data.multiyear.it[industry]?.[year] || 0) / 100;
        const itFinal = itBase * (1 + regionAdj) * (1 + revenueAdj);
        const itSpend = revenue * itFinal;
        let itYoY = 0;
        if (index > 0) {
            const prevYear = years[index - 1];
            const prevItBase = (data.multiyear.it[industry]?.[prevYear] || 0) / 100;
            const prevItFinal = prevItBase * (1 + regionAdj) * (1 + revenueAdj);
            const prevItSpend = revenue * prevItFinal;
            if (prevItSpend > 0) itYoY = ((itSpend / prevItSpend) - 1) * 100;
        }
        return { year, itSpend, itPercent: itFinal * 100, itYoY };
    });

    const getCAGR = (startVal: number, endVal: number, yrs: number) => {
        if (startVal <= 0 || endVal <= 0) return 0;
        return (Math.pow(endVal / startVal, 1 / yrs) - 1) * 100;
    };

    const val2022_IT = trends.find((t: any) => t.year === 2022)?.itSpend || 0;
    const val2024_IT = trends.find((t: any) => t.year === 2024)?.itSpend || 0;
    const val2030_IT = trends.find((t: any) => t.year === 2030)?.itSpend || 0;

    const baselineIT = trends.find((t: any) => t.year === 2026)?.itSpend || val2024_IT;

    // IT Breakdown
    const itBreakdown: any[] = [];
    const itIndustryData = data.it_breakdown[industry];
    if (itIndustryData) {
        Object.entries(itIndustryData).forEach(([l1, l2s]: [string, any]) => {
            let l1Item: any = { id: `L1-${l1}`, name: l1, value: 0, percentage: 0, level: 0, children: [] };
            itBreakdown.push(l1Item);
            Object.entries(l2s).forEach(([l2, l3s]: [string, any]) => {
                const l2Item: any = { id: `L2-${l1}-${l2}`, name: l2, value: 0, percentage: 0, level: 1, children: [] };
                Object.entries(l3s).forEach(([l3, weight]: [string, any]) => {
                    const val = baselineIT * weight;
                    l2Item.value += val;
                    l2Item.children.push({ id: `L3-${l1}-${l2}-${l3}`, name: l3, value: val, percentage: weight * 100, level: 2 });
                });
                l2Item.percentage = (l2Item.value / baselineIT) * 100;
                l1Item.value += l2Item.value;
                l1Item.children.push(l2Item);
            });
            l1Item.percentage = (l1Item.value / baselineIT) * 100;
        });
    }

    // Emerging Tech (IT specific)
    const emergingTech: any[] = [];
    const industryETBase = data.lookups.emerging_tech.industry_base[industry] || {};
    const etCats = new Set([...Object.keys(data.lookups.emerging_tech.region_adj), ...Object.keys(industryETBase)]);
    
    etCats.forEach((name: any) => {
        let etValue = 0;
        const baseWeight = (industryETBase[name] || 0) / 100;
        const rAdj = (data.lookups.emerging_tech.region_adj[name]?.[region] || 0) / 100;
        const revAdj = (data.lookups.emerging_tech.revenue_adj[name]?.[revenueTier] || 0) / 100;
        const etAdjTotal = baseWeight * (1 + rAdj) * (1 + revAdj);
        
        if (name === 'Blockchain') {
            let blockchainIT = 0;
            itBreakdown.forEach((l1: any) => l1.children?.forEach((l2: any) => l2.children?.forEach((l3: any) => {
                if (l3.name.toLowerCase().includes('blockchain')) blockchainIT += l3.value;
            })));
            etValue = blockchainIT;
        } else if (name !== 'AI (ML/DL/GenAI & Safety)') { // AI is often ERD heavy, skipping for IT-only simplified view if needed, but let's keep it if IT spend driven
            etValue = baselineIT * etAdjTotal;
        }

        if (etValue > 0 || baseWeight > 0) {
            emergingTech.push({ name, value: etValue, adjTotal: etAdjTotal * 100 });
        }
    });

    return {
        companyName, revenue, industry, country, region, 
        trends,
        itCAGR_Historical: getCAGR(val2022_IT, val2024_IT, 2),
        itCAGR_Forecast: getCAGR(val2024_IT, val2030_IT, 6),
        itBreakdown,
        emergingTech
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
        const result = calculateITSpend(String(companyName), Number(revenue), String(industry), String(country));
        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(500).json({ error: 'Calculation failed', message: error.message });
    }
}

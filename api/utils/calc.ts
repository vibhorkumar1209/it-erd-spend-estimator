import { data } from '../calculator-data';

export function getRawData() {
    return data;
}

export function calculateAll(companyName: string, revenue: number, industry: string, country: string) {
    const region: string = data.countries[country] || 'ROW2';
    const regionAdj: number = data.lookups.region_adj[region] || 0;

    let revenueTier = '<$10M';
    if (revenue > 5000) revenueTier = '>$5B';
    else if (revenue > 1000) revenueTier = '$1B-$5B';
    else if (revenue > 500) revenueTier = '$500M-$1B';
    else if (revenue > 100) revenueTier = '$100M-$500M';
    else if (revenue > 10) revenueTier = '$10M-$100M';

    const revenueAdj: number = data.lookups.revenue_adj[revenueTier] || 0;

    const itYears = Object.keys(data.multiyear.it[industry] || {}).map(Number).sort((a, b) => a - b);
    const erdYears = Object.keys(data.multiyear.erd[industry] || {}).map(Number).sort((a, b) => a - b);
    const allYears = Array.from(new Set([...itYears, ...erdYears])).sort((a, b) => a - b);

    const trends = allYears.map((year, index) => {
        const itBase = (data.multiyear.it[industry]?.[year] || 0) / 100;
        const erdBase = (data.multiyear.erd[industry]?.[year] || 0) / 100;
        const itFinal = itBase * (1 + regionAdj) * (1 + revenueAdj);
        const erdFinal = erdBase * (1 + regionAdj) * (1 + revenueAdj);
        const itSpend = revenue * itFinal;
        const erdSpend = revenue * erdFinal;
        
        let itYoY = 0, erdYoY = 0;
        if (index > 0) {
            const prevYear = allYears[index - 1];
            const prevItBase = (data.multiyear.it[industry]?.[prevYear] || 0) / 100;
            const prevErdBase = (data.multiyear.erd[industry]?.[prevYear] || 0) / 100;
            const prevItFinal = prevItBase * (1 + regionAdj) * (1 + revenueAdj);
            const prevErdFinal = prevErdBase * (1 + regionAdj) * (1 + revenueAdj);
            const prevItSpend = revenue * prevItFinal;
            const prevErdSpend = revenue * prevErdFinal;
            if (prevItSpend > 0) itYoY = ((itSpend / prevItSpend) - 1) * 100;
            if (prevErdSpend > 0) erdYoY = ((erdSpend / prevErdSpend) - 1) * 100;
        }
        return { year, itSpend, erdSpend, itPercent: itFinal * 100, erdPercent: erdFinal * 100, itYoY, erdYoY };
    });

    const getCAGR = (startVal: number, endVal: number, yrs: number) => {
        if (startVal <= 0 || endVal <= 0) return 0;
        return (Math.pow(endVal / startVal, 1 / yrs) - 1) * 100;
    };

    const val2022_IT = trends.find(t => t.year === 2022)?.itSpend || 0;
    const val2024_IT = trends.find(t => t.year === 2024)?.itSpend || 0;
    const val2030_IT = trends.find(t => t.year === 2030)?.itSpend || 0;
    const val2022_ERD = trends.find(t => t.year === 2022)?.erdSpend || 0;
    const val2024_ERD = trends.find(t => t.year === 2024)?.erdSpend || 0;
    const val2030_ERD = trends.find(t => t.year === 2030)?.erdSpend || 0;

    const baselineIT = trends.find(t => t.year === 2026)?.itSpend || val2024_IT;
    const baselineERD = trends.find(t => t.year === 2026)?.erdSpend || val2024_ERD;

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

    // ERD Breakdown
    const erdBreakdown: any[] = [];
    const erdIndustryData = data.erd_breakdown[industry];
    if (erdIndustryData) {
        Object.entries(erdIndustryData).forEach(([cat, weight]: [string, any]) => {
            erdBreakdown.push({ id: cat, name: cat, value: baselineERD * weight, percentage: weight * 100, level: 0 });
        });
    }

    // Emerging Tech
    const emergingTech: any[] = [];
    const industryETBase = data.lookups.emerging_tech.industry_base[industry] || {};
    const etCats = new Set([...Object.keys(data.lookups.emerging_tech.region_adj), ...Object.keys(industryETBase)]);
    const erdHeavyIndustries = ['Aerospace & Defence', 'Automotive', 'Construction', 'Energy (Oil & Gas)',
        'Healthcare Providers', 'Industrial Manufacturing – Discrete', 'Industrial Manufacturing – Process',
        'IT Hardware', 'IT Services', 'Medical Devices', 'Mineral / Mining / Natural Resources',
        'Pharmaceuticals / Life Sciences', 'Telecommunications', 'Transportation'];

    etCats.forEach((name: any) => {
        let etValue = 0;
        const baseWeight = (industryETBase[name] || 0) / 100;
        const rAdj = (data.lookups.emerging_tech.region_adj[name]?.[region] || 0) / 100;
        const revAdj = (data.lookups.emerging_tech.revenue_adj[name]?.[revenueTier] || 0) / 100;
        const etAdjTotal = baseWeight * (1 + rAdj) * (1 + revAdj);
        if (name === 'AI (ML/DL/GenAI & Safety)' && erdHeavyIndustries.includes(industry)) {
            const aiErdBreakdown = erdBreakdown.find(b => b.id === 'AI/ML & Data Engineering');
            etValue = aiErdBreakdown ? aiErdBreakdown.value : 0;
        } else if (name === 'Blockchain') {
            let blockchainIT = 0;
            itBreakdown.forEach(l1 => l1.children?.forEach((l2: any) => l2.children?.forEach((l3: any) => {
                if (l3.name.toLowerCase().includes('blockchain')) blockchainIT += l3.value;
            })));
            etValue = blockchainIT;
        } else {
            etValue = baselineIT * etAdjTotal;
        }
        if (etValue > 0 || baseWeight > 0) {
            emergingTech.push({ name, value: etValue, adjTotal: etAdjTotal * 100 });
        }
    });

    return {
        companyInfo: { companyName, revenue, industry, country, region, revenueTier },
        itSpend: {
            trends: trends.map(t => ({ year: t.year, spend: t.itSpend, percent: t.itPercent, yoy: t.itYoY })),
            cagrHistorical: getCAGR(val2022_IT, val2024_IT, 2),
            cagrForecast: getCAGR(val2024_IT, val2030_IT, 6),
            breakdown: itBreakdown,
            emergingTech: emergingTech
        },
        erdSpend: {
            trends: trends.map(t => ({ year: t.year, spend: t.erdSpend, percent: t.erdPercent, yoy: t.erdYoY })),
            cagrHistorical: getCAGR(val2022_ERD, val2024_ERD, 2),
            cagrForecast: getCAGR(val2024_ERD, val2030_ERD, 6),
            breakdown: erdBreakdown
        }
    };
}

export function calculateDesktop(companyName: string, revenue: number, industry: string, country: string) {
    const region: string = data.countries[country] || 'ROW2';
    const regionAdj: number = data.lookups.region_adj[region] || 0;

    let revenueTier = '<$10M';
    if (revenue > 5000) revenueTier = '>$5B';
    else if (revenue > 1000) revenueTier = '$1B-$5B';
    else if (revenue > 500) revenueTier = '$500M-$1B';
    else if (revenue > 100) revenueTier = '$100M-$500M';
    else if (revenue > 10) revenueTier = '$10M-$100M';

    const revenueAdj: number = data.lookups.revenue_adj[revenueTier] || 0;

    const itYears = Object.keys(data.multiyear.it[industry] || {}).map(Number).sort((a, b) => a - b);
    const erdYears = Object.keys(data.multiyear.erd[industry] || {}).map(Number).sort((a, b) => a - b);
    const allYears = Array.from(new Set([...itYears, ...erdYears])).sort((a, b) => a - b);

    const trends = allYears.map((year, index) => {
        const itBase = (data.multiyear.it[industry]?.[year] || 0) / 100;
        const erdBase = (data.multiyear.erd[industry]?.[year] || 0) / 100;
        const itFinal = itBase * (1 + regionAdj) * (1 + revenueAdj);
        const erdFinal = erdBase * (1 + regionAdj) * (1 + revenueAdj);
        const itSpend = revenue * itFinal;
        const erdSpend = revenue * erdFinal;
        
        let itYoY = 0, erdYoY = 0;
        if (index > 0) {
            const prevYear = allYears[index - 1];
            const prevItBase = (data.multiyear.it[industry]?.[prevYear] || 0) / 100;
            const prevErdBase = (data.multiyear.erd[industry]?.[prevYear] || 0) / 100;
            const prevItFinal = prevItBase * (1 + regionAdj) * (1 + revenueAdj);
            const prevErdFinal = prevErdBase * (1 + regionAdj) * (1 + revenueAdj);
            const prevItSpend = revenue * prevItFinal;
            const prevErdSpend = revenue * prevErdFinal;
            if (prevItSpend > 0) itYoY = ((itSpend / prevItSpend) - 1) * 100;
            if (prevErdSpend > 0) erdYoY = ((erdSpend / prevErdSpend) - 1) * 100;
        }
        return { year, itSpend, erdSpend, itPercent: itFinal * 100, erdPercent: erdFinal * 100, itYoY, erdYoY };
    });

    const getCAGR = (startVal: number, endVal: number, yrs: number) => {
        if (startVal <= 0 || endVal <= 0) return 0;
        return (Math.pow(endVal / startVal, 1 / yrs) - 1) * 100;
    };

    const val2022_IT = trends.find(t => t.year === 2022)?.itSpend || 0;
    const val2024_IT = trends.find(t => t.year === 2024)?.itSpend || 0;
    const val2030_IT = trends.find(t => t.year === 2030)?.itSpend || 0;
    const val2022_ERD = trends.find(t => t.year === 2022)?.erdSpend || 0;
    const val2024_ERD = trends.find(t => t.year === 2024)?.erdSpend || 0;
    const val2030_ERD = trends.find(t => t.year === 2030)?.erdSpend || 0;

    const baselineIT = trends.find(t => t.year === 2026)?.itSpend || val2024_IT;
    const baselineERD = trends.find(t => t.year === 2026)?.erdSpend || val2024_ERD;

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

    // ERD Breakdown
    const erdBreakdown: any[] = [];
    const erdIndustryData = data.erd_breakdown[industry];
    if (erdIndustryData) {
        Object.entries(erdIndustryData).forEach(([cat, weight]: [string, any]) => {
            erdBreakdown.push({ id: cat, name: cat, value: baselineERD * weight, percentage: weight * 100, level: 0 });
        });
    }

    // Emerging Tech
    const emergingTech: any[] = [];
    const industryETBase = data.lookups.emerging_tech.industry_base[industry] || {};
    const etCats = new Set([...Object.keys(data.lookups.emerging_tech.region_adj), ...Object.keys(industryETBase)]);
    const erdHeavyIndustries = ['Aerospace & Defence', 'Automotive', 'Construction', 'Energy (Oil & Gas)',
        'Healthcare Providers', 'Industrial Manufacturing – Discrete', 'Industrial Manufacturing – Process',
        'IT Hardware', 'IT Services', 'Medical Devices', 'Mineral / Mining / Natural Resources',
        'Pharmaceuticals / Life Sciences', 'Telecommunications', 'Transportation'];

    etCats.forEach((name: any) => {
        let etValue = 0;
        const baseWeight = (industryETBase[name] || 0) / 100;
        const rAdj = (data.lookups.emerging_tech.region_adj[name]?.[region] || 0) / 100;
        const revAdj = (data.lookups.emerging_tech.revenue_adj[name]?.[revenueTier] || 0) / 100;
        const etAdjTotal = baseWeight * (1 + rAdj) * (1 + revAdj);
        if (name === 'AI (ML/DL/GenAI & Safety)' && erdHeavyIndustries.includes(industry)) {
            const aiErdBreakdown = erdBreakdown.find(b => b.id === 'AI/ML & Data Engineering');
            etValue = aiErdBreakdown ? aiErdBreakdown.value : 0;
        } else if (name === 'Blockchain') {
            let blockchainIT = 0;
            itBreakdown.forEach(l1 => l1.children?.forEach((l2: any) => l2.children?.forEach((l3: any) => {
                if (l3.name.toLowerCase().includes('blockchain')) blockchainIT += l3.value;
            })));
            etValue = blockchainIT;
        } else {
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
        erdCAGR_Historical: getCAGR(val2022_ERD, val2024_ERD, 2),
        erdCAGR_Forecast: getCAGR(val2024_ERD, val2030_ERD, 6),
        itBreakdown, erdBreakdown, emergingTech
    };
}

export function calculateITSpendDesktop(companyName: string, revenue: number, industry: string, country: string) {
    const full = calculateDesktop(companyName, revenue, industry, country);
    return {
        companyName: full.companyName,
        revenue: full.revenue,
        industry: full.industry,
        country: full.country,
        region: full.region,
        trends: full.trends.map(t => ({ year: t.year, itSpend: t.itSpend, itPercent: t.itPercent, itYoY: t.itYoY })),
        itCAGR_Historical: full.itCAGR_Historical,
        itCAGR_Forecast: full.itCAGR_Forecast,
        itBreakdown: full.itBreakdown,
        emergingTech: full.emergingTech
    };
}

export function calculateERDSpendDesktop(companyName: string, revenue: number, industry: string, country: string) {
    const full = calculateDesktop(companyName, revenue, industry, country);
    return {
        companyName: full.companyName,
        revenue: full.revenue,
        industry: full.industry,
        country: full.country,
        region: full.region,
        trends: full.trends.map(t => ({ year: t.year, erdSpend: t.erdSpend, erdPercent: t.erdPercent, erdYoY: t.erdYoY })),
        erdCAGR_Historical: full.erdCAGR_Historical,
        erdCAGR_Forecast: full.erdCAGR_Forecast,
        erdBreakdown: full.erdBreakdown
    };
}

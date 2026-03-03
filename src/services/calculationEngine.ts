import rawData from '../data.json';

interface LookupData {
    multiyear: {
        it: { [industry: string]: { [year: string]: number } };
        erd: { [industry: string]: { [year: string]: number } };
    };
    lookups: {
        region_adj: { [key: string]: number };
        revenue_adj: { [key: string]: number };
        emerging_tech: {
            region_adj: { [key: string]: { [region: string]: number } };
            revenue_adj: { [key: string]: { [tier: string]: number } };
            industry_base: { [industry: string]: { [cat: string]: number } };
        };
    };
    countries: { [key: string]: string };
    it_breakdown: {
        [industry: string]: {
            [l1: string]: {
                [l2: string]: {
                    [l3: string]: number;
                }
            }
        };
    };
    erd_breakdown: {
        [industry: string]: {
            [cat: string]: number;
        }
    };
}

const data = rawData as LookupData;

export interface BreakdownItem {
    id: string;
    name: string;
    value: number;
    percentage: number;
    level: number;
    children?: BreakdownItem[];
}

export interface EmergingTechResult {
    name: string;
    value: number;
    adjTotal: number;
}

export interface YearlyEstimate {
    year: number;
    itSpend: number;
    erdSpend: number;
    itPercent: number;
    erdPercent: number;
    itYoY: number;
    erdYoY: number;
}

export interface SpendBreakdown {
    companyName: string;
    revenue: number;
    industry: string;
    country: string;
    region: string;
    trends: YearlyEstimate[];
    itCAGR_Historical: number;
    itCAGR_Forecast: number;
    erdCAGR_Historical: number;
    erdCAGR_Forecast: number;
    itBreakdown: BreakdownItem[];
    erdBreakdown: BreakdownItem[];
    emergingTech: EmergingTechResult[];
}

export const calculateSpend = (
    companyName: string,
    revenue: number,
    industry: string,
    country: string,
): SpendBreakdown => {
    const region = data.countries[country] || 'ROW2';
    const regionAdj = data.lookups.region_adj[region] || 0;

    let revenueTier = '<$10M';
    if (revenue > 5000) revenueTier = '>$5B';
    else if (revenue > 1000) revenueTier = '$1B-$5B';
    else if (revenue > 500) revenueTier = '$500M-$1B';
    else if (revenue > 100) revenueTier = '$100M-$500M';
    else if (revenue > 10) revenueTier = '$10M-$100M';

    const revenueAdj = data.lookups.revenue_adj[revenueTier] || 0;

    const years = Object.keys(data.multiyear.it[industry] || {}).map(Number).sort((a, b) => a - b);
    const trends: YearlyEstimate[] = years.map((year, index) => {
        const itBase = (data.multiyear.it[industry]?.[year] || 0) / 100;
        const erdBase = (data.multiyear.erd[industry]?.[year] || 0) / 100;

        const itFinal = itBase * (1 + regionAdj) * (1 + revenueAdj);
        const erdFinal = erdBase * (1 + regionAdj) * (1 + revenueAdj);

        const itSpend = revenue * itFinal;
        const erdSpend = revenue * erdFinal;

        let itYoY = 0;
        let erdYoY = 0;

        if (index > 0) {
            const prevYear = years[index - 1];
            const prevItBase = (data.multiyear.it[industry]?.[prevYear] || 0) / 100;
            const prevErdBase = (data.multiyear.erd[industry]?.[prevYear] || 0) / 100;
            const prevItFinal = prevItBase * (1 + regionAdj) * (1 + revenueAdj);
            const prevErdFinal = prevErdBase * (1 + regionAdj) * (1 + revenueAdj);
            const prevItSpend = revenue * prevItFinal;
            const prevErdSpend = revenue * prevErdFinal;

            if (prevItSpend > 0) itYoY = ((itSpend / prevItSpend) - 1) * 100;
            if (prevErdSpend > 0) erdYoY = ((erdSpend / prevErdSpend) - 1) * 100;
        }

        return {
            year,
            itSpend,
            erdSpend,
            itPercent: itFinal * 100,
            erdPercent: erdFinal * 100,
            itYoY,
            erdYoY
        };
    });

    const getCAGR = (startVal: number, endVal: number, years: number) => {
        if (startVal <= 0 || endVal <= 0) return 0;
        return (Math.pow(endVal / startVal, 1 / years) - 1) * 100;
    };

    const val2022_IT = trends.find(t => t.year === 2022)?.itSpend || 0;
    const val2024_IT = trends.find(t => t.year === 2024)?.itSpend || 0;
    const val2030_IT = trends.find(t => t.year === 2030)?.itSpend || 0;

    const val2022_ERD = trends.find(t => t.year === 2022)?.erdSpend || 0;
    const val2024_ERD = trends.find(t => t.year === 2024)?.erdSpend || 0;
    const val2030_ERD = trends.find(t => t.year === 2030)?.erdSpend || 0;

    const itCAGR_Hist = getCAGR(val2022_IT, val2024_IT, 2);
    const itCAGR_Fore = getCAGR(val2024_IT, val2030_IT, 6);
    const erdCAGR_Hist = getCAGR(val2022_ERD, val2024_ERD, 2);
    const erdCAGR_Fore = getCAGR(val2024_ERD, val2030_ERD, 6);

    // Completely rely on the natively structured 2026 data from data.json
    const baselineIT = trends.find(t => t.year === 2026)?.itSpend || val2024_IT;
    const baselineERD = trends.find(t => t.year === 2026)?.erdSpend || val2024_ERD;

    const itBreakdown: BreakdownItem[] = [];
    const itIndustryData = data.it_breakdown[industry];
    if (itIndustryData) {
        Object.entries(itIndustryData).forEach(([l1, l2s]) => {
            let l1Item: BreakdownItem = { id: `L1-${l1}`, name: l1, value: 0, percentage: 0, level: 0, children: [] };
            itBreakdown.push(l1Item);

            Object.entries(l2s).forEach(([l2, l3s]) => {
                const l2Item: BreakdownItem = { id: `L2-${l1}-${l2}`, name: l2, value: 0, percentage: 0, level: 1, children: [] };
                Object.entries(l3s).forEach(([l3, weight]) => {
                    const val = baselineIT * weight;
                    l2Item.value += val;
                    l2Item.children?.push({ id: `L3-${l1}-${l2}-${l3}`, name: l3, value: val, percentage: weight * 100, level: 2 });
                });
                l2Item.percentage = (l2Item.value / baselineIT) * 100;
                l1Item.value += l2Item.value;
                l1Item.children?.push(l2Item);
            });
            l1Item.percentage = (l1Item.value / baselineIT) * 100;
        });
    }

    const erdBreakdown: BreakdownItem[] = [];
    const erdIndustryData = data.erd_breakdown[industry];
    if (erdIndustryData) {
        Object.entries(erdIndustryData).forEach(([cat, weight]) => {
            erdBreakdown.push({
                id: cat,
                name: cat,
                value: baselineERD * weight,
                percentage: weight * 100,
                level: 0
            });
        });
    }

    const emergingTech: EmergingTechResult[] = [];
    const industryETBase = data.lookups.emerging_tech.industry_base[industry] || {};
    const etCats = new Set([...Object.keys(data.lookups.emerging_tech.region_adj), ...Object.keys(industryETBase)]);

    const erdHeavyIndustries = [
        'Aerospace & Defence', 'Automotive', 'Construction', 'Energy (Oil & Gas)',
        'Healthcare Providers', 'Industrial Manufacturing – Discrete', 'Industrial Manufacturing – Process',
        'IT Hardware', 'IT Services', 'Medical Devices', 'Mineral / Mining / Natural Resources',
        'Pharmaceuticals / Life Sciences', 'Telecommunications', 'Transportation'
    ];

    etCats.forEach((name) => {
        let etValue = 0;
        const baseWeight = (industryETBase[name] || 0) / 100;
        const rAdj = (data.lookups.emerging_tech.region_adj[name]?.[region] || 0) / 100;
        const revAdj = (data.lookups.emerging_tech.revenue_adj[name]?.[revenueTier] || 0) / 100;
        const etAdjTotal = baseWeight * (1 + rAdj) * (1 + revAdj);

        // Exceptional logic: AI/ML inherits from ERD for ERD-heavy industries
        if (name === 'AI (ML/DL/GenAI & Safety)' && erdHeavyIndustries.includes(industry)) {
            const aiErdBreakdown = erdBreakdown.find(b => b.id === 'AI/ML & Data Engineering');
            etValue = aiErdBreakdown ? aiErdBreakdown.value : 0;
            // Blockchain always references IT Spend by Category (Digital Enterprise > Blockchain)
        } else if (name === 'Blockchain') {
            let blockchainIT = 0;
            itBreakdown.forEach(l1 => {
                l1.children?.forEach(l2 => {
                    l2.children?.forEach(l3 => {
                        if (l3.name.toLowerCase().includes('blockchain')) {
                            blockchainIT += l3.value;
                        }
                    });
                });
            });
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
        itCAGR_Historical: itCAGR_Hist,
        itCAGR_Forecast: itCAGR_Fore,
        erdCAGR_Historical: erdCAGR_Hist,
        erdCAGR_Forecast: erdCAGR_Fore,
        itBreakdown, erdBreakdown, emergingTech
    };
};

export const getIndustries = () => Object.keys(data.multiyear.it).sort();
export const getCountries = () => Object.keys(data.countries).sort();

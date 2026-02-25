import rawData from '../data.json';

interface LookupData {
    industries: {
        [key: string]: {
            it: number;
            erd: number;
        }
    };
    lookups: {
        region_adj: {
            [key: string]: number;
        };
        revenue_adj: {
            [key: string]: number;
        };
    };
    countries: {
        [key: string]: string;
    };
}

const data = rawData as LookupData;

export interface CalculationResult {
    basePercent: number;
    regionAdj: number;
    revenueAdj: number;
    finalPercent: number;
    totalSpend: number;
}

export interface SpendBreakdown {
    it: CalculationResult;
    erd: CalculationResult;
}

export const calculateSpend = (
    revenue: number, // in millions US$
    industry: string,
    country: string,
): SpendBreakdown => {
    const region = data.countries[country] || 'ROW2';
    const regionAdj = data.lookups.region_adj[region] || 0;

    // Find revenue tier
    let revenueTier = '<$10M';
    if (revenue > 5000) revenueTier = '>$5B';
    else if (revenue > 1000) revenueTier = '$1B-$5B';
    else if (revenue > 500) revenueTier = '$500M-$1B';
    else if (revenue > 100) revenueTier = '$100M-$500M';
    else if (revenue > 10) revenueTier = '$10M-$100M';

    const revenueAdj = data.lookups.revenue_adj[revenueTier] || 0;
    const industryData = data.industries[industry] || { it: 0, erd: 0 };

    // Apply logic: Base % * (1 + Region Adj) * (1 + Revenue Adj)
    const calculateFinal = (base: number) => {
        const baseDecimal = base / 100;
        const finalDecimal = baseDecimal * (1 + regionAdj) * (1 + revenueAdj);
        return {
            basePercent: base,
            regionAdj: regionAdj * 100,
            revenueAdj: revenueAdj * 100,
            finalPercent: finalDecimal * 100,
            totalSpend: revenue * finalDecimal
        };
    };

    return {
        it: calculateFinal(industryData.it),
        erd: calculateFinal(industryData.erd)
    };
};

export const getIndustries = () => Object.keys(data.industries).sort();
export const getCountries = () => Object.keys(data.countries).sort();

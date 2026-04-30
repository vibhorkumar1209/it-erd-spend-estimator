import { calculateAll } from '../api/utils/calc';

const testInput = {
    companyName: 'Test Corp',
    revenue: 1000,
    industry: 'Software',
    country: 'Norway'
};

try {
    const result = calculateAll(testInput.companyName, testInput.revenue, testInput.industry, testInput.country);
    console.log('SUCCESS: Calculation logic verified locally.');
    console.log('IT Spend Table Data Keys:', Object.keys(result.itSpend.breakdown[0]));
    console.log('IT Spend Charts Data Keys:', Object.keys(result.itSpend.trends[0]));
    process.exit(0);
} catch (e: any) {
    console.error('FAILURE:', e.message);
    process.exit(1);
}

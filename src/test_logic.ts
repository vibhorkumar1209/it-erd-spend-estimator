import { calculateSpend } from './services/calculationEngine';

const test = () => {
    // Sample: Incora, $803.1M, Supply Chain / Logistics, Oman
    // From Excel: 
    // Base IT Spend % (Supply Chain): 5.3%? (Need to verify this in data.json)
    // Region Oman (ROW2): -15%
    // Revenue $803.1M ($500M-$1B): +5%
    // Calculation: 5.3 * (1 - 0.15) * (1 + 0.05) = 5.3 * 0.85 * 1.05 = 4.73%

    const result = calculateSpend(803.1, 'Supply Chain / Logistics', 'Oman');
    console.log('Test Result:', JSON.stringify(result, null, 2));
};

test();

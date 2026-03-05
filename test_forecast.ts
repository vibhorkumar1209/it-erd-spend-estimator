import { calculateSpend } from './src/services/calculationEngine';

const res = calculateSpend('General Motors', 187440, 'Automotive', 'USA');
console.log('2024 IT:', res.trends.find(t => t.year === 2024)?.itSpend);
console.log('2026 IT:', res.trends.find(t => t.year === 2026)?.itSpend);
console.log('2030 IT:', res.trends.find(t => t.year === 2030)?.itSpend);

console.log('2024 ERD:', res.trends.find(t => t.year === 2024)?.erdSpend);
console.log('2026 ERD:', res.trends.find(t => t.year === 2026)?.erdSpend);
console.log('2030 ERD:', res.trends.find(t => t.year === 2030)?.erdSpend);

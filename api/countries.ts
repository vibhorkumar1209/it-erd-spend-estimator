import type { VercelRequest, VercelResponse } from '@vercel/node';
import data from './utils/calculator-data.json';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ countries: Object.keys(data.countries).sort() });
}

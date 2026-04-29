import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCountries } from '../src/services/calculationEngine';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ countries: getCountries() });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { data } from './utils/calc';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ industries: Object.keys(data.multiyear.it).sort() });
}

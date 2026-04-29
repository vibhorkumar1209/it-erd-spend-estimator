import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

const data = JSON.parse(readFileSync(join(process.cwd(), 'src', 'data.json'), 'utf-8'));

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ countries: Object.keys(data.countries).sort() });
}

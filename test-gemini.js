import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    const companyName = "Microsoft";
    const prompt = `You are a financial data API. Return the latest annual revenue (2024/2025) of ${companyName} in USD.
Respond ONLY with a valid JSON object in this exact format:
{ "revenue_in_millions": 1500 }
If the revenue is 1.5 billion USD, the value should be 1500. If it's 500 million, the value should be 500.
Do not include markdown blocks or any other text, just the raw JSON object.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
test();

import OpenAI from 'openai';
import { ServiceResponse } from './types';

// Client for FastRouter (Chat & Vision)
const fastRouter = new OpenAI({
    baseURL: "https://go.fastrouter.ai/api/v1",
    apiKey: process.env.FASTROUTER_API_KEY || 'dummy',
});

import { complianceService } from './compliance-service';

/** Pick first non-undefined value from obj for given keys (case-insensitive match). */
function pickFirst(obj: Record<string, unknown>, ...keys: string[]): unknown {
    const lower: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) lower[k.toLowerCase().replace(/\s+/g, '_')] = obj[k];
    for (const key of keys) {
        const val = obj[key] ?? lower[key.toLowerCase().replace(/\s+/g, '_')];
        if (val !== undefined && val !== null) return val;
    }
    return undefined;
}

function toNum(val: unknown): number {
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
}

function toStringOrNull(val: unknown): string | null {
    if (val === undefined || val === null) return null;
    const s = String(val).trim();
    return s === '' ? null : s;
}

/** Normalize AI receipt response to expected keys and types for DB/frontend. */
function normalizeReceiptData(data: Record<string, unknown>): Record<string, unknown> {
    return {
        vendor_name: toStringOrNull(pickFirst(data, 'vendor_name', 'vendor name', 'seller_name', 'supplier_name')) ?? data.vendor_name ?? '',
        gstin: toStringOrNull(pickFirst(data, 'gstin', 'gstin_no', 'gst_number')) ?? data.gstin ?? '',
        invoice_date: toStringOrNull(pickFirst(data, 'invoice_date', 'invoice date', 'date', 'inv_date')) ?? data.invoice_date ?? '',
        total_amount: toNum(pickFirst(data, 'total_amount', 'total amount', 'total', 'grand_total', 'amount')),
        status: (typeof data.status === 'string' && (data.status === 'Safe' || data.status === 'Failed')) ? data.status : (data.gstin ? 'Safe' : 'Failed'),
        invoice_number: toStringOrNull(pickFirst(data, 'invoice_number', 'invoice_no', 'inv_no', 'bill_no', 'invoice no', 'bill no')),
        place_of_supply: toStringOrNull(pickFirst(data, 'place_of_supply', 'pos', 'place of supply')),
        taxable_value: toNum(pickFirst(data, 'taxable_value', 'taxable value', 'taxable_value_before_tax', 'assessable_value')),
        cgst_amount: toNum(pickFirst(data, 'cgst_amount', 'cgst', 'cgst amount')),
        sgst_amount: toNum(pickFirst(data, 'sgst_amount', 'sgst', 'sgst amount')),
        igst_amount: toNum(pickFirst(data, 'igst_amount', 'igst', 'igst amount')),
        cess_amount: toNum(pickFirst(data, 'cess_amount', 'cess', 'cess amount')),
    };
}

export class AIService {
    async generateChatResponse(message: string): Promise<ServiceResponse<string>> {
        try {
            if (!process.env.FASTROUTER_API_KEY) {
                return { success: false, error: 'FastRouter API Key is missing' };
            }

            // 1. Fetch Real-time Context from DB
            const [statsRes, recordsRes] = await Promise.all([
                complianceService.getStats(),
                complianceService.getComplianceRecords()
            ]);

            const stats = statsRes.data || { total_outstanding: 0, itc_at_risk: 0, safe_to_pay: 0 };
            const records = recordsRes.data || [];

            // Limit records context to top 10 to save tokens
            const recentbst = records.slice(0, 10).map(r =>
                `- ${r.vendor_name}: ₹${r.amount} (${r.status}) [GSTIN: ${r.gstin}]`
            ).join('\n');

            const systemContext = `
You are an AI CFO assistant for Indian MSMEs using Khatabook.
Current Financial Status:
- Total Outstanding: ₹${stats.total_outstanding}
- ITC at Risk: ₹${stats.itc_at_risk}
- Safe to Pay: ₹${stats.safe_to_pay}

Recent Invoices:
${recentbst}

INSTRUCTIONS:
1. Answer questions based on the above real-time data if relevant.
2. CRITICAL: Do NOT use any markdown formatting (no bold **, no headers #, no lists -).
3. Write completely plain text.
4. Keep answers concise and professional.
            `.trim();

            const completion = await fastRouter.chat.completions.create({
                model: "anthropic/claude-sonnet-4-20250514",
                messages: [
                    {
                        role: "system",
                        content: systemContext
                    },
                    { role: "user", content: message },
                ],
                max_tokens: 1000,
            });

            const reply = completion.choices[0].message.content || "I apologize, I couldn't generate a response.";

            return { success: true, data: reply };

        } catch (error: any) {
            console.error('FastRouter Chat Error:', error);
            return { success: false, error: error.message };
        }
    }

    async analyzeReceipt(base64Image: string, mimeType: string = 'image/jpeg'): Promise<ServiceResponse<any>> {
        try {
            if (!process.env.FASTROUTER_API_KEY) {
                return { success: false, error: 'FastRouter API Key is missing' };
            }

            const response = await fastRouter.chat.completions.create({
                model: "anthropic/claude-sonnet-4-20250514",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `This image is an Indian GST invoice or bill. Analyze it and extract the following details.

WHERE TO FIND EACH FIELD:
- Invoice number: Look at the top of the invoice for "Invoice No.", "Bill No.", "Inv No.", or similar. Extract the full number or reference.
- Place of supply: Look for "Place of Supply", "POS", or state name/code (e.g. "Maharashtra", "27"). Use state name or code as found.
- Taxable value: Total value before GST, often in a tax summary or table (e.g. "Taxable Value", "Assessable Value").
- CGST / SGST: From the tax breakdown table. Use 0 if not present (e.g. inter-state supply uses IGST only).
- IGST: From the tax breakdown. Use 0 if not present (e.g. intra-state supply uses CGST+SGST only).
- CESS: From the tax breakdown. Use 0 if not present.

OUTPUT: Return a single JSON object with exactly these keys. Use raw JSON only (no markdown, no \`\`\`json or surrounding text).
Keys: vendor_name, gstin, invoice_date, total_amount, status, invoice_number, place_of_supply, taxable_value, cgst_amount, sgst_amount, igst_amount, cess_amount.

RULES:
- vendor_name: string (seller/supplier name).
- gstin: string (vendor GSTIN, 15 chars if present).
- invoice_date: string in YYYY-MM-DD.
- total_amount: number (invoice total including tax).
- status: "Safe" if GSTIN is present and valid-looking, else "Failed".
- invoice_number: string or null if not found.
- place_of_supply: string (state name or code) or null if not found.
- taxable_value, cgst_amount, sgst_amount, igst_amount, cess_amount: numbers only; use 0 when missing or not applicable.` },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
            });

            const content = response.choices[0].message.content;
            if (!content) throw new Error("No analysis returned");

            // Attempt to parse JSON from the response
            try {
                // Clean up markdown code blocks if present
                const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
                const data = JSON.parse(jsonStr);
                const normalized = normalizeReceiptData(data);
                return { success: true, data: normalized };
            } catch (e) {
                console.error("Failed to parse OCR JSON", content);
                return { success: false, error: "Failed to parse receipt data" };
            }

        } catch (error: any) {
            console.error('FastRouter OCR Error:', error);
            return { success: false, error: error.message };
        }
    }
}

export const aiService = new AIService();

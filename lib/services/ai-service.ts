import OpenAI from 'openai';
import { ServiceResponse } from './types';

// Client for FastRouter (Chat & Vision)
const fastRouter = new OpenAI({
    baseURL: "https://go.fastrouter.ai/api/v1",
    apiKey: process.env.FASTROUTER_API_KEY || 'dummy',
});

import { complianceService } from './compliance-service';

// ... (existing imports/setup)

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
                            { type: "text", text: "Analyze this image and extract the following invoice details in JSON format: vendor_name, gstin (of vendor), invoice_date (YYYY-MM-DD), total_amount (number), taxable_value (number), cgst_amount (number), sgst_amount (number), igst_amount (number), cess_amount (number), invoice_number (string), place_of_supply (string), status (Safe/Failed based on if GSTIN is present). If any field is missing, return null for it. do not write json at start and end" },
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
                return { success: true, data };
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

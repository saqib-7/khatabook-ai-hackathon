import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { supabase } from '@/lib/db/supabase';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    if (!monthParam || !yearParam) {
      return NextResponse.json({ error: "Month and Year are required" }, { status: 400 });
    }

    const month = parseInt(monthParam);
    const year = parseInt(yearParam);

    if (isNaN(month) || isNaN(year)) {
        return NextResponse.json({ error: "Invalid Month or Year" }, { status: 400 });
    }

    // Calculate Date Range
    // Input month is 1-12
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]; // First day
    // Last day: Day 0 of next month gets the last day of previous month
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // Fetch Data from receipts (compliance_records)
    const { data: records, error } = await supabase
      .from('compliance_records')
      .select('*')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate);

    if (error) {
      throw error;
    }

    // Initialize variables
    let total_taxable = 0;
    let total_igst = 0;
    let total_cgst = 0;
    let total_sgst = 0;
    let total_cess = 0;

    // Loop through receipts and sum values
    records?.forEach((r: any) => {
       total_taxable += Number(r.taxable_value || 0);
       total_igst += Number(r.igst_amount || 0);
       total_cgst += Number(r.cgst_amount || 0);
       total_sgst += Number(r.sgst_amount || 0);
       total_cess += Number(r.cess_amount || 0);
    });

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Create a promise to handle the async PDF generation
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // --- PDF Content ---
        const startX = 50;
        const fullWidth = 500; // 550 - 50 = 500 approx width available

        // Header
        doc.fontSize(20).text('GSTR-3B Summary Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Return Period: ${month.toString().padStart(2, '0')}-${year}`, { align: 'center' });
        doc.moveDown(2);

        // --- Section 1: Outward Supplies (Sales) ---
        // Ensure X coordinate is reset
        doc.fontSize(14).text('Table 3.1: Details of Outward Supplies', startX, doc.y, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text('(No sales data found - Expenditure only)', startX, doc.y, { oblique: true });
        doc.moveDown(1);

        let currentY = doc.y;

        // Table 3.1 Header
        doc.rect(startX, currentY, fullWidth, 25).stroke(); // Header Box

        doc.font('Helvetica-Bold');
        doc.text('Nature of Supplies', startX + 5, currentY + 8);
        doc.text('Taxable Value', startX + 200 + 5, currentY + 8);
        doc.text('IGST', startX + 275 + 5, currentY + 8);
        doc.text('CGST', startX + 350 + 5, currentY + 8);
        doc.text('SGST', startX + 425 + 5, currentY + 8);
        doc.font('Helvetica');

        currentY += 25;

        // Table 3.1 Row
        doc.rect(startX, currentY, fullWidth, 25).stroke(); // Row Box
        doc.text('Outward Taxable Supplies', startX + 5, currentY + 8);
        doc.text('0.00', startX + 200 + 5, currentY + 8);
        doc.text('0.00', startX + 275 + 5, currentY + 8);
        doc.text('0.00', startX + 350 + 5, currentY + 8);
        doc.text('0.00', startX + 425 + 5, currentY + 8);

        doc.y = currentY + 40; // Add space after table

        // --- Section 2: Eligible ITC (Purchases) ---
        doc.fontSize(14).text('Table 4: Eligible ITC', startX, doc.y, { underline: true });
        doc.moveDown(1);

        currentY = doc.y;

        // Table 4 Header
        doc.rect(startX, currentY, fullWidth, 25).stroke();
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Details', startX + 5, currentY + 8);
        doc.text('IGST', startX + 200 + 5, currentY + 8);
        doc.text('CGST', startX + 275 + 5, currentY + 8);
        doc.text('SGST', startX + 350 + 5, currentY + 8);
        doc.text('Cess', startX + 425 + 5, currentY + 8);
        doc.font('Helvetica');

        currentY += 25;

        // Table 4 Row 1: ITC Available
        doc.rect(startX, currentY, fullWidth, 25).stroke();
        doc.text('(A) ITC Available (whether in full or part)', startX + 5, currentY + 8);

        currentY += 25;

        // Table 4 Row 2: All Other ITC
        doc.rect(startX, currentY, fullWidth, 25).stroke();
        doc.text('   (5) All Other ITC', startX + 5, currentY + 8);
        doc.text(total_igst.toFixed(2), startX + 200 + 5, currentY + 8);
        doc.text(total_cgst.toFixed(2), startX + 275 + 5, currentY + 8);
        doc.text(total_sgst.toFixed(2), startX + 350 + 5, currentY + 8);
        doc.text(total_cess.toFixed(2), startX + 425 + 5, currentY + 8);

        doc.y = currentY + 40;

        // --- Summary Footer ---
        doc.fontSize(12).text('Summary of Calculated Input Tax Credit:', startX, doc.y, { underline: true });
        doc.moveDown();

        currentY = doc.y;
        const summaryWidth = 350;
        doc.rect(startX, currentY, summaryWidth, 120).stroke(); // Summary Box

        doc.fontSize(10);
        let textY = currentY + 10;
        const labelX = startX + 10;
        const valueX = startX + 250;

        doc.text('Total Records Processed:', labelX, textY);
        doc.text(records?.length.toString() || '0', valueX, textY);
        textY += 15;

        doc.text('Total Taxable Value:', labelX, textY);
        doc.text(total_taxable.toFixed(2), valueX, textY);
        textY += 15;

        doc.text('Total Integrated Tax (IGST):', labelX, textY);
        doc.text(total_igst.toFixed(2), valueX, textY);
        textY += 15;

        doc.text('Total Central Tax (CGST):', labelX, textY);
        doc.text(total_cgst.toFixed(2), valueX, textY);
        textY += 15;

        doc.text('Total State/UT Tax (SGST):', labelX, textY);
        doc.text(total_sgst.toFixed(2), valueX, textY);
        textY += 15;

        doc.text('Total Cess:', labelX, textY);
        doc.text(total_cess.toFixed(2), valueX, textY);

        doc.end();
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=gstr3b_report_${month}_${year}.pdf`,
        },
    });

  } catch (error: any) {
    console.error("GSTR-3B Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

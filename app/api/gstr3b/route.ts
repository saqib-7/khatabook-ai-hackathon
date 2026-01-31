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

        // Header
        doc.fontSize(20).text('GSTR-3B Summary Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Return Period: ${month.toString().padStart(2, '0')}-${year}`, { align: 'center' });
        doc.moveDown(2);

        // Section 1: Outward Supplies (Sales)
        doc.fontSize(14).text('Table 3.1: Details of Outward Supplies', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text('(No sales data found - Expenditure only)', { oblique: true });
        doc.moveDown(1);

        // Table Header for Section 1
        const startX = 50;
        let currentY = doc.y;

        doc.font('Helvetica-Bold');
        doc.text('Nature of Supplies', startX, currentY);
        doc.text('Taxable Value', startX + 200, currentY);
        doc.text('IGST', startX + 300, currentY);
        doc.text('CGST', startX + 360, currentY);
        doc.text('SGST', startX + 420, currentY);
        doc.font('Helvetica');

        currentY += 15;
        doc.moveTo(startX, currentY).lineTo(550, currentY).stroke(); // Line below header
        currentY += 10;

        // Hardcoded 0.00 values
        doc.text('Outward Taxable Supplies', startX, currentY);
        doc.text('0.00', startX + 200, currentY);
        doc.text('0.00', startX + 300, currentY);
        doc.text('0.00', startX + 360, currentY);
        doc.text('0.00', startX + 420, currentY);

        doc.moveDown(4);

        // Section 2: Eligible ITC (Purchases)
        doc.fontSize(14).text('Table 4: Eligible ITC', { underline: true });
        doc.moveDown(1);

        currentY = doc.y;
        doc.fontSize(10);
        doc.font('Helvetica-Bold');
        doc.text('Details', startX, currentY);
        doc.text('IGST', startX + 250, currentY);
        doc.text('CGST', startX + 320, currentY);
        doc.text('SGST', startX + 390, currentY);
        doc.text('Cess', startX + 460, currentY);
        doc.font('Helvetica');

        currentY += 15;
        doc.moveTo(startX, currentY).lineTo(550, currentY).stroke();
        currentY += 10;

        doc.text('(A) ITC Available (whether in full or part)', startX, currentY, { width: 240 });
        currentY += 15;

        doc.text('   (5) All Other ITC', startX, currentY);
        doc.text(total_igst.toFixed(2), startX + 250, currentY);
        doc.text(total_cgst.toFixed(2), startX + 320, currentY);
        doc.text(total_sgst.toFixed(2), startX + 390, currentY);
        doc.text(total_cess.toFixed(2), startX + 460, currentY);

        doc.moveDown(3);

        // Summary Footer
        doc.fontSize(12).text('Summary of Calculated Input Tax Credit:', { underline: true });
        doc.moveDown();
        doc.fontSize(10);
        doc.text(`Total Records Processed: ${records?.length || 0}`);
        doc.moveDown(0.5);
        doc.text(`Total Taxable Value: ${total_taxable.toFixed(2)}`);
        doc.text(`Total Integrated Tax (IGST): ${total_igst.toFixed(2)}`);
        doc.text(`Total Central Tax (CGST): ${total_cgst.toFixed(2)}`);
        doc.text(`Total State/UT Tax (SGST): ${total_sgst.toFixed(2)}`);
        doc.text(`Total Cess: ${total_cess.toFixed(2)}`);

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

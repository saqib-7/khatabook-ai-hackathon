
import { NextResponse } from 'next/server';
import { complianceService } from '@/lib/services/compliance-service';

export async function GET() {
    try {
        const [recordsRes, statsRes] = await Promise.all([
            complianceService.getComplianceRecords(),
            complianceService.getStats()
        ]);

        return NextResponse.json({
            records: recordsRes.data || [],
            stats: statsRes.data || { total_outstanding: 0, itc_at_risk: 0, safe_to_pay: 0 }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const res = await complianceService.addComplianceRecord(body);

        if (!res.success) {
            return NextResponse.json({ error: res.error }, { status: 500 });
        }

        return NextResponse.json(res.data);
    } catch (e) {
        return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const res = await complianceService.updateComplianceRecord(id, updates);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: 500 });

        return NextResponse.json(res.data);
    } catch (e) {
        return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const res = await complianceService.deleteComplianceRecord(id);
        if (!res.success) return NextResponse.json({ error: res.error }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
    }
}

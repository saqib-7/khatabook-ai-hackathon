import { supabase } from '@/lib/db/supabase';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { ServiceResponse } from './types';

export interface ComplianceRecord {
    id: string;
    vendor_name: string;
    gstin: string;
    status: 'Safe' | 'Failed' | 'Pending';
    amount: number;
    invoice_date: string;
    taxable_value?: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    cess_amount?: number;
    invoice_number?: string;
    place_of_supply?: string;
}

export interface ComplianceStats {
    total_outstanding: number;
    itc_at_risk: number;
    safe_to_pay: number;
}

export class ComplianceService {

    async getComplianceRecords(): Promise<ServiceResponse<ComplianceRecord[]>> {
        try {
            const { data, error } = await supabase
                .from('compliance_records')
                .select('*')
                .order('invoice_date', { ascending: false });

            if (error) throw error;

            return { success: true, data: data as ComplianceRecord[] };
        } catch (error: any) {
            console.error('Error fetching compliance records:', error);
            return { success: false, error: error.message };
        }
    }

    async getStats(): Promise<ServiceResponse<ComplianceStats>> {
        try {
            const { data, error } = await supabase
                .from('compliance_records')
                .select('status, amount');

            if (error) throw error;

            const records = data || [];

            const stats = records.reduce((acc, curr) => {
                const amount = Number(curr.amount);
                acc.total_outstanding += amount;

                if (curr.status === 'Failed') {
                    acc.itc_at_risk += amount;
                } else if (curr.status === 'Safe') {
                    acc.safe_to_pay += amount;
                }

                return acc;
            }, { total_outstanding: 0, itc_at_risk: 0, safe_to_pay: 0 });

            return { success: true, data: stats };

        } catch (error: any) {
            console.error('Error fetching stats:', error);
            return { success: false, error: error.message };
        }
    }

    async addComplianceRecord(record: Partial<ComplianceRecord>): Promise<ServiceResponse<ComplianceRecord>> {
        try {
            // Basic validation
            if (!record.vendor_name || !record.amount) {
                throw new Error("Missing required fields");
            }

            // USE ADMIN CLIENT HERE TO BYPASS RLS IF AVAILABLE
            const client = supabaseAdmin || supabase;

            if (!supabaseAdmin) {
                console.warn("Using public client for compliance insert. This may fail due to RLS.");
            }

            const { data, error } = await client
                .from('compliance_records')
                .insert([{
                    vendor_name: record.vendor_name,
                    gstin: record.gstin,
                    status: record.status || 'Pending',
                    amount: record.amount,
                    invoice_date: record.invoice_date || new Date().toISOString().split('T')[0],
                    taxable_value: record.taxable_value || 0,
                    cgst_amount: record.cgst_amount || 0,
                    sgst_amount: record.sgst_amount || 0,
                    igst_amount: record.igst_amount || 0,
                    cess_amount: record.cess_amount || 0,
                    invoice_number: record.invoice_number || 'UNKNOWN',
                    place_of_supply: record.place_of_supply || 'UNKNOWN'
                }])
                .select()
                .single();

            if (error) throw error;

            return { success: true, data: data as ComplianceRecord };

        } catch (error: any) {
            console.error('Error adding compliance record:', error);
            return { success: false, error: error.message };
        }
    }

    async updateComplianceRecord(id: string, updates: Partial<ComplianceRecord>): Promise<ServiceResponse<ComplianceRecord>> {
        try {
            const client = supabaseAdmin || supabase;
            const { data, error } = await client
                .from('compliance_records')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data: data as ComplianceRecord };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async deleteComplianceRecord(id: string): Promise<ServiceResponse<boolean>> {
        try {
            const client = supabaseAdmin || supabase;
            const { error } = await client
                .from('compliance_records')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true, data: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export const complianceService = new ComplianceService();

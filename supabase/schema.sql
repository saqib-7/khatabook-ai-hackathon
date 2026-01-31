-- Create vendors/compliance table
CREATE TABLE IF NOT EXISTS compliance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL,
    gstin TEXT NOT NULL,
    status TEXT CHECK (status IN ('Safe', 'Failed', 'Pending')),
    amount NUMERIC NOT NULL,
    invoice_date DATE NOT NULL,
    taxable_value NUMERIC DEFAULT 0,
    cgst_amount NUMERIC DEFAULT 0,
    sgst_amount NUMERIC DEFAULT 0,
    igst_amount NUMERIC DEFAULT 0,
    cess_amount NUMERIC DEFAULT 0,
    invoice_number TEXT DEFAULT 'UNKNOWN',
    place_of_supply TEXT DEFAULT 'UNKNOWN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for demo purposes)
CREATE POLICY "Allow anonymous read access"
    ON compliance_records
    FOR SELECT
    TO anon
    USING (true);

-- Seed Data (replicating frontend mock data)
INSERT INTO compliance_records (vendor_name, gstin, status, amount, invoice_date) VALUES
    ('Zomato Media Pvt Ltd', '27AABCU9603R1ZM', 'Safe', 15000, '2024-01-15'),
    ('Swiggy Technologies', '29AADCS0472N1Z5', 'Failed', 24000, '2024-01-14'),
    ('Freshworks Inc', '33AABCF1234H1ZK', 'Safe', 8500, '2024-01-13'),
    ('Razorpay Software', '29AAGCR4375J1ZU', 'Pending', 32000, '2024-01-12'),
    ('Phonepe Digital', '29AALCP1234M1ZD', 'Safe', 12500, '2024-01-11'),
    ('Paytm Payments Bank', '09AAICP5678A1Z2', 'Failed', 18000, '2024-01-10'),
    ('Instamojo Technologies', '29AABCI9876K1ZN', 'Safe', 5600, '2024-01-09');

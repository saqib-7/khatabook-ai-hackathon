-- Add GSTR-3B Columns
ALTER TABLE compliance_records 
ADD COLUMN IF NOT EXISTS taxable_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cess_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS place_of_supply TEXT;

-- Clear old data as requested
TRUNCATE TABLE compliance_records;

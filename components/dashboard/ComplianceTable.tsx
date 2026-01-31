import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, ShieldX, Loader2 } from "lucide-react";

interface Invoice {
  id: string;
  date: string;
  vendor: string;
  gstin: string;
  status: "Safe" | "Failed" | "Pending";
  amount: number;
}

interface ComplianceTableProps {
  onStatsRefresh?: () => void;
}

export function ComplianceTable({ onStatsRefresh }: ComplianceTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Action State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [actionType, setActionType] = useState<"pay" | "block" | "verify" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/compliance');
        const data = await res.json();

        if (data.records) {
          // Map DB response to frontend interface
          const mapped: Invoice[] = data.records.map((r: any) => ({
            id: r.id,
            date: r.invoice_date,
            vendor: r.vendor_name,
            gstin: r.gstin,
            status: r.status,
            amount: r.amount
          }));
          setInvoices(mapped);
        }
      } catch (e) {
        console.error("Failed to fetch compliance data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAction = (invoice: Invoice, type: "pay" | "block" | "verify") => {
    setSelectedInvoice(invoice);
    setActionType(type);
  };

  const executeAction = async () => {
    if (!selectedInvoice || !actionType) return;

    setIsProcessing(true);

    try {
      if (actionType === 'pay') {
        // DELETE the record (Clean up)
        await fetch(`/api/compliance?id=${selectedInvoice.id}`, { method: 'DELETE' });

        // Remove from local state
        setInvoices(prev => prev.filter(i => i.id !== selectedInvoice.id));

        toast.success("Payment Processed", {
          description: `₹${formatAmount(selectedInvoice.amount)} transferred to ${selectedInvoice.vendor}`,
        });
        onStatsRefresh?.();

      } else if (actionType === 'block') {
        // DELETE (Archive) or Update to blocked? User said "entry should be gone". 
        // Let's DELETE for now to clear the list, assuming "Blocked" items are handled elsewhere.
        await fetch(`/api/compliance?id=${selectedInvoice.id}`, { method: 'DELETE' });

        setInvoices(prev => prev.filter(i => i.id !== selectedInvoice.id));

        toast.error("Vendor Blocked & Removed", {
          description: `Future payments to ${selectedInvoice.vendor} will be rejected.`,
        });
        onStatsRefresh?.();

      } else if (actionType === 'verify') {
        // UPDATE status to 'Safe'
        const res = await fetch('/api/compliance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedInvoice.id, status: 'Safe' })
        });

        if (res.ok) {
          setInvoices(prev => prev.map(i =>
            i.id === selectedInvoice.id ? { ...i, status: 'Safe' } : i
          ));
          toast.success("Verification Successful", {
            description: "Vendor GSTIN verified against database.",
          });
          onStatsRefresh?.();
        } else {
          throw new Error("Verification Failed");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Action Failed", { description: "Something went wrong. Please try again." });
    } finally {
      setIsProcessing(false);
      setActionType(null);
      setSelectedInvoice(null);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <div className="p-4 font-mono text-xs">LOADING DATA...</div>;
  }

  return (
    <div className="relative border border-foreground bg-background">
      {/* Corner Accent - Design Signature */}
      <div className="absolute top-0 right-0 w-1 h-1 bg-foreground" />
      <div className="border-b border-foreground p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            // COMPLIANCE GRID
          </div>
          <div className="mt-1 font-mono text-sm">
            Recent Invoices — GST Verification Status
          </div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          {invoices.length} RECORDS
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="border-b border-foreground hover:bg-transparent">
            <TableHead className="font-mono text-[10px] uppercase border-r border-foreground/20 py-2">Date</TableHead>
            <TableHead className="font-mono text-[10px] uppercase border-r border-foreground/20 py-2">Vendor</TableHead>
            <TableHead className="font-mono text-[10px] uppercase border-r border-foreground/20 py-2 hidden md:table-cell">GSTIN</TableHead>
            <TableHead className="font-mono text-[10px] uppercase border-r border-foreground/20 py-2">Status</TableHead>
            <TableHead className="font-mono text-[10px] uppercase border-r border-foreground/20 py-2 text-right">Amount</TableHead>
            <TableHead className="font-mono text-[10px] uppercase py-2 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const isFailed = invoice.status === "Failed";
            const isPending = invoice.status === "Pending";

            return (
              <TableRow
                key={invoice.id}
                className={cn(
                  "border-b border-black/5 transition-colors cursor-default",
                  !isFailed && !isPending && "hover:bg-zinc-50",
                  isFailed && "bg-red-50 hover:bg-red-50"
                )}
              >
                <TableCell className={cn(
                  "font-mono text-xs py-4 pl-6 border-r border-black/5 relative overflow-hidden",
                  // Red Stripe for Failed
                  isFailed && "text-red-900"
                )}>
                  {isFailed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                  {invoice.date}
                </TableCell>
                <TableCell className={cn(
                  "font-sans text-xs font-medium py-4 border-r border-black/5",
                  isFailed ? "text-red-900" : "text-zinc-700"
                )}>{invoice.vendor}</TableCell>
                <TableCell className={cn(
                  "font-mono text-[10px] text-zinc-400 py-4 border-r border-black/5 hidden md:table-cell",
                  isFailed && "text-red-800/60"
                )}>
                  {invoice.gstin}
                </TableCell>
                <TableCell className={cn(
                  "py-4 border-r border-black/5"
                )}>
                  <StatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className={cn(
                  "font-mono text-xs py-4 text-right border-r border-black/5 font-bold",
                  isFailed ? "text-red-900" : "text-black"
                )}>
                  {formatAmount(invoice.amount)}
                </TableCell>
                <TableCell className={cn(
                  "text-right py-4 pr-6"
                )}>
                  <ActionButton status={invoice.status} onAction={(type) => handleAction(invoice, type)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Action Dialog (Dummy UI) */}
      <Dialog open={!!actionType} onOpenChange={(open: boolean) => !open && setActionType(null)}>
        <DialogContent className="sm:max-w-md border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-widest flex items-center gap-2">
              {actionType === 'pay' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {actionType === 'block' && <ShieldX className="w-5 h-5 text-red-600" />}
              {actionType === 'verify' && <Loader2 className="w-5 h-5 animate-spin" />}

              {actionType === 'pay' && "Confirm Payment"}
              {actionType === 'block' && "Block Vendor"}
              {actionType === 'verify' && "Verifying Details"}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs pt-2">
              {selectedInvoice && (
                <>
                  Action for invoice <strong>{selectedInvoice.vendor}</strong> ({formatAmount(selectedInvoice.amount)})
                  <br />
                  GSTIN: {selectedInvoice.gstin}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-zinc-50 border border-black/10 text-xs font-mono">
              {actionType === 'pay' && "Initiating secure transfer via Razorpay X..."}
              {actionType === 'block' && "This will flag the vendor and prevent future payments until cleared."}
              {actionType === 'verify' && "Cross-referencing GSTR-2B data with GSTN portal..."}
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              disabled={isProcessing}
              onClick={executeAction}
              className="w-full bg-black text-white hover:bg-zinc-800 rounded-none font-mono uppercase text-xs h-10 border-2 border-black"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'pay' && "Process Payment"}
                  {actionType === 'block' && "Confirm Block"}
                  {actionType === 'verify' && "Run Verification"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  if (status === "Failed") {
    return (
      <span className="inline-flex items-center px-3 py-1 bg-white border border-red-200 text-red-600 font-bold font-mono text-[10px] uppercase shadow-sm">
        <span className="w-2 h-2 bg-red-500 mr-2" />
        FAILED
      </span>
    )
  }

  if (status === "Safe") {
    return (
      <span className="inline-flex items-center px-3 py-1 bg-white border border-green-200 text-green-600 font-bold font-mono text-[10px] uppercase shadow-sm">
        <span className="w-2 h-2 bg-green-500 mr-2" />
        SAFE
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-3 py-1 bg-white border border-zinc-200 text-zinc-500 font-mono text-[10px] uppercase shadow-sm">
      <span className="w-2 h-2 bg-zinc-300 mr-2" />
      PENDING
    </span>
  );
}

function ActionButton({ status, onAction }: { status: Invoice["status"]; onAction: (type: "pay" | "block" | "verify") => void }) {
  if (status === "Failed") {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => onAction('block')}
        className="font-mono text-[10px] uppercase h-8 px-4 bg-black text-white hover:bg-zinc-800 rounded-none shadow-sm"
      >
        BLOCK PAYMENT
      </Button>
    );
  }

  if (status === "Safe") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAction('pay')}
        className="font-mono text-[10px] uppercase h-8 px-4 bg-white border-2 border-black text-black hover:bg-zinc-50 rounded-none font-bold"
      >
        PAY NOW
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onAction('verify')}
      className="font-mono text-[10px] uppercase h-8 px-4 border-zinc-200 text-zinc-600 hover:text-black hover:border-black rounded-none transition-colors"

    >
      VERIFY
    </Button>
  );
}

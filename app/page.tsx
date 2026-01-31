"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ComplianceTable } from "@/components/dashboard/ComplianceTable";
import { ShieldAlert, TrendingUp, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState({
    total_outstanding: 0,
    itc_at_risk: 0,
    safe_to_pay: 0
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/compliance');
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/compliance');
      const data = await res.json();

      if (!data.records) throw new Error("No data");

      // Simple CSV conversion
      const headers = ["Invoice ID", "Date", "Vendor", "GSTIN", "Amount", "Status"];
      const rows = data.records.map((r: any) => [
        r.id,
        r.invoice_date,
        r.vendor_name,
        r.gstin,
        r.amount,
        r.status
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) => row.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateGSTR = async () => {
    setIsGenerating(true);
    try {
      // Default to Jan 2024 for demo purposes as per seed data
      const month = 1;
      const year = 2024;

      const response = await fetch(`/api/gstr3b?month=${month}&year=${year}`);

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gstr3b_report_${month}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (e) {
      console.error("GSTR Generation Error", e);
      alert("Failed to generate GSTR-3B Report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSyncTally = () => {
    setIsSyncing(true);
    // Mock Delay
    setTimeout(() => {
      setIsSyncing(false);
      alert("Synced successfully with Tally Prime!");
    }, 2500);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(val);
  };


  return (
    <DashboardLayout
      onScanClick={() => setIsScanModalOpen(true)}
      isScanModalOpen={isScanModalOpen}
      onCloseScanModal={() => setIsScanModalOpen(false)}
      onScanComplete={handleRefresh}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              // DASHBOARD
            </div>
            <h1 className="mt-1 font-mono text-2xl font-bold">
              HEADS UP DISPLAY
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              GST COMPLIANCE SHIELD FOR TRADERS & MSMEs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-mono text-[10px] text-muted-foreground">
              LAST SYNC: JUST NOW
            </div>
            <Button
              onClick={() => setIsScanModalOpen(true)}
              className="font-mono text-xs gap-2"
            >
              <ScanLine className="h-4 w-4" />
              QUICK SCAN
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="TOTAL OUTSTANDING"
          value={formatCurrency(stats.total_outstanding)}
          variant="default"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="ITC AT RISK"
          value={formatCurrency(stats.itc_at_risk)}
          variant="danger"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <StatCard
          label="SAFE TO PAY"
          value={formatCurrency(stats.safe_to_pay)}
          variant="success"
        />
      </div>

      {/* Compliance Table */}
      <ComplianceTable key={refreshTrigger} onStatsRefresh={fetchStats} />

      {/* Quick Actions */}
      <div className="mt-8 border border-dotted border-foreground/30 p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          // QUICK ACTIONS
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-[10px]"
            onClick={handleExportCSV}
            disabled={isExporting}
          >
            {isExporting ? "EXPORTING..." : "EXPORT CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-[10px]"
            onClick={handleGenerateGSTR}
            disabled={isGenerating}
          >
            {isGenerating ? "GENERATING..." : "GENERATE GSTR-3B"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-[10px]"
            onClick={handleSyncTally}
            disabled={isSyncing}
          >
            {isSyncing ? "SYNCING..." : "SYNC TALLY"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-[10px]"
            onClick={handleRefresh}
          >
            REFRESH ALL
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 font-mono text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>// GSTIN VALIDATION: ACTIVE</span>
          <span className="w-px h-3 bg-foreground/20" />
          <span>// ITC MATCHING: ENABLED</span>
          <span className="w-px h-3 bg-foreground/20" />
          <span>// AUTO-BLOCK: ON</span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;

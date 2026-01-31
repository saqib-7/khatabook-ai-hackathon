import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, X, ScanLine, Camera, AlertTriangle, ShieldX, Ban, CreditCard, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete?: () => void;
}

type ScanState = "upload" | "processing" | "result" | "error";

interface ScannedData {
  vendor_name?: string;
  gstin?: string;
  invoice_date?: string;
  total_amount?: number;
  status?: string;
  compliance_issues?: string[];
  taxable_value?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  cess_amount?: number;
  invoice_number?: string;
  place_of_supply?: string;
}

function DotGridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.15]"
      style={{
        backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    />
  );
}

function TerminalProcessing({ logs }: { logs: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="relative h-full bg-white text-black font-mono text-sm overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-1 bg-black/5 z-10">
        <div className="h-full bg-black/20 w-1/3 animate-scan" />
      </div>

      <div className="flex-1 p-8 overflow-auto space-y-2" ref={scrollRef}>
        <div className="flex items-center gap-2 text-black/40 mb-6 uppercase tracking-widest text-xs border-b border-black/10 pb-2">
          <span>// SYSTEM_LOGS</span>
          <span className="ml-auto">LIVE_FEED</span>
        </div>

        {logs.map((log, index) => (
          <div
            key={index}
            className={cn(
              "animate-fade-in flex items-start",
              log.includes("ERROR") ? "text-red-600 font-bold" : "text-black"
            )}
          >
            <span className="mr-3 opacity-30 select-none">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="mr-2 opacity-50">{">"}</span>
            <span className="uppercase tracking-tight">{log}</span>
          </div>
        ))}
        <div className="w-2 h-4 bg-black animate-blink mt-2 ml-10" />
      </div>
    </div>
  );
}

function ResultCard({ data, onClose, onSave, isSaving }: { data: ScannedData; onClose: () => void; onSave: (status: 'Safe' | 'Failed') => void; isSaving: boolean }) {
  const isSafe = !data.status || data.status === 'Safe';

  const formatCurrency = (val?: number) => {
    return val ? new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val) : "₹0.00";
  };

  return (
    <div className="h-full flex flex-col bg-white text-black p-8 font-mono overflow-auto">
      {/* Header Info */}
      <div className="border-b border-dashed border-black/20 pb-6 mb-6">
        <div className="text-[10px] text-black/40 uppercase tracking-[0.2em] mb-2">
          // SCANNED INVOICE
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight">{data.vendor_name || "UNKNOWN VENDOR"}</h2>
            <div className="text-xs mt-1 uppercase">GSTIN: <span className="font-bold">{data.gstin || "NOT FOUND"}</span></div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold">{data.invoice_date || "DATE UNKNOWN"}</div>
            <div className="text-[10px] uppercase mt-1">
              STATUS: <span className={isSafe ? "text-black" : "text-red-600"}>{data.status || "PENDING"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance / Alert Box */}
      <div className={cn(
        "border p-4 mb-6 relative overflow-hidden",
        isSafe ? "border-black" : "border-black"
      )}>
        {/* Striped Background for Warning */}
        {!isSafe && (
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
        )}

        <div className="flex items-start gap-4 relative z-10">
          {isSafe ? (
            <CheckCircle2 className="h-5 w-5 mt-0.5" />
          ) : (
            <ShieldX className="h-5 w-5 mt-0.5" />
          )}

          <div>
            <div className="font-bold text-sm uppercase">
              {isSafe ? "COMPLIANT VENDOR" : "COMPLIANCE RISK DETECTED"}
            </div>
            <div className="text-xs mt-1 text-black/70">
              {isSafe
                ? "GSTIN verified. Safe to proceed with payment."
                : "Vendor GSTIN verification failed. ITC Claim may be rejected."
              }
            </div>
          </div>
        </div>
      </div>

      {/* Risk Grid */}
      <div className="border border-black/10 p-4 mb-6 bg-black/[0.02]">
        <div className="text-[10px] text-black/40 uppercase tracking-[0.2em] mb-4">
          // RISK ASSESSMENT
        </div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <div className={cn("w-3 h-3 border border-black rounded-full flex items-center justify-center", !isSafe && "bg-black text-white")}>
                {!isSafe && <X className="w-2 h-2" />}
                {isSafe && <CheckCircle2 className="w-2 h-2 opacity-0" />}
              </div>
              GSTR-1:
            </span>
            <span className="font-bold">{!isSafe ? "NOT FILED" : "FILED"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 border border-black rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-black rounded-full" />
              </div>
              GSTR-3B:
            </span>
            <span className="font-bold">PENDING</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <div className={cn("w-3 h-3 border border-black rounded-full flex items-center justify-center", !isSafe && "bg-black text-white")}>
                {!isSafe && <Ban className="w-2 h-2" />}
              </div>
              ITC MATCH:
            </span>
            <span className="font-bold">{!isSafe ? "FAILED" : "LIKELY"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              RISK LEVEL:
            </span>
            <span className="font-bold">{!isSafe ? "HIGH" : "LOW"}</span>
          </div>
        </div>
      </div>

      {/* Financials */}
      <div className="border border-black p-4 mb-8">
        <div className="text-[10px] text-black/40 uppercase tracking-[0.2em] mb-4">
          // INVOICE DETAILS
        </div>
        <div className="flex justify-between items-end border-b border-dashed border-black/20 pb-2 mb-2">
          <span className="text-xl font-bold uppercase">TOTAL</span>
          <span className="text-xl font-bold">{formatCurrency(data.total_amount)}</span>
        </div>
        {!isSafe && (
          <div className="flex justify-between items-center text-xs text-red-600 font-bold mt-2">
            <span>ITC AT RISK</span>
            <span>{formatCurrency((data.total_amount || 0) * 0.18)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto">
        <Button
          className="w-full h-12 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-colors uppercase font-bold tracking-widest text-xs flex items-center justify-center gap-2 mb-3 rounded-none"
          onClick={() => onSave(isSafe ? 'Safe' : 'Failed')}
          disabled={isSaving}
        >
          {isSafe ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
          {isSaving ? "SAVING..." : (isSafe ? "APPROVE FOR PAYMENT" : "BLOCK PAYMENT")}
        </Button>

        <div className="text-center">
          <button
            onClick={onClose}
            className="text-[10px] uppercase tracking-widest hover:underline flex items-center justify-center gap-1 mx-auto"
          >
            <X className="w-3 h-3" /> CLOSE WITHOUT SAVING
          </button>
        </div>
      </div>

    </div>
  );
}

export function ScanReceiptModal({ isOpen, onClose, onScanComplete }: ScanReceiptModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("upload");
  const [logs, setLogs] = useState<string[]>([]);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false); // Add saving state

  // ... (Camera State remains same) ...
  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setScanState("upload");
    setLogs([]);
    setScannedData(null);
    setIsSaving(false);
    onClose();
  }, [onClose, stopCamera]);


  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera access is only available in secure contexts (HTTPS or localhost).\n\nIf you are on mobile using an IP address, the browser blocks camera access for security. Please upload a file instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera Error:", err);
      alert("Unable to access camera. Please allow permissions.");
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [isCameraActive]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        stopCamera();
        processBase64(dataUrl);
      }
    }
  };

  const handleSave = async (status: 'Safe' | 'Failed') => {
    if (!scannedData) return;
    setIsSaving(true);

    try {
      // Prepare payload
      const payload = {
        vendor_name: scannedData.vendor_name,
        gstin: scannedData.gstin,
        amount: scannedData.total_amount,
        status: status,
        invoice_date: scannedData.invoice_date,
        taxable_value: scannedData.taxable_value,
        cgst_amount: scannedData.cgst_amount,
        sgst_amount: scannedData.sgst_amount,
        igst_amount: scannedData.igst_amount,
        cess_amount: scannedData.cess_amount,
        invoice_number: scannedData.invoice_number,
        place_of_supply: scannedData.place_of_supply
      };

      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save record");

      // Success
      if (onScanComplete) onScanComplete();
      handleClose();

    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save record. Please try again.");
      setIsSaving(false);
    }
  };

  // Helper to resize image
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension 1024px to keep size low
          const MAX_SIZE = 1024;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG 0.7
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const processBase64 = async (dataUrl: string) => {
    setScanState("processing");
    setLogs(["CAPTURING IMAGE...", "OPTIMIZING FOR CLAUDE...", "CONNECTING TO VISION ENGINE..."]);

    try {
      // Ensure we have a valid base64
      const matches = dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!matches) throw new Error("Invalid image data");

      const detectedMime = matches[1];
      const base64String = matches[2];

      setLogs(prev => [...prev, `FORMAT: ${detectedMime}`, "SENDING TO CLOUD..."]);

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64String,
          mimeType: detectedMime
        }),
      });

      setLogs(prev => [...prev, "ANALYZING RECEIPT...", "EXTRACTING DATA..."]);
      const data = await res.json();

      if (data.data) {
        setLogs(prev => [...prev, "SUCCESS.", "RENDERING..."]);
        setTimeout(() => {
          setScannedData(data.data);
          setScanState("result");
        }, 800);
      } else {
        throw new Error(data.error || "Extraction failed");
      }

    } catch (err: any) {
      setLogs(prev => [...prev, `ERROR: ${err.message}`]);
      setTimeout(() => setScanState("upload"), 4000);
    }
  };

  const processFile = async (file: File) => {
    setScanState("processing");
    setLogs(["INITIALIZING VISION ENGINE...", "COMPRESSING IMAGE...", "WAITING FOR CLAUDE AI..."]);

    try {
      const resizedDataUrl = await resizeImage(file);
      processBase64(resizedDataUrl);
    } catch (e) {
      console.error(e);
      setScanState("upload");
      alert("Failed to process image. Please try another file.");
    }
  };

  // ... (Event handlers remain same) ...
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleContentClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ... (useEffect remains same) ...
  useEffect(() => {
    if (isOpen) {
      setScanState("upload");
      setLogs([]);
      setScannedData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <DotGridBackground />

      <div className="relative w-full h-full max-w-3xl max-h-[85vh] m-4 bg-white border-2 border-black flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-black flex-shrink-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 list-none border-2 border-black flex items-center justify-center rounded-sm">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono text-sm font-bold uppercase tracking-wider">SCAN_RECEIPT</div>
              <div className="font-mono text-[10px] text-black/50 uppercase tracking-widest">
                // CLAUDE AI VISION ENGINE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="font-mono text-[10px] uppercase tracking-widest hidden sm:block">
              STATS: <span className="font-bold">{scanState}</span>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          <DotGridBackground />

          {scanState === "upload" && !isCameraActive && (
            <div className="h-full p-8 flex flex-col items-center justify-center relative z-10 text-center">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />

              <div
                className={cn(
                  "w-full h-48 border-2 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 transition-all mb-6",
                  isDragging && "border-black bg-black/5"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="w-8 h-8 mb-4 opacity-50" />
                <div className="font-mono text-sm font-bold uppercase tracking-widest">Drop Invoice Here</div>
                <div className="font-mono text-xs text-black/40 mt-2 uppercase">or click to browse</div>
              </div>

              <div className="w-full flex items-center justify-between gap-4">
                <div className="h-px bg-black/10 flex-1" />
                <span className="font-mono text-[10px] text-black/40 uppercase">OR USE CAMERA</span>
                <div className="h-px bg-black/10 flex-1" />
              </div>

              <Button
                className="mt-6 h-12 w-full border-2 border-black bg-black text-white hover:bg-zinc-800 transition-colors uppercase font-bold tracking-widest text-xs rounded-none px-8"
                onClick={startCamera}
              >
                <Camera className="h-4 w-4 mr-2" />
                Open Camera
              </Button>
            </div>
          )}

          {scanState === "upload" && isCameraActive && (
            <div className="h-full relative flex flex-col">
              <div className="flex-1 bg-black relative overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Overlay */}
                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none">
                  <div className="w-full h-full border-2 border-white/50 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t-2 border-black flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  className="font-mono text-[10px] h-12 w-12 rounded-full border border-black/10"
                  onClick={stopCamera}
                >
                  <X className="h-4 w-4" />
                </Button>

                <button
                  onClick={captureImage}
                  className="h-16 w-16 rounded-full border-4 border-black bg-white flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all"
                >
                  <div className="h-12 w-12 rounded-full bg-red-600" />
                </button>

                <div className="w-12" /> {/* Spacer */}
              </div>
            </div>
          )}

          {scanState === "processing" && (
            <TerminalProcessing logs={logs} />
          )}

          {scanState === "result" && scannedData && (
            <ResultCard data={scannedData} onClose={handleClose} onSave={handleSave} isSaving={isSaving} />
          )}
        </div>
      </div>
    </div>
  );
}

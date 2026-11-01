"use client";

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../../../../lib/theme";
import { resizeImage } from "../../../../lib/imageResize";
import { FEE_ITEMS } from "../../../../lib/feeChallan";

export default function ParentFeeChallanPage() {
  const [challan, setChallan] = useState(null);
  const [bank, setBank] = useState({});
  const [loading, setLoading] = useState(true);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  async function loadHistory() {
    const res = await fetch("/api/fee-challans/history", { cache: "no-store" });
    if (res.ok) setHistory(await res.json());
  }

  async function load() {
    const [challanRes, bankRes] = await Promise.all([
      fetch("/api/fee-challans", { cache: "no-store" }),
      fetch("/api/bank-details", { cache: "no-store" }).then((r) => r.json()),
    ]);
    if (challanRes.ok) {
      setChallan(await challanRes.json());
    } else {
      const data = await challanRes.json();
      setError(data.error || "Could not load challan.");
    }
    setBank(bankRes);
    setLoading(false);
    loadHistory();
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReceiptChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploadSuccess(false);
    setReceiptFile(file);
    const dataUrl = await resizeImage(file, 1200, 0.85);
    setReceiptPreview(dataUrl);
  }

  async function handleUploadSubmit() {
    if (!receiptPreview) {
      setUploadError("Please choose a photo of your receipt first.");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadSuccess(false);
    try {
      const res = await fetch("/api/fee-challans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptImage: receiptPreview }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Could not upload the receipt. Please try again.");
        setUploading(false);
        return;
      }
      setChallan(data);
      setUploadSuccess(true);
      // Clear the picker completely — the confirmed upload now lives in
      // "Recent Transactions" below, not stuck showing in this box.
      setReceiptFile(null);
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadHistory();
    } catch (err) {
      setUploadError("Could not reach the server. Check your internet and try again.");
    }
    setUploading(false);
  }

  const statusInfo = {
    unpaid: { label: "Unpaid", color: "#791F1F", bg: "#FCEBEB" },
    pending: { label: "Pending verification", color: "#8A5B00", bg: "#FCEFD6" },
    verified: { label: "Verified — Paid", color: "#27500A", bg: "#EAF3DE" },
    superseded: { label: "Replaced by a newer receipt", color: "#5A5A52", bg: "#EEEDE6" },
    rejected: { label: "Rejected — please re-upload", color: "#791F1F", bg: "#FCEBEB" },
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <div className="no-print" style={{ background: COLORS.navy, padding: "16px 24px" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Fee Challan</p>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
        ) : error ? (
          <p style={{ fontSize: 13, color: COLORS.red }}>{error}</p>
        ) : (
          <>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "20px 20px 16px", marginBottom: 20 }}>
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <img src="/logo-full.png" alt="The PEERS Education System" style={{ height: 46, margin: "0 auto 8px", display: "block" }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, margin: 0, textDecoration: "underline" }}>Fee Voucher</p>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 14, border: `1px solid ${COLORS.border}` }}>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600, width: "28%" }}>Name</td>
                    <td style={{ padding: "6px 8px" }}>{challan.studentName}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>Father's Name</td>
                    <td style={{ padding: "6px 8px" }}>{challan.fatherName || "-"}</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>Class</td>
                    <td style={{ padding: "6px 8px" }}>
                      {challan.className}
                      <span style={{ color: COLORS.muted }}> · Section: {challan.section || "-"}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>Roll No / Month</td>
                    <td style={{ padding: "6px 8px" }}>
                      {challan.rollNo || "-"} · {challan.month}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, border: `1px solid ${COLORS.border}` }}>
                <thead>
                  <tr style={{ background: COLORS.tint, borderBottom: `1px solid ${COLORS.border}` }}>
                    <th style={{ textAlign: "left", padding: "6px 8px" }}>Description</th>
                    <th style={{ textAlign: "right", padding: "6px 8px" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_ITEMS.filter((it) => it.key === "tuitionFee" || (challan.items?.[it.key] || 0) > 0).map((it) => (
                    <tr key={it.key} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "6px 8px", color: it.key === "arrears" ? COLORS.red : COLORS.ink }}>{it.label}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: it.key === "arrears" ? COLORS.red : COLORS.ink }}>
                        Rs. {(challan.items?.[it.key] || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: COLORS.tint }}>
                    <td style={{ padding: "8px", fontWeight: 700 }}>Total Amount Payable</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>Rs. {challan.totalDue.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: statusInfo[challan.status]?.color, background: statusInfo[challan.status]?.bg, padding: "5px 12px", borderRadius: 4 }}>
                  {statusInfo[challan.status]?.label}
                </span>
                {challan.status !== "verified" && Number(challan.paidAmount) > 0 && (
                  <p style={{ fontSize: 13, margin: "10px 0 0", color: COLORS.ink }}>
                    Received so far: <b style={{ color: "#27500A" }}>Rs. {Number(challan.paidAmount).toLocaleString()}</b> · Balance to pay:{" "}
                    <b style={{ color: COLORS.red }}>Rs. {Math.max(0, challan.totalDue - Number(challan.paidAmount)).toLocaleString()}</b>
                  </p>
                )}
              </div>
            </div>

            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.navy, margin: "0 0 12px" }}>Online Payment</p>
              {bank.bankName || bank.iban || bank.jazzcash ? (
                <div style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.8 }}>
                  {bank.bankName && <p style={{ margin: 0 }}><strong>Bank:</strong> {bank.bankName}</p>}
                  {bank.accountTitle && <p style={{ margin: 0 }}><strong>Account Title:</strong> {bank.accountTitle}</p>}
                  {bank.iban && <p style={{ margin: 0 }}><strong>IBAN:</strong> {bank.iban}</p>}
                  {bank.jazzcash && <p style={{ margin: 0 }}><strong>JazzCash:</strong> {bank.jazzcash}</p>}
                  {bank.easypaisa && <p style={{ margin: 0 }}><strong>Easypaisa:</strong> {bank.easypaisa}</p>}
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: "#9A9A90", margin: 0 }}>Payment details will be added by the school soon.</p>
              )}
            </div>

            <div className="no-print" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.navy, margin: "0 0 12px" }}>Upload Payment Receipt</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReceiptChange} style={{ fontSize: 13, marginBottom: 10, display: "block" }} />
              {receiptPreview && (
                <img
                  src={receiptPreview}
                  alt="Receipt"
                  style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 6, marginBottom: 12, display: "block" }}
                />
              )}
              {receiptFile && (
                <button
                  onClick={handleUploadSubmit}
                  disabled={uploading}
                  style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 6, padding: "10px 22px", fontSize: 13.5, fontWeight: 600, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.7 : 1 }}
                >
                  {uploading ? "Uploading..." : "Upload Receipt"}
                </button>
              )}
              {uploadError && <p style={{ fontSize: 12.5, color: COLORS.red, marginTop: 10 }}>{uploadError}</p>}
              {uploadSuccess && (
                <p style={{ fontSize: 12.5, color: "#1D7A3B", marginTop: 10 }}>
                  ✓ Receipt uploaded — the office will verify it shortly.
                </p>
              )}
            </div>

            {history.length > 0 && (
              <div className="no-print" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.navy, margin: "0 0 12px" }}>Recent Transactions</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {history.map((h) => {
                    const st = statusInfo[h.status] || statusInfo.pending;
                    const fmt = (iso) => iso
                      ? new Date(iso).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi",
                        })
                      : null;
                    const uploadedWhen = fmt(h.submittedAt);
                    const reviewedWhen = fmt(h.reviewedAt);
                    const Wrapper = h.receiptImage ? "a" : "div";
                    const wrapperProps = h.receiptImage
                      ? { href: `/api/image?key=${h.receiptImage}`, target: "_blank", rel: "noreferrer" }
                      : {};
                    return (
                      <Wrapper
                        key={h.id}
                        {...wrapperProps}
                        style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "10px 12px" }}
                      >
                        {h.receiptImage ? (
                          <img src={`/api/image?key=${h.receiptImage}`} alt="Receipt" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 5, background: COLORS.tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9.5, color: "#9A9A90", textAlign: "center", lineHeight: 1.2 }}>
                            Office<br/>Record
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, margin: 0 }}>
                            {h.month} · Rs. {(h.paidAmount ?? h.totalDue ?? 0).toLocaleString()}
                          </p>
                          {uploadedWhen && (
                            <p style={{ fontSize: 11.5, color: "#9A9A90", margin: "2px 0 0" }}>
                              Uploaded: {uploadedWhen}
                            </p>
                          )}
                          {reviewedWhen && (
                            <p style={{ fontSize: 11.5, color: "#9A9A90", margin: "1px 0 0" }}>
                              {h.status === "rejected" ? "Rejected" : "Approved"}: {reviewedWhen}
                              {h.reviewedBy ? ` · by ${h.reviewedBy}` : ""}
                            </p>
                          )}
                          {!uploadedWhen && !reviewedWhen && (
                            <p style={{ fontSize: 11.5, color: "#9A9A90", margin: "2px 0 0" }}>Recorded by office</p>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: "4px 10px", borderRadius: 4, flexShrink: 0 }}>{st.label}</span>
                      </Wrapper>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => window.open(`/api/fee-challans/pdf?t=${Date.now()}`, "_blank")}
              className="no-print"
              style={{ display: "inline-block", background: COLORS.red, color: "#fff", border: "none", borderRadius: 6, padding: "10px 22px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              Download Challan (PDF)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

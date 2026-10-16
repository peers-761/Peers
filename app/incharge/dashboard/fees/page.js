"use client";

import { useRouter } from "next/navigation";
import { COLORS } from "../../../../lib/theme";
import FeeManager from "../../../../components/FeeManager";

export default function InchargeFeesPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Fee Vouchers</p>
        <a href="/incharge/dashboard" style={{ color: "#fff", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 5, textDecoration: "none" }}>
          Back
        </a>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 16px" }}>
          Every student appears here — even ones whose parent has never opened the Parent Portal. Tap "Open voucher"
          to see the full voucher and change any fee block. If a parent pays in person, mark it as paid.
        </p>
        <FeeManager onUnauthorized={() => router.push("/incharge")} />
      </div>
    </div>
  );
}

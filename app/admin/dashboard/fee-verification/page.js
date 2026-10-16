"use client";

import AdminShell from "../../../../components/AdminShell";
import FeeManager from "../../../../components/FeeManager";

export default function FeeVerificationPage() {
  return (
    <AdminShell title="Fee Verification">
      <div style={{ maxWidth: 760 }}>
        <FeeManager onUnauthorized={() => (window.location.href = "/admin")} />
      </div>
    </AdminShell>
  );
}

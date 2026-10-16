import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { isAdminSessionValid } from "../../../lib/adminSessions";

export const dynamic = "force-dynamic";

// Runs on every admin page load: if this device was signed out because 5
// other devices are already signed in, send it back to the login page.
export default async function AdminDashboardLayout({ children }) {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (session?.role === "admin") {
    const ok = await isAdminSessionValid(session.sid).catch(() => true);
    if (!ok) redirect("/admin?signedOut=1");
  }
  return children;
}

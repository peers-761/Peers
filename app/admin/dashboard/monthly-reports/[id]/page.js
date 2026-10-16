"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AdminShell from "../../../../../components/AdminShell";
import { COLORS } from "../../../../../lib/theme";
import { downloadElementAsPdf, safeFileName } from "../../../../../lib/downloadPdf";
import { computeRow, computeRanks, groupTotal, newId, defaultSubjects } from "../../../../../lib/monthlyTests";

const cell = { border: "1px solid #444", padding: "5px 6px", textAlign: "center", fontSize: 13 };
const headCell = { ...cell, background: "#C9D0E4", fontWeight: 700 };
const box = { width: "100%", minWidth: 38, textAlign: "center", border: "1px solid #bbb", borderRadius: 3, padding: "4px 2px", fontSize: 13, background: "#FFFDF2" };

export default function MonthlyTestEditor() {
  const { id } = useParams();
  const [test, setTest] = useState(null);
  const [students, setStudents] = useState({});
  const [roster, setRoster] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    fetch(`/api/monthly-tests/${id}`, { cache: "no-store" })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return setError(d.error || "Could not load.");
        setTest(d.test);
        setStudents(d.students);
        setRoster(d.roster);
      });
  }, [id]);

  // Auto-save 1.5 seconds after the last change.
  useEffect(() => {
    if (!test || !dirty.current) return;
    setStatus("Unsaved changes...");
    const t = setTimeout(save, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  async function save() {
    setStatus("Saving...");
    const res = await fetch(`/api/monthly-tests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: test.title, groups: test.groups }),
    });
    dirty.current = false;
    setStatus(res.ok ? "All changes saved" : "Could not save — check your internet");
  }

  function change(fn) {
    dirty.current = true;
    setTest((t) => {
      const copy = JSON.parse(JSON.stringify(t));
      fn(copy);
      return copy;
    });
  }

  const setGroup = (gi, fn) => change((t) => fn(t.groups[gi]));

  function addGroup() {
    change((t) => {
      const used = new Set(t.groups.flatMap((g) => g.studentIds));
      t.groups.push({ id: newId("g"), label: "", section: "All", subjects: defaultSubjects(), studentIds: roster.filter((s) => !used.has(s.id)).map((s) => s.id), marks: {} });
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadElementAsPdf(document.getElementById("sheet"), safeFileName(test.title, "Class", test.className), { landscape: true });
    } catch (e) {
      alert(e.message || "Could not create the PDF.");
    }
    setDownloading(false);
  }

  if (error) return <AdminShell title="Monthly Test"><p style={{ color: COLORS.red, fontSize: 13 }}>{error}</p></AdminShell>;
  if (!test) return <AdminShell title="Monthly Test"><p style={{ color: COLORS.muted, fontSize: 13 }}>Loading...</p></AdminShell>;

  const classLabel = /^\d+$/.test(test.className) ? `${test.className}TH` : test.className;

  return (
    <AdminShell title="Monthly Test Report">
      <style>{`@media print { @page { size: A4 landscape; margin: 8mm; } main { padding: 0 !important; } }`}</style>

      <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <a href="/admin/dashboard/monthly-reports" style={{ fontSize: 13, color: COLORS.navy }}>← All tests</a>
        <input value={test.title} onChange={(e) => change((t) => (t.title = e.target.value))} style={{ padding: "8px 10px", fontSize: 14, fontWeight: 600, border: "1px solid #DBD8CC", borderRadius: 5, minWidth: 240 }} />
        <span style={{ fontSize: 12, color: COLORS.muted }}>{status}</span>
        <span style={{ flex: 1 }} />
        <button onClick={handleDownload} disabled={downloading} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}>
          {downloading ? "Preparing PDF..." : "Download PDF"}
        </button>
        <button onClick={() => window.print()} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}>Print</button>
      </div>

      <div id="sheet" style={{ background: "#fff", padding: 12 }}>
        {test.groups.map((g, gi) => {
          const ranks = computeRanks(g);
          const total = groupTotal(g);
          const inGroup = new Set(g.studentIds);
          const outside = roster.filter((s) => !inGroup.has(s.id));
          return (
            <div key={g.id} className="keep-together" style={{ marginBottom: 34 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #16215E", paddingBottom: 6, marginBottom: 8 }}>
                <img src="/emblem.png" alt="" style={{ height: 40 }} />
                <p style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: 16, margin: 0, textAlign: "center", color: COLORS.navy }}>
                  The PEERS Education System — {test.title} · {classLabel}{g.section !== "All" ? ` ${g.section.toUpperCase()}` : ""}
                </p>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{g.label}</p>
              </div>

              <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8, fontSize: 12.5 }}>
                <input value={g.label} onChange={(e) => setGroup(gi, (x) => (x.label = e.target.value))} placeholder="Table label (e.g. 9th B3, Arts)" style={{ padding: "6px 8px", border: "1px solid #DBD8CC", borderRadius: 5 }} />
                <select value={g.section} onChange={(e) => setGroup(gi, (x) => (x.section = e.target.value))} style={{ padding: "6px 8px", border: "1px solid #DBD8CC", borderRadius: 5 }}>
                  <option value="All">All students</option>
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                </select>
                <button onClick={() => setGroup(gi, (x) => x.subjects.push({ id: newId("s"), name: "New subject", total: 20 }))} style={{ padding: "6px 10px", border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 5, cursor: "pointer" }}>+ Subject</button>
                {test.groups.length > 1 && (
                  <button onClick={() => confirm("Remove this table?") && change((t) => t.groups.splice(gi, 1))} style={{ padding: "6px 10px", border: "none", background: "none", color: COLORS.red, cursor: "pointer" }}>Remove table</button>
                )}
                {outside.length > 0 && (
                  <select value="" onChange={(e) => e.target.value && setGroup(gi, (x) => x.studentIds.push(e.target.value))} style={{ padding: "6px 8px", border: "1px solid #DBD8CC", borderRadius: 5 }}>
                    <option value="">+ Add a student to this table...</option>
                    {outside.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.section})</option>)}
                  </select>
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={headCell}>Sr.#</th>
                      <th style={{ ...headCell, minWidth: 150 }}>Name</th>
                      {g.subjects.map((s, si) => (
                        <th key={s.id} style={headCell}>
                          <input value={s.name} onChange={(e) => setGroup(gi, (x) => (x.subjects[si].name = e.target.value))} style={{ ...box, background: "transparent", border: "1px dashed #8a93b8", fontWeight: 700, minWidth: 70 }} />
                          <span className="no-print" onClick={() => confirm(`Remove ${s.name}?`) && setGroup(gi, (x) => x.subjects.splice(si, 1))} style={{ color: COLORS.red, cursor: "pointer", fontSize: 11 }}>remove</span>
                        </th>
                      ))}
                      <th style={headCell}>OBT.M</th>
                      <th style={headCell}>%AGE</th>
                      <th style={headCell}>Grade</th>
                      <th style={headCell}>Rank</th>
                      <th className="no-print" style={headCell}></th>
                    </tr>
                    <tr>
                      <th style={headCell}></th>
                      <th style={headCell}>Total M.</th>
                      {g.subjects.map((s, si) => (
                        <th key={s.id} style={headCell}>
                          <input type="number" min="0" value={s.total} onChange={(e) => setGroup(gi, (x) => (x.subjects[si].total = e.target.value === "" ? 0 : Number(e.target.value)))} style={{ ...box, background: "transparent", fontWeight: 700 }} />
                        </th>
                      ))}
                      <th style={headCell}>{total}</th>
                      <th style={headCell}>100</th>
                      <th style={headCell}></th>
                      <th style={headCell}></th>
                      <th className="no-print" style={headCell}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.studentIds.filter((sid) => students[sid]).map((sid, ri) => {
                      const row = computeRow(g, sid);
                      const st = students[sid];
                      return (
                        <tr key={sid}>
                          <td style={cell}>{ri + 1}</td>
                          <td style={{ ...cell, textAlign: "left", fontWeight: 600 }}>{st.name}</td>
                          {g.subjects.map((s) => (
                            <td key={s.id} style={cell}>
                              <input
                                type="number"
                                min="0"
                                max={s.total || undefined}
                                value={g.marks?.[sid]?.[s.id] ?? ""}
                                onChange={(e) => setGroup(gi, (x) => ((x.marks[sid] = x.marks[sid] || {}), (x.marks[sid][s.id] = e.target.value)))}
                                style={{ ...box, borderColor: Number(g.marks?.[sid]?.[s.id]) > Number(s.total) ? COLORS.red : "#bbb" }}
                              />
                            </td>
                          ))}
                          <td style={{ ...cell, fontWeight: 700 }}>{row.obtained ?? ""}</td>
                          <td style={{ ...cell, fontWeight: 700 }}>{row.percentage ?? ""}</td>
                          <td style={{ ...cell, fontWeight: 700 }}>{row.grade}</td>
                          <td style={cell}>{ranks[sid] ?? ""}</td>
                          <td className="no-print" style={{ ...cell, border: "none" }}>
                            <span onClick={() => setGroup(gi, (x) => (x.studentIds = x.studentIds.filter((i) => i !== sid)))} style={{ color: COLORS.red, cursor: "pointer", fontSize: 11 }}>remove</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <button className="no-print" onClick={addGroup} style={{ padding: "8px 16px", fontSize: 13, border: `1px solid ${COLORS.navy}`, background: "#fff", color: COLORS.navy, borderRadius: 5, cursor: "pointer" }}>
        + Add another table (e.g. Arts group)
      </button>
      <p className="no-print" style={{ fontSize: 11.5, color: "#9A9A90", marginTop: 10 }}>
        Obtained marks are typed in; OBT.M, %AGE, Grade and Rank are calculated automatically. Changes save by themselves. Marks in red are higher than the subject's total.
      </p>
    </AdminShell>
  );
}

// Real "Download PDF" for any on-screen block (client side only).
//
// Before this, every "Download PDF" button just called window.print(), which
// opens the print dialog. This captures the block and saves an actual .pdf
// file instead. Anything with the class "no-print" (buttons, menus) is left
// out of the file. Print buttons still use window.print().
const SRC = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

let loading = null;
function loadLib() {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in a browser."));
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => (window.html2pdf ? resolve(window.html2pdf) : reject(new Error("PDF tool did not load.")));
    s.onerror = () => {
      loading = null;
      reject(new Error("Could not load the PDF tool. Check your internet connection and try again."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export async function downloadElementAsPdf(element, filename = "report.pdf", { landscape = false } = {}) {
  if (!element) throw new Error("Nothing to download.");
  const html2pdf = await loadLib();
  document.body.classList.add("pdf-capturing");
  try {
    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: filename.endsWith(".pdf") ? filename : filename + ".pdf",
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".result-card", ".keep-together"] },
      })
      .from(element)
      .save();
  } finally {
    document.body.classList.remove("pdf-capturing");
  }
}

export function safeFileName(...parts) {
  return parts
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9\-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

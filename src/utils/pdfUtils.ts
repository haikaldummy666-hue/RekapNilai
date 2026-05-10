/** PDF rapor menggunakan jsPDF + html2canvas. */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * html2canvas uses its own CSS parser that does NOT support oklch() or
 * color-mix(in oklab, ...). This helper walks every stylesheet and inline style
 * in the cloned document and replaces those functions with rgba() fallbacks so
 * html2canvas can parse the CSS without throwing.
 */
function sanitizeColorsForHtml2Canvas(doc: Document) {
  // Regex patterns for unsupported modern color functions
  const oklab = /color-mix\s*\(\s*in\s+oklab[^)]*\)/gi;
  const oklch = /oklch\s*\([^)]*\)/gi;

  // Replace with safe transparent/white fallbacks
  const replaceFn = (css: string) =>
    css.replace(oklab, "rgba(0,0,0,0)").replace(oklch, "#000000");

  // 1. Walk stylesheets
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule || rule instanceof CSSMediaRule) {
          // We can't mutate cssText directly on sub-rules easily,
          // so handle it via the owning <style> element below.
        }
      }
    } catch {
      // cross-origin sheets — skip
    }
  }

  // 2. Replace text content of every <style> tag
  for (const style of Array.from(doc.querySelectorAll("style"))) {
    style.textContent = replaceFn(style.textContent ?? "");
  }

  // 3. Replace inline style attributes on every element
  for (const el of Array.from(doc.querySelectorAll("[style]"))) {
    const htmlEl = el as HTMLElement;
    htmlEl.style.cssText = replaceFn(htmlEl.style.cssText);
  }
}

export async function exportElementToPDF(element: HTMLElement, filename: string) {
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) {
    throw new Error("Konten PDF kosong. Coba scroll ke atas lalu coba lagi.");
  }

  const targetPxWidth = 1600;
  const scale = Math.max(1, Math.min(2, targetPxWidth / rect.width));

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      removeContainer: true,
      imageTimeout: 15000,
      onclone: (doc) => {
        doc.documentElement.classList.add("pdf-mode");
        // Must run AFTER adding pdf-mode so the class overrides are in place,
        // then sanitise any remaining modern color functions.
        sanitizeColorsForHtml2Canvas(doc);
      },
    });
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Gagal render halaman ke PDF: ${e.message}`
        : "Gagal render halaman ke PDF",
    );
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const marginMm = 10;
  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const contentWidthMm = pageWidthMm - marginMm * 2;
  const contentHeightMm = pageHeightMm - marginMm * 2;

  const mmPerPx = contentWidthMm / canvas.width;
  const pageHeightPx = Math.floor(contentHeightMm / mmPerPx);
  const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

  for (let page = 0; page < totalPages; page++) {
    const y = page * pageHeightPx;
    const sliceHeight = Math.min(pageHeightPx, canvas.height - y);

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const ctx = pageCanvas.getContext("2d");
    if (!ctx) throw new Error("Gagal membuat konteks canvas");
    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
    if (page > 0) pdf.addPage();
    const imgHeightMm = sliceHeight * mmPerPx;
    pdf.addImage(imgData, "JPEG", marginMm, marginMm, contentWidthMm, imgHeightMm);
  }

  try {
    pdf.save(filename);
  } catch (e) {
    throw new Error(
      e instanceof Error ? `Gagal menyimpan file PDF: ${e.message}` : "Gagal menyimpan file PDF",
    );
  }
}

/** PDF rapor menggunakan jsPDF + html2canvas. */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

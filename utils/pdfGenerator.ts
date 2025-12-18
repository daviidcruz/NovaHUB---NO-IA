import { ProjectDraft, Tender } from '../types';

declare global {
  interface Window {
    jspdf: any;
  }
}

export const generateProjectPDF = (tender: Tender, draft: ProjectDraft) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const margin = 20;
  let cursorY = margin;
  const pageHeight = doc.internal.pageSize.height;
  const maxWidth = 170;

  const checkPageBreak = (heightAdd: number) => {
    if (cursorY + heightAdd > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185); // NovaGob Blue-ish
  const titleLines = doc.splitTextToSize(`Proyecto: ${tender.title}`, maxWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += (titleLines.length * 10) + 10;

  // Cover Image if exists
  if (draft.coverImage) {
    checkPageBreak(100);
    // Assuming image is roughly square/landscape, fit to width
    try {
        doc.addImage(draft.coverImage, 'PNG', margin, cursorY, 100, 100);
        cursorY += 110;
    } catch(e) {
        console.error("Error adding image to PDF", e);
    }
  }

  // Meta Info
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Referencia Licitación: ${tender.id}`, margin, cursorY);
  cursorY += 6;
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, cursorY);
  cursorY += 10;

  // Sections
  const addSection = (title: string, content: string) => {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, cursorY);
    cursorY += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(content, maxWidth);
    checkPageBreak(lines.length * 5);
    doc.text(lines, margin, cursorY);
    cursorY += (lines.length * 5) + 10;
  };

  addSection("1. Introducción", draft.introduction);
  addSection("2. Objetivos", draft.objectives);
  addSection("3. Metodología", draft.methodology);
  addSection("4. Recursos Necesarios", draft.resources);
  addSection("5. Evaluación", draft.evaluation);

  doc.save(`Proyecto_NovaHUB_${tender.id.substring(0, 8)}.pdf`);
};
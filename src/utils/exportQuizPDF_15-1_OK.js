//import { jsPDF } from "jspdf";
//import "../fonts/DejaVuSans-normal.js";

import jsPDF from "jspdf";
import "../fonts/DejaVuSans-normal.js";


// ================== UTILS ==================

// Convert URL ảnh sang base64
async function getBase64FromUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Chuẩn hoá tên
const capitalizeName = (name) => {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// Lấy text sạch từ HTML / option object
const extractText = (val) => {
  if (!val) return "";
  const raw =
    typeof val === "string"
      ? val
      : val.text || val.question || "";

  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Lấy image đúng theo data mới
const extractImage = (opt) => {
  if (!opt) return null;

  if (opt.formats?.image) return opt.formats.image;

  if (typeof opt.text === "string" && opt.text.startsWith("http")) {
    return opt.text;
  }

  return null;
};

// ================== MAIN ==================

export const exportQuizPDF = async (
  studentInfo,
  className,
  questions,
  answers,
  total,
  durationStr,
  quizTitle
) => {
  const pdf = new jsPDF("p", "mm", "a4");
  const margin = 15;
  const lineHeight = 7;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageBottom = pageHeight - margin;
  let y = margin;

  pdf.setFont("DejaVuSans", "normal");

  // ================== HEADER ==================
  pdf.setFontSize(12);
  pdf.rect(margin, y, pageWidth - 2 * margin, 28);

  pdf.setTextColor(0, 0, 255);
  pdf.text(`Trường: TH Bình Khánh`, margin + 5, y + 8);
  pdf.text(`Họ tên: ${capitalizeName(studentInfo.name)}`, margin + 5, y + 15);
  pdf.text(`Lớp: ${className}`, margin + 5, y + 22);

  const now = new Date();

  const datePart = now.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const timePart = now.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit"
  });

  pdf.text(`Ngày: ${datePart} (${timePart})`, pageWidth / 2 + 10, y + 8);

  if (durationStr) {
    pdf.text(`Thời gian: ${durationStr}`, pageWidth / 2 + 10, y + 15);
  }

  pdf.setTextColor(255, 0, 0);
  pdf.text(`Kết quả: ${total} điểm`, pageWidth / 2 + 10, y + 22);

  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 255);
  pdf.text(quizTitle, pageWidth / 2, y + 40, { align: "center" });

  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  y += 50;


  // ================== QUESTIONS ==================
  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];

    const qLines = pdf.splitTextToSize(
      `Câu ${idx + 1}: ${extractText(q.question)}`,
      pageWidth - 2 * margin
    );

    if (y + qLines.length * lineHeight > pageBottom) {
      pdf.addPage();
      y = margin;
    }

    pdf.text(qLines, margin, y);
    y += qLines.length * lineHeight + 2;

    // -------- IMAGE QUESTION --------
    if (q.questionImage) {
      try {
        const img64 = await getBase64FromUrl(q.questionImage);
        pdf.addImage(img64, "PNG", margin + 40, y, 40, 40);
        y += 45;
      } catch {}
    }

    // ================== TYPES ==================
    switch (q.type) {
      case "single": {
        q.options.forEach((opt, i) => {
          const text = extractText(opt);
          const selected = answers[q.id] === i ? "[x]" : "[ ]";
          const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
          const isCorrect = answers[q.id] === i && correctArr.includes(i);

          const lines = pdf.splitTextToSize(
            `${selected} ${text}`,
            pageWidth - 2 * margin - 10
          );

          if (y + lines.length * lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(lines, margin + 5, y);

          if (answers[q.id] === i) {
            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);
            pdf.setTextColor(0, 0, 0);
          }

          y += lines.length * lineHeight;
        });
        break;
      }

      case "sort": {
        const userOrder = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const correctTexts = Array.isArray(q.correctTexts) ? q.correctTexts : [];

        // Nếu chưa làm → hiển thị theo thứ tự gốc
        const displayOrder =
          userOrder.length === q.options.length
            ? userOrder
            : q.options.map((_, i) => i);

        displayOrder.forEach((optIndex, i) => {
          const text = extractText(q.options[optIndex]);

          const lines = pdf.splitTextToSize(
            `${i + 1}. ${text}`,
            pageWidth - 2 * margin - 15
          );

          if (y + lines.length * lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(lines, margin + 5, y);

          // ===== SO SÁNH GIỐNG HỆT CHẤM ĐIỂM =====
          if (
            userOrder.length === correctTexts.length &&
            correctTexts.length > 0
          ) {
            const isCorrect = text === extractText(correctTexts[i]);

            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);
            pdf.setTextColor(0, 0, 0);
          }

          y += lines.length * lineHeight;
        });

        break;
      }


      case "image": {
        const imgSize = 18;     // kích thước ảnh
        const gap = 40;         // khoảng cách mỗi ảnh
        const maxPerRow = 4;

        const totalRowWidth = gap * maxPerRow;
        const startX = (pageWidth - totalRowWidth) / 2; // ⭐ căn giữa

        let x = startX;

        for (let i = 0; i < q.options.length; i++) {
          if (i > 0 && i % maxPerRow === 0) {
            x = startX;
            y += imgSize + 14;
          }

          const imgUrl = extractImage(q.options[i]);
          const selected = (answers[q.id] || []).includes(i) ? "[x]" : "[ ]";

          // checkbox
          pdf.text(selected, x + imgSize / 2 - 4, y);

          // image
          if (imgUrl) {
            try {
              const img64 = await getBase64FromUrl(imgUrl);
              pdf.addImage(img64, "PNG", x, y + 4, imgSize, imgSize);
            } catch {}
          }

          x += gap;
        }

        y += imgSize + 20;
        break;
      }

      case "multiple": {
        const userAns = answers[q.id] || [];
        q.options.forEach((opt, i) => {
          const text = extractText(opt);
          const checked = userAns.includes(i) ? "[x]" : "[ ]";
          const isCorrect =
            Array.isArray(q.correct) && q.correct.includes(i);

          const lines = pdf.splitTextToSize(
            `${checked} ${text}`,
            pageWidth - 2 * margin - 10
          );

          if (y + lines.length * lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(lines, margin + 5, y);

          if (userAns.includes(i)) {
            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);
            pdf.setTextColor(0, 0, 0);
          }

          y += lines.length * lineHeight;
        });
        break;
      }

      case "truefalse": {
        const userAns = answers[q.id] || [];
        q.options.forEach((opt, i) => {
          const text = extractText(opt);
          const val = userAns[i] || "";
          const correctVal = q.correct?.[i] || "";

          const mark = val ? `[${val}]` : "[ ]";
          const isCorrect = val === correctVal;

          const line = pdf.splitTextToSize(
            `${mark} ${text}`,
            pageWidth - 2 * margin
          );

          if (y + line.length * lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(line, margin + 5, y);

          if (val) {
            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);
            pdf.setTextColor(0, 0, 0);
          }

          y += line.length * lineHeight;
        });
        break;
      }

      case "fillblank": {
        const filled = q.filled || [];
        const correct = q.options || [];

        filled.forEach((word, i) => {
          const isCorrect = word === correct[i];
          const line = `${i + 1}. ${word || "______"}`;

          if (y + lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(line, margin + 5, y);

          if (word) {
            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);
            pdf.setTextColor(0, 0, 0);
          }

          y += lineHeight;
        });
        break;
      }

      case "matching": {
        const order = answers[q.id] || [];
        q.pairs.forEach((pair, i) => {
          const left = extractText(pair.left);
          const rightIdx = order[i];
          const right = extractText(q.rightOptions?.[rightIdx]);

          const isCorrect = rightIdx === q.correct?.[i];

          const line = `${left}  →  ${right || "_____"}`;

          const lines = pdf.splitTextToSize(
            line,
            pageWidth - 2 * margin
          );

          if (y + lines.length * lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(lines, margin + 5, y);

          pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
          pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);
          pdf.setTextColor(0, 0, 0);

          y += lines.length * lineHeight;
        });
        break;
      }


      default:
        pdf.text("(Loại câu hỏi chưa hỗ trợ)", margin + 5, y);
        y += lineHeight;
    }

    y += 4;
  }

  // ================== SAVE ==================
  const code = Date.now();
  const safeName = capitalizeName(studentInfo.name).replace(/\s+/g, "_");
  pdf.save(`${className}_${safeName}_${code}.pdf`);
};

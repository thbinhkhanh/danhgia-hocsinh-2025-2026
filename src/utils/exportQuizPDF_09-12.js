import { jsPDF } from "jspdf";
import "../fonts/DejaVuSans-normal.js"; // font tiếng Việt

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

const capitalizeName = (name) => {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const exportQuizPDF = async (
  studentInfo, className, questions, answers, total, durationStr, quizTitle
) => {
  const pdf = new jsPDF("p", "mm", "a4");
  const margin = 15;
  const lineHeight = 7;
  const lineSpacing = lineHeight * 1.5;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageBottom = pageHeight - margin;
  let y = margin;

  pdf.setFont("DejaVuSans", "normal");

  // ===== HEADER =====
  pdf.setFontSize(12);
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);

  const boxHeight = lineSpacing * 4;
  pdf.rect(margin, y, pageWidth - 2 * margin, boxHeight);

  pdf.setTextColor(0, 0, 255);
  pdf.text(`Trường: TH Bình Khánh`, margin + 5, y + lineSpacing);
  pdf.text(`Họ tên: ${capitalizeName(studentInfo.name)}`, margin + 5, y + lineSpacing * 2);
  pdf.text(`Lớp: ${className}`, margin + 5, y + lineSpacing * 3);

  const currentDate = new Date();
  const datePart = currentDate.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const timePart = currentDate.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
  const vnTime = `${datePart} ${timePart}`;

  pdf.text(`Ngày: ${vnTime}`, pageWidth / 2 + 10, y + lineSpacing);
  if (durationStr) pdf.text(`Thời gian: ${durationStr}`, pageWidth / 2 + 10, y + lineSpacing * 2);
  pdf.setTextColor(255, 0, 0);
  pdf.text(`Kết quả: ${total} điểm`, pageWidth / 2 + 10, y + lineSpacing * 3);

  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 255);
  pdf.text(quizTitle, pageWidth / 2, y + boxHeight + lineSpacing, { align: "center" });

  pdf.setTextColor(0, 0, 0);
  y += boxHeight + lineSpacing * 2;

  // ===== NỘI DUNG CÂU HỎI =====
  pdf.setFontSize(12);

  for (let index = 0; index < questions.length; index++) {
    const q = questions[index];

    let questionLines = pdf.splitTextToSize(`Câu ${index + 1}: ${q.question}`, pageWidth - 2 * margin);
    if (y + questionLines.length * lineHeight > pageBottom) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(questionLines, margin, y);
    y += questionLines.length * lineHeight;

    // ===== Hình minh họa =====
    if (q.questionImage) {
      try {
        const imgBase64 = await getBase64FromUrl(q.questionImage);
        const imgProps = pdf.getImageProperties(imgBase64);
        const imgWidth = (pageWidth - 2 * margin) * 0.25;
        const imgHeight = (imgProps.height / imgProps.width) * imgWidth;
        const x = (pageWidth - imgWidth) / 2;

        if (y + imgHeight > pageBottom) { pdf.addPage(); y = margin; }
        pdf.addImage(imgBase64, "JPEG", x, y, imgWidth, imgHeight);
        y += imgHeight + 2;
      } catch (e) {
        const errLine = pdf.splitTextToSize("(Không tải được hình minh họa)", pageWidth - 2 * margin);
        if (y + errLine.length * lineHeight > pageBottom) { pdf.addPage(); y = margin; }
        pdf.text(errLine, margin, y);
        y += errLine.length * lineHeight;
      }
    }

    // ===== Xử lý theo loại =====
    switch(q.type) {
      case "single":
        q.options.forEach((opt, i) => {
          const selected = answers[q.id] === i ? "(●)" : "( )";
          const correctArray = Array.isArray(q.correct) ? q.correct : [q.correct];
          const isCorrect = answers[q.id] === i && correctArray.includes(i);

          const optionLines = pdf.splitTextToSize(`${selected} ${opt}`, pageWidth - 2 * margin - 10);
          const optionHeight = optionLines.length * lineHeight;
          if (y + optionHeight > pageBottom) { pdf.addPage(); y = margin; }
          pdf.text(optionLines, margin + 5, y);

          if (answers[q.id] === i) {
            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", margin + 150, y);
            pdf.setTextColor(0, 0, 0);
          } else if (correctArray.includes(i)) {
            pdf.setTextColor(255, 0, 0);
            pdf.text("✓", margin + 150, y); // tick đỏ cho thiếu
            pdf.setTextColor(0, 0, 0);
          }
          y += optionHeight;
        });
        break;

      case "multiple":
        q.options.forEach((opt, i) => {
          const selected = (answers[q.id] || []).includes(i) ? "[x]" : "[ ]";
          const correctArray = Array.isArray(q.correct) ? q.correct : [q.correct];
          const isCorrect = (answers[q.id] || []).includes(i) && correctArray.includes(i);

          const optionLines = pdf.splitTextToSize(`${selected} ${opt}`, pageWidth - 2 * margin - 10);
          const optionHeight = optionLines.length * lineHeight;
          if (y + optionHeight > pageBottom) { pdf.addPage(); y = margin; }
          pdf.text(optionLines, margin + 5, y);

          if ((answers[q.id] || []).includes(i)) {
            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", margin + 150, y);
            pdf.setTextColor(0, 0, 0);
          } else if (correctArray.includes(i)) {
            pdf.setTextColor(255, 0, 0);
            pdf.text("✓", margin + 150, y); // tick đỏ cho thiếu
            pdf.setTextColor(0, 0, 0);
          }
          y += optionHeight;
        });
        break;

            case "truefalse": {
        const userArray = answers[q.id] || [];

        q.options.forEach((opt, i) => {
          const selected = userArray[i] || "";
          const originalIdx = Array.isArray(q.initialOrder) ? q.initialOrder[i] : i;
          const correctArray = Array.isArray(q.correct) ? q.correct : [];
          const correctVal = correctArray[originalIdx] ?? "";

          const isCorrect = selected === correctVal;
          const isWrong   = selected !== "" && selected !== correctVal;

          const optionLines = pdf.splitTextToSize(`[${selected}] ${opt}`, pageWidth - 2 * margin - 10);
          const optionHeight = optionLines.length * lineHeight;
          if (y + optionHeight > pageBottom) { pdf.addPage(); y = margin; }
          pdf.text(optionLines, margin + 5, y);

          if (selected) {
            if (isCorrect) {
              pdf.setTextColor(0, 128, 0);
              pdf.text("✓", margin + 150, y);
            } else if (isWrong) {
              pdf.setTextColor(255, 0, 0);
              pdf.text("✗", margin + 150, y);
            }
            pdf.setTextColor(0, 0, 0);
          } else if (correctVal !== "") {
            // thiếu
            pdf.setTextColor(255, 0, 0);
            pdf.text("✓", margin + 150, y);
            pdf.setTextColor(0, 0, 0);
          }

          y += optionHeight;
        });
        break;
      }

      case "matching":
        const ans = answers[q.id] || [];
        q.leftOptions.forEach((left, i) => {
          const rightIdx = ans[i];
          const right = rightIdx !== undefined ? q.rightOptions[rightIdx] : "?";
          const isCorrect = rightIdx === q.correct[i];

          const line = pdf.splitTextToSize(`${left} → ${right}`, pageWidth - 2 * margin - 10);
          const optionHeight = line.length * lineHeight;
          if (y + optionHeight > pageBottom) { pdf.addPage(); y = margin; }
          pdf.text(line, margin + 5, y);

          if (rightIdx !== undefined) {
            if (isCorrect) {
              pdf.setTextColor(0, 128, 0);
              pdf.text("✓", margin + 150, y);
            } else {
              pdf.setTextColor(255, 0, 0);
              pdf.text("✗", margin + 150, y);
            }
            pdf.setTextColor(0, 0, 0);
          } else if (q.correct[i] !== undefined) {
            // thiếu
            pdf.setTextColor(255, 0, 0);
            pdf.text("✓", margin + 150, y);
            pdf.setTextColor(0, 0, 0);
          }

          y += optionHeight;
        });
        break;

      case "sort": {
        const userOrder = answers[q.id] || [];
        const userTexts = userOrder.map((idx) => q.options[idx]);
        const correctTexts = q.correctTexts || [];

        userTexts.forEach((text, i) => {
          const isCorrect =
            correctTexts.length === userTexts.length &&
            text === correctTexts[i];

          const line = pdf.splitTextToSize(`${i + 1}. ${text}`, pageWidth - 2 * margin - 10);
          const optionHeight = line.length * lineHeight;
          if (y + optionHeight > pageBottom) { pdf.addPage(); y = margin; }
          pdf.text(line, margin + 5, y);

          if (userOrder.length > 0) {
            if (isCorrect) {
              pdf.setTextColor(0, 128, 0);
              pdf.text("✓", margin + 150, y);
            } else {
              pdf.setTextColor(255, 0, 0);
              pdf.text("✗", margin + 150, y);
            }
            pdf.setTextColor(0, 0, 0);
          }

          y += optionHeight;
        });
        break;
      }

      case "image":
        let x = margin + 5;
        const imgSize = 25;
        for (let i = 0; i < q.options.length; i++) {
          const imgUrl = q.options[i];
          const selected = (answers[q.id] || []).includes(i) ? "[x]" : "[ ]";
          const correctArray = Array.isArray(q.correct) ? q.correct : [q.correct];
          const isCorrect = (answers[q.id] || []).includes(i) && correctArray.includes(i);

          const line = pdf.splitTextToSize(`${selected} Hình ${i + 1}`, pageWidth - 2 * margin - 10);
          const optionHeight = line.length * lineHeight + imgSize;
          if (y + optionHeight > pageBottom) { pdf.addPage(); y = margin; }
          pdf.text(line, x, y);

          if ((answers[q.id] || []).includes(i)) {
            if (isCorrect) {
              pdf.setTextColor(0, 128, 0);
              pdf.text("✓", x + imgSize, y);
            } else {
              pdf.setTextColor(255, 0, 0);
              pdf.text("✗", x + imgSize, y);
            }
            pdf.setTextColor(0, 0, 0);
          } else if (correctArray.includes(i)) {
            // thiếu
            pdf.setTextColor(255, 0, 0);
            pdf.text("✓", x + imgSize, y);
            pdf.setTextColor(0, 0, 0);
          }

          try {
            const imgBase64 = await getBase64FromUrl(imgUrl);
            pdf.addImage(imgBase64, "JPEG", x, y + 5, imgSize, imgSize);
          } catch (e) {
            pdf.text("(Không tải được ảnh)", x, y + 5);
          }

          x += imgSize + 20;
        }
        y += imgSize + 20;
        break;

      case "fillblank":
        const parts = (q.option || "").split("[...]");
        const userAnswers = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const correctAnswers = Array.isArray(q.options) ? q.options : [];

        const maxWidth = pageWidth - 2 * margin;
        let xPos = margin;
        let yLine = y;

        for (let i = 0; i < parts.length; i++) {
          const textBefore = parts[i];
          const splitBefore = pdf.splitTextToSize(textBefore, maxWidth - (xPos - margin));
          splitBefore.forEach((line, idx) => {
            if (idx > 0) { yLine += lineHeight; xPos = margin; }
            pdf.setTextColor(0, 0, 0);
            pdf.text(line, xPos, yLine);
            xPos += pdf.getTextWidth(line);
          });

          if (i < parts.length - 1) {
            const answerWord = userAnswers[i] ? userAnswers[i] : "______";
            const isCorrect =
              userAnswers[i] &&
              correctAnswers[i] &&
              userAnswers[i].trim() === correctAnswers[i].trim();

            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            const wordToDraw = `[${answerWord}]`;

            if (xPos + pdf.getTextWidth(wordToDraw) > pageWidth - margin) {
              yLine += lineHeight;
              xPos = margin;
            }

            pdf.text(wordToDraw, xPos, yLine);
            xPos += pdf.getTextWidth(wordToDraw);
            pdf.setTextColor(0, 0, 0);
          }
        }
        y = yLine + lineHeight;
        break;

      default:
        const defaultLine = pdf.splitTextToSize("Loại câu hỏi không hỗ trợ", pageWidth - 2 * margin - 10);
        if (y + defaultLine.length * lineHeight > pageBottom) { pdf.addPage(); y = margin; }
        pdf.text(defaultLine, margin + 5, y);
        y += defaultLine.length * lineHeight;
    }

    y += 2;
  }

  // ===== LƯU FILE =====
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  const code = `${hh}${mm}${ss}${ms}`;

  const safeName = capitalizeName(studentInfo.name).replace(/\s+/g, "_");
  const fileName = `${className}_${safeName}_${code}.pdf`;

  pdf.save(fileName);
};

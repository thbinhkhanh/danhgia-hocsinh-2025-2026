//import { jsPDF } from "jspdf";
//import "../fonts/DejaVuSans-normal.js";

import jsPDF from "jspdf";
import "../fonts/DejaVuSans-normal.js";
import { v4 as uuidv4 } from "uuid";

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

const getImageSize = (base64) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.src = base64;
  });
};

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

        const { width, height } = await getImageSize(img64);

        // scale
        let newWidth = width * 0.4 * 0.264583;
        let newHeight = height * 0.4 * 0.264583;

        // tránh tràn
        const maxWidth = pageWidth - 2 * margin;
        if (newWidth > maxWidth) {
          const ratio = maxWidth / newWidth;
          newWidth = maxWidth;
          newHeight = newHeight * ratio;
        }

        // 👉 căn giữa
        const xCenter = (pageWidth - newWidth) / 2;

        pdf.addImage(img64, "PNG", xCenter, y-5, newWidth, newHeight);

        y += newHeight - 2;

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
        const SCALE = 0.5;
        const gap = 20;
        const maxPerRow = 4;

        /* ===== Chuẩn hoá đáp án ===== */
        const rawAns = answers[q.id];
        const userIndexes = Array.isArray(rawAns)
          ? rawAns.map(Number)
          : rawAns !== undefined && rawAns !== null
          ? [Number(rawAns)]
          : [];

        const correctIndexes = (
          Array.isArray(q.correct) ? q.correct : [q.correct]
        ).map(Number);

        for (let row = 0; row < q.options.length; row += maxPerRow) {

          const rowItems = q.options.slice(row, row + maxPerRow);

          // ===== load tất cả ảnh trước =====
          const images = await Promise.all(
            rowItems.map(async (opt) => {
              const imgUrl = extractImage(opt);
              if (!imgUrl) return null;

              try {
                const img64 = await getBase64FromUrl(imgUrl);
                const { width, height } = await getImageSize(img64);

                let newWidth = width * SCALE * 0.264583;
                let newHeight = height * SCALE * 0.264583;

                const maxSize = 30;
                if (newWidth > maxSize) {
                  const ratio = maxSize / newWidth;
                  newWidth = maxSize;
                  newHeight *= ratio;
                }

                return { img64, newWidth, newHeight };
              } catch {
                return null;
              }
            })
          );

          // ===== tính tổng width thật =====
          const totalWidth =
            images.reduce((sum, img) => sum + (img?.newWidth || 0), 0) +
            gap * (images.length - 1);

          let x = (pageWidth - totalWidth) / 2;

          let rowMaxHeight = 0;

          // ===== render từng ảnh =====
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const index = row + i;

            const isChosen = userIndexes.includes(index);
            const isCorrect = correctIndexes.includes(index);

            if (img) {
              pdf.addImage(img.img64, "PNG", x, y + 5, img.newWidth, img.newHeight);

              // checkbox
              pdf.text(isChosen ? "[x]" : "[ ]", x, y);

              // ✓ / ✗
              if (isChosen) {
                pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
                pdf.text(
                  isCorrect ? "✓" : "✗",
                  x,
                  y + img.newHeight + 12
                );
                pdf.setTextColor(0, 0, 0);
              }

              if (img.newHeight > rowMaxHeight) {
                rowMaxHeight = img.newHeight;
              }

              x += img.newWidth + gap;
            }
          }

          y += rowMaxHeight + 20;
        }

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
        const userAns = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const order = Array.isArray(q.initialOrder)
          ? q.initialOrder
          : q.correct.map((_, i) => i);

        q.options.forEach((opt, displayIdx) => {
          const text = extractText(opt);

          const userVal = userAns[displayIdx]; // "Đ" | "S" | undefined
          const originalIdx = order[displayIdx];
          const correctVal = q.correct?.[originalIdx]; // "Đ" | "S"

          // ✅ HIỂN THỊ NHÃN
          const mark =
            userVal === "Đ"
              ? "[Đ]"
              : userVal === "S"
              ? "[S]"
              : "[ ]";

          const isCorrect =
            userVal !== undefined && userVal === correctVal;

          const lines = pdf.splitTextToSize(
            `${mark} ${text}`,
            pageWidth - 2 * margin
          );

          if (y + lines.length * lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(lines, margin + 5, y);

          if (userVal !== undefined) {
            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);
            pdf.setTextColor(0, 0, 0);
          }

          y += lines.length * lineHeight;
        });

        break;
      }

      /*case "fillblank": {
        const filled = Array.isArray(q.filled) ? q.filled : [];
        const correct = Array.isArray(q.options) ? q.options : [];

        // ===== HIỂN THỊ NỘI DUNG ĐỀ (a, b, c, d) =====
        if (q.option) {
          const optionText = q.option
            .replace(/<\/p>/g, "\n")
            .replace(/<[^>]*>/g, "")
            .trim();

          const optionLines = pdf.splitTextToSize(
            optionText,
            pageWidth - 2 * margin
          );

          if (y + optionLines.length * lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          // 🔺 TĂNG khoảng cách TRÊN
          y += 6;

          pdf.text(optionLines, margin, y);

          // 🔻 GIẢM khoảng cách DƯỚI
          y += optionLines.length * lineHeight - 5;
        }

        // ===== HIỂN THỊ CÂU TRẢ LỜI =====
        filled.forEach((word, i) => {
          const userWord = (word || "").trim().toLowerCase();

          const correctObj = correct[i];
          const correctWord =
            typeof correctObj === "string"
              ? correctObj.trim().toLowerCase()
              : (correctObj?.text || "").trim().toLowerCase();

          const isCorrect = userWord && userWord === correctWord;

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
      }*/

      case "fillblank": {
        const filled = Array.isArray(q.filled) ? q.filled : [];
        const options = Array.isArray(q.options) ? q.options : [];

        // ===== HIỂN THỊ CÂU HỎI =====
        if (q.option) {
          let optionText = q.option
            .replace(/<\/p>/g, "\n")
            .replace(/<[^>]*>/g, "")
            .trim();

          const lines = optionText.split("\n").filter(Boolean);

          if (y + lines.length * lineHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          lines.forEach((line, i) => {
            const userVal = filled[i] || "______";

            const correctObj = options[i];
            const correctText =
              typeof correctObj === "string"
                ? correctObj
                : correctObj?.text || "";

            const isCorrect =
              userVal &&
              userVal.trim().toLowerCase() ===
              correctText.trim().toLowerCase();

            const parts = line.split(/\[\.\.\.\]/);

            const before = parts[0] || "";
            const after = parts[1] || "";

            let x = margin;
            const yLine = y + i * lineHeight + 5; // 👈 tăng ở đây

            // ===== before =====
            pdf.setTextColor(0, 0, 0);
            pdf.text(before, x, yLine);
            x += pdf.getTextWidth(before);

            // ===== answer (color) =====
            const answerText = `[${userVal}]`;

            pdf.setTextColor(
              isCorrect ? 0 : 255,
              isCorrect ? 150 : 0,
              0
            );

            pdf.text(answerText, x, yLine);
            x += pdf.getTextWidth(answerText);

            // ===== after =====
            pdf.setTextColor(0, 0, 0);
            pdf.text(after, x, yLine);
          });

          y += lines.length * lineHeight + 4;
        }

        // ❌ ĐÃ XÓA HOÀN TOÀN PHẦN:
        // filled.forEach(...)  ← KHÔNG HIỂN THỊ DANH SÁCH NỮA

        break;
      }

      case "matching": {
        y -= 4;
        const SCALE = 0.4;
        const gapX = 10;
        const cellPadding = 3;

        const totalWidth = pageWidth - 2 * margin;

        // ===== DÙNG columnRatio =====
        const ratio = q.columnRatio || {};
        const leftRatio = Number(ratio.left) || 1;
        const rightRatio = Number(ratio.right) || 1;

        const totalRatio = leftRatio + rightRatio;

        const leftColWidth = totalWidth * (leftRatio / totalRatio);
        const rightColWidth = totalWidth * (rightRatio / totalRatio);

        const userOrder = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const correctOrder = Array.isArray(q.correct) ? q.correct : [];

        const isNotInteracted = userOrder.length === 0;

        for (let i = 0; i < q.pairs.length; i++) {
          const pair = q.pairs[i];

          const leftText = extractText(pair.left);
          const leftImgUrl = pair.leftImage?.url;

          const rightIdx = isNotInteracted ? correctOrder[i] : userOrder[i];
          const rightPair = q.pairs[rightIdx];

          const rightText = extractText(rightPair?.right);

          const isCorrect = isNotInteracted
            ? true
            : rightIdx === correctOrder[i];

          // ===== PAGE BREAK =====
          if (y + 50 > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          let leftHeight = 0;
          let imgDrawWidth = 0;
          let imgDrawHeight = 0;
          let img64Cache = null;

          // ===== LOAD IMAGE =====
          if (leftImgUrl) {
            try {
              const img64 = await getBase64FromUrl(leftImgUrl);
              const { width, height } = await getImageSize(img64);

              let newWidth = width * SCALE * 0.264583;
              let newHeight = height * SCALE * 0.264583;

              const maxSize = leftColWidth - cellPadding * 2;

              if (newWidth > maxSize) {
                const ratio = maxSize / newWidth;
                newWidth = maxSize;
                newHeight *= ratio;
              }

              imgDrawWidth = newWidth;
              imgDrawHeight = newHeight;
              img64Cache = img64;

              leftHeight = newHeight;
            } catch {}
          }

          // ===== LEFT TEXT =====
          let leftLines = [];
          if (leftText) {
            leftLines = pdf.splitTextToSize(
              leftText,
              leftColWidth - cellPadding * 2
            );

            leftHeight = Math.max(leftHeight, leftLines.length * lineHeight);
          }

          // ===== RIGHT TEXT =====
          const rightLines = pdf.splitTextToSize(
            rightText || "_____",
            rightColWidth - cellPadding * 2
          );

          const rightHeight = rightLines.length * lineHeight;

          const rowHeight =
            Math.max(leftHeight, rightHeight) + cellPadding * 2;

          // ===== DRAW BORDER =====
          pdf.rect(margin, y, totalWidth, rowHeight);

          pdf.line(
            margin + leftColWidth,
            y,
            margin + leftColWidth,
            y + rowHeight
          );

          // ===== DRAW LEFT (CENTER) =====
          const contentHeight = Math.max(
            imgDrawHeight,
            leftLines.length * lineHeight
          );

          let leftStartY = y + (rowHeight - contentHeight) / 2;

          // ảnh
          if (img64Cache) {
            const imgX =
              margin + (leftColWidth - imgDrawWidth) / 2;

            pdf.addImage(
              img64Cache,
              "PNG",
              imgX,
              leftStartY,
              imgDrawWidth,
              imgDrawHeight
            );
          }

          // text
          if (leftLines.length > 0) {
            const textY = img64Cache
              ? leftStartY + imgDrawHeight + 2
              : leftStartY;

            pdf.text(
              leftLines,
              margin + leftColWidth / 2,
              textY,
              { align: "center" }
            );
          }

          // ===== DRAW RIGHT (CENTER VERTICAL) =====
          const rightContentHeight = rightLines.length * lineHeight;

          const rightStartY =
            y + (rowHeight - rightContentHeight) / 2 + lineHeight / 2;

          pdf.text(
            rightLines,
            margin + leftColWidth + gapX,
            rightStartY
          );

          // ===== ✓ / ✗ =====
          pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
          pdf.text(
            isCorrect ? "✓" : "✗",
            pageWidth - margin - 8,
            y + cellPadding + lineHeight
          );
          pdf.setTextColor(0, 0, 0);

          // ===== NEXT ROW =====
          y += rowHeight;
        }

        y += 5; // hoặc 15 nếu muốn rộng hơn

        break;
      }

      default:
        pdf.text("(Loại câu hỏi chưa hỗ trợ)", margin + 5, y);
        y += lineHeight;
    }

    y += 4;
  }

  // ================== SAVE ==================
  // sinh chuỗi ngẫu nhiên 3 ký tự
  const code = uuidv4().replace(/-/g, "").substring(0, 3);

  const safeName = capitalizeName(studentInfo.name).replace(/\s+/g, "_");

  pdf.save(`${className}_${safeName}_${code}.pdf`);

};

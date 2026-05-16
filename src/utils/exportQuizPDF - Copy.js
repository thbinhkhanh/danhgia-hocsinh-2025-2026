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

  // format mới phổ biến
  if (opt.formats?.image?.url) return opt.formats.image.url;
  if (opt.formats?.image) return opt.formats.image;

  // các kiểu khác
  if (opt.image) return opt.image;
  if (opt.url) return opt.url;

  // fallback text URL
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

        // 🔥 tăng scale (0.4 -> 0.8)
        const scale = 0.7;

        let newWidth = width * scale * 0.264583;
        let newHeight = height * scale * 0.264583;

        const maxWidth = pageWidth - 2 * margin;
        const maxHeight = 80; // giới hạn chiều cao để không tràn

        // fit theo width trước
        if (newWidth > maxWidth) {
          const ratio = maxWidth / newWidth;
          newWidth = maxWidth;
          newHeight *= ratio;
        }

        // nếu vẫn quá cao thì fit theo height
        if (newHeight > maxHeight) {
          const ratio = maxHeight / newHeight;
          newHeight = maxHeight;
          newWidth *= ratio;
        }

        // 👉 căn giữa
        const xCenter = (pageWidth - newWidth) / 2;

        // 📌 vẽ ảnh
        pdf.addImage(img64, "PNG", xCenter, y, newWidth, newHeight);

        // 📌 đẩy con trỏ xuống đúng chuẩn
        y += newHeight + 7;

      } catch {}
    }

    // ================== TYPES ==================
    switch (q.type) {
      case "single": {
        const userAns = answers[q.id];

        const order =
          Array.isArray(q.displayOrder) && q.displayOrder.length
            ? q.displayOrder
            : q.options.map((_, i) => i);

        for (const optIndex of order) {
          const opt = q.options[optIndex];

          const text = extractText(opt);
          const imgUrl = extractImage(opt);

          const selected = userAns === optIndex ? "[x]" : "[ ]";

          const correctArr = Array.isArray(q.correct)
            ? q.correct
            : [q.correct];

          const isCorrect =
            userAns === optIndex && correctArr.includes(optIndex);

          // ================= TEXT LINES =================
          const lines = pdf.splitTextToSize(
            `${selected} ${text}`,
            pageWidth - 2 * margin - 10
          );

          let img64 = null;
          let w = 0;
          let h = 0;

          // ================= IMAGE PRE-CALC =================
          if (imgUrl) {
            try {
              img64 = await getBase64FromUrl(imgUrl);
              const size = await getImageSize(img64);

              // ================== HEIGHT IS PRIMARY ==================
              const scale = 0.8; // 🔥 TĂNG CHIỀU CAO (0.22 -> 0.35)

              h = size.height * scale * 0.264583;

              // 👉 width auto theo height (giữ tỉ lệ chuẩn)
              w = (size.width / size.height) * h;

              const maxW = pageWidth - 2 * margin - 20;

              // nếu quá rộng thì co lại theo width
              if (w > maxW) {
                const r = maxW / w;
                w = maxW;
                h *= r;
              }
            } catch {
              img64 = null;
            }
          }

          // ================= TOTAL HEIGHT CHECK =================
          const totalHeight =
            lines.length * lineHeight + (img64 ? h + 3 : 0);

          if (y + totalHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          // ================= TEXT =================
          pdf.text(lines, margin + 5, y);

          if (userAns === optIndex) {
            pdf.setTextColor(
              isCorrect ? 0 : 255,
              isCorrect ? 128 : 0,
              0
            );

            pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);

            pdf.setTextColor(0, 0, 0);
          }

          let currentY = y + lines.length * lineHeight;

          // ================= IMAGE (BELOW OPTION) =================
          if (img64) {
            // 👇 canh cùng lề với text option (giống pdf.text margin + 5)
            const x = margin + 5;

            pdf.addImage(img64, "PNG", x, currentY - 5, w, h);

            currentY += h + 3;
          }

          // ================= UPDATE Y =================
          y = currentY;
        }

        break;
      }

      case "multiple": {
        const userAns = answers[q.id] || [];

        const order =
          Array.isArray(q.displayOrder) && q.displayOrder.length
            ? q.displayOrder
            : q.options.map((_, i) => i);

        for (const optIndex of order) {
          const opt = q.options[optIndex];

          const text = extractText(opt);
          const imgUrl = extractImage(opt);

          const checked = userAns.includes(optIndex) ? "[x]" : "[ ]";

          const isCorrect =
            Array.isArray(q.correct) && q.correct.includes(optIndex);

          // ================= TEXT =================
          const lines = pdf.splitTextToSize(
            `${checked} ${text}`,
            pageWidth - 2 * margin - 10
          );

          let img64 = null;
          let w = 0;
          let h = 0;

          // ================= IMAGE PRE-CALC =================
          if (imgUrl) {
            try {
              img64 = await getBase64FromUrl(imgUrl);
              const size = await getImageSize(img64);

              const scale = 0.8;

              h = size.height * scale * 0.264583;
              w = (size.width / size.height) * h;

              const maxW = pageWidth - 2 * margin - 20;

              if (w > maxW) {
                const r = maxW / w;
                w = maxW;
                h *= r;
              }
            } catch {
              img64 = null;
            }
          }

          // ================= HEIGHT CHECK =================
          const totalHeight = lines.length * lineHeight + (img64 ? h + 3 : 0);

          if (y + totalHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          // ================= TEXT =================
          pdf.text(lines, margin + 5, y);

          if (userAns.includes(optIndex)) {
            pdf.setTextColor(
              isCorrect ? 0 : 255,
              isCorrect ? 128 : 0,
              0
            );

            pdf.text(
              isCorrect ? "✓" : "✗",
              pageWidth - margin - 10,
              y
            );

            pdf.setTextColor(0, 0, 0);
          }

          let currentY = y + lines.length * lineHeight;

          // ================= IMAGE BELOW OPTION =================
          if (img64) {
            const x = margin + 5; // canh cùng text

            pdf.addImage(img64, "PNG", x, currentY - 5, w, h);

            // 🔥 GIẢM khoảng cách giữa option và ảnh
            currentY += h + 1;   // (trước là +3 → giờ sát hơn)
          }

          y = currentY;
        }

        break;
      }

      case "sort": {
        const userOrder = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const correctTexts = Array.isArray(q.correctTexts) ? q.correctTexts : [];

        const displayOrder =
          userOrder.length === q.options.length
            ? userOrder
            : q.options.map((_, i) => i);

        for (let i = 0; i < displayOrder.length; i++) {
          const optIndex = displayOrder[i];
          const opt = q.options[optIndex];

          const text = extractText(opt);
          const imgUrl = extractImage(opt);

          const lines = pdf.splitTextToSize(
            `${i + 1}. ${text}`,
            pageWidth - 2 * margin - 15
          );

          let img64 = null;
          let w = 0;
          let h = 0;

          // ================= IMAGE PRE-CALC =================
          if (imgUrl) {
            try {
              img64 = await getBase64FromUrl(imgUrl);
              const size = await getImageSize(img64);

              const scale = 0.8;

              h = size.height * scale * 0.264583;
              w = (size.width / size.height) * h;

              const maxW = pageWidth - 2 * margin - 20;

              if (w > maxW) {
                const r = maxW / w;
                w = maxW;
                h *= r;
              }
            } catch {
              img64 = null;
            }
          }

          const totalHeight = lines.length * lineHeight + (img64 ? h + 2 : 0);

          if (y + totalHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          // ================= TEXT =================
          pdf.text(lines, margin + 5, y);

          // ===== CHECK RESULT =====
          if (
            userOrder.length === correctTexts.length &&
            correctTexts.length > 0
          ) {
            const isCorrect = text === extractText(correctTexts[i]);

            pdf.setTextColor(isCorrect ? 0 : 255, isCorrect ? 128 : 0, 0);
            pdf.text(isCorrect ? "✓" : "✗", pageWidth - margin - 10, y);
            pdf.setTextColor(0, 0, 0);
          }

          let currentY = y + lines.length * lineHeight;

          // ================= IMAGE BELOW OPTION =================
          if (img64) {
            const x = margin + 5;

            pdf.addImage(img64, "PNG", x, currentY - 5, w, h);

            currentY += h + 1; // giảm khoảng cách
          }

          y = currentY;
        }

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

        // ⭐⭐⭐ FIX: dùng displayOrder nếu có
        const order =
          Array.isArray(q.displayOrder) && q.displayOrder.length
            ? q.displayOrder
            : q.options.map((_, i) => i);

        for (let row = 0; row < order.length; row += maxPerRow) {

          const rowIndexes = order.slice(row, row + maxPerRow);
          const rowItems = rowIndexes.map(i => q.options[i]);

          // ===== load tất cả ảnh trước =====
          const images = await Promise.all(
            rowItems.map(async (opt) => {
              const imgUrl = extractImage(opt);
              if (!imgUrl) return null;

              try {
                const img64 = await getBase64FromUrl(imgUrl);

                // 👉 FIX CỨNG SIZE
                const FIX_WIDTH = 15;
                const FIX_HEIGHT = 15;

                return {
                  img64,
                  newWidth: FIX_WIDTH,
                  newHeight: FIX_HEIGHT
                };
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

            const index = rowIndexes[i]; // ⭐ FIX QUAN TRỌNG

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

      case "truefalse": {
        const userAns = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const order = Array.isArray(q.initialOrder)
          ? q.initialOrder
          : q.correct.map((_, i) => i);

        for (let displayIdx = 0; displayIdx < q.options.length; displayIdx++) {
          const opt = q.options[displayIdx];

          const text = extractText(opt);
          const imgUrl = extractImage(opt);

          const userVal = userAns[displayIdx]; // "Đ" | "S" | undefined
          const originalIdx = order[displayIdx];
          const correctVal = q.correct?.[originalIdx];

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

          let img64 = null;
          let w = 0;
          let h = 0;

          // ================= IMAGE PRE-CALC =================
          if (imgUrl) {
            try {
              img64 = await getBase64FromUrl(imgUrl);
              const size = await getImageSize(img64);

              const scale = 0.8;

              h = size.height * scale * 0.264583;
              w = (size.width / size.height) * h;

              const maxW = pageWidth - 2 * margin - 20;

              if (w > maxW) {
                const r = maxW / w;
                w = maxW;
                h *= r;
              }
            } catch {
              img64 = null;
            }
          }

          const totalHeight =
            lines.length * lineHeight + (img64 ? h + 2 : 0);

          if (y + totalHeight > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          // ================= TEXT =================
          pdf.text(lines, margin + 5, y);

          if (userVal !== undefined) {
            pdf.setTextColor(
              isCorrect ? 0 : 255,
              isCorrect ? 128 : 0,
              0
            );

            pdf.text(
              isCorrect ? "✓" : "✗",
              pageWidth - margin - 10,
              y
            );

            pdf.setTextColor(0, 0, 0);
          }

          let currentY = y + lines.length * lineHeight;

          // ================= IMAGE BELOW OPTION =================
          if (img64) {
            const x = margin + 5;

            pdf.addImage(img64, "PNG", x, currentY - 5, w, h);

            currentY += h + 1; // 🔥 giảm khoảng cách
          }

          y = currentY;
        }

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

        y += 5;

        if (q.option) {
          const optionText = q.option
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim();

          const parts = optionText.split(/\[\.\.\.\]/);

          const maxWidth = pageWidth - 2 * margin;

          let x = margin;

          const writeWord = (word, color) => {
            const w = pdf.getTextWidth(word + " ");

            if (x + w > maxWidth) {
              x = margin;
              y += lineHeight;

              if (y > pageBottom) {
                pdf.addPage();
                y = margin;
              }
            }

            pdf.setTextColor(...color);
            pdf.text(word + " ", x, y);

            pdf.setTextColor(0, 0, 0);

            x += w;
          };

          const writeSentence = (text, color) => {
            const words = text.split(" ").filter(Boolean);
            for (const w of words) {
              writeWord(w, color);
            }
          };

          for (let i = 0; i < parts.length; i++) {
            const before = parts[i] || "";

            // ===== BEFORE =====
            writeSentence(before, [0, 0, 0]);

            // ===== BLANK =====
            if (i < filled.length) {
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

              writeWord(
                `[${userVal}]`,
                isCorrect ? [0, 150, 0] : [255, 0, 0]
              );
            }
          }

          y += lineHeight + 4;

          pdf.setTextColor(0, 0, 0);
        }

        break;
      }

      case "matching": {
        y -= 4;

        const gapX = 10;
        const cellPadding = 3;

        const totalWidth = pageWidth - 2 * margin;

        const ratio = q.columnRatio || {};
        const leftRatio = Number(ratio.left) || 1;
        const rightRatio = Number(ratio.right) || 1;
        const totalRatio = leftRatio + rightRatio;

        const leftColWidth = totalWidth * (leftRatio / totalRatio);
        const rightColWidth = totalWidth * (rightRatio / totalRatio);

        const userMap = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const correctMap = Array.isArray(q.correct) ? q.correct : [];
        const pairs = q.pairs || [];
        const rightOptions = q.rightOptions || [];

        for (let i = 0; i < pairs.length; i++) {
          const leftPair = pairs[i];

          const leftText = extractText(leftPair.left);
          const leftImgUrl = leftPair.leftImage?.url;

          // ⭐ RIGHT THEO USER DRAG
          const rightIndex = userMap[i];
          const rightValue = rightOptions[rightIndex];
          const rightText = extractText(rightValue);

          // ⭐ CHECK ĐÚNG
          const isCorrect = userMap[i] === correctMap[i];

          if (y + 60 > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          // ================= LEFT IMAGE =================
          let img64 = null;
          let imgW = 0;
          let imgH = 0;

          if (leftImgUrl) {
            try {
              img64 = await getBase64FromUrl(leftImgUrl);
              const size = await getImageSize(img64);

              // ⭐ SCALE LỚN HƠN (0.4 -> 0.55)
              let w = size.width * 0.8 * 0.264583;
              let h = size.height * 0.8 * 0.264583;

              const maxW = leftColWidth - cellPadding * 2;

              if (w > maxW) {
                const r = maxW / w;
                w = maxW;
                h *= r;
              }

              imgW = w;
              imgH = h;
            } catch {}
          }

          // ================= TEXT =================
          const leftLines = pdf.splitTextToSize(
            leftText,
            leftColWidth - cellPadding * 2
          );

          const rightLines = pdf.splitTextToSize(
            rightText || "",
            rightColWidth - cellPadding * 2
          );

          const textHeight = leftLines.length * 7;
          const contentHeight = Math.max(imgH || 0, textHeight);

          const rowHeight =
            Math.max(contentHeight, rightLines.length * 7) + 6;

          // ================= FRAME =================
          pdf.rect(margin, y, totalWidth, rowHeight);

          pdf.line(
            margin + leftColWidth,
            y,
            margin + leftColWidth,
            y + rowHeight
          );

          // =====================================================
          // ================= LEFT RENDER =======================
          // =====================================================

          const leftBlockY = y + (rowHeight - contentHeight) / 2;

          if (img64) {
            // 🟢 IMAGE: CENTER BOTH AXES
            const imgX = margin + (leftColWidth - imgW) / 2;

            pdf.addImage(
              img64,
              "PNG",
              imgX,
              leftBlockY,
              imgW,
              imgH
            );
          } else {
            // 🟢 TEXT: LEFT ALIGN + VERTICAL CENTER
            pdf.text(
              leftLines,
              margin + 4,
              y + (rowHeight - textHeight) / 2 + 5
            );
          }

          // ================= RIGHT =================
          const rightTextHeight = rightLines.length * 7;

          // căn giữa theo chiều dọc
          const rightY =
            y + (rowHeight - rightTextHeight) / 2 + 5;

          pdf.text(
            rightLines,
            margin + leftColWidth + gapX, // căn trái theo chiều ngang
            rightY
          );

          // ================= RESULT =================
          pdf.setTextColor(
            isCorrect ? 0 : 255,
            isCorrect ? 150 : 0,
            0
          );

          pdf.text(
            isCorrect ? "✓" : "✗",
            pageWidth - margin - 8,
            y + 10
          );

          pdf.setTextColor(0, 0, 0);

          y += rowHeight;
        }

        y += 5;
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

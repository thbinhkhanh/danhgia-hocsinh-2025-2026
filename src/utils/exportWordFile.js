import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from "docx";

// Hàm mới: lấy ảnh từ URL và trả về Uint8Array
async function getUint8ArrayFromUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// -------------------------
// KÝ HIỆU ĐÁP ÁN
// -------------------------
function getAnswerSymbol(type, isCorrect) {
  switch (type) {
    case "single": return isCorrect ? "(•)" : "(  )";
    case "multiple": return isCorrect ? "[✓]" : "[  ]";
    case "truefalse": return isCorrect ? "[✓]" : "[  ]";
    default: return "";
  }
}

// -------------------------
// PHÂN TÍCH TITLE
// -------------------------
function parseTitle(title) {
  const parts = (title || "").split("_");
  // Ví dụ: ["quiz", "Lớp 5", "Tin học", "CKI", "25-26 (D)"]
  const grade = parts[1] || "";
  const subject = parts[2] || "";
  const term = parts[3] || "";
  const last = parts[4] || "";
  const matchVariant = last.match(/\(([^)]+)\)/);
  const variant = matchVariant ? matchVariant[1] : "";
  return { grade, subject, term, variant };
}

// -------------------------
// XUẤT WORD
// -------------------------
export async function exportWordFile({ title, school, questions }) {
  const children = [];

  // Phân tích title để lấy thông tin
  const { grade, subject, term, variant } = parseTitle(title);

  // ==== TIÊU ĐỀ ====
  // Dòng tên trường
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: school,
          bold: true,
          size: 26,
          font: "Aptos",
        }),
      ],
    })
  );

  // Dòng kiểm tra định kì
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `KIỂM TRA ĐỊNH KÌ - ${term}`,
          bold: true,
          size: 32,
          font: "Aptos",
        }),
      ],
    })
  );

  // Dòng môn học + lớp + đề
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${subject} - ${grade}${variant ? ` (Đề ${variant})` : ""}`,
          bold: true,
          size: 32,
          font: "Aptos",
        }),
      ],
    })
  );

  // Khoảng trắng sau tiêu đề
  children.push(new Paragraph({ children: [new TextRun({ text: " " })] }));

  // ==== VÒNG LẶP CÂU HỎI ====
  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];

    const questionText =
      q.question ||
      q.option ||
      (Array.isArray(q.pairs) && q.pairs[0]?.question) ||
      "(Không có nội dung câu hỏi)";

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Câu ${idx + 1}: ${questionText}`,
            size: 26,
            font: "Aptos",
          }),
        ],
      })
    );

    // ==== HÌNH CÂU HỎI ====
    if (q.questionImage) {
      try {
        const uint8Array = await getUint8ArrayFromUrl(q.questionImage);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: uint8Array,
                transformation: { width: 250, height: 150 },
              }),
            ],
          })
        );
      } catch {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "(Không tải được hình minh họa)",
                italics: true,
                color: "888888",
                size: 26,
                font: "Aptos",
              }),
            ],
          })
        );
      }
    }

    // ==== XỬ LÝ THEO LOẠI ====
    switch (q.type) {
      case "single":
        q.options?.forEach((opt, i) => {
          const symbol = getAnswerSymbol("single", q.correct?.includes(i));
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `   ${symbol} ${opt}`,
                  size: 26,
                  font: "Aptos",
                }),
              ],
            })
          );
        });
        break;

      case "multiple":
        q.options?.forEach((opt, i) => {
          const symbol = getAnswerSymbol("multiple", q.correct?.includes(i));
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `   ${symbol} ${opt}`,
                  size: 26,
                  font: "Aptos",
                }),
              ],
            })
          );
        });
        break;

      case "truefalse":
        q.options?.forEach((opt, i) => {
          const isCorrect = q.correct?.[i] === "Đ";
          const symbol = getAnswerSymbol("truefalse", isCorrect);
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `   ${symbol} ${opt}`,
                  size: 26,
                  font: "Aptos",
                }),
              ],
            })
          );
        });
        break;

      case "matching":
        q.pairs?.forEach((pair) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `   ${pair.left} → ${pair.right}`,
                  size: 26,
                  font: "Aptos",
                }),
              ],
            })
          );
        });
        break;

      case "sort":
        q.options?.forEach((opt, i) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `   ${i + 1}. ${opt}`,
                  size: 26,
                  font: "Aptos",
                }),
              ],
            })
          );
        });
        break;

      case "image": {
        const imagesInRow = [];
        for (let i = 0; i < q.options.length; i++) {
          const isCorrect = q.correct?.includes(i);
          const symbol = isCorrect ? "[✓]" : "( )";

          imagesInRow.push(
            new TextRun({
              text: ` ${symbol} `,
              size: 26,
              font: "Aptos",
            })
          );

          try {
            const uint8Array = await getUint8ArrayFromUrl(q.options[i]);
            imagesInRow.push(
              new ImageRun({
                data: uint8Array,
                transformation: { width: 80, height: 80 },
              }),
              new TextRun({ text: "   " })
            );
          } catch {
            imagesInRow.push(
              new TextRun({
                text: "(Không tải được ảnh) ",
                color: "888888",
                size: 26,
                font: "Aptos",
              })
            );
          }

          if ((i + 1) % 4 === 0 || i === q.options.length - 1) {
            children.push(new Paragraph({ children: imagesInRow }));
            imagesInRow.length = 0;
          }
        }
        break;
      }

      case "fillblank": {
        let text = q.option || "";
        let answers = q.options || [];

        const parts = text.split("[...]");
        let merged = [];
        for (let p = 0; p < parts.length; p++) {
          merged.push(parts[p]);
          if (p < parts.length - 1) {
            const ans = answers[p] || "";
            merged.push(` ______ [${ans}] `);
          }
        }

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: merged.join(""),
                size: 26,
                font: "Aptos",
              }),
            ],
          })
        );
        break;
      }

      default:
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "(Loại câu hỏi không hỗ trợ)",
                color: "ff0000",
                size: 26,
                font: "Aptos",
              }),
            ],
          })
        );
    }

    children.push(new Paragraph({ children: [new TextRun({ text: " " })] }));
  }

  // ===== TẠO FILE WORD =====
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11909,   // 8.27 inch
              height: 16992,  // 11.8 inch
            },
            margin: {
              top: 1152,      // 0.8 inch
              bottom: 1152,   // 0.8 inch
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.docx`;
  a.click();

  URL.revokeObjectURL(url);

}
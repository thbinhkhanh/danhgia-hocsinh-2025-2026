import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
} from "docx";

import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";

// ================== UTILS ==================
const capitalizeName = (name) => {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const extractText = (val) => {
  if (!val) return "";
  const raw = typeof val === "string" ? val : val.text || val.question || "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// image -> buffer (docx cần ArrayBuffer/Uint8Array)
const getImageBuffer = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Không tải được ảnh");
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.error("❌ Lỗi tải ảnh:", err);
    return null;
  }
};

// ================== MAIN EXPORT WORD ==================
export const exportQuizPDF = async (
  studentInfo,
  className,
  questions,
  answers,
  total,
  durationStr,
  quizTitle
) => {
  const children = [];

  // ================== HEADER ==================
  const headerTable = new Table({
    rows: [
      new TableRow({
        children: [
          // Cột trái
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "TRƯỜNG: ", bold: true, color: "0000AA" }),
                  new TextRun({ text: "TH LÂM VĂN BỀN", color: "000000" }),
                ],
                spacing: { line: 360 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Họ tên: ", bold: true, color: "0000AA" }),
                  new TextRun({ text: capitalizeName(studentInfo.name), color: "000000" }),
                ],
                spacing: { line: 360 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Lớp: ", bold: true, color: "0000AA" }),
                  new TextRun({ text: className, color: "000000" }),
                ],
                spacing: { line: 360 },
              }),
            ],
            width: { size: 50, type: "pct" },
            borders: {
              top: { style: "single", size: 2, color: "000000" },
              bottom: { style: "single", size: 2, color: "000000" },
              left: { style: "single", size: 2, color: "000000" },
              right: { style: "single", size: 2, color: "000000" },
            },
          }),
          // Cột phải
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Ngày: ", bold: true, color: "0000AA" }),
                  new TextRun({ text: new Date().toLocaleString("vi-VN"), color: "000000" }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { line: 360 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Thời gian: ", bold: true, color: "0000AA" }),
                  new TextRun({ text: durationStr || "", color: "000000" }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { line: 360 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Kết quả: ", bold: true, color: "0000AA" }),
                  new TextRun({
                    text: `${total} điểm`,
                    bold: true,
                    color: "FF0000", // điểm màu đỏ
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { line: 360 },
              }),
            ],
            width: { size: 50, type: "pct" },
            borders: {
              top: { style: "single", size: 2, color: "000000" },
              bottom: { style: "single", size: 2, color: "000000" },
              left: { style: "single", size: 2, color: "000000" },
              right: { style: "single", size: 2, color: "000000" },
            },
          }),
        ],
      }),
    ],
    width: { size: 100, type: "pct" },
    borders: {
      top: { style: "single", size: 2, color: "000000" },
      bottom: { style: "single", size: 2, color: "000000" },
      left: { style: "single", size: 2, color: "000000" },
      right: { style: "single", size: 2, color: "000000" },
    },
  });

  children.push(headerTable);
  children.push(new Paragraph(" "));

  // ================== TITLE ==================
  const titleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: quizTitle || "KTĐK CUỐI KỲ I - TIN HỌC",
        bold: true,
        size: 32, // 16pt cho tiêu đề
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
  });

  children.push(titleParagraph);
  children.push(new Paragraph(" "));

  // ================== QUESTIONS ==================
  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];

    children.push(
      new Paragraph({
        text: `Câu ${idx + 1}: ${extractText(q.question)}`,
        heading: HeadingLevel.HEADING_2,
      })
    );

    if (q.questionImage) {
      const buffer = await getImageBuffer(q.questionImage);
      if (buffer) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: buffer,
                transformation: { width: 200, height: 100 }, // giảm 50%
              }),
            ],
            alignment: AlignmentType.CENTER, // căn giữa ảnh
          })
        );
      }
    }

    switch (q.type) {
      case "single": {
        q.options.forEach((opt, i) => {
          const checked = answers[q.id] === i;
          const correct = Array.isArray(q.correct)
            ? q.correct.includes(i)
            : q.correct === i;

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${checked ? "[x]" : "[ ]"} ${extractText(opt)} ${
                    checked ? (correct ? "✓" : "✗") : ""
                  }`,
                  color: checked ? (correct ? "00AA00" : "FF0000") : "000000",
                }),
              ],
            })
          );
        });
        break;
      }

      case "multiple": {
        const userAns = answers[q.id] || [];
        q.options.forEach((opt, i) => {
          const checked = userAns.includes(i);
          const correct = q.correct?.includes(i);

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${checked ? "[x]" : "[ ]"} ${extractText(opt)} ${
                    checked ? (correct ? "✓" : "✗") : ""
                  }`,
                  color: checked ? (correct ? "00AA00" : "FF0000") : "000000",
                }),
              ],
            })
          );
        });
        break;
      }

      case "truefalse": {
        const userAns = answers[q.id] || [];
        q.options.forEach((opt, i) => {
          const val = userAns[i] || "";
          const correctVal = q.correct?.[i] || "";
          const isCorrect = val === correctVal;

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${val ? `[${val}]` : "[ ]"} ${extractText(opt)} ${
                    val ? (isCorrect ? "✓" : "✗") : ""
                  }`,
                  color: val ? (isCorrect ? "00AA00" : "FF0000") : "000000",
                }),
              ],
            })
          );
        });
        break;
      }

      case "image": {
        const userAns = Array.isArray(answers[q.id]) ? answers[q.id] : [answers[q.id]];
        const rowCells = [];

        for (let i = 0; i < q.options.length; i++) {
          const opt = q.options[i];
          const imgUrl = opt.formats?.image?.trim()
            ? opt.formats.image
            : opt.text?.trim();

          const checked = userAns.includes(i);
          const correct = Array.isArray(q.correct)
            ? q.correct.includes(i)
            : q.correct === i;

          const cellChildren = [];

          if (imgUrl && imgUrl.startsWith("http")) {
            const buffer = await getImageBuffer(imgUrl);
            if (buffer) {
              cellChildren.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: buffer,
                      transformation: { width: 80, height: 80 },
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })
              );
            }
          }

          cellChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${checked ? "[x]" : "[ ]"} Ảnh ${i + 1} ${
                    checked ? (correct ? "✓" : "✗") : ""
                  }`,
                  color: checked ? (correct ? "00AA00" : "FF0000") : "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            })
          );

          rowCells.push(
            new TableCell({
              children: cellChildren,
              width: { size: Math.floor(100 / q.options.length), type: "pct" },
              borders: { top: {}, bottom: {}, left: {}, right: {} },
            })
          );
        }

        children.push(
          new Table({
            rows: [new TableRow({ children: rowCells })],
            width: { size: 100, type: "pct" },
            borders: { top: {}, bottom: {}, left: {}, right: {} },
            alignment: AlignmentType.CENTER,
          })
        );
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

          // So sánh giống như chấm điểm
          let isCorrect = false;
          if (userOrder.length === correctTexts.length && correctTexts.length > 0) {
            isCorrect = text === extractText(correctTexts[i]);
          }

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${i + 1}. ${text} ${isCorrect ? "✓" : "✗"}`,
                  color: isCorrect ? "00AA00" : "FF0000",
                }),
              ],
            })
          );
        });

        break;
      }

      case "matching": {
        const rows = [];
        for (let i = 0; i < q.pairs.length; i++) {
          const pair = q.pairs[i];
          const userAnswer = answers[q.id]?.[i];
          const correctAnswer = q.correct[i];
          const isCorrect = userAnswer !== undefined && userAnswer === correctAnswer;

          const leftChildren = [];
          if (pair.leftImage?.url) {
            const buffer = await getImageBuffer(pair.leftImage.url);
            if (buffer) {
              leftChildren.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: buffer,
                      transformation: { width: 40, height: 40 },
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                })
              );
            }
          } else if (pair.left) {
            leftChildren.push(
              new Paragraph({
                children: [new TextRun({ text: pair.left, color: "000000" })],
              })
            );
          }

          const rightChildren = [
            new Paragraph({
              children: [
                new TextRun({
                  text: extractText(pair.right).replace(/^Câu\s*\d+:\s*/i, ""), // loại bỏ "Câu x:"
                  color: userAnswer !== undefined
                    ? isCorrect ? "00AA00" : "FF0000"
                    : "000000",
                }),
                new TextRun({
                  text: userAnswer !== undefined ? (isCorrect ? " ✓" : " ✗") : "",
                  color: isCorrect ? "00AA00" : "FF0000",
                }),
              ],
            }),
          ];

          rows.push(
            new TableRow({
              children: [
                new TableCell({ children: leftChildren }),
                new TableCell({ children: rightChildren }),
              ],
            })
          );
        }

        // 👉 Thêm khoảng cách trước bảng
        children.push(new Paragraph(" "));

        children.push(
          new Table({
            rows,
            width: { size: 100, type: "pct" },
            alignment: AlignmentType.CENTER,
          })
        );

        break;
      }

      /*case "fillblank": {
        // Tiêu đề câu hỏi
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: extractText(q.pairs?.[0]?.question || ""),
                color: "0000AA",
              }),
            ],
            spacing: { line: 240 },
          })
        );

        // Nội dung chính: thay thế dấu [...] bằng từ học sinh nhập
        const userAnswers = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        let filledText = q.option;
        userAnswers.forEach((ans, i) => {
          filledText = filledText.replace("...", ans || "_____");
        });

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: extractText(filledText),
                color: "000000",
              }),
            ],
            spacing: { line: 240 },
          })
        );

        // Hiển thị từng chỗ trống với ✓/✗
        const correctAnswers = Array.isArray(q.correct) ? q.correct : [];
        correctAnswers.forEach((correctText, i) => {
          const userText = userAnswers[i] || "";
          const isCorrect = userText && userText === correctText;

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${i + 1}. ${userText || "_____"} ${userText ? (isCorrect ? "✓" : "✗") : ""}`,
                  color: userText
                    ? isCorrect
                      ? "00AA00"
                      : "FF0000"
                    : "000000",
                }),
              ],
              spacing: { line: 240 },
            })
          );
        });

        break;
      }*/
     
        case "fillblank": {
        // Chỉ hiển thị câu hỏi với chỗ trống (không push thêm q.question nữa)
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: extractText(q.option), // chứa a), b), c), d) với [...]
                color: "0000AA", // xanh lam cho câu hỏi
              }),
            ],
            spacing: { line: 240 },
          })
        );

        // Hiển thị từng chỗ trống với màu xanh/đỏ
        const filled = Array.isArray(q.filled) ? q.filled : [];
        const correct = Array.isArray(q.options) ? q.options : [];

        filled.forEach((word, i) => {
          const userWord = (word || "").trim();
          const correctObj = correct[i];
          const correctWord =
            typeof correctObj === "string"
              ? correctObj.trim()
              : (correctObj?.text || "").trim();

          const isCorrect =
            userWord && userWord.toLowerCase() === correctWord.toLowerCase();

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${i + 1}. `,
                  color: "000000",
                }),
                new TextRun({
                  text: userWord || "______",
                  color: userWord
                    ? isCorrect
                      ? "00AA00" // xanh lá nếu đúng
                      : "FF0000" // đỏ nếu sai
                    : "000000",
                }),
              ],
              spacing: { line: 240 },
            })
          );
        });

        break;
      }

      default:
        children.push(new Paragraph("Loại câu hỏi chưa hỗ trợ"));
    }

    children.push(new Paragraph(" "));
  }

  // ================== CREATE DOC ==================
  const doc = new Document({
    sections: [{ children }],
    // đặt style mặc định cho toàn bộ trang
    styles: {
      default: {
        document: {
          run: {
            size: 24, // 12pt
            font: "Times New Roman", // có thể chọn font khác nếu muốn
          },
          paragraph: {
            spacing: { line: 240 }, // khoảng cách dòng ~1.5 (240 = 1.5 line)
          },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);

  // sinh chuỗi ngẫu nhiên 3 ký tự từ uuid
  const id = uuidv4().replace(/-/g, "").substring(0, 3);

  const fileName = `${className}_${capitalizeName(studentInfo.name).replace(
    /\s+/g,
    "_"
  )}_${id}.docx`;

  saveAs(blob, fileName);

};
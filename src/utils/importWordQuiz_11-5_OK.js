import * as mammoth from "mammoth/mammoth.browser";

export const handleImportWordQuiz = async ({
  event,
  questions,
  setQuestions,
  setImportData,
  setOpenImportModeDialog,
  setLessonInput,
  setSnackbar,
}) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const arrayBuffer = await file.arrayBuffer();

    const htmlResult = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.inline(async (image) => {
          const base64 = await image.read("base64");
          return {
            src: `data:${image.contentType};base64,${base64}`,
          };
        }),
      }
    );

    const html = htmlResult.value;

    const escapeHTML = (str = "") =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // =========================
    const detectType = (block) => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

      if (/\[\s*\.\.\.\s*\]/.test(block) || /\[…\]/.test(block) || /…/.test(block))
        return "fillblank";

      if (lines.some(l => /^[A-D][\.\)]/.test(l))) return "choice";
      if (lines.some(l => /^\d+\./.test(l))) return "sort";
      if (lines.some(l => /^[ĐS][\.\)]/.test(l))) return "truefalse";

      return "matching";
    };

    // ========================= MATCHING
    const parseMatchingFromTable = (table, index) => {
      let questionText = "";

      let prev = table.previousElementSibling;
      while (prev) {
        if (prev.tagName === "P" && prev.innerText.trim()) {
          questionText = prev.innerText.trim();
          break;
        }
        prev = prev.previousElementSibling;
      }

      const rows = table.querySelectorAll("tr");
      const pairs = [];

      rows.forEach(row => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length < 2) return;

        const leftCell = cells[0];
        const rightCell = cells[1];

        const img = leftCell.querySelector("img");

        const leftImage = img?.src?.startsWith("data:")
          ? { url: img.src, name: "word-image" }
          : null;

        const leftTextClone = leftCell.cloneNode(true);
        leftTextClone.querySelectorAll("img").forEach(i => i.remove());

        const cleanLeftText = leftTextClone.innerText.trim();

        pairs.push({
          left: cleanLeftText ? `<p>${escapeHTML(cleanLeftText)}</p>` : "",
          leftImage,
          right: `<p>${escapeHTML(rightCell.innerText.trim())}</p>`,
        });
      });

      if (pairs.length < 2) return null;

      return {
        id: `q_${Date.now()}_table_${index}`,
        question: `<p>${escapeHTML(questionText)}</p>`,
        questionImage: "",
        type: "matching",
        pairs,
        options: [],
        correct: [],
        sortType: "shuffle",
        score: 0.5,
      };
    };

    // ========================= PARSE CHOICE
    const parseChoice = (block, index, questionImage = "") => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const questionText = lines[0]?.replace(/^Câu\s*\d+[:\.\-)]?\s*/i, "");

      const options = [];
      const correct = [];

      lines.slice(1).forEach(line => {
        const match = line.match(/^([A-D])[\.\)\:\-\s]*/i);
        if (!match) return;

        let text = line.replace(/^([A-D])[\.\)\:\-\s]*/i, "").trim();
        const isCorrect = /\*/.test(text);

        text = text.replace(/\*/g, "").trim();

        if (isCorrect) correct.push(options.length);

        options.push({
          text: `<p>${escapeHTML(text)}</p>`,
          image: "",
        });
      });

      while (options.length < 4) {
        options.push({ text: "", image: "" });
      }

      return {
        id: `q_${Date.now()}_${index}`,
        question: `<p>${escapeHTML(questionText)}</p>`,
        questionImage,
        type: correct.length > 1 ? "multiple" : "single",
        options: options.slice(0, 4),
        correct,
        score: 0.5,
        sortType: "shuffle",
        pairs: [],
      };
    };

    // ========================= PARSE SORT
    const parseSort = (block, index, questionImage = "") => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const questionText = lines[0]?.replace(/^Câu\s*\d+[:\.\-)]?\s*/i, "") || "";

      const items = [];

      lines.slice(1).forEach(line => {
        const match = line.match(/^\d+\.\s*(.+)/);
        if (match) {
          items.push({
            text: `<p>${escapeHTML(match[1])}</p>`,
            image: "",
          });
        }
      });

      if (items.length < 2) return null;

      return {
        id: `q_${Date.now()}_${index}`,
        question: `<p>${escapeHTML(questionText)}</p>`,
        questionImage,
        type: "sort",
        options: items,
        correct: [],
        sortType: "shuffle",
        pairs: [],
        score: 0.5,
      };
    };

    // ========================= PARSE FILLBLANK
    const parseFillBlank = (block, index, questionImage = "") => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      if (!lines.length) return null;

      const answerLine = lines.find(l => /^Từ cần điền/i.test(l)) || "";

      const questionText = lines[0].replace(/^Câu\s*\d+\s*[:\.\-)]?\s*/i, "");

      const optionLines = lines.slice(1).filter(l => !/^Từ cần điền/i.test(l));
      let optionText = optionLines.join("\n");

      optionText = optionText
        .replace(/\[\s*(?:\.{3,}|…)\s*\]/g, "[...]")
        .replace(/([a-zà-ỹ])\s*\n\s*([a-zà-ỹ])/gi, "$1$2")
        .replace(/\s*#\s*/g, "\n")
        .replace(/\n{2,}/g, "\n")
        .trim();

      const answers = answerLine
        .replace(/^Từ cần điền\s*:\s*/i, "")
        .split("/")
        .map(a => a.replace(/\u00a0/g, " ").trim())
        .filter(Boolean);

      return {
        id: `q_${Date.now()}_${index}`,
        question: `<p>${escapeHTML(questionText)}</p>`,
        questionImage,
        type: "fillblank",
        option: `<p>${escapeHTML(optionText).replace(/\n/g, "<br>")}</p>`,
        options: answers.map(a => ({ text: a, image: "", formats: {} })),
        correct: answers,
        score: 0.5,
        sortType: "shuffle",
        pairs: [],
        title: "",
      };
    };

    // ========================= PARSE TRUE FALSE
    const parseTrueFalse = (block, index, questionImage = "") => {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (!lines.length) return null;

      const questionText =
        lines[0]?.replace(/^Câu\s*\d+[:\.\-)]?\s*/i, "") || "";

      const options = [];
      const correct = [];

      lines.slice(1).forEach((line) => {
        // VD:
        // Đ. Trái đất hình tròn
        // S. Mặt trời quay quanh trái đất
        // Đ) abc
        // S) xyz

        const match = line.match(/^([ĐS])[\.\)\:\-\s]*(.+)$/i);

        if (!match) return;

        const answer = match[1].toUpperCase();
        const text = match[2].trim();

        options.push({
          text: `<p>${escapeHTML(text)}</p>`,
          image: "",
          formats: {},
        });

        correct.push(answer);
      });

      if (!options.length) return null;

      return {
        id: `q_${Date.now()}_${index}`,
        question: `<p>${escapeHTML(questionText)}</p>`,
        questionImage,
        type: "truefalse",

        options,

        // ["Đ","S","Đ"]
        correct,

        score: 0.5,
        sortType: "shuffle",
        pairs: [],
      };
    };

    // ========================= MAIN PARSE
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const elements = Array.from(doc.body.querySelectorAll("p, table"));

    const finalQuestions = [];
    let index = 0;

    const usedTables = new Set();

    elements.forEach((el) => {

      if (el.tagName === "TABLE") {
        if (usedTables.has(el)) return;
        usedTables.add(el);

        const firstRow = el.querySelector("tr");
        if (!firstRow) return;

        const colCount = firstRow.querySelectorAll("td, th").length;

        if (colCount === 2) {
          const q = parseMatchingFromTable(el, index++);
          if (q) finalQuestions.push(q);
          return;
        }

        if (colCount > 2) {
          const questionEl = el.previousElementSibling;

          let questionImage = "";
          let questionText = "";

          // lấy câu hỏi + ảnh nằm trước bảng
          let prev = el.previousElementSibling;

          while (prev) {
            if (prev.tagName === "P") {
              const txt = prev.innerText.trim();

              // nếu là ảnh riêng (Word thường convert thành <p><img/></p>)
              const img = prev.querySelector("img");
              if (img?.src?.startsWith("data:")) {
                questionImage = img.src;
              }

              // lấy câu hỏi (Câu 3: ...)
              if (/^Câu\s*\d+/i.test(txt)) {
                questionText = txt
                  .replace(/^Câu\s*\d+\s*[:\.\-)]?\s*/i, "")
                  .trim();
                break;
              }
            }

            // dừng nếu gặp TABLE trước đó
            if (prev.tagName === "TABLE") break;

            prev = prev.previousElementSibling;
          }

          const images = [];

          // CHỈ lấy ảnh trong bảng => options
          el.querySelectorAll("td img").forEach(img => {
            if (img?.src?.startsWith("data:")) {
              images.push(img.src);
            }
          });

          finalQuestions.push({
            id: `q_${Date.now()}_image_${index++}`,
            question: `<p>${escapeHTML(questionText)}</p>`,
            questionImage, // 👈 chỉ 1 ảnh nằm ngoài bảng
            type: "image",
            options: images.map(src => ({
              text: "",
              image: src,
            })),
            correct: [],
            score: 0.5,
          });

          return;
        }
      }

      if (el.tagName === "P") {
        const textBlock = el.innerText.trim();
        if (!/^Câu\s*\d+/i.test(textBlock)) return;

        let block = textBlock;
        let next = el.nextElementSibling;

        const images = [];

        while (next && !(next.tagName === "P" && /^Câu\s*\d+/i.test(next.innerText))) {
          block += "\n" + next.innerText.trim();

          next.querySelectorAll?.("img")?.forEach(img => {
            if (img?.src?.startsWith("data:")) {
              images.push(img.src);
            }
          });

          next = next.nextElementSibling;
        }

        const questionImage = images[0] || ""; // ✅ CHỈ LẤY 1 ẢNH

        const type = detectType(block);

        if (type === "choice") {
          finalQuestions.push(
            parseChoice(block, index++, questionImage)
          );

        } else if (type === "sort") {
          finalQuestions.push(
            parseSort(block, index++, questionImage)
          );

        } else if (type === "fillblank") {
          finalQuestions.push(
            parseFillBlank(block, index++, questionImage)
          );

        } else if (type === "truefalse") {
          finalQuestions.push(
            parseTrueFalse(block, index++, questionImage)
          );
        }
      }
    });

    const isEmpty =
      !questions ||
      questions.length === 0 ||
      (questions.length === 1 && !questions[0].question);

    if (isEmpty) {
      setQuestions(finalQuestions);
      setLessonInput?.("");

      setSnackbar({
        open: true,
        message: "✅ Nhập Word thành công!",
        severity: "success",
      });
    } else {
      setImportData(finalQuestions);
      setOpenImportModeDialog(true);
    }

    /*setSnackbar({
      open: true,
      message: "✅ Nhập Word thành công!",
      severity: "success",
    });*/

  } catch (err) {
    console.error(err);

    setSnackbar({
      open: true,
      message: "❌ Lỗi đọc file Word",
      severity: "error",
    });
  }

  event.target.value = "";
};
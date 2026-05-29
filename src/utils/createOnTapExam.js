import { getDoc, doc } from "firebase/firestore";

/**
 * CHECK TRÙNG ÔN TẬP
 */
export const checkDuplicateOnTap = async (db, docId) => {
  const snap = await getDoc(doc(db, "DE_ONTAP", docId));
  return snap.exists();
};

/**
 * CHUẨN HÓA ID ÔN TẬP
 */
export const normalizeOnTapId = (
  selectedExams,
  selectedYear,
  formatExamTitle
) => {
  const raw = formatExamTitle(
    selectedExams[0].tenDe || selectedExams[0].id
  );

  const match = raw.match(
    /(Tin học|Công nghệ)\s*(\d+)(?:\s*-\s*(CKI|CKII|CN))?/i
  );

  if (!match) {
    throw new Error("Không parse được tên đề");
  }

  const [, subject, classNum, partRaw] = match;
  const part = partRaw || "";

  const [s, e] = selectedYear.split("-");
  const yearKey = `${s.slice(-2)}-${e.slice(-2)}`;

  return `quiz_Lớp ${classNum}_${subject}${
    part ? `_${part}` : ""
  }_${yearKey}`;
};

/**
 * TẠO ĐỀ ÔN TẬP
 */
export const createOnTapExam = async ({
  selectedExams,
  db,
  selectedYear,
  formatExamTitle,
}) => {
  if (!selectedExams || selectedExams.length === 0) {
    throw new Error("Chưa chọn đề nào");
  }

  let mergedQuestions = [];

  for (const ex of selectedExams) {
    const snap = await getDoc(doc(db, "NGANHANG_DE", ex.id));
    if (!snap.exists()) continue;

    const data = snap.data();

    const questions = (data.questions || []).map((q, qIndex) => {
      const base = {
        id: `${ex.id}_${q.id || qIndex}`,
        question: q.question || "",
        questionImage: q.questionImage || "",
        type: q.type || "single",
        sortType: q.sortType || "shuffle",
        score: q.score || 0.5,
        correct: Array.isArray(q.correct)
          ? [...q.correct]
          : q.correct !== undefined
          ? [q.correct]
          : [],
        sourceExamId: ex.id,
      };

      /**
       * ✅ MATCHING: GIỮ NGUYÊN STRUCTURE
       */
      if (q.type === "matching") {
        return {
          ...base,
          type: "matching",
          pairs: q.pairs || [],
          columnRatio: q.columnRatio || { left: 1, right: 1 },
        };
      }

      /**
       * ✅ SINGLE / MULTIPLE / OTHER
       */
      return {
        ...base,

        option: q.option || "",
        fillBlank: q.fillBlank || q.option || "",

        options: (q.options || []).map((opt) => ({
          text: opt?.text || "",
          image: opt?.image || "",
          formats: {
            image: opt?.formats?.image || "",
          },
        })),
      };
    });

    mergedQuestions.push(...questions);
  }

  const firstExam = selectedExams[0];

  const [s, e] = selectedYear.split("-");
  const yearKey = `${s.slice(-2)}-${e.slice(-2)}`;

  const raw = formatExamTitle(firstExam.tenDe || firstExam.id);

  const match = raw.match(
    /(Tin học|Công nghệ)\s*(\d+)(?:\s*-\s*(CKI|CKII|CN))?/i
  );

  if (!match) {
    throw new Error("Không parse được tên đề để tạo ID");
  }

  const [, subject, classNum, partRaw] = match;
  const part = partRaw || "";

  const docId = `quiz_Lớp ${classNum}_${subject}${
    part ? `_${part}` : ""
  }_${yearKey}`;

  const docData = {
    examType: "ontap",
    class: firstExam.class || "",
    title: "Ôn tập",
    schoolYear: selectedYear,
    yearKey,
    sourceExams: selectedExams.map((e) => e.id),
    questions: mergedQuestions,
    subject: firstExam.subject || "",
    semester: firstExam.semester || "",
    totalQuestions: mergedQuestions.length,
    createdAt: new Date(),
  };

  return { docId, docData };
};
import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { normalizeFirestoreQuiz } from "./normalizeFirestoreQuiz";

export default function useInitialQuiz({
  db,
  setQuestions,
  setSelectedClass,
  setSelectedSubject,
  setSemester,
  setSchoolYear,
  setExamLetter,
  setExamType,
  setLessonName, // 🔥 THÊM
}) {
  useEffect(() => {
    const fetchInitialQuiz = async () => {
      try {
        // 🔥 ƯU TIÊN LOAD TỪ LOCAL (FIX LUYỆN TẬP)
        const savedId = localStorage.getItem("deTracNghiemId");
        const savedCollection = localStorage.getItem("deTracNghiemCollection");

        if (savedId && savedCollection) {
          const quizRef = doc(db, savedCollection, savedId);
          const quizSnap = await getDoc(quizRef);

          if (quizSnap.exists()) {
            const data = quizSnap.data();
            const list = Array.isArray(data.questions) ? data.questions : [];

            const normalizedList = normalizeFirestoreQuiz(list);

            setQuestions(normalizedList);

            setSelectedClass(data.class || "");
            setSelectedSubject(data.subject || "");
            setSemester(data.semester || "");
            setSchoolYear(data.schoolYear || "");
            setExamLetter(data.examLetter || "");

            // 🔥 xác định loại đề
            if (savedCollection.startsWith("TRACNGHIEM")) {
              setExamType("luyentap");
              setLessonName && setLessonName(savedId); // 🔥 thêm
            } else if (savedCollection === "NGANHANG_DE") {
              setExamType("ktdk");
            } else {
              setExamType("bt");
            }

            return; // 🔥 DỪNG ở đây (không chạy CONFIG nữa)
          }
        }

        // ===== FALLBACK (GIỮ NGUYÊN CODE CŨ) =====
        const cfgRef = doc(db, "CONFIG", "config");
        const cfgSnap = await getDoc(cfgRef);

        if (!cfgSnap.exists()) {
          setQuestions([]);
          return;
        }

        const cfgData = cfgSnap.data();
        const docId = cfgData.deTracNghiem || null;
        const examType = cfgData.examType || "";

        if (!docId) {
          setQuestions([]);
          return;
        }

        const collectionName =
          examType === "bt" ? "BAITAP_TUAN" : "NGANHANG_DE";

        const quizRef = doc(db, collectionName, docId);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {
          setQuestions([]);
          return;
        }

        const data = quizSnap.data();
        const list = Array.isArray(data.questions) ? data.questions : [];

        const normalizedList = normalizeFirestoreQuiz(list);

        setQuestions(normalizedList);

        setSelectedClass(data.class || "");
        setSelectedSubject(data.subject || "");
        setSemester(data.semester || "");
        setSchoolYear(data.schoolYear || "");
        setExamLetter(data.examLetter || "");
        setExamType(examType);

        localStorage.setItem("teacherQuiz", JSON.stringify(list));
        localStorage.setItem(
          "teacherConfig",
          JSON.stringify({
            selectedClass: data.class || "",
            selectedSubject: data.subject || "",
            schoolYear: data.schoolYear || "",
            examLetter: data.examLetter || "",
            examType,
          })
        );
      } catch (err) {
        console.error("❌ Lỗi load đề:", err);
        setQuestions([]);
      }
    };

    fetchInitialQuiz();
  }, [db]);
}
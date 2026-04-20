import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";

export default function useInitialQuiz({
  db,
  setQuestions,
  setSelectedClass,
  setSelectedSubject,
  setSemester,
  setSchoolYear,
  setExamLetter,
  setExamType,
}) {
  useEffect(() => {
    const fetchInitialQuiz = async () => {
      try {
        // 🔹 load config
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

        // 🔹 chọn collection
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

        // 🔹 normalize matching
        const normalizedList = list.map((q) => {
          if (q.type === "matching") {
            return {
              ...q,
              columnRatio: q.columnRatio || { left: 1, right: 1 },
            };
          }
          return q;
        });

        setQuestions(normalizedList);

        // 🔹 sync state
        setSelectedClass(data.class || "");
        setSelectedSubject(data.subject || "");
        setSemester(data.semester || "");
        setSchoolYear(data.schoolYear || "");
        setExamLetter(data.examLetter || "");
        setExamType(examType);

        // 🔹 localStorage
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
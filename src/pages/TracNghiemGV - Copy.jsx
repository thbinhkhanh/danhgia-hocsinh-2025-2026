import * as XLSX from "xlsx";
import React, { useState, useEffect, useRef } from "react";

import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Card,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";

import { db } from "../firebase";
import { doc, getDoc, getDocs, updateDoc, setDoc, collection, writeBatch } from "firebase/firestore";

import SaveIcon from "@mui/icons-material/Save";
//import FileUploadIcon from "@mui/icons-material/FileUpload";

import QuestionCard from "../Types/questions/QuestionCard";
import { saveAllQuestions } from "../utils/saveAllQuestions";
import { useTeacherQuizContext } from "../context/TeacherQuizContext";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenExamDialog from "../dialog/OpenExamDialog";
import ExitAddLessonDialog from "../dialog/ExitAddLessonDialog";
import ExportDialog from "../dialog/ExportDialog";
import ImportModeDialog from "../dialog/ImportModeDialog";
import ImportSourceDialog from "../dialog/ImportSourceDialog";
import ImportFromFirestoreDialog from "../dialog/ImportFromFirestoreDialog";

import { exportQuestionsToJSON } from "../utils/exportJson_importJson.js";
import { importQuestionsFromJSON } from "../utils/exportJson_importJson.js";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import InputAdornment from "@mui/material/InputAdornment";
import { cleanAnswersFieldInAllQuizzes } from "../utils/cleanAnswersField";
import { handleUploadExcel } from "../utils/uploadExcel";
import mammoth from "mammoth";

export default function TracNghiemGV() {
  const fileInputRef = useRef(null);

  const savedConfig = JSON.parse(localStorage.getItem("teacherConfig") || "{}");
  const [selectedClass, setSelectedClass] = useState(savedConfig.selectedClass || "");
  const [semester, setSemester] = useState(savedConfig.semester || "");
  const [lesson, setLesson] = useState(savedConfig.lesson || "");
  const [lessonsFromFirestore, setLessonsFromFirestore] = useState([]);
  const { quizCache, setQuizCache } = useTeacherQuizContext();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [fileName, setFileName] = useState("");
  const [openExportDialog, setOpenExportDialog] = useState(false); // dialog export

  const classes = ["Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5"];

  const [prevLesson, setPrevLesson] = useState("");
  const [prevQuestions, setPrevQuestions] = useState([]);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonName, setNewLessonName] = useState("");
  const [week, setWeek] = useState("");
  const [lessonInput, setLessonInput] = useState("");
  const [openExitDialog, setOpenExitDialog] = useState(false);
  const [onConfirmExit, setOnConfirmExit] = useState(() => () => {});
  const [justSaved, setJustSaved] = useState(false);
  const excelInputRef = useRef(null);
  const [namHoc, setNamHoc] = useState("");
  const [openImportModeDialog, setOpenImportModeDialog] = useState(false);
  const [importData, setImportData] = useState([]);
  const [openImportSourceDialog, setOpenImportSourceDialog] = useState(false);
  const [openFirestoreDialog, setOpenFirestoreDialog] = useState(false);
  const wordInputRef = useRef(null);

  const weeks =
    String(semester) === "1"
      ? Array.from({ length: 18 }, (_, i) => i + 1)      // HK I: 1 → 18
      : Array.from({ length: 17 }, (_, i) => i + 19);    // HK II: 19 → 35

  const [questions, setQuestions] = useState([]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ===== HELPERS =====
  const createEmptyQuestion = () => ({
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: "",
    question: "",
    option: "",
    type: "single",
    options: ["", "", "", ""],
    score: 0.5,
    correct: [],
    sortType: "fixed",
    pairs: [],
    answers: [],
    questionImage: "",
  });

  useEffect(() => {
    const loadNamHoc = async () => {
      try {
        const snap = await getDoc(doc(db, "CONFIG", "config"));
        if (snap.exists()) {
          const data = snap.data();
          setNamHoc(data.namHoc);
        }
      } catch (err) {
        console.error("Lỗi load năm học:", err);
      }
    };

    loadNamHoc();
  }, []);

  // ===== INIT QUESTIONS (FIX MẤT DỮ LIỆU KHI ĐANG SOẠN) =====
  useEffect(() => {
    const isAdding = localStorage.getItem("isAddingLesson") === "true";

    // 🔥 Nếu đang thêm bài → dùng draft
    if (isAdding) {
      const draft = JSON.parse(localStorage.getItem("draftQuestions") || "[]");

      if (Array.isArray(draft) && draft.length > 0) {
        setQuestions(draft);
        return;
      }
    }

    // 🔥 QUAN TRỌNG: nếu đã có lesson → KHÔNG load ở đây
    if (savedConfig.lesson) {
      return; // 👉 để fetchExam xử lý
    }

    // fallback
    const saved = JSON.parse(localStorage.getItem("teacherQuiz") || "[]");

    if (Array.isArray(saved) && saved.length > 0) {
      setQuestions(saved);
    } else {
      setQuestions([createEmptyQuestion()]);
    }
  }, []);

  // ===== AUTO SAVE DRAFT =====
  useEffect(() => {
    if (isAddingLesson) {
      localStorage.setItem("draftQuestions", JSON.stringify(questions));
    }
  }, [questions, isAddingLesson]);

  // ===== SAVE CONFIG LOCAL =====
  useEffect(() => {
    localStorage.setItem(
      "teacherConfig",
      JSON.stringify({ selectedClass, semester, lesson })
    );
  }, [selectedClass, semester, lesson]);

  // ===== SYNC lesson → lessonInput =====
  useEffect(() => {
    if (lesson) {
      setLessonInput(lesson);
    }
  }, [lesson]);

  // ===== FIRESTORE COLLECTION =====
  const getTracNghiemCollection = (lop) => {
    const num = lop.match(/\d+/)?.[0];
    if (!num || !namHoc) return null;

    const isOldYear = namHoc === "2025-2026";

    return isOldYear
      ? `TRACNGHIEM${num}`
      : `TRACNGHIEM${num}_New`;
  };

  useEffect(() => {
    const flag = localStorage.getItem("isAddingLesson") === "true";
    setIsAddingLesson(flag);
  }, []);

  // ===== FETCH EXAM =====
  const fetchExam = async ({ selectedClass, lessonFullName }) => {
    // 🔥 CHẶN NGAY TỪ ĐẦU (an toàn hơn)
    const isAdding =
      isAddingLesson || localStorage.getItem("isAddingLesson") === "true";

    if (isAdding) {
      console.log("🚫 Đang thêm bài → bỏ qua fetchExam");
      return;
    }

    if (!selectedClass || !lessonFullName) return;

    const CACHE_KEY = `teacher_quiz_${selectedClass}_${lessonFullName}`;

    try {
      const collectionName = getTracNghiemCollection(selectedClass);
      if (!collectionName) return;
      const docRef = doc(db, collectionName, lessonFullName);

      // =======================
      // 1️⃣ FIRESTORE – chỉ lấy updatedAt
      // =======================
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        //console.warn("❌ GV KHÔNG TÌM THẤY ĐỀ:", lessonFullName);
        setQuestions([createEmptyQuestion()]);
        localStorage.removeItem(CACHE_KEY);

        // xoá cache đề này trong context
        setQuizCache(prev => {
          if (!prev) return {};
          const next = { ...prev };
          delete next[CACHE_KEY];
          return next;
        });

        return;
      }

      const data = snap.data();
      const serverUpdatedAt =
        typeof data.updatedAt === "number"
          ? data.updatedAt
          : data.updatedAt?.toMillis?.() ?? 0;

      // =======================
      // 2️⃣ CONTEXT (VALID)
      // =======================
      const cacheFromContext = quizCache?.[CACHE_KEY];
      console.groupEnd();

      if (
        cacheFromContext &&
        cacheFromContext.updatedAt === serverUpdatedAt &&
        Array.isArray(cacheFromContext.questions)
      ) {
        //console.log("🧠 GV LOAD FROM CONTEXT ✅", CACHE_KEY);
        setQuestions(cacheFromContext.questions);
        return;
      }

      // =======================
      // 3️⃣ LOCALSTORAGE (VALID)
      // =======================
      const stored = localStorage.getItem(CACHE_KEY);

      //console.group("💾 GV CHECK LOCALSTORAGE");
      //console.log("CACHE_KEY:", CACHE_KEY);
      //console.log("stored raw:", stored);
      console.groupEnd();

      if (stored) {
        const parsed = JSON.parse(stored);

        //console.group("💾 GV PARSED LOCAL");
        //console.log("parsed.updatedAt:", parsed.updatedAt);
        //console.log("serverUpdatedAt:", serverUpdatedAt);
        console.groupEnd();

        if (
          parsed.updatedAt === serverUpdatedAt &&
          Array.isArray(parsed.questions)
        ) {
          //console.log("💾 GV LOAD FROM LOCALSTORAGE ✅", CACHE_KEY);

          setQuestions(parsed.questions);

          // ✅ sync lại context (LƯU NHIỀU ĐỀ)
          setQuizCache(prev => ({
            ...prev,
            [CACHE_KEY]: parsed,
          }));

          return;
        } else {
          console.warn("❌ GV LOCALSTORAGE OUTDATED → REMOVE", CACHE_KEY);
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // =======================
      // 4️⃣ FIRESTORE – LOAD FULL QUESTIONS
      // =======================
      const questionsFromServer = Array.isArray(data.questions)
        ? data.questions
        : [createEmptyQuestion()];

      setQuestions(questionsFromServer);

      const cachePayload = {
        key: CACHE_KEY,
        class: selectedClass,
        lesson: lessonFullName,
        questions: questionsFromServer,
        updatedAt: serverUpdatedAt,
        savedAt: Date.now(),
      };

      // =======================
      // 5️⃣ SAVE CACHE (CONTEXT + STORAGE)
      // =======================
      setQuizCache(prev => ({
        ...prev,
        [CACHE_KEY]: cachePayload,
      }));

      localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));

      //console.log("🔥 GV LOAD FROM FIRESTORE & CACHE SAVED", CACHE_KEY);

    } catch (err) {
      console.error("❌ GV FETCH EXAM ERROR:", err);
      setSnackbar({
        open: true,
        message: "❌ Không tải được đề",
        severity: "error",
      });
    }
  };

  // ===== FETCH LESSONS =====
  const fetchLessonsFromFirestore = async (lop) => {
    if (!lop || !namHoc) return [];

    try {
      const lopNumber = lop.replace("Lớp ", "");

      // 🔥 chọn collection theo năm học
      const isOldYear = namHoc === "2025-2026";

      const collectionName = isOldYear
        ? `TENBAI_Lop${lopNumber}`
        : `TENBAI_Lop${lopNumber}_New`;

      const snapshot = await getDocs(collection(db, collectionName));

      const lessons = snapshot.docs
        .map((d) => d.data())
        .sort((a, b) => {
          const aIsWeek = a.tenBai?.startsWith("Tuần");
          const bIsWeek = b.tenBai?.startsWith("Tuần");

          if (aIsWeek && !bIsWeek) return 1;
          if (!aIsWeek && bIsWeek) return -1;

          return (a.stt || 0) - (b.stt || 0);
        })
        .map((d) => d.tenBai);

      setLessonsFromFirestore(lessons);
      return lessons;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // ===== LOAD LAST OPENED EXAM =====
  useEffect(() => {
    const loadLastOpenedExam = async () => {
      if (justSaved) return; // 🔥 chặn fetch sau khi vừa lưu
      if (!lesson && lessonInput) return;
      if (isAddingLesson || localStorage.getItem("isAddingLesson") === "true") return;

      try {
        const snap = await getDoc(doc(db, "CONFIG", "config"));
        if (!snap.exists()) return;

        const { selectedClass, lesson } = snap.data();
        if (!selectedClass || !lesson) return;

        setSelectedClass(selectedClass);
        const lessons = await fetchLessonsFromFirestore(selectedClass);

        if (lessons.includes(lesson)) {
          setLesson(lesson);
          setLessonInput(lesson);
          fetchExam({ selectedClass, lessonFullName: lesson });
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadLastOpenedExam();
  }, [isAddingLesson, lessonInput, justSaved]);

  // ===== WHEN CLASS CHANGES: ONLY LOAD LESSON LIST =====
  useEffect(() => {
    const loadLessonsOnly = async () => {
      if (!selectedClass) {
        setLessonsFromFirestore([]);
        setLesson("");
        setQuestions([createEmptyQuestion()]);
        localStorage.removeItem("teacherQuiz");
        return;
      }

      await fetchLessonsFromFirestore(selectedClass);
    };

    loadLessonsOnly();
  }, [selectedClass, namHoc]); // 🔥 thêm namHoc

  // ===== UI ACTIONS =====
  const addQuestion = () =>
    setQuestions((prev) => [...prev, createEmptyQuestion()]);

  const updateQuestionAt = (index, patch) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleDeleteQuestion = async (index) => {
    if (!window.confirm(`Xóa câu hỏi ${index + 1}?`)) return;

    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);

    try {
      const collectionName = getTracNghiemCollection(selectedClass);
      if (!collectionName) return;

      await updateDoc(doc(db, collectionName, lesson), {
        questions: updatedQuestions,
      });

      localStorage.setItem("teacherQuiz", JSON.stringify(updatedQuestions));
      setSnackbar({ open: true, message: "✅ Xóa câu hỏi thành công", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: "❌ Xóa thất bại", severity: "error" });
    }
  };

  /*const handleSaveAll = () => {
    saveAllQuestions({
      questions,
      db,
      selectedClass,
      semester,
      lesson,
      setSnackbar,
    });
    localStorage.setItem("teacherQuiz", JSON.stringify(questions));
  };*/

const handleSaveAll = async () => {
  // 🔴 kiểm tra lớp + bài học
  const finalLesson = (lesson || lessonInput || "").trim();

  if (!selectedClass || !finalLesson) {
    setSnackbar({
      open: true,
      severity: "warning",
      message: "⚠️ Vui lòng chọn lớp và nhập bài học",
    });
    return;
  }

  const lessonName = finalLesson;
  const collectionName = getTracNghiemCollection(selectedClass);

  // 🔴 nếu là bài tuần → validate format
  const isWeekLesson = lessonName.toLowerCase().startsWith("tuần");
  if (isWeekLesson) {
    const isValid = /^Tuần\s\d+\.\s.+/.test(lessonName);
    if (!isValid) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "⚠️ Định dạng phải: Tuần X. Tên bài",
      });
      return;
    }
  }

  try {
    // ===== LƯU ĐỀ =====
    await saveAllQuestions({
      questions,
      db,
      selectedClass,
      semester,
      lesson: lessonName,
      setSnackbar,
      collectionName, // 🔥 BẮT BUỘC
    });

    // ✅ SET LẠI LESSON
    setLesson(lessonName);
    setLessonInput(lessonName);

    // 🔥 Chặn fetchExam sau khi vừa lưu
    setJustSaved(true);

    // 🔥 XÓA CACHE CŨ
    const CACHE_KEY = `teacher_quiz_${selectedClass}_${lessonName}`;
    localStorage.removeItem(CACHE_KEY);
    setQuizCache((prev) => {
      if (!prev) return {};
      const next = { ...prev };
      delete next[CACHE_KEY];
      return next;
    });

    localStorage.setItem("teacherQuiz", JSON.stringify(questions));

    // 🔥 TẮT CỜ thêm bài
    setIsAddingLesson(false);
    localStorage.removeItem("isAddingLesson");
    localStorage.removeItem("draftQuestions");

    // ===== AUTO THÊM BÀI MỚI NẾU CHƯA CÓ =====
    if (!lessonsFromFirestore.includes(lessonName)) {
      const lopNumber = selectedClass.replace("Lớp ", "");
      const stt = lessonsFromFirestore.length + 1; // gán stt cho bài mới
      
      // 🔥 chọn collection theo năm học
      const isOldYear = namHoc === "2025-2026";

      const colName = isOldYear
        ? `TENBAI_Lop${lopNumber}`
        : `TENBAI_Lop${lopNumber}_New`;

      await setDoc(doc(db, colName, lessonName), {
        tenBai: lessonName,
        createdAt: new Date(),
        stt,
      });

      // reload list lessons & set state đúng
      const lessons = await fetchLessonsFromFirestore(selectedClass);
      setLessonsFromFirestore(lessons);
    }

    // ===== LƯU CONFIG =====
    await setDoc(
      doc(db, "CONFIG", "config"),
      {
        selectedClass,
        lesson: lessonName,
      },
      { merge: true }
    );

    {/*setSnackbar({
      open: true,
      message: "✅ Lưu đề thành công",
      severity: "success",
    });*/}

  } catch (err) {
    console.error("❌ Lỗi lưu đề:", err);
    setSnackbar({
      open: true,
      message: "❌ Lưu đề thất bại",
      severity: "error",
    });
  }
};

  // ===== UPLOAD EXCEL =====
  //const handleUploadClick = () => fileInputRef.current?.click();

  const handleUploadClick = () => excelInputRef.current?.click();
  const handleFileChange = (e) => {
    handleUploadExcel({
      event: e,
      db,
      setSnackbar,
    });
  };

  const handleAddLesson = () => {
    setPrevLesson(lesson);
    setPrevQuestions(questions);

    setLesson("");          // 🔥 clear
    setLessonInput("");     // 🔥 clear
    setQuestions([createEmptyQuestion()]);

    setIsAddingLesson(true);
    localStorage.setItem("isAddingLesson", "true");
  };

  const handleExportJSON = () => {
    let defaultName = "";

    if (selectedClass && lesson) {
      // thay khoảng trắng bằng "_", bỏ dấu chấm
      const lop = selectedClass.replace(/\s+/g, " ");
      const bai = lesson.replace(/\s+/g, " ").replace(/\./g, "");
      defaultName = `${lop}_${bai}`;
    }

    setFileName(defaultName);
    setOpenExportDialog(true);
  };
  
  const handleConfirmExport = () => {
    setOpenExportDialog(false); // đóng dialog

    let finalName = fileName.trim();

    if (!finalName) {
      setSnackbar({
        open: true,
        message: "❌ Tên file không được để trống",
        severity: "error",
      });
      return;
    }

    // 🔥 Xóa hẳn phần: .json_123456
    finalName = finalName.replace(/\.json_\d+$/, "");

    // 🔥 nếu chưa có .json thì thêm
    if (!finalName.endsWith(".json")) {
      finalName += ".json";
    }

    const result = exportQuestionsToJSON({
      questions,
      fileName: finalName,
    });

    if (result.success) {
      setSnackbar({
        open: true,
        message: "✅ Xuất đề thành công!",
        severity: "success",
      });
    } else {
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi xuất đề!",
        severity: "error",
      });
    }
  };

  const handleImportOverwrite = () => {
    setPrevLesson(lesson);
    setPrevQuestions(questions);

    setQuestions(importData);

    //setIsAddingLesson(true);
    //setLesson("");
    //setLessonInput("");

    setOpenImportModeDialog(false);
  };

  const handleImportAppend = () => {
    setQuestions((prev) => {
      const isEmpty =
        prev.length === 1 && !prev[0].question;

      const base = isEmpty ? [] : prev;

      const newData = importData.map(q => ({
        ...q,
        id: `q_${Date.now()}_${Math.random()}`
      }));

      return [...base, ...newData];
    });

    setOpenImportModeDialog(false);
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const result = await importQuestionsFromJSON(file);

    if (!result.success) {
      setSnackbar({
        open: true,
        message: `❌ ${result.error}`,
        severity: "error",
      });
      e.target.value = "";
      return;
    }

    const importedQuestions = result.data;

    // 🔥 kiểm tra đề hiện tại có rỗng không
    const isEmpty =
      !questions ||
      questions.length === 0 ||
      (questions.length === 1 && !questions[0].question);

    // ===== CASE 1: ĐỀ TRỐNG → import luôn =====
    if (isEmpty) {
      // lưu để có thể undo
      setPrevLesson(lesson);
      setPrevQuestions(questions);

      setQuestions(importedQuestions);

      // 🔥 cho đặt tên bài mới
      setIsAddingLesson(true);
      setLesson("");
      setLessonInput("");

      setSnackbar({
        open: true,
        message: "✅ Nhập đề thành công",
        severity: "success",
      });
    } 
    // ===== CASE 2: ĐANG CÓ ĐỀ → mở dialog chọn =====
    else {
      // lưu data để xử lý ở dialog
      setImportData(importedQuestions);
      setOpenImportModeDialog(true);
    }

    // reset input để chọn lại file cùng tên vẫn trigger
    e.target.value = "";
  };

  const handleCleanAnswers = async () => {
    if (!window.confirm("Xóa toàn bộ answers trong tất cả đề?")) return;

    try {
      await cleanAnswersFieldInAllQuizzes(db);

      setSnackbar({
        open: true,
        message: "✅ Đã xóa toàn bộ answers",
        severity: "success",
      });
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi xóa answers",
        severity: "error",
      });
    }
  };

  const handleImportWord = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      console.log("📄 Nội dung Word:", text);

      // ===== TÁCH THEO "Câu X:" =====
      const blocks = text
        .split(/Câu\s*\d+\s*:/i)
        .map(b => b.trim())
        .filter(Boolean);

      const questionsParsed = blocks.map((block, index) => {
        if (!block) return null;

        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

        const question = lines[0];
        const options = [];
        const correct = [];

        lines.slice(1).forEach(line => {
          if (/^[A-D][\.\)]/.test(line)) {
            let text = line.replace(/^[A-D][\.\)]\s*/, "").trim();
            if (text.endsWith("*")) {
              text = text.replace(/\*$/, "").trim();
              correct.push(options.length);
            }
            options.push(text);
          }
        });

        while (options.length < 4) options.push("");

        return {
          id: `q_${Date.now()}_${index}`,
          question: `<p>${question}</p>`,
          questionImage: "",
          options: options.slice(0, 4).map(opt => ({
            text: `<p>${opt}</p>`,
            image: ""
          })),
          correct,
          type: correct.length > 1 ? "multiple" : "single",
          score: 0.5,
          sortType: "shuffle",
          title: "",
          pairs: []
        };
      }).filter(Boolean);

      console.log("Parsed questions:", questionsParsed);

      const isEmpty =
        !questions ||
        questions.length === 0 ||
        (questions.length === 1 && !questions[0].question);

      if (isEmpty) {
        setQuestions(questionsParsed);
        //setIsAddingLesson(true);
        // ❌ bỏ setLesson để giữ nguyên tên bài học hiện có
        setLessonInput(lesson || "");
      } else {
        setImportData(questionsParsed);
        setOpenImportModeDialog(true);
      }

      setSnackbar({
        open: true,
        message: "✅ Import Word thành công",
        severity: "success",
      });

    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi đọc file Word",
        severity: "error",
      });
    }

    e.target.value = "";
  };


  // ===== RENDER =====
  return (
    <Box sx={{ minHeight: "100vh", pt: 10, px: 3, backgroundColor: "#e3f2fd", display: "flex", justifyContent: "center" }}>
      <Card elevation={4} sx={{ width: "100%", maxWidth: 970, p: 3, borderRadius: 3, position: "relative" }}>
        {/* BUTTONS */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: "absolute", top: 8, left: 8 }}
        >
          <Tooltip title="Thêm bài học">
            <IconButton
              onClick={handleAddLesson} // reuse logic nút Thêm bài học
              sx={{ color: "#1976d2" }}
            >
              <Box
                sx={{
                  fontSize: 24,
                  fontWeight: "bold",
                  lineHeight: 1,
                }}
              >
                +
              </Box>
            </IconButton>
          </Tooltip>

          <Tooltip title="Lưu đề">
            <IconButton onClick={handleSaveAll} sx={{ color: "#1976d2" }}>
              <SaveIcon />
            </IconButton>
          </Tooltip>

          {/*<Tooltip title="Tải tên bài học từ Excel">
            <IconButton onClick={handleUploadClick} sx={{ color: "#1976d2" }}>
              <UploadFileIcon /> 
            </IconButton>
          </Tooltip>*/}

          {/* 🗑️ ICON XÓA ĐỀ */}
          <Tooltip title="Xóa đề trắc nghiệm">
            <IconButton
              onClick={() => setOpenDeleteDialog(true)}
              sx={{ color: "#f57c00" }}   // cam cảnh báo
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>

          <input
            type="file"
            accept=".xlsx,.xls"
            ref={excelInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {/* Export */}
          <Tooltip title="Xuất đề kiểm tra (JSON)">
            <IconButton onClick={handleExportJSON} sx={{ color: "#2e7d32" }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>

          {/* Import */} 
          <Tooltip title="Nhập đề kiểm tra">
            <IconButton
              onClick={() => setOpenImportSourceDialog(true)}
              sx={{ color: "#ed6c02" }}
            >
              <UploadFileIcon />
            </IconButton>
          </Tooltip>

          {/* Input file ẩn */}
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImportJSON}
          />

          <input
            type="file"
            accept=".docx"
            ref={wordInputRef}
            style={{ display: "none" }}
            onChange={handleImportWord}
          />

          {/* Xóa answers [] */}
          {/*<Tooltip title="Xóa toàn bộ answers">
            <IconButton
              onClick={handleCleanAnswers}
              sx={{ color: "#d32f2f" }}
            >
              🧹
            </IconButton>
          </Tooltip>*/}
        </Stack>

        <Typography variant="h5" fontWeight="bold" textAlign="center" sx={{ mt: 3, mb: 2, color: "#1976d2" }}>
          SOẠN ĐỀ KIỂM TRA
        </Typography>

        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>

            {/* LỚP */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Lớp</InputLabel>
              <Select
                value={selectedClass}
                label="Lớp"
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <MenuItem value="">Chọn</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* BÀI HỌC */}
            {!isAddingLesson ? (
              // ===== DROPDOWN =====
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Bài học</InputLabel>
                <Select
                  value={lesson}
                  label="Bài học"
                  onChange={async (e) => {
                    const value = e.target.value;

                    setLesson(value);
                    setLessonInput(value); // 🔥 sync luôn

                    if (!value) {
                      setQuestions([createEmptyQuestion()]);
                      return;
                    }

                    await setDoc(doc(db, "CONFIG", "config"), {
                      selectedClass,
                      lesson: value,
                    }, { merge: true });

                    fetchExam({
                      selectedClass,
                      lessonFullName: value,
                    });
                  }}
                >
                  <MenuItem value="">Chọn</MenuItem>
                  {lessonsFromFirestore.map((l) => (
                    <MenuItem key={l} value={l}>
                      {l}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              // ===== INPUT NHẬP TÊN + NÚT X =====
              <TextField
                label="Nhập tên bài học mới"
                size="small"
                value={lessonInput}
                onChange={(e) => setLessonInput(e.target.value)}
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Thoát chế độ nhập" arrow>
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => {
                            // gán callback reset dữ liệu
                            setOnConfirmExit(() => () => {
                              setIsAddingLesson(false);
                              localStorage.removeItem("isAddingLesson");

                              setLessonInput("");

                              if (prevLesson) {
                                setLesson(prevLesson);
                                setQuestions(prevQuestions);
                              } else {
                                setLesson("");
                                setQuestions([createEmptyQuestion()]);
                              }

                              setOpenExitDialog(false); // đóng dialog
                            });

                            // mở dialog cảnh báo
                            setOpenExitDialog(true);
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />

            )}

          </Stack>
        </Paper>

        <Stack spacing={3}>
          {questions.map((q, qi) => (
            <QuestionCard
              key={q.id}
              q={q}
              qi={qi}
              updateQuestionAt={updateQuestionAt}
              handleDeleteQuestion={handleDeleteQuestion}
              handleSaveAll={handleSaveAll}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button variant="contained" onClick={addQuestion}>
            Thêm câu hỏi
          </Button>
        </Stack>

        <OpenExamDialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        />

        <ExitAddLessonDialog
          open={openExitDialog}
          onClose={() => setOpenExitDialog(false)}
          onConfirmExit={onConfirmExit}
        />

        <ExportDialog
          open={openExportDialog}
          onClose={() => setOpenExportDialog(false)}
          fileName={fileName}
          setFileName={setFileName}
          onConfirm={handleConfirmExport}
        />

        <ImportModeDialog
          open={openImportModeDialog}
          onClose={() => setOpenImportModeDialog(false)}
          onOverwrite={handleImportOverwrite}
          onAppend={handleImportAppend}
        />

        <ImportSourceDialog
          open={openImportSourceDialog}
          onClose={() => setOpenImportSourceDialog(false)}

          onSelectJSON={() => {
            setOpenImportSourceDialog(false);
            fileInputRef.current?.click();
          }}

          onSelectWord={() => {
            setOpenImportSourceDialog(false);
            wordInputRef.current?.click(); // 👈 thêm
          }}

          onSelectFirestore={() => {
            setOpenImportSourceDialog(false);
            setOpenFirestoreDialog(true);
          }}
        />

        <ImportFromFirestoreDialog
          open={openFirestoreDialog}
          onClose={() => setOpenFirestoreDialog(false)}
          onImport={(importedQuestions) => {
            const isEmpty =
              questions.length === 0 ||
              (questions.length === 1 && !questions[0].question);

            if (isEmpty) {
              setQuestions(importedQuestions);
            } else {
              const mapped = importedQuestions.map(q => ({
                ...q,
                id: `q_${Date.now()}_${Math.random()}`
              }));

              setQuestions(prev => [...prev, ...mapped]);
            }
          }}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Card>
    </Box>
  );
}

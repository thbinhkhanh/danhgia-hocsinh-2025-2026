// ================= REACT =================
import React, { useState, useEffect, useRef } from "react";

// ================= MUI =================
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
} from "@mui/material";

import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";

// ================= FIREBASE =================
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../firebase";

// ================= CONTEXT =================
import { useConfig } from "../context/ConfigContext";
import { useTracNghiem } from "../context/TracNghiemContext";

// ================= COMPONENTS =================
import QuestionCard from "../Types/questions/QuestionCard";

// ================= DIALOGS =================
import ExportDialog from "../dialog/ExportDialog";
import OpenExamDialog from "../dialog/OpenExamDialog";
import ExamDeleteConfirmDialog from "../dialog/ExamDeleteConfirmDialog";
import ImportSourceDialog from "../dialog/ImportSourceDialog";
import ImportFromFirestoreDialog from "../dialog/ImportFromFirestoreDialog";
import ImportModeDialog from "../dialog/ImportModeDialog";
import DeleteQuestionDialog from "../dialog/DeleteQuestionDialog";
import ExportSourceDialog from "../dialog/ExportSourceDialog";

// ================= UTILS =================
import { saveAllQuestions } from "../utils/saveAllQuestions";
import { uploadImageToCloudinary } from "../utils/uploadCloudinary";
import useInitialQuiz from "../utils/useInitialQuiz";
import { handleImportQuiz } from "../utils/importQuizJson";
import { handleExportQuiz, handleConfirmExportQuiz } from "../utils/exportQuizJson";
import { handleImportWordQuiz } from "../utils/importWordQuiz";
import { normalizeFirestoreQuiz } from "../utils/normalizeFirestoreQuiz";
import { exportQuestionsToWord } from "../utils/exportQuizWORD";

// ================= LIBS =================
import * as mammoth from "mammoth/mammoth.browser";

export default function TracNghiemGV() {
  // ================= CONTEXT =================
const { config, setConfig } = useConfig();
const { config: quizConfig, updateConfig: updateQuizConfig } = useTracNghiem();

// ================= LOCAL STORAGE =================
const savedConfig = JSON.parse(localStorage.getItem("teacherConfig") || "{}");

// ================= FILTER =================
const [filterClass, setFilterClass] = useState("Lớp 4");
const [filterYear, setFilterYear] = useState("2025-2026");
const [semester, setSemester] = useState("Giữa kỳ I");

// ================= EXAM CONFIG =================
const [selectedClass, setSelectedClass] = useState(savedConfig.selectedClass || "");
const [selectedSubject, setSelectedSubject] = useState(savedConfig.selectedSubject || "");
const [schoolYear, setSchoolYear] = useState(savedConfig.schoolYear || "2025-2026");
const [examLetter, setExamLetter] = useState(savedConfig.examLetter || "");
const [examType, setExamType] = useState("bt");
const [dialogExamType, setDialogExamType] = useState("");

// ================= DOCUMENT / DATA =================
const [docList, setDocList] = useState([]);
const [loadingList, setLoadingList] = useState(false);
const [selectedDoc, setSelectedDoc] = useState(null);
const [isEditingNewDoc, setIsEditingNewDoc] = useState(true);
const [importData, setImportData] = useState([]);
const [lessonInput, setLessonInput] = useState("");
const [lessonName, setLessonName] = useState("");

// ================= FILE =================
const fileInputRef = React.useRef(null);
const wordInputRef = useRef(null);
const [fileName, setFileName] = useState("de_trac_nghiem");

// ================= DIALOGS =================
const [openDialog, setOpenDialog] = useState(false);
const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
const [openExportDialog, setOpenExportDialog] = useState(false);
const [openImportSourceDialog, setOpenImportSourceDialog] = useState(false);
const [openFirestoreDialog, setOpenFirestoreDialog] = useState(false);
const [openImportModeDialog, setOpenImportModeDialog] = useState(false);
const [openExport, setOpenExport] = useState(false);
const [openDelete, setOpenDelete] = useState(false);

// ================= DELETE CONTROL =================
const [deleteIndex, setDeleteIndex] = useState(null);

useEffect(() => {
  if (openDialog) {
    const savedExamType = localStorage.getItem("teacherExamType") || "bt";

    setDialogExamType(savedExamType);
    fetchQuizList(savedExamType, filterYear, filterClass);
  }
}, [openDialog]); // 👈 CHỈ mở dialog mới chạy

// State tuần riêng cho TracNghiemGV
const [deTuan, setDeTuan] = useState(
  Number(localStorage.getItem("deTuan")) || 1
);

const hocKyMap = {
  "Giữa kỳ I": { from: 1, to: 9 },
  "Cuối kỳ I": { from: 10, to: 18 },
  "Giữa kỳ II": { from: 19, to: 27 },
  "Cuối năm": { from: 28, to: 35 },
};


  // ⚙️ Dropdown cố định
  const semesters = ["Giữa kỳ I", "Cuối kỳ I", "Giữa kỳ II", "Cuối năm"];
  const classes = ["Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5"];
  const subjects = ["Tin học", "Công nghệ"];
  const years = ["2025-2026", "2026-2027", "2027-2028", "2028-2029", "2029-2030"];


  // ⚙️ Danh sách câu hỏi
  const [questions, setQuestions] = useState([]);

  // ⚙️ Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const savedId = localStorage.getItem("deTracNghiemId");
    const savedCollection = localStorage.getItem("deTracNghiemCollection"); // 🔥 thêm

    if (savedId) {
      updateQuizConfig({ 
        deTracNghiem: savedId,
        collection: savedCollection // 🔥 thêm
      });
    }
  }, []);

  useInitialQuiz({
    db,
    setQuestions,
    setSelectedClass,
    setSelectedSubject,
    setSemester,
    setSchoolYear,
    setExamLetter,
    setExamType,
    setLessonName,
  });


// -----------------------
// Load dữ liệu khi mount
// -----------------------
useEffect(() => {
  try {
    // Load config
    const cfg = JSON.parse(localStorage.getItem("teacherConfig") || "{}");

    if (cfg?.selectedClass) setSelectedClass(cfg.selectedClass);
    if (cfg?.selectedSubject) setSelectedSubject(cfg.selectedSubject);

    // ⭐ Thêm 3 dòng cần thiết
    //if (cfg?.semester) setSemester(cfg.semester);
    if (cfg?.schoolYear) setSchoolYear(cfg.schoolYear);
    if (cfg?.examLetter) setExamLetter(cfg.examLetter);

    // Load quiz
    const saved = JSON.parse(localStorage.getItem("teacherQuiz") || "[]");

    if (Array.isArray(saved) && saved.length) {
      const fixed = saved.map(q => {
        switch (q.type) {
          case "image":
            return {
              ...q,
              options: Array.from({ length: 4 }, (_, i) => q.options?.[i] || ""),
              correct: Array.isArray(q.correct) ? q.correct : [],
            };
          case "truefalse":
            return {
              ...q,
              options: q.options || ["Đúng", "Sai"],
              correct: q.correct || ["Đúng"],
            };
          case "sort":
          case "matching":
            return { ...q };
          default:
            return {
              ...q,
              type: "sort",
              options: q.options || ["", "", "", ""],
              correct: q.options ? q.options.map((_, i) => i) : [],
              pairs: [],
            };
        }
      });

      setQuestions(fixed);
    } else {
      setQuestions([createEmptyQuestion()]);
    }
  } catch (err) {
    console.error("❌ Không thể load dữ liệu:", err);
    setQuestions([createEmptyQuestion()]);
  }
}, []);


  // 🔹 Lưu config vào localStorage khi thay đổi
  useEffect(() => {
    const cfg = {
      selectedClass,
      selectedSubject,
      semester,
      schoolYear,
      examLetter,
    };
    localStorage.setItem("teacherConfig", JSON.stringify(cfg));
  }, [selectedClass, selectedSubject, semester, schoolYear, examLetter]);


  // -----------------------
  // Xử lý câu hỏi
  // -----------------------
  const createEmptyQuestion = () => ({
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: "",
    question: "",             // nội dung câu hỏi
    option: "",               // riêng cho fillblank (câu hỏi có [...])
    type: "single",           // mặc định: 1 lựa chọn
    options: ["", "", "", ""],// luôn có mảng options
    score: 0.5,
    correct: [],              // đáp án đúng
    sortType: "fixed",        // cho loại sort
    pairs: [],                // cho loại matching
    //answers: [],              // cho loại fillblank
    questionImage: ""         // cho loại image
  });

  // Hàm dùng để reorder khi kéo thả (nếu dùng sau)
  function reorder(list, startIndex, endIndex) {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  }

  const handleCreateNewQuiz = () => {
    // Xóa đề đang chọn
    setSelectedDoc(null);

    // Reset câu hỏi về 1 câu trống
    const emptyQ = createEmptyQuestion();
    setQuestions([emptyQ]);

    // Đặt trạng thái là đề mới
    setIsEditingNewDoc(true);
    setExamType("bt");                        
    setSelectedClass("");                     
    setSelectedSubject("");                   
    setSemester("");                          
    setSchoolYear("");                        
    setExamLetter("");                        
    setDeTuan("");                            
  };

  const handleAddQuestion = () => setQuestions((prev) => [...prev, createEmptyQuestion()]);

  const handleDeleteQuestion = (index) => {
    setDeleteIndex(index);
    setOpenDelete(true);
  };

  const updateQuestionAt = (index, patch) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const isQuestionValid = (q) => {
    if (!q.question?.trim()) return false;  // câu trả lời hoặc nội dung
    if (q.score <= 0) return false;

    if (q.type === "sort") {
      const nonEmptyOpts = (q.options || []).filter((o) => o?.trim());
      return nonEmptyOpts.length >= 2;
    }

    if (q.type === "matching") {
      const pairs = q.pairs || [];
      return pairs.length > 0 && pairs.every(p => p.left?.trim() && p.right?.trim());
    }

    if (q.type === "single") {
      return q.options?.some((o) => o.trim()) && q.correct?.length === 1;
    }

    if (q.type === "multiple") {
      return q.options?.some((o) => o.trim()) && q.correct?.length > 0;
    }

    if (q.type === "truefalse") {
      const opts = q.options || [];
      const correct = q.correct || [];
      return opts.length > 0 && opts.some(o => o?.trim()) && correct.length === opts.length;
    }

    if (q.type === "image") {
      const hasImage = q.options?.some(o => o); 
      const hasAnswer = q.correct?.length > 0;
      return hasImage && hasAnswer;
    }

    if (q.type === "fillblank") {
      // ít nhất 1 từ để điền (options) và câu hỏi có ít nhất 1 chỗ trống [...]
      const hasOptions = q.options?.some(o => o?.trim());
      const hasBlanks = q.option?.includes("[...]"); // lưu ý dùng q.option thay vì q.question
      return hasOptions && hasBlanks;
    }

    return false; // fallback cho các type chưa xử lý
  };

  function extractMatchingCorrect(pairs) {
    const correct = {};
    pairs.forEach((p) => {
      correct[p.left.trim()] = p.right.trim();
    });
    return correct;
  }

  const handleSaveAll = () => {
    saveAllQuestions({
      questions,
      //isQuestionValid,
      db,
      selectedClass,
      selectedSubject,
      semester,
      schoolYear,
      examLetter,
      examType,
      week: quizConfig?.deTuan ?? localStorage.getItem("deTuan") ?? "1",
      quizConfig,
      updateQuizConfig,
      setDeTuan,
      setSnackbar,
      setIsEditingNewDoc,
      lessonName, // ✅ THÊM DÒNG NÀY
    });
  };


  // --- Hàm mở dialog và fetch danh sách document ---
 // Mở dialog với mặc định loại đề "Bài tập tuần"
  const handleOpenDialog = () => {
    setSelectedDoc(null);
    setFilterClass("Lớp 4");

    const defaultType = "bt";
    fetchQuizList(defaultType, filterYear, filterClass);
  };


  // 🔹 Hàm lấy danh sách đề trong Firestore
  const fetchQuizList = async (type, year = filterYear, cls = filterClass) => {
  setLoadingList(true);

  try {
    let docs = [];

    // ===== GIỮ NGUYÊN BT / KTĐK =====
    if (type !== "luyentap") {
      const colName = type === "bt" ? "BAITAP_TUAN" : "NGANHANG_DE";

      const snap = await getDocs(collection(db, colName));

      docs = snap.docs.map((d) => ({
        id: d.id,
        name: d.id,
        collection: colName,
        ...d.data(),
      }));
    }

    // ===== LUYỆN TẬP TIN HỌC =====
    else {
      const baseCollections = [
        //"TRACNGHIEM1",
        //"TRACNGHIEM2",
        "TRACNGHIEM3",
        "TRACNGHIEM4",
        "TRACNGHIEM5",
      ];

      const suffix = year === "2025-2026" ? "" : "_New";

      const collections = baseCollections.map((c) => c + suffix);

      docs = [];

      for (const colName of collections) {
        try {
          const snap = await getDocs(collection(db, colName));

          const colDocs = snap.docs.map((d) => ({
            id: d.id,
            name: d.id,
            collection: colName,
            lop: `Lớp ${colName.match(/\d+/)?.[0]}`,
            year,
            ...d.data(),
          }));

          docs.push(...colDocs);
        } catch (err) {
          console.warn("Missing:", colName);
        }
      }
    }

    setDocList(docs);

    if (docs.length > 0) setSelectedDoc(docs[0].id);

  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách đề:", err);

    setSnackbar({
      open: true,
      message: "❌ Không thể tải danh sách đề!",
      severity: "error",
    });
  } finally {
    setLoadingList(false);
    setOpenDialog(true);
  }
};


  // 🔹 Hàm mở đề được chọn
  const handleOpenSelectedDoc = async () => {
    if (!selectedDoc) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn một đề trước khi mở.",
        severity: "warning",
      });
      return;
    }

    setOpenDialog(false);

    try {
      // 🔹 Xác định collection theo loại đề
      let collectionName = "BAITAP_TUAN";

      if (dialogExamType === "ktdk") {
        collectionName = "NGANHANG_DE";
      } 
      else if (dialogExamType === "luyentap") {
        // 🔥 luyện tập: collection nằm sẵn trong docList
        const currentDoc = docList.find((d) => d.id === selectedDoc);
        if (!currentDoc?.collection) {
          throw new Error("Không xác định được collection của đề luyện tập");
        }
        collectionName = currentDoc.collection; // TRACNGHIEM1..5

        localStorage.setItem("deTracNghiemCollection", currentDoc.collection);
        localStorage.setItem("deTracNghiemId", selectedDoc);
      }

      const docRef = doc(db, collectionName, selectedDoc);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setSnackbar({
          open: true,
          message: "❌ Không tìm thấy đề này!",
          severity: "error",
        });
        return;
      }

      const data = docSnap.data();

      // 🔥 Lấy tên bài học cho luyện tập
      if (dialogExamType === "luyentap") {
        setLessonName(selectedDoc);
      } else {
        setLessonName("");
      }

      /* ================== TUẦN (chỉ BT) ================== */
      const weekFromFile = data.week || 1;
      setDeTuan(weekFromFile);
      localStorage.setItem("deTuan", weekFromFile);

      try {
        const configRef = doc(db, "CONFIG", "config");
        await setDoc(configRef, { deTuan: weekFromFile }, { merge: true });
      } catch (err) {
        console.error("❌ Lỗi ghi deTuan CONFIG:", err);
      }

      /* ================== LOẠI ĐỀ ================== */
      let examTypeFromCollection = "bt";
      if (collectionName === "NGANHANG_DE") examTypeFromCollection = "ktdk";
      if (collectionName.startsWith("TRACNGHIEM")) examTypeFromCollection = "luyentap";

      setDialogExamType(examTypeFromCollection);
      setExamType(examTypeFromCollection);
      localStorage.setItem("teacherExamType", examTypeFromCollection);

      /* ================== CHUẨN HÓA CÂU HỎI ================== */
      /*const fixedQuestions = (data.questions || []).map((q) => {
        if (q.type === "image") {
          return {
            ...q,
            options: Array.from({ length: 4 }, (_, i) => q.options?.[i] || ""),
            correct: Array.isArray(q.correct) ? q.correct : [],
          };
        }
        return q;
      });*/

      let rawQuestions = data.questions || [];

      // CHỈ normalize khi mở từ dialog OpenExamDialog
      // (đây là luồng Firestore mở đề)
      if (
        dialogExamType === "bt" ||
        dialogExamType === "ktdk" ||
        dialogExamType === "luyentap"
      ) {
        rawQuestions = normalizeFirestoreQuiz(rawQuestions);
      }

      const fixedQuestions = rawQuestions;

      /* ================== SET STATE ================== */
      setQuestions(fixedQuestions);
      setSelectedClass(data.class || "");
      setSelectedSubject(data.subject || "");
      setSemester(data.semester || "");
      setSchoolYear(data.schoolYear || "");
      setExamLetter(data.examLetter || "");

      /* ================== CONTEXT + STORAGE ================== */
      updateQuizConfig({ deTracNghiem: selectedDoc });
      localStorage.setItem("deTracNghiemId", selectedDoc);
      localStorage.setItem("teacherQuiz", JSON.stringify(fixedQuestions));

      localStorage.setItem(
        "teacherConfig",
        JSON.stringify({
          selectedClass: data.class,
          selectedSubject: data.subject,
          semester: data.semester,
          schoolYear: data.schoolYear,
          examLetter: data.examLetter,
        })
      );

      /* ================== CONFIG CHUNG ================== */
      try {
        const configRef = doc(db, "CONFIG", "config");
        await setDoc(
          configRef,
          {
            deTracNghiem: selectedDoc,
            examType: examTypeFromCollection,
          },
          { merge: true }
        );
        setIsEditingNewDoc(false);
      } catch (err) {
        console.error("❌ Lỗi ghi CONFIG:", err);
      }

    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi mở đề: ${err.message}`,
        severity: "error",
      });
    }
  };


  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      createEmptyQuestion(),
    ]);
  };

  const handleDeleteSelectedDoc = () => {
    if (!selectedDoc) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn một đề trước khi xóa.",
        severity: "warning",
      });
      return;
    }

    setOpenDialog(true);       // đóng dialog danh sách đề
    setOpenDeleteDialog(true);  // mở dialog xác nhận xóa
  };

  const confirmDeleteSelectedDoc = async () => {
    // Đóng dialog ngay khi xác nhận
    setOpenDeleteDialog(false);

    try {
      const docToDelete = docList.find(d => d.id === selectedDoc);
      if (!docToDelete) return;

      // ❌ Bỏ logic "TH Lâm Văn Bền"
      // ✅ Dùng collection từ chính document
      await deleteDoc(doc(db, docToDelete.collection, docToDelete.id));

      const updatedList = docList.filter(d => d.id !== docToDelete.id);
      setDocList(updatedList);
      updateQuizConfig({ quizList: updatedList });
      setSelectedDoc(null);

      const isCurrentQuizDeleted =
        selectedClass === docToDelete?.class &&
        selectedSubject === docToDelete?.subject &&
        semester === docToDelete?.semester &&
        schoolYear === docToDelete?.schoolYear &&
        examLetter === docToDelete?.examLetter;

      if (isCurrentQuizDeleted) {
        setQuestions([createEmptyQuestion()]);
        updateQuizConfig({ deTracNghiem: null });
      }

      setSnackbar({
        open: true,
        message: "🗑️ Đã xóa đề thành công!",
        severity: "success",
      });
    } catch (err) {
      console.error("❌ Lỗi khi xóa đề:", err);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi xóa đề: ${err.message}`,
        severity: "error",
      });
    }
  };

  useEffect(() => {
    // Ưu tiên lấy từ context nếu có
    const contextDocId = quizConfig?.deTracNghiem;

    // Nếu không có trong context, thử lấy từ localStorage
    const storedDocId = localStorage.getItem("deTracNghiemId");

    const docId = contextDocId || storedDocId || null;

    if (docId) {
      setSelectedDoc(docId);
      setIsEditingNewDoc(false); // có đề → không phải đề mới
    } else {
      setIsEditingNewDoc(true); // không có đề → là đề mới
    }
  }, []);


  const handleImageChange = async (qi, oi, file) => {
    try {
      // 🔥 dùng hàm đã tách
      const imageUrl = await uploadImageToCloudinary(file);

      // Cập nhật question.options với URL
      const newOptions = [...questions[qi].options];
      newOptions[oi] = imageUrl;

      updateQuestionAt(qi, { options: newOptions });

    } catch (err) {
      console.error("❌ Lỗi upload hình:", err);
      setSnackbar({
        open: true,
        message: `❌ Upload hình thất bại: ${err.message}`,
        severity: "error",
      });
    }
  };

  const handleExportJSON = () => {
    handleExportQuiz({
      questions,
      selectedClass,
      semester,
      schoolYear,
      examLetter,
      selectedSubject,
      selectedDoc,
      fileName,
      setFileName,
      setOpenExportDialog,
      setSnackbar,
    });
  };

  const handleConfirmExport = () => {
    setOpenExportDialog(false);

    handleConfirmExportQuiz({
      fileName,
      questions,
      setSnackbar,
    });
  };

  const handleImportJSON = (e) => {
    handleImportQuiz({
      event: e,
      setQuestions: (data) => {
        setImportData(data);           // 👈 lưu tạm
        setOpenImportModeDialog(true); // 👈 mở dialog chọn mode
      },
      setSnackbar,
    });
  };

  const handleImportOverwrite = () => {
    setQuestions(importData);

    setSelectedDoc(null);
    setIsEditingNewDoc(true);

    setOpenImportModeDialog(false);

    setSnackbar({
      open: true,
      message: "✅ Nhập đề thành công!",
      severity: "success",
    });
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
    
    setSnackbar({
      open: true,
      message: "✅ Nhập đề thành công!",
      severity: "success",
    });
  };

  const escapeHTML = (str = "") => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };
  
  const handleImportWord = async (e) => {
    await handleImportWordQuiz({
      event: e,
      questions,
      setQuestions,
      setImportData,
      setOpenImportModeDialog,
      setLessonInput,
      setSnackbar,
    });
  };

const isLT = examType === "luyentap";
const isKTDK = examType === "ktdk";

const getSx = (ltWidth) => {
  if (isLT) return { flex: 1, minWidth: ltWidth };   // giữ nguyên LTTH
  if (isKTDK) return { flex: 1, minWidth: 130 };     // 👈 giảm cho KTĐK
  return { flex: 1, minWidth: 160 };                 // BT
};

const handleExportWord = (fileName) => {
  if (!fileName || !fileName.trim()) {
    fileName = "questions";
  }

  exportQuestionsToWord(questions, fileName.trim());
  setOpenExport(false);
};

const getDefaultName = () => {
  const cls = selectedClass || "";
  const les = (lesson || lessonInput || "").trim();

  return `${cls} - ${les}`;
};

const buildExportFileName = () => {
  const lop = selectedClass?.replace("Lớp ", "") || "";
  const mon = selectedSubject || "";
  const nam = schoolYear || "";
  const ky = semester || "";
  const de = examLetter || "";

  if (examType === "ktdk") {
    const kyShort =
      ky === "Cuối năm" ? "CN"
      : ky === "Giữa kỳ I" ? "GK1"
      : ky === "Cuối kỳ I" ? "CK1"
      : ky === "Giữa kỳ II" ? "GK2"
      : ky;

    return `KTĐK_${mon} ${lop}_${kyShort}_${nam} (${de})`;
  }

  if (examType === "bt") {
    return `BaiTap_${mon} ${lop}_Tuan ${deTuan || ""}`;
  }

  if (examType === "luyentap") {
    return `LTTH_${mon} ${lop}_${lessonInput || lessonName || "Bai"}`;
  }

  return `DE_${mon}_${lop}`;
};

const confirmDelete = () => {
  setQuestions((prev) =>
    prev.filter((_, i) => i !== deleteIndex)
  );

  setOpenDelete(false);
  setDeleteIndex(null);
};

const moveQuestionUp = (index) => {
  if (index === 0) return;

  setQuestions((prev) => {
    const newArr = [...prev];
    [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
    return newArr;
  });
};

const moveQuestionDown = (index) => {
  setQuestions((prev) => {
    if (index === prev.length - 1) return prev;

    const newArr = [...prev];
    [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
    return newArr;
  });
};

const moveQuestionTop = (index) => {
  setQuestions((prev) => {
    const arr = [...prev];
    const item = arr.splice(index, 1)[0];
    arr.unshift(item);
    return arr;
  });
};

const moveQuestionBottom = (index) => {
  setQuestions((prev) => {
    const arr = [...prev];
    const item = arr.splice(index, 1)[0];
    arr.push(item);
    return arr;
  });
};

const APPBAR_HEIGHT = 10;

return (
  <Box
    sx={{
      height: "94vh",
      bgcolor: "#f4f6f8",
      display: "flex",
      justifyContent: "center",
      overflow: "hidden", // 👈 khóa scroll toàn trang
    }}
  >
    {/* ================= WRAPPER ================= */}
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >

      {/* ================= CARD 1 (HEADER + FORM - FIXED) ================= */}
      <Card
        elevation={3}
        sx={{
          flexShrink: 0,
          mt: 1,
          mb: 1,
          borderRadius: 2,
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          overflow: "visible",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >

        {/* ================= HEADER ================= */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1,
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            background: "linear-gradient(to right, #ffffff, #f9fbff)",
          }}
        >

          {/* LEFT TOOLBAR */}
          <Stack direction="row" spacing={0.5} alignItems="center">

            <Tooltip title="Soạn đề mới">
              <IconButton
                onClick={handleCreateNewQuiz}
                sx={{
                  color: "#1976d2",
                  "&:hover": { bgcolor: "rgba(25,118,210,0.08)" },
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Mở đề">
              <IconButton
                onClick={fetchQuizList}
                sx={{
                  color: "#1976d2",
                  "&:hover": { bgcolor: "rgba(25,118,210,0.08)" },
                }}
              >
                <FolderOpenIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Lưu đề">
              <IconButton
                onClick={handleSaveAll}
                sx={{
                  color: "#1976d2",
                  "&:hover": { bgcolor: "rgba(25,118,210,0.08)" },
                }}
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Xuất đề kiểm tra">
              <IconButton
                onClick={() => setOpenExport(true)}
                sx={{
                  color: "#2e7d32",
                  "&:hover": { bgcolor: "rgba(46,125,50,0.08)" },
                }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Nhập đề kiểm tra">
              <IconButton
                onClick={() => setOpenImportSourceDialog(true)}
                sx={{
                  color: "#ed6c02",
                  "&:hover": { bgcolor: "rgba(237,108,2,0.08)" },
                }}
              >
                <UploadFileIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* RIGHT TITLE */}
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              bgcolor: "rgba(25,118,210,0.08)",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#1976d2",
                letterSpacing: 0.5,
              }}
            >
              TẠO ĐỀ KIỂM TRA
            </Typography>
          </Box>

        </Box>

        {/* ================= FORM ================= */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 0,
            bgcolor: "transparent",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            flexWrap="wrap"
            sx={{ width: "100%", alignItems: "flex-start" }}
          >

            <FormControl size="small" sx={getSx(150)} variant="outlined">
              <InputLabel id="exam-type-label">Loại đề</InputLabel>
              <Select
                labelId="exam-type-label"
                id="exam-type"
                value={examType || "bt"}
                label="Loại đề"
                onChange={(e) => setExamType(e.target.value)}
              >
                <MenuItem value="bt">Bài tập tuần</MenuItem>
                <MenuItem value="luyentap">Luyện tập tin học</MenuItem>
                <MenuItem value="ktdk">KTĐK</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={getSx(120)} variant="outlined">
              <InputLabel id="class-label">Lớp</InputLabel>
              <Select
                labelId="class-label"
                id="class-select"
                value={selectedClass || ""}
                label="Lớp"
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <MenuItem value="">Chọn</MenuItem>
                {classes.map((lop) => (
                  <MenuItem key={lop} value={lop}>
                    {lop}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {examType === "luyentap" ? (
              <TextField
                size="small"
                label="Tên bài học"
                value={lessonName || ""}
                sx={getSx(500)}
                InputProps={{ readOnly: true }}
              />
            ) : (
              <FormControl size="small" sx={getSx(500)} variant="outlined">
                <InputLabel id="subject-label">Môn học</InputLabel>
                <Select
                  labelId="subject-label"
                  id="subject-select"
                  value={selectedSubject || ""}
                  label="Môn học"
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  {subjects?.map((mon) => (
                    <MenuItem key={mon} value={mon}>
                      {mon}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {examType === "bt" && (
              <FormControl size="small" sx={getSx(120)} variant="outlined">
                <InputLabel id="week-label">Tuần</InputLabel>
                <Select
                  labelId="week-label"
                  id="week-select"
                  value={deTuan || ""}
                  label="Tuần"
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setDeTuan(value);
                    localStorage.setItem("deTuan", value);
                  }}
                >
                  <MenuItem value="">Chọn tuần</MenuItem>
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((t) => (
                    <MenuItem key={t} value={t}>
                      Tuần {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {examType === "ktdk" && (
              <>
                <FormControl size="small" sx={getSx(120)} variant="outlined">
                  <InputLabel id="semester-label">Học kỳ</InputLabel>
                  <Select
                    labelId="semester-label"
                    id="semester-select"
                    value={semester}
                    label="Học kỳ"
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
                    <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
                    <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
                    <MenuItem value="Cả năm">Cuối năm</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={getSx(120)} variant="outlined">
                  <InputLabel id="year-label">Năm học</InputLabel>
                  <Select
                    labelId="year-label"
                    id="year-select"
                    value={schoolYear || ""}
                    label="Năm học"
                    onChange={(e) => setSchoolYear(e.target.value)}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={getSx(120)} variant="outlined">
                  <InputLabel id="letter-label">Đề</InputLabel>
                  <Select
                    labelId="letter-label"
                    id="letter-select"
                    value={examLetter || ""}
                    label="Đề"
                    onChange={(e) => setExamLetter(e.target.value)}
                  >
                    {["A", "B", "C", "D"].map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

          </Stack>
        </Paper>
      </Card>

      {/* ================= CARD 2 (SCROLL AREA ONLY) ================= */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto", // 👈 CHỈ CUỘN Ở ĐÂY
          minHeight: 0,
        }}
      >
        <Card elevation={4} sx={{ p: 3, borderRadius: 2 }}>
          <Stack spacing={3}>
            {questions.map((q, qi) => (
              <QuestionCard
                key={q.id || qi}
                q={q}
                qi={qi}
                updateQuestionAt={updateQuestionAt}
                handleDeleteQuestion={handleDeleteQuestion}
                handleImageChange={handleImageChange}
                handleSaveAll={() =>
                  saveAllQuestions({
                    questions,
                    db,
                    selectedClass,
                    selectedSubject,
                    semester,
                    schoolYear,
                    examLetter,
                    examType,
                    week: deTuan,
                    quizConfig,
                    updateQuizConfig,
                    setDeTuan,
                    setSnackbar,
                    setIsEditingNewDoc,
                    lessonName,
                  })
                }
                moveQuestionUp={moveQuestionUp}       // 👈 thêm
                moveQuestionDown={moveQuestionDown}   // 👈 thêm
                moveQuestionTop={moveQuestionTop}
                moveQuestionBottom={moveQuestionBottom}
                totalQuestions={questions.length}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button variant="contained" onClick={addQuestion}>
              Thêm câu hỏi
            </Button>
          </Stack>
        </Card>
      </Box>

      {/* ================= ALL DIALOGS (GIỮ NGUYÊN 100%) ================= */}
      <OpenExamDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        dialogExamType={dialogExamType}
        setDialogExamType={setDialogExamType}
        filterClass={filterClass}
        setFilterClass={setFilterClass}
        filterYear={filterYear}
        setFilterYear={setFilterYear}
        classes={classes}
        loadingList={loadingList}
        docList={docList}
        selectedDoc={selectedDoc}
        setSelectedDoc={setSelectedDoc}
        handleOpenSelectedDoc={handleOpenSelectedDoc}
        handleDeleteSelectedDoc={handleDeleteSelectedDoc}
        fetchQuizList={fetchQuizList}
      />

      <ExportDialog
        open={openExportDialog}
        onClose={() => setOpenExportDialog(false)}
        fileName={fileName}
        setFileName={setFileName}
        onConfirm={handleConfirmExport}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <ExamDeleteConfirmDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={confirmDeleteSelectedDoc}
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
          wordInputRef.current?.click();
        }}
        onSelectFirestore={() => {
          setOpenFirestoreDialog(true);
        }}
      />

      <ExportSourceDialog
        open={openExport}
        onClose={() => setOpenExport(false)}
        onSelectJSON={() => {
          setOpenExport(false);
          handleConfirmExportQuiz({
            fileName: buildExportFileName() || "de_trac_nghiem",
            questions,
            setSnackbar,
          });
        }}
        onSelectWord={() => {
          const fileName = buildExportFileName();
          setOpenExport(false);
          handleExportWord(fileName);
        }}
      />
      
      <DeleteQuestionDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={confirmDelete}
        index={deleteIndex}
      />

    </Box>
  </Box>
);
}

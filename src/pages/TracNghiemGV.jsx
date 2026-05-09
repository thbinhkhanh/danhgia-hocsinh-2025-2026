import React, { useState, useEffect, useRef } from "react";

import {
  Box,
  Typography,
  Paper,
  //TextField,
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
  TextField
} from "@mui/material";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

import { db } from "../firebase"; // Firestore instance

//import DeleteIcon from "@mui/icons-material/Delete";
import { useConfig } from "../context/ConfigContext";
import { useTracNghiem } from "../context/TracNghiemContext";

import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SaveIcon from "@mui/icons-material/Save";
//import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddIcon from '@mui/icons-material/Add';
//import CloseIcon from "@mui/icons-material/Close";

//import Dialog from "@mui/material/Dialog";
//import DialogTitle from "@mui/material/DialogTitle";
//import DialogContent from "@mui/material/DialogContent";
//import DialogActions from "@mui/material/DialogActions";
import ExportDialog from "../dialog/ExportDialog";

import OpenExamDialog from "../dialog/OpenExamDialog";
import ExamDeleteConfirmDialog from "../dialog/ExamDeleteConfirmDialog";
import QuestionCard from "../Types/questions/QuestionCard";
import { saveAllQuestions } from "../utils/saveAllQuestions";

import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { uploadImageToCloudinary } from "../utils/uploadCloudinary";
import useInitialQuiz from "../utils/useInitialQuiz";
import { handleImportQuiz } from "../utils/importQuizJson";
import { handleExportQuiz, handleConfirmExportQuiz } from "../utils/exportQuizJson";

import ImportSourceDialog from "../dialog/ImportSourceDialog";
import ImportFromFirestoreDialog from "../dialog/ImportFromFirestoreDialog";
import ImportModeDialog from "../dialog/ImportModeDialog";
import { normalizeFirestoreQuiz } from "../utils/normalizeFirestoreQuiz";

import ExportSourceDialog from "../dialog/ExportSourceDialog";
import { exportQuestionsToWord } from "../utils/exportQuizWORD";

//import mammoth from "mammoth";
import * as mammoth from "mammoth/mammoth.browser";

export default function TracNghiemGV() {
  const { config, setConfig } = useConfig(); 
  //const semester = config?.hocKy || "";
  const { config: quizConfig, updateConfig: updateQuizConfig } = useTracNghiem();

  // ⚙️ State cho dialog mở đề
  const [openDialog, setOpenDialog] = useState(false);
  const [docList, setDocList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isEditingNewDoc, setIsEditingNewDoc] = useState(true);

  // ⚙️ Bộ lọc lớp
  const [filterClass, setFilterClass] = useState("Lớp 4");

  // ⚙️ CẤU HÌNH ĐỀ THI – ĐÚNG CHUẨN FIRESTORE
  const savedConfig = JSON.parse(localStorage.getItem("teacherConfig") || "{}");

const [selectedClass, setSelectedClass] = useState(savedConfig.selectedClass || "");
const [selectedSubject, setSelectedSubject] = useState(savedConfig.selectedSubject || "");
//const [semester, setSemester] = useState(savedConfig.semester || "");
const [schoolYear, setSchoolYear] = useState(savedConfig.schoolYear || "2025-2026");
const [examLetter, setExamLetter] = useState(savedConfig.examLetter || "");
const [examType, setExamType] = useState("bt");
const [dialogExamType, setDialogExamType] = useState("");
const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
const [filterYear, setFilterYear] = useState("2025-2026");
const [semester, setSemester] = useState("Giữa kỳ I");

const fileInputRef = React.useRef(null);
//const [openDialog, setOpenDialog] = useState(false);
const [fileName, setFileName] = useState("de_trac_nghiem");
const [openExportDialog, setOpenExportDialog] = useState(false); // dialog export

const [openImportSourceDialog, setOpenImportSourceDialog] = useState(false);
const [openFirestoreDialog, setOpenFirestoreDialog] = useState(false);
const wordInputRef = useRef(null);
const [openImportModeDialog, setOpenImportModeDialog] = useState(false);
const [importData, setImportData] = useState([]);
const [lessonInput, setLessonInput] = useState("");
const [lessonName, setLessonName] = useState("");

const [openExport, setOpenExport] = useState(false);

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
  "Cả năm": { from: 28, to: 35 },
};


  // ⚙️ Dropdown cố định
  const semesters = ["Giữa kỳ I", "Cuối kỳ I", "Giữa kỳ II", "Cả năm"];
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
    if (window.confirm(`Bạn có chắc muốn xóa câu hỏi ${index + 1}?`)) {
      setQuestions((prev) => prev.filter((_, i) => i !== index));
    }
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

    setOpenDialog(false);       // đóng dialog danh sách đề
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
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const html = htmlResult.value;

      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const text = textResult.value;

      const escapeHTML = (str = "") =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      // ===== Detect type =====
      const detectType = (block) => {
        const normalized = block.replace(/\s+/g, " ");
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

        // ✅ FIX: fillblank ưu tiên cao nhất
        if (
          /\[\s*\.\.\.\s*\]/.test(block) ||   // [...]
          /\[…\]/.test(block) ||             // […] (Unicode)
          /…/.test(block)                    // ellipsis
        ) {
          return "fillblank";
        }

        if (lines.some(l => /^[A-D][\.\)]/.test(l))) return "choice";
        if (lines.some(l => /^\d+\./.test(l))) return "sort";
        if (lines.some(l => /^[ĐS][\.\)]/.test(l))) return "truefalse";

        return "matching";
      };

      // ===== Choice parser =====
      const parseChoice = (block, index) => {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        if (!lines.length) return null;

        const questionText = lines[0].replace(/^Câu\s*\d+\s*[:\.\-)]?\s*/i, "");
        const options = [];
        const correct = [];

        lines.slice(1).forEach(line => {
          const match = line.match(/^([A-D])[\.\)\:\-\s]*/i);
          if (match) {
            let text = line.replace(/^([A-D])[\.\)\:\-\s]*/i, "").trim();
            const isCorrect = /\*/.test(text);

            text = text.replace(/\*/g, "").trim();

            if (isCorrect) correct.push(options.length);

            options.push({
              text: `<p>${escapeHTML(text)}</p>`,
              image: ""
            });
          }
        });

        while (options.length < 4) {
          options.push({ text: "", image: "" });
        }

        return {
          id: `q_${Date.now()}_${index}`,
          question: `<p>${escapeHTML(questionText)}</p>`,
          type: correct.length > 1 ? "multiple" : "single",
          options: options.slice(0, 4),
          correct,
          score: 0.5,
          sortType: "shuffle",
          pairs: []
        };
      };

      // ===== Sort parser =====
      const parseSort = (block, index) => {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        const questionText = lines[0].replace(/^Câu\s*\d+\s*[:\.\-)]?\s*/i, "");
        const items = [];

        lines.slice(1).forEach(line => {
          const match = line.match(/^\d+\.\s*(.+)/);
          if (match) {
            items.push({
              text: `<p>${escapeHTML(match[1])}</p>`,
              image: ""
            });
          }
        });

        if (items.length < 2) return null;

        return {
          id: `q_${Date.now()}_${index}`,
          question: `<p>${escapeHTML(questionText)}</p>`,
          type: "sort",
          options: items,
          correct: [],
          sortType: "shuffle",
          pairs: []
        };
      };

      // ===== True/False parser =====
      const parseTrueFalse = (block, index) => {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        if (!lines.length) return null;

        const questionText = lines[0].replace(/^Câu\s*\d+\s*[:\.\-)]?\s*/i, "");
        const options = [];
        const correct = [];

        lines.slice(1).forEach(line => {
          const match = line.match(/^([ĐS])[\.\)\:\-\s]*/i);
          if (match) {
            let text = line.replace(/^([ĐS])[\.\)\:\-\s]*/i, "").trim();
            text = text.replace(/\*/g, "").trim();

            options.push({
              text: `<p>${escapeHTML(text)}</p>`,
              image: ""
            });

            correct.push(match[1].toUpperCase());
          }
        });

        return {
          id: `q_${Date.now()}_${index}`,
          question: `<p>${escapeHTML(questionText)}</p>`,
          type: "truefalse",
          options,
          correct,
          score: 0.5,
          sortType: "shuffle",
          pairs: []
        };
      };

      // ===== FillBlank parser (FIXED) =====
      const parseFillBlank = (block, index) => {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        if (!lines.length) return null;

        // Tìm dòng "Từ cần điền"
        const answerLine = lines.find(l => /^Từ cần điền/i.test(l)) || "";

        // Phần question là dòng đầu tiên (dẫn nhập)
        const questionText = lines[0].replace(/^Câu\s*\d+\s*[:\.\-)]?\s*/i, "");

        // Phần option là các dòng còn lại (trừ dòng "Từ cần điền")
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
          type: "fillblank",
          option: `<p>${escapeHTML(optionText).replace(/\n/g, "<br>")}</p>`,
          options: answers.map(a => ({ text: a, image: "", formats: {} })),
          correct: answers,
          score: 0.5,
          sortType: "shuffle",
          pairs: [],
          title: "",
          questionImage: ""
        };
      };

    // ===== Matching parser =====
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");
    let tableIndex = 0;

    const parseMatchingFromTable = (table, index) => {
      // ✅ LẤY QUESTION TỪ <p> TRƯỚC TABLE
      let questionText = "";
      let prev = table.previousElementSibling;
      while (prev) {
        if (prev.tagName === "P" && prev.innerText.trim()) {
          questionText = prev.innerText.trim();
          break;
        }
        prev = prev.previousElementSibling;
      }

      // 🔥 CẮT "Câu 1."
      questionText = questionText.replace(/^Câu\s*\d+\s*[:\.\-)]?\s*/i, "");

      const rows = table.querySelectorAll("tr");
      const pairs = [];

      rows.forEach(row => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length < 2) return;

        const getCellContent = (cell) => {
          let text = cell.innerText.trim();
          const img = cell.querySelector("img");
          if (img) {
            const alt = img.getAttribute("alt")?.trim();
            text = alt ? `[Hình: ${alt}]` : "[Hình]";
          }
          return text;
        };

        const l = getCellContent(cells[0]);
        const r = getCellContent(cells[1]);
        if (!l && !r) return;

        pairs.push({
          left: `<p>${escapeHTML(l)}</p>`,
          right: `<p>${escapeHTML(r)}</p>`
        });
      });

      if (pairs.length < 2) return null;

      return {
        id: `q_${Date.now()}_table_${index}`,
        question: `<p>${escapeHTML(questionText)}</p>`,
        type: "matching",
        questionType: "matching",
        pairs,
        options: [],
        correct: [],
        sortType: "shuffle",
        score: 0.5
      };
    };

    // ===== Parse theo thứ tự DOM =====
    const elements = [...doc.body.querySelectorAll("p, table")];
    const finalQuestions = [];
    let index = 0;

    elements.forEach(el => {
      if (el.tagName === "P") {
        const textBlock = el.innerText.trim();
        if (!/^Câu\s*\d+/i.test(textBlock)) return;

        let block = textBlock;
        let next = el.nextElementSibling;
        while (next && next.tagName === "P" && !/^Câu\s*\d+/i.test(next.innerText)) {
          block += "\n" + next.innerText.trim();
          next = next.nextElementSibling;
        }

        const type = detectType(block);
        if (type === "choice") finalQuestions.push(parseChoice(block, index++));
        else if (type === "sort") finalQuestions.push(parseSort(block, index++));
        else if (type === "truefalse") finalQuestions.push(parseTrueFalse(block, index++));
        else if (type === "fillblank") finalQuestions.push(parseFillBlank(block, index++));
      }

      if (el.tagName === "TABLE") {
        const rows = el.querySelectorAll("tr");

        // lấy số cột tối đa
        let maxCols = 0;
        rows.forEach(r => {
          const cols = r.querySelectorAll("td, th").length;
          if (cols > maxCols) maxCols = cols;
        });

        // ====== CASE: IMAGE TABLE (> 2 cột) ======
        if (maxCols > 2) {
          const images = [];

          rows.forEach(row => {
            const cells = row.querySelectorAll("td, th");
            if (!cells.length) return;

            cells.forEach(cell => {
              const img = cell.querySelector("img");
              if (img) {
                images.push({
                  text: img.src || img.getAttribute("data-src") || "",
                  alt: img.alt || "",
                });
              }
            });
          });

          // ===== lấy câu hỏi thực tế (giống matching) =====
          let questionText = "";
          let prev = el.previousElementSibling;

          while (prev) {
            if (prev.tagName === "P" && prev.innerText.trim()) {
              questionText = prev.innerText.trim();
              break;
            }
            prev = prev.previousElementSibling;
          }

          if (!questionText) {
            questionText = "Câu hỏi hình ảnh";
          }

          // clean "Câu 5: ..."
          questionText = questionText.replace(/^Câu\s*\d+\s*[:\.\-)]?\s*/i, "");

          if (images.length) {
            finalQuestions.push({
              id: `q_${Date.now()}_image_${index++}`,
              question: `<p>${escapeHTML(questionText)}</p>`,
              type: "image",
              options: images.map(img => ({
                text: "",
                image: img.text
              })),
              correct: [],
              score: 0.5,
              sortType: "shuffle",
              pairs: []
            });
          }

          return; // ⛔ skip matching parser
        }

        // ====== NORMAL MATCHING ======
        const q = parseMatchingFromTable(el, index++);
        if (q) finalQuestions.push(q);
      }
    });


    console.log("✅ FINAL:", finalQuestions);

    const isEmpty =
      !questions ||
      questions.length === 0 ||
      (questions.length === 1 && !questions[0].question);

    if (isEmpty) {
      setQuestions(finalQuestions);
      setLessonInput("");

      setSnackbar({
        open: true,
        message: "✅ Nhập đề thành công!",
        severity: "success",
      });
      
    } else {
      setImportData(finalQuestions);
      setOpenImportModeDialog(true);
    }

  } catch (err) {
    console.error(err);
    setSnackbar({
      open: true,
      message: "❌ Lỗi đọc file Word",
      severity: "error"
    });
  }

  e.target.value = "";
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
      ky === "Cả năm" ? "CN"
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

  return (
    <Box sx={{ minHeight: "100vh", p: 3, backgroundColor: "#e3f2fd", display: "flex", justifyContent: "center" }}>
      <Card elevation={4} sx={{ width: "100%", maxWidth: 970, p: 3, borderRadius: 3, position: "relative" }}>
        {/* Nút New, Mở đề và Lưu đề */}
        <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 8, left: 8 }}>
          {/* Icon New: soạn đề mới */}
          <Tooltip title="Soạn đề mới">
            <IconButton onClick={handleCreateNewQuiz} sx={{ color: "#1976d2" }}>
              <AddIcon />
            </IconButton>
          </Tooltip>

          {/* Icon mở đề */}
          <Tooltip title="Mở đề">
            <IconButton onClick={fetchQuizList} sx={{ color: "#1976d2" }}>
              <FolderOpenIcon />
            </IconButton>
          </Tooltip>

          {/* Icon lưu đề */}
          <Tooltip title="Lưu đề">
            <IconButton onClick={handleSaveAll} sx={{ color: "#1976d2" }}>
              <SaveIcon />
            </IconButton>
          </Tooltip>

          {/* Export */}
          <Tooltip title="Xuất đề kiểm tra">
            <IconButton
              onClick={() => setOpenExport(true)}
              sx={{ color: "#2e7d32" }}
            >
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

        </Stack>

        {/* Tiêu đề */}
        <Typography
          variant="h5"
          fontWeight="bold"
          textAlign="center"
          gutterBottom
          sx={{ textTransform: "uppercase", color: "#1976d2", mt: 3, mb: 1 }}
        >
          Tạo đề kiểm tra
        </Typography>

        <Typography
          variant="subtitle1"
          textAlign="center"
          fontWeight="bold"
          sx={{ color: "text.secondary", mb: 3 }}
        >
          {quizConfig.deTracNghiem || localStorage.getItem("deTracNghiemId")
            ? `📝 Đề: ${selectedSubject || ""} - ${selectedClass || ""}`
            : "🆕 Đang soạn đề mới"}
        </Typography>

        {/* FORM LỚP / MÔN / HỌC KỲ / NĂM HỌC / ĐỀ */}
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            flexWrap="wrap"
          >
            {/* Loại đề */}
            <FormControl size="small" sx={getSx(150)}>
              <InputLabel>Loại đề</InputLabel>
              <Select
                value={examType || "bt"}
                onChange={(e) => setExamType(e.target.value)}
                label="Loại đề"
              >
                <MenuItem value="bt">Bài tập tuần</MenuItem>
                <MenuItem value="luyentap">Luyện tập tin học</MenuItem>
                <MenuItem value="ktdk">KTĐK</MenuItem>
              </Select>
            </FormControl>

            {/* Lớp */}
            <FormControl size="small" sx={getSx(120)}>
              <InputLabel>Lớp</InputLabel>
              <Select
                value={selectedClass || ""}
                onChange={(e) => setSelectedClass(e.target.value)}
                label="Lớp"
              >
                <MenuItem value="">Chọn</MenuItem>
                {classes.map((lop) => (
                  <MenuItem key={lop} value={lop}>
                    {lop}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Môn học / Tên bài học */}
            {examType === "luyentap" ? (
              <TextField
                size="small"
                label="Tên bài học"
                value={lessonName || ""}
                sx={getSx(500)}
                InputProps={{
                  readOnly: true,
                }}
              />
            ) : (
              <FormControl size="small" sx={getSx(500)}>
                <InputLabel>Môn học</InputLabel>
                <Select
                  value={selectedSubject || ""}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  label="Môn học"
                >
                  {subjects?.map((mon) => (
                    <MenuItem key={mon} value={mon}>
                      {mon}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Bài tập tuần */}
            {examType === "bt" && (
              <FormControl size="small" sx={getSx(120)}>
                <InputLabel>Tuần</InputLabel>
                <Select
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

            {/* KTĐK */}
            {examType === "ktdk" && (
              <>
                <FormControl size="small" sx={getSx(120)}>
                  <InputLabel>Học kỳ</InputLabel>
                  <Select value={semester} label="Học kỳ">
                    <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
                    <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
                    <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
                    <MenuItem value="Cả năm">Cả năm</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={getSx(120)}>
                  <InputLabel>Năm học</InputLabel>
                  <Select value={schoolYear || ""} label="Năm học">
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={getSx(120)}>
                  <InputLabel>Đề</InputLabel>
                  <Select value={examLetter || ""} label="Đề">
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

        {/* DANH SÁCH CÂU HỎI */}
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
                  lessonName, // ✅ THÊM DÒNG NÀY
                })
              }
            />
          ))}
        </Stack>


        {/* Nút thêm câu hỏi + nút lưu đề */}
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button variant="contained" onClick={addQuestion}>Thêm câu hỏi</Button>
          {/*<Button variant="outlined" color="secondary" onClick={handleSaveAll} disabled={questions.length === 0}>
            Lưu đề
          </Button>*/}
        </Stack>

        {/* DIALOG MỞ ĐỀ */}
        <OpenExamDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          dialogExamType={dialogExamType}
          setDialogExamType={setDialogExamType}
          filterClass={filterClass}
          setFilterClass={setFilterClass}
          filterYear={filterYear}          // thêm
          setFilterYear={setFilterYear}    // thêm
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

        {/* SNACKBAR */}
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
              try {
                const normalized = normalizeFirestoreQuiz(importedQuestions);

                setImportData(normalized);   // 👈 đã chuẩn hoá
                setOpenImportModeDialog(true);

              } catch (err) {
                setSnackbar({
                  open: true,
                  message: "❌ Dữ liệu Firestore không hợp lệ",
                  severity: "error",
                });
              }
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

              setSnackbar({
                open: true,
                message: "✅ Xuất JSON thành công",
                severity: "success",
              });
            }}

            onSelectWord={() => {
              const fileName = buildExportFileName();

              setOpenExport(false);

              handleExportWord(fileName);

              setSnackbar({
                open: true,
                message: "📄 Xuất Word thành công",
                severity: "success",
              });
            }}
          />
                </Card>
              </Box>
            );
          }

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
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
  Radio, 
  Checkbox,
  Grid,
} from "@mui/material";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

import { db } from "../firebase"; // Firestore instance

import DeleteIcon from "@mui/icons-material/Delete";
import { useConfig } from "../context/ConfigContext";
import { useTracNghiem } from "../context/TracNghiemContext";

import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SaveIcon from "@mui/icons-material/Save";
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from "@mui/icons-material/Close";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import OpenExamDialog from "../dialog/OpenExamDialog";
import ExamDeleteConfirmDialog from "../dialog/ExamDeleteConfirmDialog";
import QuestionCard from "../Types/questions/QuestionCard";
import { saveAllQuestions } from "../utils/saveAllQuestions";

export default function TracNghiemGV() {
  const { config, setConfig } = useConfig(); 
  const semester = config?.hocKy || "";
  const { config: quizConfig, updateConfig: updateQuizConfig } = useTracNghiem();

  // ⚙️ State cho dialog mở đề
  const [openDialog, setOpenDialog] = useState(false);
  const [docList, setDocList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isEditingNewDoc, setIsEditingNewDoc] = useState(true);

  // ⚙️ Bộ lọc lớp
  const [filterClass, setFilterClass] = useState("Tất cả");

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
const [filterYear, setFilterYear] = useState("Tất cả");

useEffect(() => {
  setDeTuan("");
  localStorage.removeItem("deTuan");
}, [config?.hocKy]);


useEffect(() => {
  if (openDialog) {
    const savedExamType = localStorage.getItem("teacherExamType") || "bt";
    setDialogExamType(savedExamType);
    fetchQuizList(savedExamType);
  }
}, [openDialog]);

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

  // Hàm upload lên Cloudinary
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "tracnghiem_upload"); // preset unsigned
    formData.append("folder", "questions"); // 🔹 folder muốn lưu

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dxzpfljv4/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Upload hình thất bại");
    }

    const data = await response.json();
    return data.secure_url; // URL hình đã upload
  };


  useEffect(() => {
    const savedId = localStorage.getItem("deTracNghiemId");
    if (savedId) {
      updateQuizConfig({ deTracNghiem: savedId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchInitialQuiz = async () => {
      try {
        // Lấy tên trường từ state hoặc localStorage (nếu cần)
        const schoolFromState = location?.state?.school;
        const schoolToUse =
          schoolFromState || localStorage.getItem("school") || "";

        // Luôn đọc config từ CONFIG/config
        const cfgRef = doc(db, "CONFIG", "config");
        const cfgSnap = await getDoc(cfgRef);
        if (!cfgSnap.exists()) {
          console.warn("Không tìm thấy CONFIG/config");
          setQuestions([]);
          return;
        }

        const cfgData = cfgSnap.data() || {};

        // Lấy id đề từ field deTracNghiem
        const docId = cfgData.deTracNghiem || null;
        const examType = cfgData.examType || ""; // "bt" hoặc "ktdk"

        if (!docId) {
          console.warn("Không có deTracNghiem trong config");
          setQuestions([]);
          return;
        }

        // 🔹 Chọn collection theo loại đề
        const collectionName =
          examType === "bt" ? "BAITAP_TUAN" : "NGANHANG_DE";

        // Lấy document đề thi
        const quizRef = doc(db, collectionName, docId);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {
          console.warn("Không tìm thấy đề:", collectionName, docId);
          setQuestions([]);
          return;
        }

        const data = quizSnap.data();
        const list = Array.isArray(data.questions) ? data.questions : [];

        // 🔹 Đồng bộ state từ document
        setQuestions(list);
        setSelectedClass(data.class || "");
        setSelectedSubject(data.subject || "");
        setSemester(data.semester || "");
        setSchoolYear(data.schoolYear || "");
        setExamLetter(data.examLetter || "");
        setExamType(examType); // cập nhật loại đề

        // 🔹 Lưu vào localStorage
        localStorage.setItem("teacherQuiz", JSON.stringify(list));
        localStorage.setItem(
          "teacherConfig",
          JSON.stringify({
            selectedClass: data.class || "",
            selectedSubject: data.subject || "",
            //semester: data.semester || "",
            schoolYear: data.schoolYear || "",
            examLetter: data.examLetter || "",
            examType: examType || "",
          })
        );
      } catch (err) {
        console.error("❌ Lỗi load đề:", err);
        setQuestions([]);
      }
    };

    fetchInitialQuiz();
  }, [location?.state?.school]);


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
    answers: [],              // cho loại fillblank
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
  });
};


  // --- Hàm mở dialog và fetch danh sách document ---
 // Mở dialog với mặc định loại đề "Bài tập tuần"
  const handleOpenDialog = () => {
    setSelectedDoc(null);
    setFilterClass("Tất cả"); // reset về "Tất cả"
    
    const defaultType = "bt";       // mặc định Bài tập tuần
    fetchQuizList(defaultType);      // load danh sách đề
  };


  // 🔹 Hàm lấy danh sách đề trong Firestore
  const fetchQuizList = async (type) => {
    setLoadingList(true);
    setFilterClass("Tất cả");
    setDialogExamType(type); // cập nhật loại đề hiện tại trong dialog

    try {
      // Chọn collection theo loại đề
      const colName = type === "bt" ? "BAITAP_TUAN" : "NGANHANG_DE";

      // Lấy tất cả document trong collection
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);

      // Lấy dữ liệu và gắn luôn tên collection để filter sau
      const docs = snap.docs.map((d) => ({
        id: d.id,
        name: d.id,
        collection: colName,
        ...d.data(),
      }));

      setDocList(docs);

      // Tự động chọn đề đầu tiên nếu có
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
      // 🔹 Xác định loại đề hiện tại
      const collectionName =
        dialogExamType === "ktdk" ? "NGANHANG_DE" : "BAITAP_TUAN";

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
      
      const weekFromFile = data.week || 1;      // lấy tuần từ dữ liệu đề
      setDeTuan(weekFromFile);                 // cập nhật state riêng TracNghiemGV
      localStorage.setItem("deTuan", weekFromFile); // lưu localStorage riêng trang này

      // Cập nhật CONFIG chung
      try {
        const configRef = doc(db, "CONFIG", "config");
        await setDoc(
          configRef,
          { deTuan: weekFromFile },  // lưu tuần của đề hiện tại
          { merge: true }
        );
      } catch (err) {
        console.error("❌ Lỗi khi ghi deTuan vào CONFIG:", err);
      }


      // 🔹 Cập nhật loại đề
      const examTypeFromCollection =
        collectionName === "NGANHANG_DE" ? "ktdk" : "bt";
      setDialogExamType(examTypeFromCollection);
      setExamType(examTypeFromCollection);
      localStorage.setItem("teacherExamType", examTypeFromCollection);

      // 🔹 Chuẩn hóa câu hỏi
      const fixedQuestions = (data.questions || []).map((q) => {
        if (q.type === "image") {
          return {
            ...q,
            options: Array.from({ length: 4 }, (_, i) => q.options?.[i] || ""),
            correct: Array.isArray(q.correct) ? q.correct : [],
          };
        }
        return q;
      });

      // 🔹 Cập nhật state
      setQuestions(fixedQuestions);
      setSelectedClass(data.class || "");
      setSelectedSubject(data.subject || "");
      setSemester(data.semester || "");
      setSchoolYear(data.schoolYear || "");
      setExamLetter(data.examLetter || "");

      // 🔹 Lưu context và localStorage
      updateQuizConfig({ deTracNghiem: selectedDoc });
      localStorage.setItem("deTracNghiemId", selectedDoc);

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

      localStorage.setItem("teacherQuiz", JSON.stringify(fixedQuestions));

      setOpenDialog(false);

      // 🔹 Ghi vào CONFIG/config chung
      try {
        const configRef = doc(db, "CONFIG", "config");
        const examTypeDisplay =
          examTypeFromCollection === "ktdk" ? "KTĐK" : "Bài tập tuần";

        await setDoc(
          configRef,
          {
            deTracNghiem: selectedDoc, // chỉ ghi id đề
            examType: examTypeFromCollection, 
          },
          { merge: true }
        );

        setIsEditingNewDoc(false);
      } catch (err) {
        console.error("❌ Lỗi khi ghi CONFIG:", err);
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
      // Tạo formData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "tracnghiem_upload"); // preset unsigned
      formData.append("folder", "questions"); // folder trong Cloudinary

      // Upload
      const response = await fetch("https://api.cloudinary.com/v1_1/dxzpfljv4/image/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload hình thất bại");

      const data = await response.json();
      const imageUrl = data.secure_url;

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
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
            
            {/* Loại đề */}
            <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
              <InputLabel>Loại đề</InputLabel>
              <Select
                value={examType || "bt"} // mặc định BT tuần
                onChange={(e) => setExamType(e.target.value)}
                label="Loại đề"
              >
                <MenuItem value="bt">Bài tập tuần</MenuItem>
                <MenuItem value="ktdk">KTĐK</MenuItem>
              </Select>
            </FormControl>

            {/* Lớp */}
            <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
              <InputLabel>Lớp</InputLabel>
              <Select
                value={selectedClass || ""}
                onChange={(e) => setSelectedClass(e.target.value)}
                label="Lớp"
              >
                <MenuItem value="">Chọn</MenuItem>   {/* 🔹 thêm dòng này */}
                {classes.map((lop) => (
                  <MenuItem key={lop} value={lop}>{lop}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Môn học */}
            <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
              <InputLabel>Môn học</InputLabel>
              <Select
                value={selectedSubject || ""}
                onChange={(e) => setSelectedSubject(e.target.value)}
                label="Môn học"
              >
                {subjects?.map((mon) => (
                  <MenuItem key={mon} value={mon}>{mon}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Nếu là BT tuần */}
            {examType === "bt" && (
              <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                <InputLabel>Tuần</InputLabel>
                <Select
                  value={deTuan || ""}   // fallback rỗng khi reset
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    setDeTuan(w);
                    localStorage.setItem("deTuan", w);
                  }}
                  label="Tuần"
                >
                  {/* MenuItem mặc định */}
                  <MenuItem value="">Chọn tuần</MenuItem>

                  {/* Chỉ render khi hocKyMap[semester] tồn tại */}
                  {semester && hocKyMap[semester] ? (
                    Array.from(
                      { length: hocKyMap[semester].to - hocKyMap[semester].from + 1 },
                      (_, i) => i + hocKyMap[semester].from
                    ).map((t) => (
                      <MenuItem key={t} value={t}>
                        Tuần {t}
                      </MenuItem>
                    ))
                  ) : null}
                </Select>
              </FormControl>
            )}


            {/* Nếu là KTĐK */}
            {examType === "ktdk" && (
              <>
                <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                  <InputLabel>Học kỳ</InputLabel>
                  <Select
                    value={semester || ""}
                    onChange={(e) => setSemester(e.target.value)}
                    label="Học kỳ"
                  >
                    {semesters.map((hk) => (
                      <MenuItem key={hk} value={hk}>{hk}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                  <InputLabel>Năm học</InputLabel>
                  <Select
                    value={schoolYear || ""}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    label="Năm học"
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                  <InputLabel>Đề</InputLabel>
                  <Select
                    value={examLetter || ""}
                    onChange={(e) => setExamLetter(e.target.value)}
                    label="Đề"
                  >
                    {["A", "B", "C", "D"].map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
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
              saveAllQuestions={() =>
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

      </Card>
    </Box>
  );
}

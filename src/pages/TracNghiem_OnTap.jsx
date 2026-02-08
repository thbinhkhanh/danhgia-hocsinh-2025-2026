import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
  Snackbar, 
  Alert,
  Divider,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel, Card,
} from "@mui/material";
import { doc, getDoc, getDocs, setDoc, collection, updateDoc } from "firebase/firestore";
// Thay cho react-beautiful-dnd
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useTheme, useMediaQuery } from "@mui/material";

import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";
import QuestionOption from "../utils/QuestionOption";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ImageZoomDialog from "../dialog/ImageZoomDialog";
import IncompleteAnswersDialog from "../dialog/IncompleteAnswersDialog";
import SimpleResultDialog from "../dialog/SimpleResultDialog";

import QuizQuestion from "../Types/questions/options/QuizQuestion";
import { buildRuntimeQuestions } from "../utils/buildRuntimeQuestions";
import { handleSubmitQuiz } from "../utils/submitQuiz";
import { autoSubmitQuiz } from "../utils/autoSubmitQuiz";
import { getQuestionStatus } from "../utils/questionStatus";

/*import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";*/

import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

//import { jsPDF } from "jspdf";
//import html2canvas from "html2canvas";

export default function TracNghiem_OnTap() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizClass, setQuizClass] = useState("");
  const [score, setScore] = useState(0);

  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const { config } = useContext(ConfigContext);
  const [selectedYear, setSelectedYear] = useState(config?.namHoc || "2025-2026");
  const [saving, setSaving] = useState(false);
  const [openExitConfirm, setOpenExitConfirm] = useState(false);

  const [zoomImage, setZoomImage] = useState(null);

  const location = useLocation();
    useEffect(() => {
    console.log("📦 location.state =", location.state);
  }, []);

  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);

  const [hocKi, setHocKi] = useState(config?.hocKy || "Cuối kỳ I");
  const [monHoc, setMonHoc] = useState("");
  const [choXemDiem, setChoXemDiem] = useState(false);
  const [choXemDapAn, setChoXemDapAn] = useState(false);
  const xuatFileBaiLam = config?.xuatFileBaiLam ?? true;

  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [studentResult, setStudentResult] = useState(null);
  const [fillBlankStatus, setFillBlankStatus] = useState({});

  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [complete, setComplete] = useState(false); // thêm dòng này
  const [examType, setExamType] = useState("kt"); // "bt" | "kt"
  
  // Lấy trường từ tài khoản đăng nhập
  const account = localStorage.getItem("account") || "";
  const school = account === "TH Lâm Văn Bền" ? account : "TH Bình Khánh";

  // Lấy lớp từ tên đề
  const detectedClass = selectedExam?.match(/Lớp\s*(\d+)/)?.[1] || "Test";

  const studentName = location.state?.fullname || "";
  const studentClass = location.state?.lop || "";

  const theme = useTheme();
  /*const isBelow900 = useMediaQuery(theme.breakpoints.down("md")); // <900
  const isBelow1080 = useMediaQuery("(max-width:1079px)");
  const isBelow1200 = useMediaQuery("(max-width:1199px)");
  const [showSidebar, setShowSidebar] = React.useState(true);*/
  const isBelow1024 = useMediaQuery("(max-width:1023px)");
  const [showSidebar, setShowSidebar] = useState(true);

  // Đồng bộ thời gian
  useEffect(() => {
    if (config?.timeLimit) setTimeLeft(config.timeLimit * 60);
  }, [config?.timeLimit]);

  useEffect(() => {
    if (started && !startTime) {
      setStartTime(Date.now());
    }
  }, [started, startTime]);

  // Timer
  useEffect(() => {
    if (!started || submitted) return; // <-- thêm !started
    if (timeLeft <= 0) {
      autoSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft, submitted]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleMatchSelect = (questionId, leftIndex, rightIndex) => {
    setAnswers(prev => {
      const prevAns = prev[questionId] ?? [];
      const newAns = [...prevAns];
      newAns[leftIndex] = rightIndex;
      return { ...prev, [questionId]: newAns };
    });
  };

  useEffect(() => {
    if (!examType) return;
    fetchQuizList(examType);
  }, [examType]);


  // ⭐ RESET TOÀN BỘ SAU KHI CHỌN ĐỀ MỚI
  useEffect(() => {
    if (!selectedExam) return;

    // Reset các state liên quan
    setAnswers({});
    setCurrentIndex(0);
    setComplete(false);
    setSubmitted(false);       // reset trạng thái đã nộp
    setStarted(false);
    setScore(0);
    setTimeLeft(0);
    setStartTime(null);        // reset thời gian bắt đầu
    setQuestions([]);
    setProgress(0);
    setLoading(true);
    setOpenResultDialog(false);
    setStudentResult(null);
    setFillBlankStatus({});

  }, [selectedExam]);

  // Hàm shuffleUntilDifferent: đảo mảng cho đến khi khác ít nhất 1 phần tử so với gốc
  function shuffleUntilDifferent(items) {
    if (!Array.isArray(items) || items.length === 0) return items;
    let shuffled = [...items];
    let attempts = 0;
    do {
      shuffled = shuffleArray([...items]);
      attempts++;
    } while (
      shuffled.every((item, idx) => item.idx === items[idx].idx) &&
      attempts < 100
    );
    return shuffled;
  }
  
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        let prog = 0;

        let collectionName =
          examType === "kt" ? "NGANHANG_DE" : "BAITAP_TUAN";

        let hocKiFromConfig = "";
        let monHocFromConfig = "";
        let timeLimitMinutes = 0;

        // 🔹 LẤY LỚP HỌC SINH TỪ STATE
        const studentClassFromState = location.state?.lop || "";
        const classNumber = studentClassFromState.match(/\d+/)?.[0];
        if (!classNumber) {
          setLoading(false);
          return;
        }

        // 🔹 LẤY CONFIG CHUNG
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        prog += 30;
        setProgress(prog);

        if (!configSnap.exists()) {
          setLoading(false);
          return;
        }

        const configData = configSnap.data();
        hocKiFromConfig = configData.hocKy || "";
        monHocFromConfig = configData.mon || "";
        timeLimitMinutes = configData.timeLimit ?? 0;

        setTimeLimitMinutes(timeLimitMinutes);
        setChoXemDiem(configData.choXemDiem ?? false);
        setChoXemDapAn(configData.choXemDapAn ?? false);

        // 🔹 KIỂM TRA ĐỀ ĐƯỢC CHỌN
        if (!selectedExam) {
          setLoading(false);
          return;
        }

        // 🔹 SET THỜI GIAN LÀM BÀI
        setTimeLeft(timeLimitMinutes * 60);

        // 🔹 LẤY DỮ LIỆU ĐỀ
        const docRef = doc(db, collectionName, selectedExam);
        const docSnap = await getDoc(docRef);
        prog += 30;
        setProgress(prog);

        if (!docSnap.exists()) {
          setSnackbar({
            open: true,
            message: "❌ Không tìm thấy đề trắc nghiệm!",
            severity: "error",
          });
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        setQuizClass(data.class || "");

        // 🔹 HỌC KỲ & MÔN HỌC (ưu tiên đề)
        const hocKiFromDoc = data.semester || hocKiFromConfig;
        const monHocFromDoc = data.subject || monHocFromConfig;

        setHocKi(hocKiFromDoc);
        setMonHoc(monHocFromDoc);

        window.currentHocKi = hocKiFromDoc;
        window.currentMonHoc = monHocFromDoc;

        // ==============================
        // ✅ XỬ LÝ CÂU HỎI BẰNG HÀM CHUNG
        const rawQuestions = Array.isArray(data.questions)
          ? data.questions
          : [];

        const runtimeQuestions = buildRuntimeQuestions(rawQuestions);

        // --- Lọc câu hợp lệ ---
        const validQuestions = runtimeQuestions.filter(q => {
          if (q.type === "matching")
            return q.question.trim() && q.leftOptions.length && q.rightOptions.length;
          if (q.type === "sort")
            return q.question.trim() && q.options.length;
          if (["single", "multiple", "image"].includes(q.type))
            return q.question.trim() && q.options.length && Array.isArray(q.correct);
          if (q.type === "truefalse")
            return q.question.trim() && q.options.length >= 2 && Array.isArray(q.correct);
          if (q.type === "fillblank")
            return q.question.trim() && q.options.length;
          return false;
        });

        setQuestions(validQuestions);
        setProgress(100);
        setStarted(true);

        // ==============================
        // ✅ TỰ ĐIỀN ANSWERS CHO SORT
        setAnswers(prev => {
          const next = { ...prev };
          validQuestions.forEach(q => {
            if (q.type === "sort" && Array.isArray(q.initialSortOrder)) {
              if (!Array.isArray(next[q.id])) {
                next[q.id] = q.initialSortOrder;
              }
            }
          });
          return next;
        });
      } catch (err) {
        console.error("❌ Lỗi khi load câu hỏi:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedExam, examType]);


  const fetchQuizList = async (type) => {
    try {
      const colName = type === "bt" ? "BAITAP_TUAN" : "NGANHANG_DE";

      // 🔹 LẤY LỚP HS TỪ STATE
      const studentClassFromState = location.state?.lop || "";
      const classNumber = studentClassFromState.match(/\d+/)?.[0];
      if (!classNumber) {
        setExamList([]);
        return;
      }

      // 🔹 LẤY CONFIG
      const monFromConfig = config?.mon?.trim() || "";
      const hocKyFromConfig = config?.hocKy || "";
      const namHocFromConfig = config?.namHoc || "";

      // 🔹 MAP HỌC KỲ → CODE
      const hocKyMap = {
        "Giữa kỳ I": "GKI",
        "Cuối kỳ I": "CKI",
        "Giữa kỳ II": "GKII",
        "Cả năm": "CN",
      };
      const hocKyCode = hocKyMap[hocKyFromConfig] || "";

      // 🔹 "2025-2026" → "25-26"
      const yearKey = namHocFromConfig
        ? namHocFromConfig.split("-").map(y => y.slice(2)).join("-")
        : "";

      const snap = await getDocs(collection(db, colName));

      const exams = snap.docs
        .map(d => d.id)
        .filter(id => {
          // ID mẫu: quiz_Lớp 4_Tin học_CKI_25-26 (A)
          const match = id.match(
            /quiz_Lớp\s*(\d+)_([^_]+)_([^_]+)_([^_ ]+)/i
          );
          if (!match) return false;

          const lop = match[1];
          const mon = match[2];
          const hocKyId = match[3];
          const namHocId = match[4];

          if (lop !== classNumber) return false;
          if (monFromConfig && mon !== monFromConfig) return false;
          if (hocKyCode && hocKyId !== hocKyCode) return false;
          if (yearKey && namHocId !== yearKey) return false;

          return true;
        });

      setExamList(exams);

      // 👉 tự chọn đề đầu tiên
      if (exams.length > 0) {
        setSelectedExam(exams[0]);
      } else {
        setSelectedExam("");
      }
    } catch (err) {
      console.error("❌ Lỗi khi lấy danh sách đề:", err);
      setExamList([]);
      setSelectedExam("");
    }
  };

  useEffect(() => {
    if (!examType) return;
    fetchQuizList(examType);
  }, [examType, config?.mon, config?.hocKy, config?.namHoc]);

  const formatQuizTitle = (examName = "") => {
    if (!examName) return "";

    // Bỏ prefix quiz_
    let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;
    const parts = name.split("_");

    // ===== LỚP =====
    const classPart = parts.find(p => p.toLowerCase().includes("lớp")) || "";
    const classNumber = classPart.match(/\d+/)?.[0] || "";

    // ===== MÔN =====
    let subjectPart = "";
    for (let i = parts.indexOf(classPart) + 1; i < parts.length; i++) {
      const p = parts[i];
      if (
        !p.toLowerCase().includes("cki") &&
        !p.toLowerCase().includes("cn") &&
        !/\d{2}-\d{2}/.test(p)
      ) {
        subjectPart = p;
        break;
      }
    }

    // ===== PHÂN BIỆT BT / KT =====
    const lastPart = parts[parts.length - 1];

    // 👉 BÀI TẬP TUẦN (kết thúc bằng số)
    if (/^\d+$/.test(lastPart)) {
      return `${subjectPart} ${classNumber} – Tuần ${lastPart}`.trim();
    }

    // 👉 KIỂM TRA ĐỊNH KỲ
    let extraPart = "";
    for (let i = parts.indexOf(classPart) + 1; i < parts.length; i++) {
      const p = parts[i];
      if (p.toLowerCase().includes("cki") || p.toLowerCase() === "cn") {
        extraPart = p.toUpperCase();
        break;
      }
    }

    const match = examName.match(/\(([^)]+)\)/);
    const examLetter = match ? match[1] : "";

    return `${subjectPart} ${classNumber}${extraPart ? ` - ${extraPart}` : ""}${examLetter ? ` (${examLetter})` : ""}`.trim();
  };

  // Hàm chuyển chữ đầu thành hoa
  const capitalizeName = (name = "") =>
    name
      .toLowerCase()
      .split(" ")
      .filter(word => word.trim() !== "")
      .map(word => word[0].toUpperCase() + word.slice(1))
      .join(" ");

  // Sử dụng:
  const hoVaTen = capitalizeName(studentName);

  // Ví dụ:
  //console.log(capitalizeName("thái phạm")); // "Thái Phạm"


  const currentQuestion = questions[currentIndex] || null;
  const isEmptyQuestion = currentQuestion?.question === "";

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const handleCloseSnackbar = (event, reason) => { if (reason === "clickaway") return; setSnackbar(prev => ({ ...prev, open: false })); };

  const handleSubmit = () =>
    handleSubmitQuiz({
      studentName,
      studentClass,
      studentId: null, // ✅ FIX CHUẨN
      studentInfo: null,
      studentResult,
      setStudentResult,
      setSnackbar,
      setSaving,
      setSubmitted,
      setOpenAlertDialog,
      setUnansweredQuestions,
      setOpenResultDialog,
      questions,
      answers,
      startTime,
      db,
      config,
      configData: config,
      selectedWeek: null,
      getQuestionMax: () => 1,
      capitalizeName,
      mapHocKyToDocKey: () => "",
      formatTime,
      exportQuizPDF: () => {},
    });

  const autoSubmit = () =>
    autoSubmitQuiz({
      studentName,
      studentClass,
      studentId: null,
      studentInfo: null,

      studentResult,
      setStudentResult,
      setSnackbar,
      setSaving,
      setSubmitted,
      setOpenAlertDialog,
      setUnansweredQuestions,
      setOpenResultDialog,

      questions,
      answers,
      startTime,

      db,
      config,
      configData: config,
      selectedWeek: null,

      getQuestionMax: () => 1,
      capitalizeName,
      mapHocKyToDocKey: () => "",
      formatTime,

      exportQuizPDF: () => {}, // autoSubmit không xuất PDF
    });


  const handleNext = () => currentIndex < questions.length - 1 && setCurrentIndex(currentIndex + 1);
  const handlePrev = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1);

  const convertPercentToScore = (percent) => {
    if (percent === undefined || percent === null) return "?";
    const raw = percent / 10;
    const decimal = raw % 1;
    if (decimal < 0.25) return Math.floor(raw);
    if (decimal < 0.75) return Math.floor(raw) + 0.5;
    return Math.ceil(raw);
  };

  useEffect(() => {
    if (config.timeLimit) setTimeLeft(config.timeLimit * 60);
  }, [config.timeLimit]);

  function reorder(list, startIndex, endIndex) {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  }

  // Giả sử bạn đang dùng useState để lưu đáp án

// Single: luôn lưu là số index
const handleSingleSelect = (questionId, optionIndex) => {
  // Đảm bảo là number (tránh trường hợp optionIndex là string)
  const idx = Number(optionIndex);
  setAnswers(prev => ({ ...prev, [questionId]: idx }));
};

// Multiple: lưu là mảng số
const handleMultipleSelect = (questionId, optionIndex, checked) => {
  const idx = Number(optionIndex);
  setAnswers(prev => {
    const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
    const next = checked
      ? Array.from(new Set([...current, idx]))
      : current.filter(x => x !== idx);
    return { ...prev, [questionId]: next };
  });
};

const handleDragEnd = (result) => {
  const { source, destination, draggableId } = result;
  if (!destination) return;

  setQuestions((prev) => {
    const updated = [...prev];
    const q = updated[currentIndex];

    let filled = q.filled ? [...q.filled] : [];

    // Kéo từ words vào blank
    if (destination.droppableId.startsWith("blank-") && source.droppableId === "words") {
      const blankIndex = Number(destination.droppableId.split("-")[1]);
      const word = draggableId.replace("word-", "");
      while (filled.length <= blankIndex) filled.push("");
      filled[blankIndex] = word;
    }

    // Kéo từ blank ra words
    if (destination.droppableId === "words" && source.droppableId.startsWith("blank-")) {
      const blankIndex = Number(source.droppableId.split("-")[1]);
      filled[blankIndex] = ""; // ô blank trở về rỗng
    }

    updated[currentIndex] = { ...q, filled };

    // ✅ Cập nhật luôn answers để chấm điểm
    setAnswers((prevAns) => ({
      ...prevAns,
      [q.id]: filled
    }));

    return updated;
  });
};

const normalizeValue = (val) => {
  if (typeof val === "object") {
    if (val.image) return String(val.image).trim();
    if (val.text) return val.text.trim();
  }
  if (typeof val === "string") {
    return val.trim();
  }
  return String(val).trim();
};

const ratio = currentQuestion?.columnRatio || { left: 1, right: 1 };

const questionCircleStyle = {
  width: { xs: 34, sm: 38 },
  height: { xs: 34, sm: 38 },
  borderRadius: "50%",
  minWidth: 0,
  fontSize: "0.85rem",
  fontWeight: 600,
  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  transition: "all 0.2s ease",
};

const handleExit = () => {
  if (submitted) {
    navigate(-1);
  } else {
    setOpenExitConfirm(true);
  }
};

/*const sidebarConfig = React.useMemo(() => {
  if (isBelow900) return null; // ✅ <900px → KHÔNG render

  if (isBelow1080) return { width: 130, cols: 2 };
  if (isBelow1200) return { width: 165, cols: 3 };

  return { width: 260, cols: 5 };
}, [isBelow900, isBelow1080, isBelow1200]);*/

const sidebarConfig = React.useMemo(() => {
  // < 1024px → ẨN sidebar
  if (isBelow1024) return null;

  // ≥ 1024px → sidebar 5 ô số
  return {
    width: 260,
    cols: 5,
  };
}, [isBelow1024]);

const hasSidebar = sidebarConfig && questions.length > 0;
const isSidebarVisible = hasSidebar && showSidebar;

return (
  <Box
    id="quiz-container"
    sx={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
      pt: { xs: 2, sm: 3 },
      px: { xs: 1, sm: 2 },
    }}
  >
    {/* ===== WRAPPER: MAIN + SIDEBAR ===== */}
    <Box
      sx={{
        display: "flex",
        gap: 3,
        width: "100%",

        maxWidth: isSidebarVisible ? 1280 : 1000,
        mx: "auto",                         // ✅ LUÔN CĂN GIỮA

        flexDirection: { xs: "column", md: "row" },
        alignItems: "stretch",
      }}
    >

      {/* ================= MAIN CONTENT (GIỮ NGUYÊN) ================= */}
      <Paper
        sx={{
          p: { xs: 2, sm: 4 },
          borderRadius: 3,
          width: "100%",
          maxWidth: 1000,
          minWidth: { xs: "auto", sm: 600 },
          minHeight: { xs: "auto", sm: 650 },
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* 🔹 Thông tin học sinh */}
        <Box
          sx={{
            p: 1.5,
            border: "2px solid #1976d2",
            borderRadius: 2,
            color: "#1976d2",
            width: "fit-content",
            mb: 2,
            position: { xs: "relative", sm: "absolute" },
            top: { sm: 16 },
            left: { sm: 16 },
            bgcolor: { xs: "#fff", sm: "transparent" },
            zIndex: 2,
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Tên: {hoVaTen}
          </Typography>
          <Typography variant="subtitle2" fontWeight="bold">
            Lớp: {studentClass}
          </Typography>
        </Box>

        {/* Nút thoát */}
        {/*<Tooltip title="Thoát trắc nghiệm" arrow>
          <IconButton
            onClick={() => {
              if (submitted) navigate(-1);
              else setOpenExitConfirm(true);
            }}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "#f44336",
              bgcolor: "rgba(255,255,255,0.9)",
              "&:hover": { bgcolor: "rgba(255,67,54,0.2)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>*/}

        {hasSidebar && (
          <Tooltip title={showSidebar ? "Thu gọn bảng câu hỏi" : "Mở bảng câu hỏi"}>
            <IconButton
              onClick={() => setShowSidebar(prev => !prev)}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                bgcolor: "#e3f2fd",
                border: "1px solid #90caf9",
                "&:hover": { bgcolor: "#bbdefb" },
                zIndex: 10,
              }}
            >
              {showSidebar ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Tiêu đề */}
        <Box
          sx={{
            width: "60%",
            maxWidth: 350,
            mt: 1,
            mb: 2,
            mx: "auto",
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontWeight: "bold",
              fontSize: 20,
              mb: 2,
              mt: -1,
              color: "#1976d2",
            }}
          >
            {config?.mon ? `ÔN TẬP ${config.mon.toUpperCase()}` : "ÔN TẬP"}
          </Typography>

          <FormControl
            size="small"
            sx={{ width: 230 }} // hoặc "50%", "20rem"
          >
            <InputLabel>Chọn đề</InputLabel>
            <Select
              value={selectedExam}
              label="Chọn đề"
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              {examList.map((exam) => (
                <MenuItem key={exam} value={exam}>
                  {formatQuizTitle(exam)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Đồng hồ */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            //mt: 2,
            mb: -3,
            minHeight: 40, // luôn giữ khoảng trống
            width: "100%",
          }}
        >
          {started && !loading && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 3,
                py: 0.5,
                borderRadius: 2,
                bgcolor: "#fff",
              }}
            >
              <AccessTimeIcon sx={{ color: "#d32f2f" }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "#d32f2f" }}
              >
                {formatTime(timeLeft)}
              </Typography>
            </Box>
          )}

          {/* Gạch ngang luôn hiển thị để giữ layout */}
          <Box sx={{ width: "100%", height: 0, bgcolor: "#e0e0e0", mt: 0, mb: 3 }} />

        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <Box sx={{ width: { xs: "60%", sm: "30%" } }}>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 3, borderRadius: 3 }} />
              <Typography variant="body2" sx={{ mt: 0.5, textAlign: "center" }}>
                🔄 Đang tải... {progress}%
              </Typography>
            </Box>
          </Box>
        )}

        {/* Câu hỏi */}
        {!loading && currentQuestion && (
          <QuizQuestion
            key={currentQuestion.id || currentIndex}
            currentQuestion={currentQuestion}
            currentIndex={currentIndex}
            answers={answers}
            setAnswers={setAnswers}
            submitted={submitted}
            started={started}
            choXemDapAn={choXemDapAn}
            setZoomImage={setZoomImage}
            handleSingleSelect={handleSingleSelect}
            handleMultipleSelect={handleMultipleSelect}
            handleDragEnd={handleDragEnd}
            reorder={reorder}
            normalizeValue={normalizeValue}
            ratio={ratio}
          />
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Điều hướng */}
        {started && !loading && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              mt: 2,
              pt: 2,
              mb: { xs: "20px", sm: "5px" },
              borderTop: "1px solid #e0e0e0",
            }}
          >
            {/* ===== CÂU TRƯỚC ===== */}
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handlePrev}
              disabled={currentIndex === 0}
              sx={{
                width: 150,
                bgcolor: currentIndex === 0 ? "#e0e0e0" : "#bbdefb",
                borderRadius: 1,
                color: "#0d47a1",
                "&:hover": {
                  bgcolor: currentIndex === 0 ? "#e0e0e0" : "#90caf9",
                },
              }}
            >
              Câu trước
            </Button>

            {/* ===== CÂU SAU / NỘP BÀI ===== */}
            <Box sx={{ width: 150, display: "flex", justifyContent: "flex-end" }}>
              {currentIndex < questions.length - 1 ? (
                <Button
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  onClick={handleNext}
                  sx={{
                    width: 150,
                    bgcolor: "#bbdefb",
                    borderRadius: 1,
                    color: "#0d47a1",
                    "&:hover": { bgcolor: "#90caf9" },
                  }}
                >
                  Câu sau
                </Button>
              ) : (
                !isSidebarVisible && (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitted || isEmptyQuestion}
                    sx={{ width: 150, borderRadius: 1 }}
                  >
                    Nộp bài
                  </Button>
                )
              )}
            </Box>
          </Stack>
        )}
      </Paper>

      {/* ================= SIDEBAR ================= */}
      {isSidebarVisible && (
        <Box
          sx={{
            width: sidebarConfig.width,   // ✅ theo config
            flexShrink: 0,
          }}
        >
          <Card
            sx={{
              p: 2,
              borderRadius: 2,
              position: sidebarConfig.width === 260 ? "sticky" : "static", // ✅ chỉ sticky khi >=1200
              top: 24,
            }}
          >
            <Typography
              fontWeight="bold"
              textAlign="center"
              mb={2}
              fontSize="1.1rem"
              color="#0d47a1"
            >
              Câu hỏi
            </Typography>

            <Divider sx={{ mt: -1, mb: 3, bgcolor: "#e0e0e0" }} />

            {/* ===== GRID Ô SỐ ===== */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${sidebarConfig.cols}, 1fr)`, // ✅ 2 / 3 / 5 ô
                gap: 1.2,
                justifyItems: "center",
                mb: !submitted ? 8 : 0,
              }}
            >
              {questions.map((q, index) => {
                const status = getQuestionStatus({
                  question: q,
                  userAnswer: answers[q.id],
                  submitted,
                });

                const active = currentIndex === index;

                let bgcolor = "#eeeeee";
                let border = "1px solid transparent";
                let textColor = "#0d47a1";

                if (!submitted && status === "answered") bgcolor = "#bbdefb";

                if (submitted) {
                  if (status === "correct") bgcolor = "#c8e6c9";
                  else if (status === "wrong") bgcolor = "#ffcdd2";
                  else {
                    bgcolor = "#fafafa";
                    border = "1px dashed #bdbdbd";
                  }
                }

                if (active) {
                  border = "2px solid #9e9e9e";
                  textColor = "#616161";
                }

                return (
                  <IconButton
                    key={q.id}
                    onClick={() => setCurrentIndex(index)}
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      bgcolor,
                      color: textColor,
                      border,
                      boxShadow: "none",
                    }}
                  >
                    {index + 1}
                  </IconButton>
                );
              })}
            </Box>

            {/* ===== ACTION BUTTONS ===== */}
            {!submitted && (
              <Button fullWidth variant="contained" onClick={handleSubmit}>
                Nộp bài
              </Button>
            )}

            <Button
              fullWidth
              variant="outlined"
              color="error"
              sx={{ mt: submitted ? 8 : 1.5 }}
              onClick={() => {
                if (submitted) navigate(-1);
                else setOpenExitConfirm(true);
              }}
            >
              Thoát
            </Button>
          </Card>
        </Box>
      )}


    </Box>

    {/* Dialog cảnh báo chưa làm hết */}
    <IncompleteAnswersDialog
      open={openAlertDialog}
      onClose={() => setOpenAlertDialog(false)}
      unansweredQuestions={unansweredQuestions}
    />

    {/* Dialog xác nhận thoát */}
    <ExitConfirmDialog
      open={openExitConfirm}
      onClose={() => setOpenExitConfirm(false)}
    />

    <SimpleResultDialog
      open={openResultDialog}
      onClose={() => setOpenResultDialog(false)}
      studentResult={studentResult}
      choXemDiem={choXemDiem}
    />

    {/* ===== ZOOM ẢNH ===== */}
    <ImageZoomDialog
      open={Boolean(zoomImage)}
      imageSrc={zoomImage}
      onClose={() => setZoomImage(null)}
    />

    {/* ===== SNACKBAR ===== */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={handleCloseSnackbar}
    >
      <Alert severity={snackbar.severity}>
        {snackbar.message}
      </Alert>
    </Snackbar>

  </Box>
);


}

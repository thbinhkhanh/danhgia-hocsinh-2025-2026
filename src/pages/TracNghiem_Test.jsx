import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  //Radio,
  //RadioGroup,
  //FormControlLabel,
  //Checkbox,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
  Snackbar, 
  Alert,
  Divider,
  //TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel, Card,
} from "@mui/material";
import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
//import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useTheme, useMediaQuery } from "@mui/material";

import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";
import { exportQuizPDF } from "../utils/exportQuizPDF"; 
//import QuestionOption from "../utils/QuestionOption";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
//import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ImageZoomDialog from "../dialog/ImageZoomDialog";
import IncompleteAnswersDialog from "../dialog/IncompleteAnswersDialog";
import TestResultDialog from "../dialog/TestResultDialog";

import QuizQuestion from "../Types/questions/options/QuizQuestion";
import { buildRuntimeQuestions } from "../utils/buildRuntimeQuestions";
import { handleSubmitQuiz } from "../utils/submitQuiz";
import { autoSubmitQuiz } from "../utils/autoSubmitQuiz";
import { getQuestionStatus } from "../utils/questionStatus";

//import Dialog from "@mui/material/Dialog";
//import DialogTitle from "@mui/material/DialogTitle";
//import DialogContent from "@mui/material/DialogContent";
//import DialogActions from "@mui/material/DialogActions";

import { processQuestions } from "../utils/processQuestions";
import { getQuizDocId } from "../utils/getQuizDocId";
import { useQuizTimer } from "../utils/useQuizTimer";

import QuizHeader from "../components/quiz/QuizHeader";
import QuizSidebar from "../components/quiz/QuizSidebar";
import QuizNavigation from "../components/quiz/QuizNavigation";
import QuizLoading from "../components/quiz/QuizLoading";
import QuizDialogs from "../components/quiz/QuizDialogs";

import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function TracNghiem_Test() {
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
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  //const [timeLeft, setTimeLeft] = useState(0);
  //const [startTime, setStartTime] = useState(null);
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
  const [allExamList, setAllExamList] = useState([]);

  const theme = useTheme();
  /*const isBelow900 = useMediaQuery(theme.breakpoints.down("md")); // <900
  const isBelow1080 = useMediaQuery("(max-width:1079px)");
  const isBelow1200 = useMediaQuery("(max-width:1199px)");
  const [showSidebar, setShowSidebar] = React.useState(true);*/
  const isBelow1024 = useMediaQuery("(max-width:1023px)");
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Lấy trường từ tài khoản đăng nhập
  const account = localStorage.getItem("account") || "";
  const school = account === "TH Lâm Văn Bền" ? account : "TH Bình Khánh";

  // Lấy lớp từ tên đề
  const detectedClass = selectedExam?.match(/Lớp\s*(\d+)/)?.[1] || "Test";
  const [selectedClass, setSelectedClass] = useState("4");

// Gán thông tin mặc định theo yêu cầu
  const studentInfo = {
    name: "Nguyễn Văn A",
    class: detectedClass,
    school: school
  };

  const handleMatchSelect = (questionId, leftIndex, rightIndex) => {
    setAnswers(prev => {
      const prevAns = prev[questionId] ?? [];
      const newAns = [...prevAns];
      newAns[leftIndex] = rightIndex;
      return { ...prev, [questionId]: newAns };
    });
  };

  const {
    timeLeft,
    setTimeLeft,
    startTime,
    formatTime,
  } = useQuizTimer({
    started,
    submitted,
    initialTime: timeLimitMinutes * 60,
    onTimeUp: () => {
      autoSubmitQuiz({
        studentName,
        studentClass: detectedClass,
        studentId: null,
        studentInfo: {
          ...studentInfo,
          className: detectedClass,
        },
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
        db: null,
        config,
        configData: config,
        selectedWeek: null,
        getQuestionMax: (q) => q.score ?? 1,
        capitalizeName,
        mapHocKyToDocKey: () => "",
        formatTime,
        exportQuizPDF,
      });
    },
  });

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
    //setStartTime(null);        // reset thời gian bắt đầu
    setQuestions([]);
    setProgress(0);
    setLoading(true);
    setOpenResultDialog(false);
    setStudentResult(null);
    setFillBlankStatus({});

  }, [selectedExam]);
  
  useEffect(() => {
    if (!selectedExam) return;

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        let prog = 0;

        const collectionName =
          examType === "kt" ? "NGANHANG_DE" : "BAITAP_TUAN";

        // ===== CONFIG =====
        const configSnap = await getDoc(doc(db, "CONFIG", "config"));

        if (!configSnap.exists()) {
          setSnackbar({
            open: true,
            message: "❌ Không tìm thấy config!",
            severity: "error",
          });
          return;
        }

        prog += 30;
        setProgress(prog);

        const configData = configSnap.data();

        const hocKiFromConfig = configData.hocKy || "";
        const monHocFromConfig = configData.mon || "";
        const timeLimitMinutes = configData.timeLimit ?? 0;

        setTimeLimitMinutes(timeLimitMinutes);
        setChoXemDiem(configData.choXemDiem ?? false);
        setChoXemDapAn(configData.choXemDapAn ?? false);

        // ===== DOC ID =====
        const docId = selectedExam;

        // ===== TIME =====
        setTimeLeft(timeLimitMinutes * 60);

        // ===== LOAD ĐỀ =====
        const docSnap = await getDoc(doc(db, collectionName, docId));

        if (!docSnap.exists()) {
          setSnackbar({
            open: true,
            message: "❌ Không tìm thấy đề!",
            severity: "error",
          });
          return;
        }

        prog += 30;
        setProgress(prog);

        const data = docSnap.data();

        // ===== META =====
        setQuizClass(data.class || "");

        const hocKiFromDoc = data.semester || hocKiFromConfig;
        const monHocFromDoc = data.subject || monHocFromConfig;

        setHocKi(hocKiFromDoc);
        setMonHoc(monHocFromDoc);

        window.currentHocKi = hocKiFromDoc;
        window.currentMonHoc = monHocFromDoc;

        // ✅ DÙNG HÀM CHUNG
        processQuestions({
          data,
          buildRuntimeQuestions,
          setQuestions,
          setStarted,
          setProgress,
          setAnswers,
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

      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);

      const exams = snap.docs
        .map((d) => d.id)
        .sort((a, b) => {
          // ===== TÁCH TUẦN =====
          const getWeek = (str) => {
            const match = str.match(/_(\d+)$/);
            return match ? Number(match[1]) : 999;
          };

          // ===== FORMAT TITLE =====
          const titleA = formatQuizTitle(a);
          const titleB = formatQuizTitle(b);

          // ===== TÊN KHÔNG CÓ TUẦN =====
          const baseA = titleA.replace(/– Tuần \d+/i, "").trim();
          const baseB = titleB.replace(/– Tuần \d+/i, "").trim();

          // ===== SORT THEO TÊN =====
          if (baseA !== baseB) {
            return baseA.localeCompare(baseB, "vi");
          }

          // ===== SORT THEO TUẦN =====
          return getWeek(a) - getWeek(b);
        });

      setAllExamList(exams);

      if (type === "bt") {
        setExamList([]);       // chờ chọn lớp
        setSelectedExam("");
      } else {
        setExamList(exams);    // KTĐK thì hiện hết
        setSelectedExam(exams[0] || "");
      }


      if (exams.length > 0) {
        setSelectedExam(exams[0]);
      }
    } catch (err) {
      console.error("❌ Lỗi khi lấy danh sách đề:", err);
      setSnackbar({
        open: true,
        message: "❌ Không thể tải danh sách đề!",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    if (examType !== "bt") return;

    if (!selectedClass) {
      setExamList([]);
      setSelectedExam("");
      return;
    }

    const filtered = allExamList.filter((examId) =>
      examId.includes(`Lớp ${selectedClass}`)
    );

    setExamList(filtered);
    setSelectedExam(filtered[0] || "");
  }, [selectedClass, examType, allExamList]);


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
  
  const studentClass = quizClass ?? detectedClass ?? studentInfo?.class ?? "Test";
  const studentName = studentInfo.name;

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

  const currentQuestion = questions[currentIndex] || null;
  const isEmptyQuestion = currentQuestion?.question === "";
  
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const handleCloseSnackbar = (event, reason) => { if (reason === "clickaway") return; setSnackbar(prev => ({ ...prev, open: false })); };

  const handleSubmit = () =>
    handleSubmitQuiz({
      studentName,
      studentClass: detectedClass,
      studentId: null,
      studentInfo: {
        ...studentInfo,
        className: detectedClass,   // 👈 BẮT BUỘC
      },
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
      getQuestionMax: (q) => q.score ?? 1,
      capitalizeName,
      mapHocKyToDocKey: () => "",
      formatTime,
      exportQuizPDF,
      xuatFileBaiLam,
      quizClass: detectedClass,
    });
  
  const autoSubmit = () => {
    autoSubmitQuiz({
      studentName,
      studentClass: detectedClass,
      studentId: null,
      studentInfo: {
        ...studentInfo,
        className: detectedClass,
      },
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
      db: null,
      config,
      configData: config,
      selectedWeek: null,
      getQuestionMax: (q) => q.score ?? 1,
      capitalizeName,
      mapHocKyToDocKey: () => "",
      formatTime,
      exportQuizPDF,
    });
  };
  
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

  function reorder(list, startIndex, endIndex) {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  }

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

const ratio = currentQuestion?.columnRatio || { left: 1, right: 1 };

/*const sidebarConfig = React.useMemo(() => {
  if (isBelow900) return null; // <900px → KHÔNG render sidebar
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

const resetQuiz = () => {
  setAnswers({});
  setCurrentIndex(0);
  setComplete(false);
  setSubmitted(false);
  setStarted(false);
  setScore(0);
  setTimeLeft(timeLimitMinutes * 60);
  //setStartTime(null);
  setProgress(0);
  setOpenResultDialog(false);
  setStudentResult(null);
  setFillBlankStatus({});
  setOpenExitConfirm(false);

  // load lại câu hỏi (nếu muốn reset hoàn toàn)
  setQuestions([]);
  setLoading(true);
};

return (
  <Box
    id="quiz-container"
    sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
      pt: { xs: 2, sm: 3 },
      px: { xs: 1, sm: 2 },
    }}
  >
    {/* Wrapper ngang để chứa Paper + Sidebar */}
    <Box
      sx={{
        display: "flex",
        width: "100%",
        maxWidth: isSidebarVisible ? 1300 : 1000,
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 2,
      }}
    >
      {/* =================== MAIN PAPER =================== */}
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
          flexGrow: 1,
        }}
      >
        {hasSidebar && (
          <Tooltip
            title={
              showSidebar
                ? "Thu gọn bảng câu hỏi"
                : "Mở bảng câu hỏi"
            }
            arrow
          >
            <IconButton
              onClick={() => setShowSidebar((prev) => !prev)}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                bgcolor: "#e3f2fd",
                border: "1px solid #90caf9",
                zIndex: 10,
                "&:hover": {
                  bgcolor: "#bbdefb",
                },
              }}
            >
              {showSidebar ? (
                <ChevronLeftIcon />
              ) : (
                <ChevronRightIcon />
              )}
            </IconButton>
          </Tooltip>
        )}

        <Box
          sx={{
            width: "60%",
            maxWidth: 350,
            mt: 1,
            mb: 2,
            ml: "auto",
            mr: "auto",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Tiêu đề */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              fontSize: "20px",
              mb: 2,
              mt: -1,
              color: "#1976d2",
            }}
          >
            TEST ĐỀ KIỂM TRA
          </Typography>

          {/* Ô chọn đề */}
          <Stack direction="row" spacing={2} alignItems="center">
            {/* ================= LOẠI ĐỀ ================= */}
            <FormControl size="small" sx={{ width: 159 }}>
              <InputLabel sx={{ fontSize: 16, fontWeight: "bold" }}>
                Loại đề
              </InputLabel>
              <Select
                value={examType}
                label="Loại đề"
                sx={{ fontSize: 16, fontWeight: 500 }}
                onChange={(e) => {
                  const type = e.target.value;
                  setExamType(type);
                  fetchQuizList(type);

                  if (type === "bt") {
                    setSelectedClass("4");
                  } else {
                    setSelectedClass("");
                  }
                }}
              >
                <MenuItem value="bt">Bài tập tuần</MenuItem>
                <MenuItem value="kt">KTĐK</MenuItem>
              </Select>
            </FormControl>

            {/* ================= CHỌN LỚP ================= */}
            {examType === "bt" && (
              <FormControl size="small" sx={{ width: 120 }}>
                <InputLabel>Lớp</InputLabel>
                <Select
                  value={selectedClass}
                  label="Lớp"
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <MenuItem value="3">Lớp 3</MenuItem>
                  <MenuItem value="4">Lớp 4</MenuItem>
                  <MenuItem value="5">Lớp 5</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* ================= CHỌN ĐỀ ================= */}
            <FormControl size="small" sx={{ width: 220 }}>
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
          </Stack>
        </Box>

        {/* Đồng hồ */}
        {/*<Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mt: 0.5,
            mb: 0,
            minHeight: 40,
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

          <Box
            sx={{
              width: "100%",
              height: 1,
              bgcolor: "#e0e0e0",
              mt: 0,
            }}
          />
        </Box>*/}

        {/* Loading */}
        <QuizLoading loading={loading} progress={progress} />

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

        {/* ===== NÚT ĐIỀU HƯỚNG ===== */}
        {started && !loading && (
          <QuizNavigation
            started={started}
            loading={loading}
            currentIndex={currentIndex}
            questionsLength={questions.length}
            handlePrev={handlePrev}
            handleNext={handleNext}
            handleSubmit={handleSubmit}
            submitted={submitted}
            isEmptyQuestion={isEmptyQuestion}
            isSidebarVisible={isSidebarVisible}
          />
        )}
      </Paper>

      {/* =================== SIDEBAR =================== */}
      {isSidebarVisible && (
        <QuizSidebar
          sidebarConfig={sidebarConfig}
          questions={questions}
          answers={answers}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          submitted={submitted}
          handleSubmit={handleSubmit}
          navigate={navigate}
          setOpenExitConfirm={setOpenExitConfirm}
          getQuestionStatus={getQuestionStatus}
        />
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

    <TestResultDialog
      open={openResultDialog}
      onClose={() => setOpenResultDialog(false)}
      studentResult={studentResult}
      choXemDiem={choXemDiem}
    />

    <ImageZoomDialog
      open={Boolean(zoomImage)}
      imageSrc={zoomImage}
      onClose={() => setZoomImage(null)}
    />

    {/* Snackbar */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={handleCloseSnackbar}
        severity={snackbar.severity}
        sx={{ width: "100%" }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  </Box>
);

}
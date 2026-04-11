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
  Card, Grid,
} from "@mui/material";
import { doc, getDoc, getDocs, setDoc, collection, updateDoc } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";
import { exportQuizPDF } from "../utils/exportQuizPDF"; 
import { handleSubmitQuiz } from "../utils/submitQuiz";
import { autoSubmitQuiz } from "../utils/autoSubmitQuiz";
import QuestionOption from "../utils/QuestionOption";
import ImageZoomDialog from "../dialog/ImageZoomDialog";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

/*import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";*/

import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

import IncompleteAnswersDialog from "../dialog/IncompleteAnswersDialog";
import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ResultDialog from "../dialog/ResultDialog";
import QuizQuestion from "../Types/questions/options/QuizQuestion";
import { buildRuntimeQuestions } from "../utils/buildRuntimeQuestions";
import { getQuestionStatus } from "../utils/questionStatus";
import { useTheme, useMediaQuery } from "@mui/material";

export default function TracNghiem() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizClass, setQuizClass] = useState("");
  const [score, setScore] = useState(0);

  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(""); 
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);

  const [zoomImage, setZoomImage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const { config } = useContext(ConfigContext);
  const [saving, setSaving] = useState(false);
  const [openExitConfirm, setOpenExitConfirm] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);

  const [hocKi, setHocKi] = useState("");
  const [monHoc, setMonHoc] = useState("");
  const [choXemDiem, setChoXemDiem] = useState(false);
  const [choXemDapAn, setChoXemDapAn] = useState(false);

  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [studentResult, setStudentResult] = useState(null);
  const [fillBlankStatus, setFillBlankStatus] = useState({});
  const [dialogMessage, setDialogMessage] = useState("");

  const [notFoundMessage, setNotFoundMessage] = useState(""); 
  const [selectedExamType, setSelectedExamType] = useState("Giữa kỳ I"); // mặc định
  const [configData, setConfigData] = useState(null);

  const locationState = location.state || {};
  const [studentId, setStudentId] = useState(locationState.studentId || "HS001");
  const [fullname, setFullname] = useState(locationState.fullname || "Test");
  const [lop, setLop] = useState(locationState.lop || "4.1");
  const [selectedWeek, setSelectedWeek] = useState(locationState.selectedWeek || 13);
  const [mon, setMon] = useState(locationState.mon || "Tin học");
  
  const theme = useTheme();
  /*const isBelow900 = useMediaQuery(theme.breakpoints.down("md")); // <900
  const isBelow1080 = useMediaQuery("(max-width:1079px)");
  const isBelow1200 = useMediaQuery("(max-width:1199px)");
  const [showSidebar, setShowSidebar] = React.useState(true);*/
  const isBelow1024 = useMediaQuery("(max-width:1023px)");
  const [showSidebar, setShowSidebar] = useState(true);
  
  const studentInfo = {
    id: studentId,
    name: fullname,
    className: lop,           
    selectedWeek: selectedWeek || 1,
    mon: mon || config.mon || "Tin học",
  };

// Khi cần lấy lớp học sinh
const studentClass = studentInfo.className;
const studentName = studentInfo.name;
const hocKiDisplay = config?.hocKy || "Cuối kỳ I"; // fallback nếu chưa có config
const monHocDisplay = studentInfo.mon || config?.mon || "Tin học";

// Kiểm tra dữ liệu học sinh
if (!studentInfo.id || !studentInfo.name || !studentClass) {
  console.warn("❌ Thiếu dữ liệu học sinh, quay lại danh sách");
  navigate("/hoc-sinh"); // quay lại trang danh sách
}

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
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        let prog = 0;

        let docId = null;
          let collectionName = "NGANHANG_DE"; // mặc định
          let hocKiFromConfig = "";
          let monHocFromConfig = "";
          let timeLimitMinutes = 0;

          // lấy config
          const configRef = doc(db, "CONFIG", "config");
          const configSnap = await getDoc(configRef);
          if (configSnap.exists()) {
            const data = configSnap.data();
            setConfigData(data); // ← thêm dòng này
          }

          prog += 30;
          setProgress(prog);

          if (!configSnap.exists()) {
            setSnackbar({ 
              open: true, 
              message: "❌ Không tìm thấy config!", 
              severity: "error" 
            });
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

          // === Lấy lớp học sinh ===
          const studentClass = studentInfo.className;
          const classNumber = studentClass.match(/\d+/)?.[0];
          if (!classNumber) {
            setSnackbar({ 
              open: true, 
              message: "❌ Không xác định được lớp của học sinh!", 
              severity: "error" 
            });
            setLoading(false);
            return;
          }
          const classLabel = `Lớp ${classNumber}`;

          // === Xác định docId ===
          if (configData.onTap === true) {
            // 🔹 NHÁNH ÔN TẬP
            const hocKiMap = {
              "Cuối kỳ I": "CKI",
              "Giữa kỳ I": "GKI",
              "Giữa kỳ II": "GKII",
              "Cả năm": "CN"
            };
            const hocKiCode = hocKiMap[hocKiFromConfig];

            if (!hocKiCode) {
              setNotFoundMessage(`❌ Không tìm thấy đề Ôn tập ${hocKiFromConfig}`);
              setLoading(false);
              return;
            }

            const onTapSnap = await getDocs(collection(db, "NGANHANG_DE"));

            // Tìm đề vừa khớp lớp, vừa khớp học kỳ
            const matchedDoc = onTapSnap.docs.find(d =>
              d.id.includes(classLabel) && d.id.includes(hocKiCode)
            );

            if (!matchedDoc) {
              setNotFoundMessage(`❌ Không tìm thấy đề Ôn tập ${hocKiFromConfig}`);
              setLoading(false);
              return;
            }

            collectionName = "NGANHANG_DE";
            docId = matchedDoc.id;

          } else if (configData.kiemTraDinhKi === true) {
            // 🔹 NHÁNH KTĐK (giữ nguyên)
            const hocKiMap = {
              "Cuối kỳ I": "CKI",
              "Giữa kỳ I": "GKI",
              "Giữa kỳ II": "GKII",
              "Cả năm": "CN"
            };

            const hocKiCode = hocKiMap[hocKiFromConfig];

            if (!hocKiCode) {
              setNotFoundMessage(`❌ Không tìm thấy đề KTĐK ${hocKiFromConfig}`);
              setLoading(false);
              return;
            }

            const deThiSnap = await getDocs(collection(db, "DETHI"));
            const matchedDeThi = deThiSnap.docs.find(d =>
              d.id.includes(classLabel) &&
              d.id.includes(hocKiCode) &&
              d.id.includes(monHocFromConfig) // ✅ thêm môn vào đây
            );

            if (!matchedDeThi) {
              setNotFoundMessage(`❌ Không tìm thấy đề KTĐK ${hocKiFromConfig}`);
              setLoading(false);
              return;
            }

            const deThiName = matchedDeThi.id;

            const tracNghiemSnap = await getDocs(collection(db, "NGANHANG_DE"));
            const matchedDoc = tracNghiemSnap.docs.find(d => d.id === deThiName);

            collectionName = "NGANHANG_DE";
            docId = matchedDoc?.id;

          } else if (configData.baiTapTuan === true) {
            // 🔹 NHÁNH BÀI TẬP TUẦN (giữ nguyên)
            const studentClass = studentInfo.className;
            const classNumber = studentClass.match(/\d+/)?.[0];
            const selectedWeek = studentInfo.selectedWeek;
            const monHoc = studentInfo.mon;

            if (!classNumber || !selectedWeek || !monHoc) {
              showNotFoundDialog("❌ Thiếu thông tin lớp / tuần / môn để mở bài tập tuần!");
              setLoading(false);
              return;
            }

            const expectedDocId = `quiz_Lớp ${classNumber}_${monHoc}_${selectedWeek}`;
            const baitapTuanSnap = await getDocs(collection(db, "BAITAP_TUAN"));
            const matchedDoc = baitapTuanSnap.docs.find(d => d.id === expectedDocId);

            if (!matchedDoc) {
              setNotFoundMessage(`❌ Không tìm thấy đề ${monHoc} Lớp ${classNumber} (tuần ${selectedWeek})`);
              setLoading(false);
              return;
            }

            collectionName = "BAITAP_TUAN";
            docId = matchedDoc.id;

          } else {
            setNotFoundMessage("❌ Không xác định nhánh nào để load đề!");
            setLoading(false);
            return;
          }

          
        // 🔹 Set thời gian làm bài (giây)
        setTimeLeft(timeLimitMinutes * 60);

        // 🔹 Lấy dữ liệu đề
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        prog += 30;
        setProgress(prog);

        if (!docSnap.exists()) {
          setSnackbar({ open: true, message: "❌ Không tìm thấy đề trắc nghiệm!", severity: "error" });
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        setQuizClass(data.class || "");

        // 🔹 Lấy học kỳ và môn học từ đề nếu có, ưu tiên config
        const hocKiFromDoc = data.semester || hocKiFromConfig;
        const monHocFromDoc = data.subject || monHocFromConfig;

        setHocKi(hocKiFromDoc);
        setMonHoc(monHocFromDoc);

        // 🔹 Lưu tạm để submit + xuất PDF
        window.currentHocKi = hocKiFromDoc;
        window.currentMonHoc = monHocFromDoc;

        // --- Xử lý câu hỏi ---
        const runtimeQuestions = buildRuntimeQuestions(data.questions);
        setQuestions(runtimeQuestions);
        
        setProgress(100);
        setStarted(true);

        //============================
        //Chấm Sort không tương tác
        setAnswers(prev => {
          const next = { ...prev };
          runtimeQuestions.forEach(q => {
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
  }, []);

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

  function mapHocKyToDocKey(loaiKT) {
    switch (loaiKT) {
      case "Giữa kỳ I": return "GKI";
      case "Cuối kỳ I": return "CKI";
      case "Giữa kỳ II": return "GKII";
      case "Cả năm": return "CN";
      default:
        console.warn("❌ Loại kiểm tra không xác định:", loaiKT);
        return "UNKNOWN";
    }
  }

  const getQuestionMax = (q) => {
    // Nếu có scoreTotal thì dùng (tổng sẵn của câu)
    if (typeof q.scoreTotal === "number") return q.scoreTotal;

    // Nếu có per-item score và có danh sách tiểu mục
    if (typeof q.perItemScore === "number") {
      // xác định số tiểu mục theo loại
      const subCount =
        q.type === "truefalse" ? (Array.isArray(q.correct) ? q.correct.length : 0) :
        q.type === "fillblank" ? (Array.isArray(q.options) ? q.options.length : 0) :
        q.type === "matching" ? (Array.isArray(q.correct) ? q.correct.length : 0) :
        q.type === "sort" ? (Array.isArray(q.correctTexts) ? q.correctTexts.length : 0) :
        1;
      return q.perItemScore * subCount;
    }

    // Mặc định: dùng score nếu có, nếu không thì 1
    return typeof q.score === "number" ? q.score : 1;
  };

  const maxScore = questions.reduce((sum, q) => sum + getQuestionMax(q), 0);
  //console.log("🔎 Tổng điểm đề (maxScore):", maxScore);

  const currentQuestion = questions[currentIndex] || null;
  const isEmptyQuestion = currentQuestion?.question === "";

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const handleCloseSnackbar = (event, reason) => { if (reason === "clickaway") return; setSnackbar(prev => ({ ...prev, open: false })); };

  const handleSubmit = () =>
    handleSubmitQuiz({
      studentName,
      studentClass,
      studentId,
      studentInfo,
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
      configData,
      selectedWeek,
      getQuestionMax,
      capitalizeName,
      mapHocKyToDocKey,
      formatTime,
      exportQuizPDF,
    });

const autoSubmit = () => {
  autoSubmitQuiz({
    studentName,
      studentClass,
      studentId,
      studentInfo,
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
      configData,
      selectedWeek,
      getQuestionMax,
      capitalizeName,
      mapHocKyToDocKey,
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

  useEffect(() => {
    if (config.timeLimit) setTimeLeft(config.timeLimit * 60);
  }, [config.timeLimit]);

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

const showNotFoundDialog = (msg) => {
  setDialogMessage(msg);
  setDialogMode("notFound");
  setOpenResultDialog(true);
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
    {/* ===== WRAPPER ===== */}
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

      {/* ================= LEFT: CONTENT ================= */}
      <Box
        sx={{
          flex: 1,              // ✅ chiếm phần còn lại
          minWidth: 0,          // ✅ QUAN TRỌNG: tránh bị tràn
          maxWidth: 1000,
        }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 3,
            minHeight: 650,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Nút thoát */}
          {/*<IconButton
            onClick={() => {
              if (submitted) navigate(-1);
              else setOpenExitConfirm(true);
            }}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "#f44336",
            }}
          >
            <CloseIcon />
          </IconButton>*/}

          {/* 🔘 Toggle sidebar */}
          {sidebarConfig && (
            <Tooltip title={showSidebar ? "Thu gọn bảng câu hỏi" : "Mở bảng câu hỏi"}>
              <IconButton
                onClick={() => setShowSidebar((prev) => !prev)}
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  bgcolor: "#e3f2fd",
                  border: "1px solid #90caf9",
                  "&:hover": {
                    bgcolor: "#bbdefb",
                  },
                  zIndex: 10,
                }}
              >
                {showSidebar ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>
            </Tooltip>
          )}

          {/* Thông tin HS */}
          <Box
            sx={{
              p: 1.5,
              border: "2px solid #1976d2",
              borderRadius: 2,
              color: "#1976d2",
              width: "fit-content",
              position: { xs: "relative", sm: "absolute" },
              top: { sm: 16 },
              left: { sm: 16 },
              bgcolor: "#fff",
            }}
          >
            <Typography fontWeight="bold">
              Tên: {capitalizeName(studentInfo.name)}
            </Typography>
            <Typography fontWeight="bold">
              Lớp: {studentInfo.className}
            </Typography>
          </Box>

          {/* Tiêu đề */}
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ color: "#1976d2", mb: { xs: 1, sm: -1 }, textAlign: "center" }}
          >
            {loading
              ? "TRẮC NGHIỆM"
              : config?.baiTapTuan
              ? "TRẮC NGHIỆM"
              : config?.kiemTraDinhKi && hocKiDisplay && monHocDisplay
              ? `KTĐK ${hocKiDisplay.toUpperCase()} - ${monHocDisplay.toUpperCase()}`
              : "TRẮC NGHIỆM"}
          </Typography>

          {/* Đồng hồ với vị trí cố định */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mt: 2,
              mb: -3,
              minHeight: 40, // giữ khoảng trống luôn
              width: "100%",
            }}
          >
            {/* Nội dung đồng hồ chỉ hiển thị khi started && !loading */}
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
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#d32f2f" }}>
                  {formatTime(timeLeft)}
                </Typography>
              </Box>
            )}

            {/* Đường gạch ngang luôn có (giữ layout như gốc) */}
            <Box
              sx={{
                width: "100%",
                height: 1,
                bgcolor: "#e0e0e0",
                mt: 0,
                mb: 3,
              }}
            />
          </Box>

          {/*<Divider sx={{ my: 2 }} />*/}

          {/* Loading */}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1, width: "100%" }}>
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

          {/* ===== ĐIỀU HƯỚNG ===== */}
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
                // ✅ HIỆN KHI SIDEBAR KHÔNG HIỂN THỊ (ẩn do toggle HOẶC do màn nhỏ)
                !isSidebarVisible && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={submitted || isEmptyQuestion}
                    sx={{
                      width: 150,
                      borderRadius: 1,
                    }}
                  >
                    Nộp bài
                  </Button>
                )
              )}
            </Stack>
          )}
        </Paper>
      </Box>

      {/* ================= RIGHT: SIDEBAR ================= */}
      {isSidebarVisible && (
        <Box
          sx={{
            width: sidebarConfig.width,
            flexShrink: 0,
          }}
        >
          <Card
            sx={{
              p: 2,
              borderRadius: 2,
              position: sidebarConfig.width === 260 ? "sticky" : "static",
              top: 24,
            }}
          >
            <Typography
              fontWeight="bold"
              textAlign="center"
              mb={2}
              fontSize="1.1rem"
              color="#0d47a1"
              sx={{
                userSelect: "none",        // ✅ CHẶN BÔI ĐEN
                cursor: "default",
              }}
            >
              Câu hỏi
            </Typography>

            <Divider sx={{ mt: -1, mb: 3, bgcolor: "#e0e0e0" }} />

            {/* ===== GRID Ô SỐ ===== */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${sidebarConfig.cols}, 1fr)`,
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

    {/* ===== DIALOGS (KHÔNG ĐƯỢC BỎ) ===== */}
    <IncompleteAnswersDialog
      open={openAlertDialog}
      onClose={() => setOpenAlertDialog(false)}
      unansweredQuestions={unansweredQuestions}
    />

    <ExitConfirmDialog
      open={openExitConfirm}
      onClose={() => setOpenExitConfirm(false)}
    />

    <ResultDialog
      open={openResultDialog}
      onClose={() => setOpenResultDialog(false)}
      dialogMode={dialogMode}
      dialogMessage={dialogMessage}
      studentResult={studentResult}
      choXemDiem={choXemDiem}
      configData={configData}
      convertPercentToScore={convertPercentToScore}
    />

    <ImageZoomDialog
      open={Boolean(zoomImage)}
      imageSrc={zoomImage}
      onClose={() => setZoomImage(null)}
    />

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

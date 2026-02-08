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
  InputLabel,
} from "@mui/material";
import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";
import { exportQuizPDF } from "../utils/exportQuizPDF"; 
import QuestionOption from "../utils/QuestionOption";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ImageZoomDialog from "../dialog/ImageZoomDialog";
import QuizQuestion from "../Types/questions/options/QuizQuestion";
import { buildRuntimeQuestions } from "../utils/buildRuntimeQuestions";
import { handleSubmitQuiz } from "../utils/submitQuiz";
import { autoSubmitQuiz } from "../utils/autoSubmitQuiz";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

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
  const [allExamList, setAllExamList] = useState([]);
  
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
  
  useEffect(() => {
    const fetchQuestions = async () => {
        try {
        setLoading(true);
        let prog = 0;

        let docId = null;
        //let collectionName = "NGANHANG_DE";
        let collectionName =
          examType === "kt" ? "NGANHANG_DE" : "BAITAP_TUAN";

        let hocKiFromConfig = "";
        let monHocFromConfig = "";
        let timeLimitMinutes = 0; // ⬅ để lưu thời gian
        
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        prog += 30;
        setProgress(prog);

        if (!configSnap.exists()) {
        setSnackbar({ open: true, message: "❌ Không tìm thấy config!", severity: "error" });
        setLoading(false);
        return;
        }

        const configData = configSnap.data();
        hocKiFromConfig = configData.hocKy || "";
        monHocFromConfig = configData.mon || "";
        timeLimitMinutes = configData.timeLimit ?? 0;   // ⬅ lấy timeLimit
        setTimeLimitMinutes(timeLimitMinutes);
        setChoXemDiem(configData.choXemDiem ?? false);
        setChoXemDapAn(configData.choXemDapAn ?? false);          

        // 🔹 Lấy docId theo đề được chọn từ dropdown (áp dụng cho mọi trường)
        if (!selectedExam) {
            //setSnackbar({ open: true, message: "Vui lòng chọn đề!", severity: "warning" });
            setLoading(false);
        return;
        }

        docId = selectedExam;

        // 🔹 Set thời gian làm bài (giây)
        setTimeLeft(timeLimitMinutes * 60);

        // 🔹 Lấy dữ liệu đề
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        prog += 30;
        setProgress(prog);

        /*if (!docSnap.exists()) {
            setSnackbar({ open: true, message: "❌ Không tìm thấy đề trắc nghiệm!", severity: "error" });
            setLoading(false);
            return;
        }*/

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
                next[q.id] = [...q.initialSortOrder]; // ✅ clone mảng
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

      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);

      const exams = snap.docs.map((d) => d.id);

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
      db: null,
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

return (
  <Box
    id="quiz-container"  // <-- Thêm dòng này
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
    <Paper
      sx={{
        p: { xs: 2, sm: 4 },
        borderRadius: 3,
        width: "100%",
        maxWidth: 1000,
        minWidth: { xs: "auto", sm: 600 },
        minHeight: { xs: "auto", sm: 650 }, // ⬅ tăng để đủ không gian
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxSizing: "border-box",
      }}
    >

      {/* Nút thoát */}
      <Tooltip title="Thoát trắc nghiệm" arrow>
        <IconButton
          onClick={() => {
            if (submitted) {
              navigate(-1);
            } else {
              setOpenExitConfirm(true);
            }
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
      </Tooltip>

      {/* Tiêu đề */}
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
            color: "#1976d2", // màu xanh
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

                // 👉 đổi sang KT thì reset lớp
                if (type === "bt") {
                  setSelectedClass("4");   // 👈 mặc định Lớp 4
                } else {
                  setSelectedClass("");    // KTĐK không dùng lớp
                }

              }}
            >
              <MenuItem value="bt">Bài tập tuần</MenuItem>
              <MenuItem value="kt">KTĐK</MenuItem>
            </Select>
          </FormControl>

          {/* ================= CHỌN LỚP (CHỈ HIỆN KHI BT) ================= */}
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

      {/* Đồng hồ với vị trí cố định */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 0.5,
          mb: 0,
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
              bgcolor: "#fff", // tùy chỉnh nếu muốn nền
            }}
          >
            <AccessTimeIcon sx={{ color: "#d32f2f" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#d32f2f" }}>
              {formatTime(timeLeft)}
            </Typography>
          </Box>
        )}

        {/* Đường gạch ngang màu xám nhạt luôn hiển thị */}
        <Box
          sx={{
            width: "100%",
            height: 1,
            bgcolor: "#e0e0e0", // màu xám nhạt
            mt: 0,
          }}
        />
      </Box>

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

      {/* Nút điều hướng và bắt đầu/nộp bài */}
      <Box sx={{ flexGrow: 1 }} />
      {started && !loading && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            position: "static",
            mt: 2,                     // cách option phía trên
            pt: 2,                     // ⬅⬅⬅ KHOẢNG CÁCH GIỮA GẠCH & NÚT
            mb: { xs: "20px", sm: "5px" },
            borderTop: "1px solid #e0e0e0",
          }}
        >

          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handlePrev}
            disabled={currentIndex === 0}
            sx={{
              width: { xs: "150px", sm: "150px" },
              bgcolor: currentIndex === 0 ? "#e0e0e0" : "#bbdefb",
              borderRadius: 1,
              color: "#0d47a1",
              "&:hover": { bgcolor: currentIndex === 0 ? "#e0e0e0" : "#90caf9" },
            }}
          >
            Câu trước
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              sx={{
                width: { xs: "150px", sm: "150px" },
                bgcolor: "#bbdefb",
                borderRadius: 1,
                color: "#0d47a1",
                "&:hover": { bgcolor: "#90caf9" },
              }}
            >
              Câu sau
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={submitted || isEmptyQuestion}
              sx={{ width: { xs: "120px", sm: "150px" }, borderRadius: 1 }}
            >
              Nộp bài
            </Button>
          )}
        </Stack>
      )}

    </Paper>

    {/* Dialog cảnh báo chưa làm hết */}
    <Dialog
      open={openAlertDialog}
      onClose={() => setOpenAlertDialog(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 0,
          bgcolor: "#e3f2fd",
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      {/* Header với nền màu full width */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 0.75, // chiều cao header
          bgcolor: "#90caf9", // nền màu xanh nhạt
          borderRadius: "12px 12px 0 0", // bo 2 góc trên
          mb: 2,
        }}
      >
        <Box
          sx={{
            bgcolor: "#42a5f5", // xanh đậm cho icon
            color: "#fff",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1.5,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          ⚠️
        </Box>

        <DialogTitle
          sx={{
            p: 0,
            fontWeight: "bold",
            color: "#0d47a1", // màu xanh tiêu đề
            fontSize: 20,
          }}
        >
          Chưa hoàn thành
        </DialogTitle>
      </Box>

      {/* Nội dung */}
      <DialogContent sx={{ px: 3, pb: 3 }}>
        <Typography sx={{ fontSize: 16, color: "#0d47a1" }}>
          Bạn chưa chọn đáp án cho câu: {unansweredQuestions.join(", ")}.<br />
          Vui lòng trả lời tất cả câu hỏi trước khi nộp.
        </Typography>
      </DialogContent>

      {/* Nút OK */}
      <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setOpenAlertDialog(false)}
          sx={{
            px: 4,
            borderRadius: 2,
            bgcolor: "#42a5f5", // xanh đậm giống mẫu
            color: "#fff",
            "&:hover": { bgcolor: "#1e88e5" },
            fontWeight: "bold",
            mb:2,
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>

    {/* Dialog xác nhận thoát */}
    <ExitConfirmDialog
      open={openExitConfirm}
      onClose={() => setOpenExitConfirm(false)}
    />

    <Dialog
      open={openResultDialog}
      onClose={(event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        setOpenResultDialog(false);
      }}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 0,
          bgcolor: "#e3f2fd",
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >

      {/* Header với nền màu full width */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 0.75,
          bgcolor: "#90caf9",
          borderRadius: "12px 12px 0 0", // bo 2 góc trên
          mb: 2,
        }}
      >
        <Box
          sx={{
            bgcolor: "#42a5f5",
            color: "#fff",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1.5,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          🎉
        </Box>

        <DialogTitle
          sx={{
            p: 0,
            fontWeight: "bold",
            color: "#0d47a1",
            fontSize: 20,
          }}
        >
          Kết quả
        </DialogTitle>
      </Box>

      {/* Nội dung */}
      <DialogContent sx={{ textAlign: "center", px: 3, pb: 3 }}>
        <Typography
          sx={{ fontSize: 18, fontWeight: "bold", color: "#0d47a1", mb: 1 }}
        >
          {studentResult?.hoVaTen?.toUpperCase()}
        </Typography>

        <Typography sx={{ fontSize: 17, color: "#1565c0", mb: 1 }}>
          <strong>Lớp: </strong>
          <span style={{ fontWeight: "bold" }}>{studentResult?.lop}</span>
        </Typography>

        {/* Nếu cho xem điểm */}
        {choXemDiem ? (
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 700,
              mt: 1,
            }}
          >
            <span style={{ color: "#1565c0" }}>Điểm:</span>&nbsp;
            <span style={{ color: "red" }}>{studentResult?.diem}</span>
          </Typography>
        ) : (
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 700,
              color: "red",
              mt: 2,
              textAlign: "center",
            }}
          >
            ĐÃ HOÀN THÀNH BÀI KIỂM TRA
          </Typography>
        )}
      </DialogContent>

      {/* Nút OK */}
      <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setOpenResultDialog(false)}
          sx={{
            px: 4,
            borderRadius: 2,
            bgcolor: "#42a5f5",
            color: "#fff",
            "&:hover": { bgcolor: "#1e88e5" },
            fontWeight: "bold",
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>

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

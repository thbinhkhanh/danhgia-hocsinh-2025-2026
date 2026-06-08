import React, { useState, useEffect, useContext } from "react";

// ===== MUI =====
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { useTheme, useMediaQuery } from "@mui/material";

// ===== Firebase =====
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// ===== Context =====
import { ConfigContext } from "../context/ConfigContext";

// ===== Router =====
import { useLocation, useNavigate } from "react-router-dom";

// ===== Icons =====
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

// ===== Dialogs =====
import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ImageZoomDialog from "../dialog/ImageZoomDialog";
import IncompleteAnswersDialog from "../dialog/IncompleteAnswersDialog";
import ResultDialog from "../dialog/ResultDialog";

// ===== Quiz Components =====
import QuizQuestion from "../Types/questions/options/QuizQuestion";
import QuizSidebar from "../components/quiz/QuizSidebar";
import QuizNavigation from "../components/quiz/QuizNavigation";
import QuizLoading from "../components/quiz/QuizLoading";

// ===== Utils =====
import { buildRuntimeQuestions } from "../utils/buildRuntimeQuestions";
import { handleSubmitQuiz } from "../utils/submitQuiz";
import { autoSubmitQuiz } from "../utils/autoSubmitQuiz";
import { getQuestionStatus } from "../utils/questionStatus";
import { processQuestions } from "../utils/processQuestions";
import { useQuizTimer } from "../utils/useQuizTimer";

//import { jsPDF } from "jspdf";
//import html2canvas from "html2canvas";

export default function TracNghiem_OnTap() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizClass, setQuizClass] = useState("");

  // ===== UI dialogs =====
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [openExitConfirm, setOpenExitConfirm] = useState(false);
  const [openResultDialog, setOpenResultDialog] = useState(false);

  // ===== loading / progress =====
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false); 

  // ===== config context =====
  const { config } = useContext(ConfigContext);
  const [selectedYear, setSelectedYear] = useState(
    config?.namHoc || "2025-2026"
  );
  const [hocKi, setHocKi] = useState(config?.hocKy || "Cuối kỳ I");
  const displayHocKi = hocKi === "Cả năm" ? "Cuối năm" : hocKi;

  // ===== quiz settings =====
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
  const [monHoc, setMonHoc] = useState("");
  const [choXemDiem, setChoXemDiem] = useState(false);
  const [choXemDapAn, setChoXemDapAn] = useState(false);

  // ===== result =====
  const [studentResult, setStudentResult] = useState(null);

  // ===== navigation / UI state =====
  const [started, setStarted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [zoomImage, setZoomImage] = useState(null);

  // ===== router =====
  const location = useLocation();
  const navigate = useNavigate();

  // ===== derived data =====
  const studentName = location.state?.fullname || "";
  const studentClass = location.state?.lop || "";

  // ===== responsive =====
  const theme = useTheme();
  const isBelow1024 = useMediaQuery("(max-width:1023px)");

  useEffect(() => {
    if (location.state?.autoStart) {
      setStarted(true);
    }
  }, [location.state]);

  const handleMatchSelect = (questionId, leftIndex, rightIndex) => {
    setAnswers(prev => {
      const prevAns = prev[questionId] ?? [];
      const newAns = [...prevAns];
      newAns[leftIndex] = rightIndex;
      return { ...prev, [questionId]: newAns };
    });
  };
  
  const buildExamId = (state = {}, config = {}) => {
    const normalize = (str = "") =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    // Lớp: lấy số
    const lop = String(state.lop || config.lop || "")
      .match(/\d+/)?.[0];

    // Môn: giữ nguyên tiếng Việt (KHÔNG remove dấu để khớp Firestore)
    const mon = (state.mon || config.mon || "").trim();

    const hocKyMap = {
      "giua ky i": "GKI",
      "cuoi ky i": "CKI",
      "giua ky ii": "GKII",
      "cuoi nam": "CN",
    };

    const hocKy =
      hocKyMap[normalize(state.hocKy || config.hocKy || "")] ||
      state.hocKy ||
      config.hocKy;

    const rawYear = state.namHoc || config.namHoc || "";
    const namHoc =
      rawYear && rawYear.length >= 9
        ? rawYear.slice(2, 4) + "-" + rawYear.slice(7, 9)
        : rawYear;

    if (!lop || !mon || !hocKy || !namHoc) return null;

    return `quiz_Lớp ${lop}_${mon}_${hocKy}_${namHoc}`;
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setProgress(0);

        const configSnap = await getDoc(doc(db, "CONFIG", "config"));
        if (!configSnap.exists()) {
          setLoading(false);
          return;
        }

        const configData = configSnap.data();

        setTimeLimitMinutes(configData.timeLimit ?? 0);
        setChoXemDiem(configData.choXemDiem ?? false);
        setChoXemDapAn(configData.choXemDapAn ?? false);

        setProgress(30);

        // ===== BUILD DIRECT EXAM ID =====
        const examId = buildExamId(location.state, config);

        if (!examId) {
          setSnackbar({
            open: true,
            message: "❌ Thiếu thông tin để xác định đề ôn tập",
            severity: "error",
          });
          setLoading(false);
          return;
        }

        setProgress(60);

        const docSnap = await getDoc(doc(db, "DE_ONTAP", examId));

        if (!docSnap.exists()) {
          setSnackbar({
            open: true,
            message: "❌ Không tìm thấy đề ôn tập phù hợp",
            severity: "error",
          });
          setLoading(false);
          return;
        }

        const data = docSnap.data();

        setQuizClass(data.class || "");
        setHocKi(data.semester || configData.hocKy || "");
        setMonHoc(data.subject || configData.mon || "");

        window.currentHocKi = data.semester;
        window.currentMonHoc = data.subject;

        setProgress(90);

        processQuestions({
          data,
          buildRuntimeQuestions,
          setQuestions,
          setStarted,
          setProgress,
          setAnswers,
        });

        setProgress(100);
      } catch (err) {
        console.error(err);
        setSnackbar({
          open: true,
          message: "❌ Lỗi khi tải đề",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const normalizeExam = (state = {}, config = {}) => {
  const normalize = (str = "") =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const mon = normalize(state.mon || config.mon || "").replace(/\s+/g, "_");

  const lop = String(state.lop || config.lop || "")
    .match(/\d+/)?.[0] || "";

  const hocKyMap = {
    "giua ky i": "GKI",
    "cuoi ky i": "CKI",
    "giua ky ii": "GKII",
    "cuoi nam": "CN",
  };

  const hocKy =
    hocKyMap[normalize(state.hocKy || config.hocKy || "")] ||
    (state.hocKy || config.hocKy || "");

  const rawYear = state.namHoc || config.namHoc || "";
  const namHoc =
    rawYear && rawYear.length >= 9
      ? rawYear.slice(2, 4) + "-" + rawYear.slice(7, 9)
      : "";

  const result = { mon, lop, hocKy, namHoc };

  return result;
};

  const parseOntapExamId = (id = "") => {
    const match = id.match(
      /^ontap_(.+)_(\d+)_-_(GKI|CKI|GKII|CN)_(\d{2}-\d{2})$/i
    );

    if (!match) return null;

    return {
      mon: match[1],
      lop: normalizeClass(match[2]), // 👈 quan trọng
      hocKy: match[3],
      namHoc: match[4],
    };
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
  
    // Đồng bộ thời gian
  const {
    timeLeft,
    setTimeLeft,
    startTime,
    formatTime,
  } = useQuizTimer({
    started,
    submitted,
    initialTime: timeLimitMinutes * 60,
    onTimeUp: autoSubmit,
    resetKey: buildExamId(location.state, config),
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
      display: "flex",
      justifyContent: "center",
    }}
  >
    {/* ================= WRAPPER ================= */}
    <Box
      sx={{
        display: "flex",
        width: "100%",
        maxWidth: isSidebarVisible ? 1280 : 1000,
        gap: 2,
        alignItems: "flex-start",
      }}
    >

      {/* ================= MAIN PAPER ================= */}
      <Paper
        sx={{
          p: 0,
          borderRadius: 3,
          width: "100%",
          minHeight: { xs: "auto", sm: 650 },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >

        {/* ================= HEADER XANH ================= */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            background: "#1976d2",
            color: "#fff",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* LEFT */}
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
                {hoVaTen}               
              </Typography>
              <Typography sx={{ fontSize: 13, opacity: 0.9 }}>
                Lớp: {studentClass}
              </Typography>
          </Box>

          {/* CENTER */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            {/*<Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              ÔN TẬP {(monHoc || "MÔN HỌC").toUpperCase()}
            </Typography>

            <Typography sx={{ fontSize: 15, opacity: 0.9 }}>
              {displayHocKi
                ? `${displayHocKi} - ${config?.namHoc || ""}`
                : "HỌC KỲ"}
            </Typography>*/}
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              ÔN TẬP - {(displayHocKi || "CUỐI NĂM").toUpperCase()}
            </Typography>

            <Typography sx={{ fontSize: 15, opacity: 0.9 }}>
              Môn: {(monHoc || "TIN HỌC").toUpperCase()}
            </Typography>
          </Box>

          {/* RIGHT */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 1,
            }}
          >
            {started && !loading && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 0.6,
                  borderRadius: 2,
                  bgcolor: "#fff",
                  color: "#d32f2f",
                  fontWeight: 800,
                  minWidth: 90,
                  justifyContent: "center",
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 20 }} />
                {formatTime(timeLeft)}
              </Box>
            )}

            {hasSidebar && (
              <IconButton
                onClick={() => setShowSidebar((p) => !p)}
                sx={{
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.15)",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.25)",
                  },
                }}
              >
                {showSidebar ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* ================= BODY ================= */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >

          {/* Loading */}
          <QuizLoading loading={loading} progress={progress} />

          {/* Question */}
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

          {/* NAVIGATION */}
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
        </Box>
      </Paper>

      {/* ================= SIDEBAR ================= */}
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
          choXemDiem={choXemDiem}
          choXemDapAn={choXemDapAn}
        />
      )}
    </Box>

    {/* ================= DIALOGS ================= */}
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
      dialogMode={null}
      dialogMessage=""
      studentResult={studentResult}
      choXemDiem={choXemDiem}
      configData={config}
      convertPercentToScore={convertPercentToScore}
    />

    <ImageZoomDialog
      open={Boolean(zoomImage)}
      imageSrc={zoomImage}
      onClose={() => setZoomImage(null)}
    />

    {/* ================= SNACKBAR ================= */}
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

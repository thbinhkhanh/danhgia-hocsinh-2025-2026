// ================= REACT =================
import React, { useState, useEffect, useContext, useRef } from "react";

// ================= MUI =================
import {
  Box,
  Paper,
  Stack,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// ================= FIREBASE =================
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";

// ================= CONTEXT =================
import { ConfigContext } from "../context/ConfigContext";

// ================= ROUTER =================
import { useLocation, useNavigate } from "react-router-dom";

// ================= UTILS =================
import { exportQuizPDF } from "../utils/exportQuizPDF";
import { handleSubmitQuiz } from "../utils/submitQuiz";
import { autoSubmitQuiz } from "../utils/autoSubmitQuiz";
import { buildRuntimeQuestions } from "../utils/buildRuntimeQuestions";
import { processQuestions } from "../utils/processQuestions";
import { getQuizDocId } from "../utils/getQuizDocId";
import { useQuizTimer } from "../utils/useQuizTimer";

// ================= COMPONENTS =================
import QuizHeader from "../components/quiz/QuizHeader";
import QuizSidebar from "../components/quiz/QuizSidebar";
import QuizNavigation from "../components/quiz/QuizNavigation";
import QuizLoading from "../components/quiz/QuizLoading";
import QuizQuestion from "../Types/questions/options/QuizQuestion";

// ================= DIALOGS =================
import ImageZoomDialog from "../dialog/ImageZoomDialog";
import IncompleteAnswersDialog from "../dialog/IncompleteAnswersDialog";
import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ResultDialog from "../dialog/ResultDialog";

export default function TracNghiem() {
  // ================= QUIZ STATE =================
const [questions, setQuestions] = useState([]);
const [answers, setAnswers] = useState({});
const [submitted, setSubmitted] = useState(false);
const [currentIndex, setCurrentIndex] = useState(0);
const [quizClass, setQuizClass] = useState("");
const [score, setScore] = useState(0);
const answersRef = useRef({});

// ================= UI STATE =================
const [openAlertDialog, setOpenAlertDialog] = useState(false);
const [dialogMode, setDialogMode] = useState("");
const [unansweredQuestions, setUnansweredQuestions] = useState([]);
const [openExitConfirm, setOpenExitConfirm] = useState(false);
const [openResultDialog, setOpenResultDialog] = useState(false);
const [zoomImage, setZoomImage] = useState(null);
const [dialogMessage, setDialogMessage] = useState("");
const [notFoundMessage, setNotFoundMessage] = useState("");

// ================= LOADING / PROCESS =================
const [loading, setLoading] = useState(true);
const [progress, setProgress] = useState(0);
const [saving, setSaving] = useState(false);

// ================= CONFIG =================
const { config } = useContext(ConfigContext);
const [configData, setConfigData] = useState(null);
const [hocKi, setHocKi] = useState("");
const [monHoc, setMonHoc] = useState("");
const [choXemDiem, setChoXemDiem] = useState(false);
const [choXemDapAn, setChoXemDapAn] = useState(false);
const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
const [selectedExamType, setSelectedExamType] = useState("Giữa kỳ I"); // mặc định
const reviewMode = submitted && choXemDapAn;

// ================= ROUTER =================
const location = useLocation();
const navigate = useNavigate();
const locationState = location.state || {};

// ================= USER STATE =================
const [studentId, setStudentId] = useState(locationState.studentId || "HS001");
const [fullname, setFullname] = useState(locationState.fullname || "Test");
const [lop, setLop] = useState(locationState.lop || "4.1");
const [selectedWeek, setSelectedWeek] = useState(locationState.selectedWeek || 13);
const [mon, setMon] = useState(locationState.mon || "Tin học");
const [studentResult, setStudentResult] = useState(null);

// derived user info
const studentInfo = {
  id: studentId,
  name: fullname,
  className: lop,
  selectedWeek: selectedWeek || 1,
  mon: mon || config.mon || "Tin học",
};

const studentClass = studentInfo.className;
const studentName = studentInfo.name;

// ================= THEME =================
const theme = useTheme();
const isBelow1024 = useMediaQuery("(max-width:1023px)");
const [showSidebar, setShowSidebar] = useState(true);

// ================= CONTROL =================
const [started, setStarted] = useState(false);

// ================= DISPLAY =================
const hocKiDisplay = config?.hocKy || "Cuối kỳ I";
const monHocDisplay = studentInfo.mon || config?.mon || "Tin học";

// ================= IMPORTANT NOTE =================
// giữ nguyên phần này của bạn:
const [fillBlankStatus, setFillBlankStatus] = useState({});

// Kiểm tra dữ liệu học sinh
if (!studentInfo.id || !studentInfo.name || !studentClass) {
  console.warn("❌ Thiếu dữ liệu học sinh, quay lại danh sách");
  navigate("/hoc-sinh"); // quay lại trang danh sách
}

  const handleMatchSelect = (questionId, leftIndex, rightIndex) => {
    setAnswers(prev => {
      const prevAns = prev[questionId] ?? [];
      const newAns = [...prevAns];
      newAns[leftIndex] = rightIndex;
      return { ...prev, [questionId]: newAns };
    });
  };

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const showNotFoundDialog = (msg) => {
    setDialogMessage(msg);
    setDialogMode("notFound");
    setOpenResultDialog(true);
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setProgress(0);

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

        const configData = configSnap.data();
        setConfigData(configData);

        const hocKiFromConfig = configData.hocKy || "";
        const monHocFromConfig = configData.mon || "";
        const timeLimitMinutes = configData.timeLimit ?? 0;

        setTimeLimitMinutes(timeLimitMinutes);
        setChoXemDiem(configData.choXemDiem ?? false);
        setChoXemDapAn(configData.choXemDapAn ?? false);

        setProgress(30);

        // ===== CLASS =====
        const classNumber = studentInfo.className.match(/\d+/)?.[0];
        if (!classNumber) {
          setSnackbar({
            open: true,
            message: "❌ Không xác định được lớp!",
            severity: "error",
          });
          return;
        }

        const classLabel = `Lớp ${classNumber}`;

        // ===== LẤY DOC ID  =====
        const result = await getQuizDocId({
          db,
          configData,
          classLabel,
          hocKiFromConfig,
          monHocFromConfig,
          studentInfo,
          setNotFoundMessage,
        });

        if (!result) return;

        const { docId, collectionName } = result;

        // ===== LOAD ĐỀ =====
        setTimeLeft(timeLimitMinutes * 60);

        const docSnap = await getDoc(doc(db, collectionName, docId));
        if (!docSnap.exists()) {
          setSnackbar({
            open: true,
            message: "❌ Không tìm thấy đề!",
            severity: "error",
          });
          return;
        }

        setProgress(60);

        const data = docSnap.data();

        setQuizClass(data.class || "");
        setHocKi(data.semester || hocKiFromConfig);
        setMonHoc(data.subject || monHocFromConfig);

        window.currentHocKi = data.semester || hocKiFromConfig;
        window.currentMonHoc = data.subject || monHocFromConfig;
        
        // ===== QUESTIONS =====
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
      case "Cuối năm": return "CN";
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
        answers: answersRef.current,
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
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >

            {/* LEFT: STUDENT */}
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
                {capitalizeName(studentInfo?.name || "Học sinh")}
              </Typography>
              <Typography sx={{ fontSize: 15, opacity: 0.9 }}>
                Lớp: {studentInfo?.className || "4A"}
              </Typography>
            </Box>

            {/* CENTER: THÔNG TIN MÔN + KỲ */}
            {/*<Box sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                KIỂM TRA ĐỊNH KÌ - {(monHocDisplay || "MÔN HỌC").toUpperCase()}
              </Typography>

              <Typography sx={{ fontSize: 15, opacity: 0.9 }}>
                {hocKiDisplay
                  ? `${hocKiDisplay} - ${config?.namHoc || ""}`
                  : "HỌC KỲ"}
              </Typography>
            </Box>*/}
            <Box sx={{ textAlign: "center" }}>
              {config?.kiemTraDinhKi ? (
                <>
                  <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                    KTĐK - {(hocKiDisplay || "CUỐI NĂM").toUpperCase()}
                  </Typography>

                  <Typography sx={{ fontSize: 15, opacity: 0.9 }}>
                    Môn: {(monHocDisplay || "TIN HỌC").toUpperCase()}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                    BÀI TẬP TUẦN {selectedWeek}
                  </Typography>

                  <Typography sx={{ fontSize: 15, opacity: 0.9 }}>
                    Môn: {(monHocDisplay || "TIN HỌC").toUpperCase()}
                  </Typography>
                </>
              )}
            </Box>

            {/* RIGHT: TIMER + SIDEBAR */}
            <Stack direction="row" spacing={1} alignItems="center">

              {/* TIMER */}
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

              {/* SIDEBAR TOGGLE */}
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
                  {showSidebar ? (
                    <ChevronLeftIcon />
                  ) : (
                    <ChevronRightIcon />
                  )}
                </IconButton>
              )}
            </Stack>

          </Stack>
        </Box>

        {/* ================= CONTENT ================= */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >

          {/* LOADING */}
          <QuizLoading loading={loading} progress={progress} />

          {/* QUESTION */}
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
          reviewMode={reviewMode}
          handleSubmit={handleSubmit}
          navigate={navigate}
          setOpenExitConfirm={setOpenExitConfirm}
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
  </Box>
);

}

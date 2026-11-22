
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
} from "@mui/material";

import SendIcon from "@mui/icons-material/Send";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { useLocation } from "react-router-dom";

import confetti from "canvas-confetti";
import QuizLoading from "../components/quiz/QuizLoading";
import QuizQuestion from "../Types/questions/options/QuizQuestion";
import ImageZoomDialog from "../dialog/ImageZoomDialog";
import { processQuestions } from "../utils/processQuestions";
import PersonIcon from "@mui/icons-material/Person";
import SchoolIcon from "@mui/icons-material/School";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { buildRuntimeQuestions } from "../utils/buildRuntimeQuestions";
import { handleSubmitQuizPHT } from "../utils/submitQuizPHT";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

export default function PhieuHocTap() {
  // ================= ROUTER =================
  const location = useLocation();
  const locationState = location.state || {};

  // ================= QUIZ STATE =================
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  // ================= UI STATE =================
  const [zoomImage, setZoomImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [studentResult, setStudentResult] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [notFoundMessage, setNotFoundMessage] = useState("");

  const [choXemDiem, setChoXemDiem] = useState(false);
  const [choXemDapAn, setChoXemDapAn] = useState(false);

  const reviewMode = submitted && choXemDapAn;

  const [configData, setConfigData] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [subject, setSubject] = useState("Tin học");

  const [startTime, setStartTime] = useState(null);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

    // Ghi nhận thời điểm bắt đầu
useEffect(() => {
  if (started && !startTime) {
    setStartTime(Date.now());
  }
}, [started, startTime]);

// Đồng hồ đếm ngược
useEffect(() => {
  if (!started || submitted || !startTime) return;

  const timer = setInterval(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(timer);
        return 0;
      }

      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [started, submitted, startTime]);

  const [sourceInfo, setSourceInfo] = useState({
    collectionName: "",
    docId: "",
  });

  // ================= WORKSHEET CONFIG =================
  const [worksheetInfo, setWorksheetInfo] = useState({
    title: "PHIẾU HỌC TẬP TRỰC TUYẾN",
    lessonTitle: "",
    subtitle: "(Tích hợp năng lực số)",
    sectionTitle: "BÀI TẬP TRẮC NGHIỆM",
  });

  // ================= STUDENT STATE =================
  const [studentList, setStudentList] = useState([]);

  const [fullname, setFullname] = useState(
    locationState.fullname || locationState.studentName || ""
  );

  const [studentClass, setStudentClass] = useState(
    locationState.lop ||
    locationState.selectedClass ||
    locationState.className ||
    ""
  );

  const [studentId, setStudentId] = useState(
    locationState.studentId || ""
  );

  const [selectedStudent, setSelectedStudent] = useState(
    locationState.fullname || locationState.studentName || ""
  );

  const studentInfo = {
    id: studentId,
    name: selectedStudent || fullname,
    className: studentClass,
    selectedWeek: selectedWeek || 1,
    mon: subject || configData?.mon || "Tin học",
  };

  const resultRef = useRef(null);

  // ================= DATE =================
  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  // ================= HELPERS =================
  const handleSingleSelect = (questionId, optionKey) => {
    if (submitted) return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const handleMultipleSelect = (questionId, optionIndex, checked) => {
    if (submitted) return;

    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId])
        ? prev[questionId]
        : [];

      const next = checked
        ? Array.from(new Set([...current, optionIndex]))
        : current.filter((item) => item !== optionIndex);

      return {
        ...prev,
        [questionId]: next,
      };
    });
  };

  const reorder = (list, startIndex, endIndex) => {
    const result = [...list];
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const handleDragEnd = (result, questionId) => {
    if (!result.destination || submitted || !started) return;

    const currentOrder =
      answers[questionId] ??
      questions.find((q) => q.id === questionId)?.options.map((_, i) => i) ??
      [];

    const newOrder = reorder(
      currentOrder,
      result.source.index,
      result.destination.index
    );

    setAnswers((prev) => ({
      ...prev,
      [questionId]: newOrder,
    }));
  };

  const normalizeValue = (value) =>
    typeof value === "object"
      ? value?.text || ""
      : String(value ?? "");

  const ratio = {
    left: 1,
    right: 1,
  };

  // ================= TÍNH ĐIỂM =================
  const getQuestionMax = (question) => {
    if (typeof question.scoreTotal === "number") {
      return question.scoreTotal;
    }

    if (typeof question.perItemScore === "number") {
      const subCount =
        question.type === "truefalse"
          ? Array.isArray(question.correct)
            ? question.correct.length
            : 0
          : question.type === "fillblank"
            ? Array.isArray(question.options)
              ? question.options.length
              : 0
            : question.type === "matching"
              ? Array.isArray(question.correct)
                ? question.correct.length
                : 0
              : question.type === "sort"
                ? Array.isArray(question.correctTexts)
                  ? question.correctTexts.length
                  : 0
                : 1;

      return question.perItemScore * subCount;
    }

    return Number(question.score ?? question.points ?? 1) || 1;
  };

  const maxTotalScore = questions.reduce(
    (sum, question) => sum + getQuestionMax(question),
    0
  );

const formatElapsedTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

  // ================= FETCH FIRESTORE DATA =================
  useEffect(() => {
    let isMounted = true;

    const fetchWorksheetData = async () => {
      try {
        setLoading(true);
        setProgress(0);
        setErrorMsg("");
        setNotFoundMessage("");

        // ===== CONFIG =====
        const configSnap = await getDoc(
          doc(db, "CONFIG", "config")
        );

        if (!configSnap.exists()) {
          throw new Error("Không tìm thấy CONFIG/config!");
        }

        const configData = configSnap.data();
        setConfigData(configData);
        setTimeLeft((Number(configData.timeLimit) || 10) * 60);


        const namHoc = configData.namHoc;
        const hocKiFromConfig = configData.hocKy || "";
        const monHocFromConfig = configData.mon || "";

        // ===== QUYỀN XEM ĐIỂM VÀ ĐÁP ÁN =====
        setChoXemDiem(configData.choXemDiem ?? false);
        setChoXemDapAn(configData.choXemDapAn ?? false);

        // ===== LẤY ID ĐỀ ĐÃ CHỌN GIỐNG TracNghiemGV =====
        const docId = configData.deTracNghiem;

        if (!docId) {
          throw new Error(
            "Không tìm thấy mã đề trong CONFIG/config.deTracNghiem!"
          );
        }

        // Phiếu học tập được lưu trong collection PHIEUHOCTAP
        const collectionName = "PHIEUHOCTAP";

        setProgress(20);

        // ===== TUẦN =====
        const weekNumber =
          Number(
            locationState.selectedWeek ??
            locationState.week ??
            locationState.weekValue ??
            locationState.tuan ??
            locationState.deTuan ??
            1
          );

        setSelectedWeek(weekNumber);

        // ===== THÔNG TIN LỚP HỌC SINH =====
        const classToUse =
          locationState.lop ||
          locationState.selectedClass ||
          locationState.className ||
          studentClass ||
          "";

        // ===== MÔN HỌC =====
        const subjectToUse =
          locationState.mon ||
          locationState.selectedSubject ||
          locationState.subject ||
          monHocFromConfig ||
          "Tin học";

        setSubject(subjectToUse);

        // ===== THÔNG TIN HỌC SINH =====
        const studentInfo = {
          id: studentId || locationState.studentId || "HS001",
          name:
            fullname ||
            locationState.fullname ||
            locationState.studentName ||
            "Test",
          className: classToUse,
          selectedWeek: weekNumber,
          mon: subjectToUse,
        };

        setProgress(45);

        // ===== LOAD ĐỀ THEO DOCUMENT ID TRONG CONFIG =====
        const docSnap = await getDoc(
          doc(db, collectionName, docId)
        );

        if (!docSnap.exists()) {
          throw new Error(
            `Không tìm thấy phiếu học tập!\n` +
            `Collection: ${collectionName}\n` +
            `Document ID: ${docId}`
          );
        }

        if (!isMounted) return;

        const data = docSnap.data();

        setSourceInfo({
          collectionName,
          docId,
        });

        setProgress(65);

        // ===== THÔNG TIN HIỂN THỊ =====
        const weekToDisplay = data.week ?? selectedWeek;

        const examTitle = `PHIẾU HỌC TẬP`;

        setWorksheetInfo({
          title: examTitle,
          lessonTitle:
            data.lessonName ||
            data.title ||
            data.lessonTitle ||
            data.subject ||
            subjectToUse,
          subtitle:
            data.subtitle ||
            (data.week
              ? `Tuần ${data.week}`
              : `Năm học ${namHoc || ""}`),
          sectionTitle:
            data.sectionTitle || "BÀI TẬP TRẮC NGHIỆM",
        });

        // ===== XỬ LÝ CÂU HỎI =====
        processQuestions({
          data,
          buildRuntimeQuestions,
          setQuestions,
          setStarted,
          setProgress,
          setAnswers,
        });

        // ===== CẬP NHẬT LỚP =====
        setStudentClass(classToUse || data.class || "");

        // ===== TẢI DANH SÁCH HỌC SINH =====
        if (
          classToUse &&
          !(
            fullname ||
            locationState.fullname ||
            locationState.studentName
          )
        ) {
          const studentsQuery = query(
            collection(db, "hoc_sinh"),
            where("lop", "==", classToUse)
          );

          const studentsSnap = await getDocs(studentsQuery);

          if (!isMounted) return;

          const list = studentsSnap.docs.map((studentDoc) => ({
            id: studentDoc.id,
            ...studentDoc.data(),
          }));

          setStudentList(list);
        }

        setProgress(100);
      } catch (error) {
        console.error(
          "Lỗi khi tải đề phiếu học tập từ Firestore:",
          error
        );

        if (isMounted) {
          setQuestions([]);
          setErrorMsg(
            error.message || "Không tải được đề từ Firestore."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWorksheetData();

    return () => {
      isMounted = false;
    };
  }, []);

  const mapHocKyToDocKey = (hocKy) => {
    switch (hocKy) {
      case "Giữa kỳ I":
        return "GKI";
      case "Cuối kỳ I":
        return "CKI";
      case "Giữa kỳ II":
        return "GKII";
      case "Cuối kỳ II":
        return "CN";
      default:
        return hocKy;
    }
  };

  const capitalizeName = (name) => {
    return String(name || "").trim().replace(/\s+/g, " ");
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // ================= SUBMIT & GRADE =================
  // ================= SUBMIT PHIẾU HỌC TẬP =================
  const handleSubmit = async () => {
    // Tính thời gian làm bài
    const totalTime = (Number(configData?.timeLimit) || 10) * 60;
    const elapsedSeconds = Math.max(0, totalTime - timeLeft);
    const durationStr = formatElapsedTime(elapsedSeconds);
    if (!selectedStudent || !studentClass || !studentId) {
      setErrorMsg(
        "Thiếu thông tin học sinh. Vui lòng kiểm tra họ tên, lớp và mã học sinh!"
      );
      return;
    }

    if (!questions.length) {
      setErrorMsg("Không có câu hỏi để nộp!");
      return;
    }

    setErrorMsg("");

    // Tính điểm để hiển thị kết quả trên giao diện
    let totalScore = 0;

    questions.forEach((question) => {
      const answer = answers[question.id];
      const correct = question.correct;

      if (answer === undefined || answer === null) return;

      let isCorrect = false;

      switch (question.type) {
        case "single": {
          const selected = Array.isArray(answer) ? answer[0] : answer;

          isCorrect = Array.isArray(correct)
            ? correct.includes(Number(selected))
            : Number(correct) === Number(selected);
          break;
        }

        case "multiple":
        case "image": {
          const selected = Array.isArray(answer)
            ? answer.map(Number)
            : [Number(answer)];

          const expected = Array.isArray(correct)
            ? correct.map(Number)
            : [Number(correct)];

          isCorrect =
            selected.length === expected.length &&
            selected.every((value) => expected.includes(value));
          break;
        }

        case "matching": {
          isCorrect =
            Array.isArray(answer) &&
            Array.isArray(correct) &&
            answer.length === correct.length &&
            answer.every(
              (value, index) => Number(value) === Number(correct[index])
            );
          break;
        }

        case "truefalse": {
          isCorrect =
            Array.isArray(answer) &&
            Array.isArray(correct) &&
            answer.length === correct.length &&
            answer.every((value, index) => {
              const originalIndex = question.initialOrder?.[index] ?? index;
              return value === correct[originalIndex];
            });
          break;
        }

        case "sort": {
          isCorrect =
            Array.isArray(answer) &&
            Array.isArray(question.options) &&
            Array.isArray(question.correctTexts) &&
            answer.length === question.correctTexts.length &&
            answer.every(
              (optionIndex, index) =>
                question.options[optionIndex] === question.correctTexts[index]
            );
          break;
        }

        case "fillblank": {
          const correctAnswers = Array.isArray(question.options)
            ? question.options
            : [];

          isCorrect =
            Array.isArray(answer) &&
            answer.length === correctAnswers.length &&
            correctAnswers.every((item, index) => {
              const correctText =
                typeof item === "object" ? item?.text : item;

              return (
                String(answer[index] ?? "").trim().toLowerCase() ===
                String(correctText ?? "").trim().toLowerCase()
              );
            });
          break;
        }

        default:
          break;
      }

      if (isCorrect) {
        totalScore += getQuestionMax(question);
      }
    });

    // 1. Hiển thị kết quả ngay lập tức
    setScore(totalScore);
    setSubmitted(true);

    // 2. Bật trạng thái đang lưu
    setSaving(true);

    // 3. Lưu Firestore chạy nền, không chờ
    handleSubmitQuizPHT({
      studentName: selectedStudent,
      studentClass,
      studentId,
      studentInfo,
      totalScore,
      maxTotalScore,

      questions,
      answers,

      db,
      config: configData,
      configData,
      selectedWeek,
      startTime,
      durationStr, // Thêm dòng này

      setStudentResult,
      setSnackbar,
      setSaving,
      setSubmitted,
      setOpenAlertDialog,
      setUnansweredQuestions,

      getQuestionMax,
      capitalizeName,
      formatTime,

      // Không sử dụng hộp thoại kết quả riêng
      setOpenResultDialog: () => {},
    }).catch((error) => {
      console.error("Lỗi lưu phiếu học tập:", error);
    });

    // 4. Hiệu ứng khi đạt điểm tối đa
    if (totalScore === maxTotalScore) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    // 5. Cuộn đến phần kết quả
    setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  // Tự động nộp bài khi hết thời gian
    useEffect(() => {
    if (started && !submitted && timeLeft === 0) {
        handleSubmit();
    }
    }, [timeLeft, started, submitted]);

  // ================= RESET =================
  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setErrorMsg("");
  };


  // ================= RENDER =================
  
return (
  <Box
    id="quiz-container"
    sx={{
      minHeight: "100vh",
      backgroundColor: "#f1f5f9",
      py: { xs: 2, sm: 3 },
      px: { xs: 1.5, sm: 2 },
      fontFamily: "'Nunito', sans-serif",
    }}
  >
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
        backgroundColor: "#fff",
        borderRadius: "24px",
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 25px rgba(0,0,0,0.10)",
      }}
    >
      {/* ================= HEADER ================= */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          background: "linear-gradient(120deg, #38bdf8 0%, #0288cc 50%, #0ea5e9 100%)",
          color: "#fff",
          textAlign: "center",
          px: { xs: 2, sm: 4 },
          py: { xs: 3.5, sm: 4.5 },
          borderRadius: "14px",
          boxShadow: "0 5px 16px rgba(2, 136, 204, 0.2)",
        }}
      >
        {/* Hoa văn góc trái */}
        <Box
          sx={{
            position: "absolute",
            zIndex: -1,
            top: -65,
            left: -45,
            width: 190,
            height: 190,
            border: "2px solid rgba(255,255,255,0.20)",
            borderRadius: "50%",
            boxShadow:
              "0 0 0 18px rgba(255,255,255,0.07), 0 0 0 38px rgba(255,255,255,0.05)",
          }}
        />

        {/* Hoa văn góc phải */}
        <Box
          sx={{
            position: "absolute",
            zIndex: -1,
            top: -35,
            right: -25,
            width: 150,
            height: 150,
            transform: "rotate(35deg)",
            border: "2px solid rgba(255,255,255,0.20)",
            borderRadius: "28px",
            boxShadow: "0 0 0 16px rgba(255,255,255,0.06)",
          }}
        />

        {/* Các chấm trang trí */}
        <Box
          sx={{
            position: "absolute",
            zIndex: -1,
            bottom: 18,
            left: { xs: 22, sm: 65 },
            width: 9,
            height: 9,
            borderRadius: "50%",
            backgroundColor: "#fef08a",
            boxShadow: "22px -14px 0 rgba(255,255,255,0.55), 44px 0 0 rgba(255,255,255,0.35)",
          }}
        />

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: 19, sm: 27 },
              fontWeight: 900,
              letterSpacing: { xs: 0.3, sm: 0.8 },
              textTransform: "uppercase",
              lineHeight: 1.4,
              color: "#ffffff",
              textShadow: "0 2px 3px rgba(0,60,100,0.15)",
            }}
          >
            {worksheetInfo.title}
          </Typography>

          {/* Dải trang trí */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              my: 1.8,
            }}
          >
            <Box
              sx={{
                width: 35,
                height: 2,
                backgroundColor: "rgba(255,255,255,0.65)",
              }}
            />

            <Box
              sx={{
                width: 9,
                height: 9,
                backgroundColor: "#fde68a",
                transform: "rotate(45deg)",
                borderRadius: "2px",
              }}
            />

            <Box
              sx={{
                width: 35,
                height: 2,
                backgroundColor: "rgba(255,255,255,0.65)",
              }}
            />
          </Box>

          <Typography
            sx={{
              fontSize: { xs: 18, sm: 24 },
              fontWeight: 900,
              color: "#fff3b0",
              textTransform: "uppercase",
              lineHeight: 1.45,
              textShadow: "0 2px 3px rgba(0,60,100,0.18)",
              overflowWrap: "anywhere",
            }}
          >
            {worksheetInfo.lessonTitle}
          </Typography>
        </Box>
      </Box>

      {/* ================= STUDENT INFORMATION ================= */}
      <Box
        sx={{
          backgroundColor: "#f8fafc",
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        {/* HỌ VÀ TÊN HS */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            backgroundColor: "#ffffff",
            border: "2px solid #e0f2fe",
            borderRadius: "14px",
            px: 2,
            py: 1,
            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.05)",
            flex: { xs: 1, sm: "unset" },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <Box
            sx={{
              backgroundColor: "#e0f2fe",
              color: "#0284c7",
              width: 32,
              height: 32,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PersonIcon sx={{ fontSize: 19 }} />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 800,
                color: "#64748b",
                whiteSpace: "nowrap",
              }}
            >
              Họ và tên HS:
            </Typography>

            {fullname ? (
              <Typography
                sx={{
                  color: "#0369a1",
                  fontWeight: 900,
                  fontSize: 15,
                  whiteSpace: "nowrap",
                }}
              >
                {fullname}
              </Typography>
            ) : (
              <Box
                component="select"
                value={selectedStudent}
                onChange={(event) => {
                  const selectedName = event.target.value;
                  setSelectedStudent(selectedName);

                  const selected = studentList.find(
                    (student) =>
                      (
                        student.hoTen ||
                        student.fullName ||
                        student.name ||
                        ""
                      ) === selectedName
                  );

                  setStudentId(selected?.id || "");

                  if (errorMsg) {
                    setErrorMsg("");
                  }
                }}
                disabled={submitted}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#0369a1",
                  fontWeight: 900,
                  fontSize: 15,
                  outline: "none",
                  cursor: "pointer",
                  minWidth: 170,
                  "&:disabled": { opacity: 0.8 },
                }}
              >
                <option value="">-- Chọn tên học sinh --</option>

                {studentList.map((student, index) => {
                  const name =
                    student.hoTen ||
                    student.fullName ||
                    student.name ||
                    "";

                  return (
                    <option
                      key={student.id || index}
                      value={name}
                    >
                      {name}
                    </option>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>

        {/* CỤM PHẢI: LỚP & NGÀY LÀM BÀI */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: { xs: "space-between", sm: "flex-end" },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {/* THẺ LỚP */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              backgroundColor: "#ffffff",
              border: "2px solid #fef3c7",
              borderRadius: "14px",
              px: 2,
              py: 1,
              boxShadow: "0 2px 6px rgba(245, 158, 11, 0.05)",
            }}
          >
            <Box
              sx={{
                backgroundColor: "#fef3c7",
                color: "#d97706",
                width: 30,
                height: 30,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SchoolIcon sx={{ fontSize: 18 }} />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#64748b",
                }}
              >
                Lớp:
              </Typography>

              <Typography
                sx={{
                  color: "#b45309",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                {studentClass || "---"}
              </Typography>
            </Box>
          </Box>

          {/* THẺ NGÀY LÀM BÀI */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              backgroundColor: "#ffffff",
              border: "2px solid #e2e8f0",
              borderRadius: "14px",
              px: 2,
              py: 1,
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
            }}
          >
            <Box
              sx={{
                backgroundColor: "#f1f5f9",
                color: "#475569",
                width: 30,
                height: 30,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarMonthIcon sx={{ fontSize: 18 }} />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#64748b",
                }}
              >
                Ngày:
              </Typography>

              <Typography
                sx={{
                  color: "#334155",
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                {formattedDate}
              </Typography>
            </Box>
          </Box>

          {/* THẺ THỜI GIAN LÀM BÀI */}
{started && (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.2,
      backgroundColor: "#ffffff",
      border: "2px solid #fecaca",
      borderRadius: "14px",
      px: 2,
      py: 1,
      boxShadow: "0 2px 6px rgba(239, 68, 68, 0.05)",
    }}
  >
    <Box
      sx={{
        backgroundColor: "#fee2e2",
        color: "#dc2626",
        width: 30,
        height: 30,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AccessTimeIcon sx={{ fontSize: 18 }} />
    </Box>

    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 800,
          color: "#64748b",
        }}
      >
        Thời gian:
      </Typography>

      <Typography
        sx={{
          color: submitted ? "#64748b" : "#dc2626",
          fontWeight: 900,
          fontSize: 15,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatElapsedTime(timeLeft)}
      </Typography>
    </Box>
  </Box>
)}
        </Box>
      </Box>

      {/* ================= MAIN CONTENT ================= */}
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {errorMsg && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              backgroundColor: "#ffe4e6",
              border: "1px solid #fda4af",
              color: "#9f1239",
              borderRadius: 2,
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: "pre-line",
            }}
          >
            ⚠️ {errorMsg}
          </Box>
        )}

        <QuizLoading
          loading={loading}
          progress={progress}
        />

        {!loading && questions.length > 0 && (
          <>
            {/* ================= QUESTION PANEL ================= */}
            <Box
              sx={{
                border: "2px solid #f59e0b",
                borderRadius: "24px",
                overflow: "hidden",
                mb: 3,
                boxShadow: "0 2px 5px rgba(0,0,0,0.04)",
              }}
            >
              {/* QUESTION PANEL HEADER */}
              <Box
                sx={{
                  background:
                    "linear-gradient(to right, #f59e0b, #f97316)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 16,
                  textTransform: "uppercase",
                  px: { xs: 2, sm: 3 },
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    fontWeight: 700,
                  }}
                >
                  {worksheetInfo.sectionTitle}
                </Typography>
              </Box>

              {/* ALL QUESTIONS */}
              <Box
                sx={{
                  p: { xs: 2, sm: 3 },
                  backgroundColor: "#fff",
                  "& .MuiTypography-root": {
                    fontFamily: "'Nunito', sans-serif",
                  },
                }}
              >
                {questions.map((question, index) => (
                  <React.Fragment key={question.id || index}>
                    <Box
                      sx={{
                        width: "100%",
                        "& .MuiFormControlLabel-root": {
                          width: "100%",
                          m: 0,
                        },
                      }}
                    >
                      <QuizQuestion
                        currentQuestion={question}
                        currentIndex={index}
                        answers={answers}
                        setAnswers={setAnswers}
                        submitted={submitted}
                        started={true}
                        choXemDapAn={reviewMode}
                        setZoomImage={setZoomImage}
                        handleSingleSelect={handleSingleSelect}
                        handleMultipleSelect={handleMultipleSelect}
                        handleDragEnd={handleDragEnd}
                        reorder={reorder}
                        normalizeValue={normalizeValue}
                        ratio={ratio}
                      />
                    </Box>

                    {index < questions.length - 1 && (
                      <Box
                        sx={{
                          borderTop: "1px solid #f1f5f9",
                          my: 3,
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </Box>
            </Box>

            {/* ================= SUBMIT / RESET BUTTON ================= */}
            {!submitted ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                startIcon={<TaskAltIcon />}
                sx={{
                  width: { xs: "100%", sm: "30%" },
                  mx: "auto",
                  display: "flex",
                  py: { xs: 1, sm: 1.2 },
                  px: 1.5,
                  background: "linear-gradient(100deg, #0288cc 0%, #0ea5e9 100%)",
                  color: "#fff",
                  fontSize: { xs: 13, sm: 16 },
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  borderRadius: "12px",
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(2, 136, 204, 0.22)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  transition: "all 0.2s ease",
                  "& .MuiButton-startIcon": {
                    mr: 0.8,
                    "& svg": {
                      fontSize: { xs: 18, sm: 20 },
                    },
                  },
                  "&:hover": {
                    background: "linear-gradient(100deg, #0277b8 0%, #0284c7 100%)",
                    boxShadow: "0 6px 16px rgba(2, 136, 204, 0.28)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "scale(0.99)",
                  },
                  "&.Mui-disabled": {
                    background: "#94a3b8",
                    color: "#fff",
                    boxShadow: "none",
                  },
                }}
              >
                {saving ? "ĐANG CHẤM BÀI..." : "NỘP BÀI – XEM KẾT QUẢ"}
              </Button>
            ) : (
              choXemDapAn === false && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleReset}
                  startIcon={<RestartAltIcon />}
                  sx={{
                    py: 1.6,
                    backgroundColor: "#475569",
                    fontWeight: 900,
                    borderRadius: "16px",
                    "&:hover": {
                      backgroundColor: "#334155",
                    },
                  }}
                >
                  LÀM LẠI BÀI TẬP
                </Button>
              )
            )}
          </>
        )}

        {/* ================= RESULT ================= */}
        {submitted && (
          <Paper
            ref={resultRef}
            elevation={0}
            sx={{
              mt: 3,
              p: {
                xs: 3,
                sm: 4,
              },
              backgroundColor: "#ecfdf5",
              border: "2px solid #6ee7b7",
              borderRadius: "24px",
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: {
                  xs: 25,
                  sm: 32,
                },
                fontWeight: 900,
                color: "#065f46",
                mb: 1,
              }}
            >
              {choXemDiem
                ? score === maxTotalScore
                  ? "🎉 XUẤT SẮC!"
                  : score >= maxTotalScore / 2
                    ? "👍 CỐ GẮNG HƠN NHÉ!"
                    : "💪 HÃY THỬ LẠI NHÉ!"
                : "ĐÃ NỘP PHIẾU HỌC TẬP!"}
            </Typography>

            <Typography
              sx={{
                fontWeight: 800,
                color: "#047857",
                mb: 2,
              }}
            >
              Học sinh: <span style={{ color: "red" }}>{selectedStudent}</span> | Lớp: {studentClass}
            </Typography>

            {choXemDiem && (
              <>
                <Typography
                  sx={{
                    fontSize: {
                      xs: 40,
                      sm: 52,
                    },
                    fontWeight: 900,
                    color: "#059669",
                    mb: 2,
                  }}
                >
                  {maxTotalScore > 0
                    ? (
                        Math.ceil(
                          ((score / maxTotalScore) * 10) * 2 - 0.5
                        ) / 2
                      ).toString()
                    : "0"}{" "}
                  / 10
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  {score === maxTotalScore
                    ? "Em đã trả lời đúng tất cả các câu hỏi trong phiếu học tập!"
                    : "Em hãy xem lại các câu trả lời và cố gắng hơn trong những lần làm bài tiếp theo nhé!"}
                </Typography>
              </>
            )}

            {!choXemDiem && (
              <Typography
                sx={{
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Bài làm của em đã được ghi nhận. Cảm ơn em!
              </Typography>
            )}
          </Paper>
        )}
      </Box>
    </Paper>

    {/* ================= IMAGE ZOOM ================= */}
    <ImageZoomDialog
      open={Boolean(zoomImage)}
      imageSrc={zoomImage}
      onClose={() => setZoomImage(null)}
    />
  </Box>
);

}
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
import { doc, getDoc, getDocs, setDoc, collection, updateDoc } from "firebase/firestore";
// Thay cho react-beautiful-dnd
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";
import QuestionOption from "../utils/QuestionOption";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
//import CheckCircleIcon from '@mui/icons-material/CheckCircle';
//import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ImageZoomDialog from "../dialog/ImageZoomDialog";


import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Hàm shuffle mảng
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

        let docId = null;
        //let collectionName = "NGANHANG_DE";
        let collectionName =
          examType === "kt" ? "NGANHANG_DE" : "BAITAP_TUAN";

        let hocKiFromConfig = "";
        let monHocFromConfig = "";
        let timeLimitMinutes = 0; // ⬅ để lưu thời gian

        // 🔹 LẤY LỚP HỌC SINH TỪ STATE (DÙNG CHUNG)
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
        let saved = Array.isArray(data.questions) ? data.questions : [];
        saved = shuffleArray(saved);

        const loadedQuestions = saved.map((q, index) => {
            const questionId = q.id ?? `q_${index}`;
            const questionText = typeof q.question === "string" ? q.question.trim() : "";
            const rawType = (q.type || "").toString().trim().toLowerCase();
            const type = ["sort", "matching", "single", "multiple", "image", "truefalse", "fillblank"].includes(rawType)
            ? rawType
            : null;
            if (!type) return null;

            if (type === "matching") {
              const pairs = Array.isArray(q.pairs) ? q.pairs : [];
              if (pairs.length === 0) return null;

              //console.log("🔥 RAW MATCHING PAIRS:", pairs);

              const leftOptions = pairs.map((p, idx) => {
                // --- CASE 1: editor lưu { leftImage: { url, name } } ---
                if (p.leftImage && p.leftImage.url) {
                  //console.log(`🔥 left[${idx}] = leftImage`, p.leftImage.url);
                  return { type: "image", url: p.leftImage.url, name: p.leftImage.name || `img-${idx}` };
                }

                // --- CASE 2: left là chuỗi URL ---
                if (typeof p.left === "string" && /^https?:\/\//i.test(p.left.trim())) {
                  //console.log(`🔥 left[${idx}] = URL`, p.left);
                  return { type: "image", url: p.left.trim(), name: `img-${idx}` };
                }

                // --- CASE 3: để nguyên dạng text ---
                //console.log(`🔥 left[${idx}] = text`, p.left);
                return p.left ?? "";
              });

              // cột phải: đảo cho đến khi khác ít nhất 1 phần tử
              const rightOptionsOriginal = pairs.map((p, idx) => ({ opt: p.right, idx }));
              const processedRightOptions =
                q.sortType === "shuffle"
                  ? shuffleUntilDifferent(rightOptionsOriginal)
                  : rightOptionsOriginal;

              const originalRightIndexMap = {};
              processedRightOptions.forEach((item, newIndex) => {
                originalRightIndexMap[item.idx] = newIndex;
              });

              const newCorrect = leftOptions.map((_, i) => originalRightIndexMap[i]);

              return {
                ...q,
                id: questionId,
                type,
                question: questionText,
                image: q.image ?? null,
                leftOptions,
                rightOptions: processedRightOptions.map(i => i.opt),
                correct: newCorrect,
                score: q.score ?? 1,
              };
            }

            if (type === "sort") {
            const options = Array.isArray(q.options) && q.options.length > 0
                ? [...q.options]
                : ["", "", "", ""];

            const indexed = options.map((opt, idx) => ({ opt, idx }));
            const processed = q.sortType === "shuffle" ? shuffleArray(indexed) : indexed;
            const shuffledOptions = processed.map(i => i.opt);

            return {
                ...q,
                id: questionId,
                type,
                question: questionText,
                image: q.image ?? null,
                options: shuffledOptions,                    // hiển thị theo shuffle
                initialSortOrder: processed.map(i => i.idx), // thứ tự index sau shuffle
                correctTexts: options,                       // đáp án đúng: text gốc Firestore
                score: q.score ?? 1
            };
            }

            if (type === "single" || type === "multiple") {
            const options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ["", "", "", ""];
            const indexed = options.map((opt, idx) => ({ opt, idx }));
            const shouldShuffle = q.sortType === "shuffle" || q.shuffleOptions === true;
            const shuffled = shouldShuffle ? shuffleArray(indexed) : indexed;
            return { 
                ...q, 
                id: questionId, 
                type, 
                question: questionText, 
                image: q.image ?? null,          // ✅ Thêm image
                options, 
                displayOrder: shuffled.map(i => i.idx), 
                correct: Array.isArray(q.correct) ? q.correct.map(Number) : typeof q.correct === "number" ? [q.correct] : [], 
                score: q.score ?? 1 
            };
            }

            if (type === "image") {
            const options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ["", "", "", ""];
            const correct = Array.isArray(q.correct) ? q.correct : [];
            return { 
                ...q, 
                id: questionId, 
                type, 
                question: questionText, 
                image: q.image ?? null,          // ✅ Thêm image
                options, 
                displayOrder: shuffleArray(options.map((_, idx) => idx)), 
                correct, 
                score: q.score ?? 1 
            };
            }

            if (type === "truefalse") {
            const options = Array.isArray(q.options) && q.options.length >= 2
                ? [...q.options]
                : ["Đúng", "Sai"];

            const indexed = options.map((opt, idx) => ({ opt, idx }));
            const processed = q.sortType === "shuffle" ? shuffleArray(indexed) : indexed;

            return {
                ...q,
                id: questionId,
                type,
                question: questionText,
                image: q.image ?? null,
                options: processed.map(i => i.opt),        // hiển thị theo shuffle
                initialOrder: processed.map(i => i.idx),   // mapping: vị trí hiển thị -> index gốc
                correct: Array.isArray(q.correct) && q.correct.length === options.length
                ? q.correct                               // theo thứ tự gốc Firestore
                : options.map(() => ""),
                score: q.score ?? 1
            };
            }

            if (type === "fillblank") {
            const options = Array.isArray(q.options) ? q.options : []; // các đáp án đúng
            const questionText = q.question || "";                     // câu có chỗ trống
            return {
                ...q,
                id: questionId,
                type,
                question: questionText,
                image: q.image ?? null,
                option: q.option,               // giữ câu có dấu [...]
                options,                        // đáp án đúng, giữ nguyên thứ tự gốc
                shuffledOptions: shuffleArray([...options]), // shuffle một lần nếu cần
                score: q.score ?? 1
            };
            }

            return null;
        }).filter(Boolean);

        // --- Lọc câu hợp lệ bao gồm fillblank ---
        const validQuestions = loadedQuestions.filter(q => {
            if (q.type === "matching") return q.question.trim() !== "" && q.leftOptions.length > 0 && q.rightOptions.length > 0;
            if (q.type === "sort") return q.question.trim() !== "" && q.options.length > 0;
            if (["single", "multiple", "image"].includes(q.type)) return q.question.trim() !== "" && q.options.length > 0 && Array.isArray(q.correct);
            if (q.type === "truefalse") return q.question.trim() !== "" && q.options.length >= 2 && Array.isArray(q.correct);
            if (q.type === "fillblank") return q.question.trim() !== "" && q.options.length > 0;
            return false;
        });

        setQuestions(validQuestions);
        setProgress(100);
        setStarted(true);

        //============================
        //Chấm Sort không tương tác
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

        //============================

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

  const handleSubmit = async () => {
    if (!studentClass || !studentName) {
      setSnackbar({ open: true, message: "Thiếu thông tin học sinh", severity: "info" });
      return;
    }

    // Kiểm tra câu chưa trả lời
    const unanswered = questions.filter(q => {
      const userAnswer = answers[q.id];
      if (q.type === "single") {
        return userAnswer === undefined || userAnswer === null || userAnswer === "";
      }
      if (q.type === "multiple" || q.type === "image") {
        return !Array.isArray(userAnswer) || userAnswer.length === 0;
      }
      if (q.type === "truefalse") {
        return !Array.isArray(userAnswer) || userAnswer.length !== q.options.length;
      }
      return false;
    });

    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered.map(q => questions.findIndex(item => item.id === q.id) + 1));
      setOpenAlertDialog(true);
      return;
    }

    try {
      setSaving(true);

      // Tính điểm thô
      let total = 0;
      questions.forEach(q => {
        const rawAnswer = answers[q.id];

        if (q.type === "single") {
          const ua = Number(rawAnswer);
          if (Array.isArray(q.correct) ? q.correct.includes(ua) : q.correct === ua) total += q.score ?? 1;

        } else if (q.type === "multiple" || q.type === "image") {
          const userSet = new Set(Array.isArray(rawAnswer) ? rawAnswer : []);
          const correctSet = new Set(Array.isArray(q.correct) ? q.correct : [q.correct]);
          if (userSet.size === correctSet.size && [...correctSet].every(x => userSet.has(x))) total += q.score ?? 1;

        } else if (q.type === "sort") {
          // 👉 nếu không kéo, dùng thứ tự ban đầu
          const order =
            Array.isArray(rawAnswer) && rawAnswer.length > 0
              ? rawAnswer
              : q.initialOrder ?? q.options.map((_, i) => i);

          const userTexts = order.map(idx => q.options[idx]);
          const correctTexts = Array.isArray(q.correctTexts) ? q.correctTexts : [];

          const isCorrect =
            userTexts.length === correctTexts.length &&
            userTexts.every((t, i) => t === correctTexts[i]);

          if (isCorrect) total += q.score ?? 1;

        } else if (q.type === "matching") {
          const userArray =
            Array.isArray(rawAnswer) && rawAnswer.length > 0
              ? rawAnswer
              : q.initialOrder ?? q.correct?.map((_, i) => i);

          const correctArray = Array.isArray(q.correct) ? q.correct : [];

          const isCorrect =
            userArray.length === correctArray.length &&
            userArray.every((val, i) => val === correctArray[i]);

          if (isCorrect) total += q.score ?? 1;
        } else if (q.type === "truefalse") {
          const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
          const correctArray = Array.isArray(q.correct) ? q.correct : [];

          if (userArray.length === correctArray.length) {
            const isAllCorrect = userArray.every((val, i) => {
              const originalIdx = Array.isArray(q.initialOrder) ? q.initialOrder[i] : i;
              return val === correctArray[originalIdx];
            });

            if (isAllCorrect) {
              total += q.score ?? 1;
            }
          }
        } else if (q.type === "fillblank") {
          const userAnswers = Array.isArray(rawAnswer) ? rawAnswer : [];
          const correctAnswers = Array.isArray(q.options) ? q.options : [];

          if (userAnswers.length === correctAnswers.length) {
            const isAllCorrect = correctAnswers.every((correct, i) => {
              if (!userAnswers[i] || !correct || typeof correct.text !== "string")
                return false;

              return (
                String(userAnswers[i]).trim().toLowerCase() ===
                correct.text.trim().toLowerCase()
              );
            });

            if (isAllCorrect) total += q.score ?? 1;
          }
        }
      });

      setScore(total);
      setSubmitted(true);
      
      // ⏱ Tính thời gian làm bài
      const durationSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const durationStr = formatTime(durationSec);

      // Tạo biến chứa tiêu đề hiển thị
      const hocKi = window.currentHocKi || "GKI";
      const monHoc = window.currentMonHoc || "Không rõ";

     // Ngày theo định dạng Việt Nam
      const ngayKiemTra = new Date().toLocaleDateString("vi-VN");

      const normalizeName = (name) =>
        name.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .toLowerCase().trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "");

      setStudentResult({
        hoVaTen: capitalizeName(studentName),
        lop: studentClass,
        diem: total,
      });
      setOpenResultDialog(true);

    } catch (err) {
      console.error("❌ Lỗi khi lưu điểm:", err);
    } finally {
      setSaving(false);
    }
  };

  const autoSubmit = async () => {
    if (!studentClass || !studentName) {
      setSnackbar({ open: true, message: "Thiếu thông tin học sinh", severity: "info" });
      return;
    }

    // Kiểm tra câu chưa trả lời
    /*const unanswered = questions.filter(q => {
      const userAnswer = answers[q.id];
      if (q.type === "single") {
        return userAnswer === undefined || userAnswer === null || userAnswer === "";
      }
      if (q.type === "multiple" || q.type === "image") {
        return !Array.isArray(userAnswer) || userAnswer.length === 0;
      }
      if (q.type === "truefalse") {
        return !Array.isArray(userAnswer) || userAnswer.length !== q.options.length;
      }
      return false;
    });

    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered.map(q => questions.findIndex(item => item.id === q.id) + 1));
      setOpenAlertDialog(true);
      return;
    }*/

    try {
      setSaving(true);

      // Tính điểm thô
      let total = 0;
      questions.forEach(q => {
        const rawAnswer = answers[q.id];

        if (q.type === "single") {
          const ua = Number(rawAnswer);
          if (Array.isArray(q.correct) ? q.correct.includes(ua) : q.correct === ua) total += q.score ?? 1;

        } else if (q.type === "multiple" || q.type === "image") {
          const userSet = new Set(Array.isArray(rawAnswer) ? rawAnswer : []);
          const correctSet = new Set(Array.isArray(q.correct) ? q.correct : [q.correct]);
          if (userSet.size === correctSet.size && [...correctSet].every(x => userSet.has(x))) total += q.score ?? 1;

        } else if (q.type === "sort") {
          // 👉 nếu không kéo, dùng thứ tự ban đầu
          const order =
            Array.isArray(rawAnswer) && rawAnswer.length > 0
              ? rawAnswer
              : q.initialOrder ?? q.options.map((_, i) => i);

          const userTexts = order.map(idx => q.options[idx]);
          const correctTexts = Array.isArray(q.correctTexts) ? q.correctTexts : [];

          const isCorrect =
            userTexts.length === correctTexts.length &&
            userTexts.every((t, i) => t === correctTexts[i]);

          if (isCorrect) total += q.score ?? 1;

        } else if (q.type === "matching") {
          const userArray =
            Array.isArray(rawAnswer) && rawAnswer.length > 0
              ? rawAnswer
              : q.initialOrder ?? q.correct?.map((_, i) => i);

          const correctArray = Array.isArray(q.correct) ? q.correct : [];

          const isCorrect =
            userArray.length === correctArray.length &&
            userArray.every((val, i) => val === correctArray[i]);

          if (isCorrect) total += q.score ?? 1;
        } else if (q.type === "truefalse") {
          const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
          const correctArray = Array.isArray(q.correct) ? q.correct : [];

          if (userArray.length === correctArray.length) {
            const isAllCorrect = userArray.every((val, i) => {
              const originalIdx = Array.isArray(q.initialOrder) ? q.initialOrder[i] : i;
              return val === correctArray[originalIdx];
            });

            if (isAllCorrect) {
              total += q.score ?? 1;
            }
          }
        } else if (q.type === "fillblank") {
          const userAnswers = Array.isArray(rawAnswer) ? rawAnswer : [];
          const correctAnswers = Array.isArray(q.options) ? q.options : [];

          if (userAnswers.length === correctAnswers.length) {
            const isAllCorrect = correctAnswers.every((correct, i) => {
              if (!userAnswers[i] || !correct || typeof correct.text !== "string")
                return false;

              return (
                String(userAnswers[i]).trim().toLowerCase() ===
                correct.text.trim().toLowerCase()
              );
            });

            if (isAllCorrect) total += q.score ?? 1;
          }
        }
      });

      setScore(total);
      setSubmitted(true);
      
      // ⏱ Tính thời gian làm bài
      const durationSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const durationStr = formatTime(durationSec);

      // Tạo biến chứa tiêu đề hiển thị
      const hocKi = window.currentHocKi || "GKI";
      const monHoc = window.currentMonHoc || "Không rõ";

      // Ngày theo định dạng Việt Nam
      const ngayKiemTra = new Date().toLocaleDateString("vi-VN");

      const normalizeName = (name) =>
        name.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .toLowerCase().trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "");

      setStudentResult({
        hoVaTen: capitalizeName(studentName),
        lop: studentClass,
        diem: total,
      });
      setOpenResultDialog(true);

    } catch (err) {
      console.error("❌ Lỗi khi lưu điểm:", err);
    } finally {
      setSaving(false);
    }
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
          alignSelf: { xs: "flex-start", sm: "auto" },
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
            color: "#1976d2",
          }}
        >
          {config?.mon
            ? `ÔN TẬP ${config.mon.toUpperCase()}`
            : "ÔN TẬP"}
        </Typography>

        {/* Ô chọn đề */}
        <Stack direction="row" spacing={2} alignItems="center">
          {/* ================= LOẠI ĐỀ ================= */}
          {/*<FormControl fullWidth size="small" sx={{ width: 159, mb: 0 }}>
            <InputLabel sx={{ fontSize: "16px", fontWeight: "bold" }}>
              Loại đề
            </InputLabel>

            <Select
              value={examType}
              label="Loại đề"
              sx={{ fontSize: "16px", fontWeight: 500 }}
              onChange={(e) => {
                const type = e.target.value; // "bt" | "kt"
                setExamType(type);
                fetchQuizList(type); // load danh sách đề
              }}
            >
              <MenuItem value="bt" sx={{ fontSize: "16px" }}>
                Bài tập tuần
              </MenuItem>
              <MenuItem value="kt" sx={{ fontSize: "16px" }}>
                KTĐK
              </MenuItem>
            </Select>
          </FormControl>*/}

          {/* ================= CHỌN ĐỀ ================= */}
          <FormControl fullWidth size="small" sx={{ width: 220 }}>
            <InputLabel id="exam-select-label">Chọn đề</InputLabel>

            <Select
              labelId="exam-select-label"
              value={selectedExam}
              label="Chọn đề"
              onChange={(e) => {
                setSelectedExam(e.target.value); // 👈 đổi đề → useEffect tự chạy
              }}
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
        <Box key={currentQuestion.id || currentIndex}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>
            <strong>Câu {currentIndex + 1}:</strong>{" "}
            <span
              dangerouslySetInnerHTML={{
                __html: (currentQuestion.question || "").replace(/^<p>|<\/p>$/g, "")
              }}
            />
          </Typography>

          {currentQuestion.image && (
            <Box sx={{ width: "100%", textAlign: "center", mb: 2 }}>
              <img
                src={currentQuestion.image}
                alt="question"
                style={{
                  maxWidth: "100%",
                  maxHeight: 150,
                  objectFit: "contain",
                  borderRadius: 8
                }}
              />
            </Box>
          )}

          {/* SORT */}
          {currentQuestion.type === "sort" && (
            <Box sx={{ mt: 0 }}>
              {currentQuestion.questionImage && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <Box
                    sx={{
                      maxHeight: 150,          // 🔥 chỉnh khung nhỏ ở đây
                      maxWidth: "100%",
                      overflow: "hidden",
                      borderRadius: 2,
                      border: "1px solid #ddd", // 🔥 khung hiện rõ
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 150,        // 🔥 trùng với Box
                        maxWidth: "100%",
                        objectFit: "contain",
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />
                  </Box>
                </Box>
              )}

              <DragDropContext
                onDragEnd={(result) => {
                  if (!result.destination || submitted || !started) return;

                  const currentOrder =
                    answers[currentQuestion.id] ??
                    currentQuestion.options.map((_, idx) => idx);

                  const newOrder = reorder(
                    currentOrder,
                    result.source.index,
                    result.destination.index
                  );

                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newOrder }));
                }}
              >
                <Droppable droppableId="sort-options">
                  {(provided) => {
                    const orderIdx =
                      answers[currentQuestion.id] ??
                      currentQuestion.options.map((_, idx) => idx);

                    return (
                      <Stack {...provided.droppableProps} ref={provided.innerRef} spacing={2}>
                        {orderIdx.map((optIdx, pos) => {
                          const optionData = currentQuestion.options[optIdx];
                          const optionText =
                            typeof optionData === "string" ? optionData : optionData.text ?? "";
                          const optionImage =
                            typeof optionData === "object" ? optionData.image ?? null : null;

                          // ✅ So sánh với correctTexts thay vì correct index
                          const correctData = currentQuestion.correctTexts[pos];
                          const isCorrectPos =
                            submitted &&
                            choXemDapAn &&
                            normalizeValue(optionData) === normalizeValue(correctData);

                          return (
                            <Draggable
                              key={optIdx}
                              draggableId={String(optIdx)}
                              index={pos}
                              isDragDisabled={submitted || !started}
                            >
                              {(provided, snapshot) => (
                                <Box
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  sx={{
                                    borderRadius: 1,
                                    bgcolor:
                                      submitted && choXemDapAn
                                        ? isCorrectPos
                                          ? "#c8e6c9" // xanh lá nhạt = đúng
                                          : "#ffcdd2" // đỏ nhạt = sai
                                        : "transparent",
                                    border: "1px solid #90caf9",
                                    cursor: submitted || !started ? "default" : "grab",
                                    boxShadow: "none",
                                    transition: "background-color 0.2s ease, border-color 0.2s ease",
                                    minHeight: 40,
                                    py: 0.5,
                                    px: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    "&:hover": {
                                      borderColor: "#1976d2",
                                      bgcolor: "#f5f5f5",
                                    },
                                  }}
                                >
                                  {optionImage && (
                                    <Box
                                      component="img"
                                      src={optionImage}
                                      alt={`option-${optIdx}`}
                                      sx={{
                                        maxHeight: 40,
                                        width: "auto",
                                        objectFit: "contain",
                                        borderRadius: 2,
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}

                                  <Typography
                                    variant="body1"
                                    fontWeight="400"
                                    sx={{
                                      userSelect: "none",
                                      fontSize: "1.1rem",
                                      lineHeight: 1.5,
                                      flex: 1,
                                      whiteSpace: "pre-wrap",
                                      "& p": { margin: 0 },
                                    }}
                                    component="div"
                                    dangerouslySetInnerHTML={{ __html: optionText }}
                                  />
                                </Box>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </Stack>
                    );
                  }}
                </Droppable>
              </DragDropContext>
            </Box>
          )}

          {/* MATCH */}
          {currentQuestion.type === "matching" && (
            <Box sx={{ width: "100%" }}>
              {/* ================= HÌNH MINH HỌA DƯỚI CÂU HỎI ================= */}
              {currentQuestion.questionImage && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      maxHeight: 150, // 🔥 đổi 100 nếu bạn muốn
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 150,
                        maxWidth: "100%",
                        height: "auto",
                        objectFit: "contain",
                        borderRadius: 8,
                        display: "block",
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />

                  </Box>
                </Box>
              )}

              {/* ================= MATCHING ================= */}
              <DragDropContext
                onDragEnd={(result) => {
                  if (!result.destination || submitted || !started) return;

                  const currentOrder =
                    answers[currentQuestion.id] ??
                    currentQuestion.pairs.map((_, idx) => idx);

                  const newOrder = reorder(
                    currentOrder,
                    result.source.index,
                    result.destination.index
                  );

                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: newOrder,
                  }));
                }}
              >
                <Stack spacing={1.5} sx={{ width: "100%", px: 1 }}>
                  {currentQuestion.pairs.map((pair, i) => {
                    const optionText = pair.left || "";
                    const optionImage =
                      pair.leftImage?.url || pair.leftIconImage?.url || null;

                    const userOrder =
                      answers[currentQuestion.id] ??
                      currentQuestion.rightOptions.map((_, idx) => idx);

                    const rightIdx = userOrder[i];
                    const rightVal = currentQuestion.rightOptions[rightIdx];
                    const rightText = typeof rightVal === "string" ? rightVal : "";
                    const rightImage =
                      typeof rightVal === "object" ? rightVal?.url : null;

                    const isCorrect =
                      submitted && userOrder[i] === currentQuestion.correct[i];

                    return (
                      <Stack
                        key={i}
                        direction="row"
                        spacing={2}
                        alignItems="stretch"
                        sx={{ minHeight: 50 }}
                      >
                        {/* ================= LEFT ================= */}
                        <Paper
                          sx={{
                            flexGrow: ratio.left,
                            flexBasis: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            px: 1,
                            py: 0.5,
                            border: "1px solid #64b5f6",
                            borderRadius: 1,
                            boxShadow: "none",
                          }}
                        >
                          {optionImage && (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                maxHeight: 40,      // khung tối đa 40
                                mr: 1,
                                flexShrink: 0,
                                overflow: "hidden",
                              }}
                            >
                              <img
                                src={optionImage}
                                alt={`left-${i}`}
                                style={{
                                  maxHeight: 40,    // ⭐ QUAN TRỌNG: trùng với Box
                                  width: "auto",
                                  height: "auto",
                                  objectFit: "contain",
                                  borderRadius: 2,
                                  display: "block",
                                }}
                              />
                            </Box>
                          )}

                          {optionText && (
                            <Typography
                              component="div"
                              sx={{
                                fontSize: "1.1rem",
                                flex: 1,
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.5,
                                "& p": { margin: 0 },
                              }}
                              dangerouslySetInnerHTML={{ __html: optionText }}
                            />
                          )}
                        </Paper>

                        {/* ================= RIGHT ================= */}
                        <Droppable droppableId={`right-${i}`} direction="vertical">
                          {(provided) => (
                            <Stack
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              sx={{ flexGrow: ratio.right, flexBasis: 0, }}
                            >
                              <Draggable
                                key={rightIdx}
                                draggableId={String(rightIdx)}
                                index={i}
                                isDragDisabled={submitted || !started}
                              >
                                {(provided) => (
                                  <Paper
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    sx={{
                                      flex: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1.5,
                                      px: 1,
                                      py: 0.5,
                                      border: "1px solid #90caf9",
                                      borderRadius: 1,
                                      boxShadow: "none",
                                      cursor:
                                        submitted || !started ? "default" : "grab",
                                      bgcolor:
                                        submitted && choXemDapAn
                                          ? isCorrect
                                            ? "#c8e6c9"
                                            : "#ffcdd2"
                                          : "transparent",
                                      transition:
                                        "background-color 0.2s ease, border-color 0.2s ease",
                                      "&:hover": {
                                        borderColor: "#1976d2",
                                        bgcolor: "#f5f5f5",
                                      },
                                    }}
                                  >
                                    {rightImage && (
                                      <Box
                                        sx={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          maxHeight: 40,
                                          mr: 1,
                                          flexShrink: 0,
                                        }}
                                      >
                                        <img
                                          src={rightImage}
                                          alt={`right-${rightIdx}`}
                                          style={{
                                            maxHeight: 40,
                                            width: "auto",
                                            height: "auto",
                                            objectFit: "contain",
                                            borderRadius: 2,
                                            display: "block",
                                          }}
                                        />
                                      </Box>
                                    )}

                                    {rightText && (
                                      <Typography
                                        component="div"
                                        sx={{
                                          fontSize: "1.1rem",
                                          flex: 1,
                                          wordBreak: "break-word",
                                          whiteSpace: "pre-wrap",
                                          lineHeight: 1.5,
                                          "& p": { margin: 0 },
                                        }}
                                        dangerouslySetInnerHTML={{
                                          __html: rightText,
                                        }}
                                      />
                                    )}
                                  </Paper>
                                )}
                              </Draggable>
                              {provided.placeholder}
                            </Stack>
                          )}
                        </Droppable>
                      </Stack>
                    );
                  })}
                </Stack>
              </DragDropContext>
            </Box>
          )}

          {/* 1. Single */}
          {currentQuestion.type === "single" && (
            <Stack spacing={2}>
              {/* Hình minh họa câu hỏi nếu có */}
              {currentQuestion.questionImage && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  {/* 🔲 KHUNG ẢNH */}
                  <Box
                    sx={{
                      maxHeight: 150,          // 🔥 chỉnh nhỏ khung tại đây
                      maxWidth: "100%",
                      overflow: "hidden",
                      borderRadius: 1,
                      border: "1px solid #ddd",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 150,        // 🔥 trùng với khung
                        maxWidth: "100%",
                        height: "auto",
                        objectFit: "contain",
                        borderRadius: 4,
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />
                  </Box>
                </Box>
              )}
              {currentQuestion.displayOrder.map((optIdx) => {
                const selected = answers[currentQuestion.id] === optIdx;

                const correctArray = Array.isArray(currentQuestion.correct)
                  ? currentQuestion.correct
                  : [currentQuestion.correct];

                const isCorrect = submitted && correctArray.includes(optIdx);
                const isWrong = submitted && selected && !correctArray.includes(optIdx);

                const handleSelect = () => {
                  if (submitted || !started) return;
                  handleSingleSelect(currentQuestion.id, optIdx);
                };

                // Lấy dữ liệu option
                const optionData = currentQuestion.options[optIdx];
                const optionText =
                  typeof optionData === "object" && optionData.text
                    ? optionData.text
                    : typeof optionData === "string"
                    ? optionData
                    : "";
                const optionImage =
                  typeof optionData === "object" && optionData.image
                    ? optionData.image
                    : null;

                return (
                  <Paper
                    key={optIdx}
                    onClick={handleSelect}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      borderRadius: 1,
                      cursor: submitted || !started ? "default" : "pointer",
                      bgcolor:
                        submitted && choXemDapAn
                          ? isCorrect
                            ? "#c8e6c9"
                            : isWrong
                            ? "#ffcdd2"
                            : "transparent"   // 👈 nền mặc định trong suốt
                          : "transparent",
                      border: "1px solid #90caf9",
                      minHeight: 40,
                      py: 0.5,
                      px: 1,
                      boxShadow: "none",          // 👈 bỏ đổ bóng
                      transition: "background-color 0.2s ease, border-color 0.2s ease",
                      "&:hover": {
                        borderColor: "#1976d2",
                        bgcolor: "#f5f5f5",       // 👈 highlight khi hover
                      },
                    }}
                  >
                    {/* Radio button */}
                    <Radio checked={selected} onChange={handleSelect} sx={{ mr: 1 }} />

                    {/* Hình option nếu có */}
                    {optionImage && (
                      <Box
                        component="img"
                        src={optionImage}
                        alt={`option-${optIdx}`}
                        sx={{
                          maxHeight: 40,
                          maxWidth: "auto",
                          objectFit: "contain",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Text option */}
                    <Typography
                      variant="body1"
                      sx={{
                        userSelect: "none",
                        fontSize: "1.1rem",
                        lineHeight: 1.5,
                        flex: 1,
                        whiteSpace: "pre-wrap",
                        "& p": { margin: 0 },
                      }}
                      component="div"
                      dangerouslySetInnerHTML={{ __html: optionText }}
                    />
                  </Paper>
                );
              })}
            </Stack>
          )}

          {/* 2. Multiple */}
          {currentQuestion.type === "multiple" && (
            <Stack spacing={2}>
              {/* Hình minh họa câu hỏi nếu có */}
              {currentQuestion.questionImage && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  {/* 🔲 KHUNG ẢNH */}
                  <Box
                    sx={{
                      maxHeight: 150,        // 🔥 khung nhỏ lại
                      maxWidth: "100%",
                      overflow: "hidden",
                      borderRadius: 1,
                      border: "1px solid #ddd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 150,      // 🔥 ảnh co theo khung
                        maxWidth: "100%",
                        height: "auto",
                        objectFit: "contain",
                        borderRadius: 8,
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />
                  </Box>
                </Box>
              )}

              {currentQuestion.displayOrder.map((optIdx) => {
                const optionData = currentQuestion.options[optIdx];
                const optionText = optionData.text ?? "";
                const optionImage = optionData.image ?? null;

                const userAns = answers[currentQuestion.id] || [];
                const checked = userAns.includes(optIdx);

                const isCorrect =
                  submitted && currentQuestion.correct.includes(optIdx);
                const isWrong =
                  submitted && checked && !currentQuestion.correct.includes(optIdx);

                const handleSelect = () => {
                  if (submitted || !started) return;
                  handleMultipleSelect(currentQuestion.id, optIdx, !checked);
                };

                return (
                  <Paper
                    key={optIdx}
                    onClick={handleSelect}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 1,
                      cursor: submitted || !started ? "default" : "pointer",
                      bgcolor:
                        submitted && choXemDapAn
                          ? isCorrect
                            ? "#c8e6c9"
                            : isWrong
                            ? "#ffcdd2"
                            : "transparent"   // 👈 nền mặc định trong suốt
                          : "transparent",
                      border: "1px solid #90caf9",
                      minHeight: 40,
                      py: 0.5,
                      px: 1,
                      gap: 1,
                      boxShadow: "none",          // 👈 bỏ đổ bóng
                      transition: "background-color 0.2s ease, border-color 0.2s ease",
                      "&:hover": {
                        borderColor: "#1976d2",
                        bgcolor: "#f5f5f5",       // 👈 highlight khi hover
                      },
                    }}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={checked}
                      onChange={handleSelect}
                      sx={{ mr: 1 }}
                    />

                    {/* Hình option nếu có */}
                    {optionImage && (
                      <Box
                        component="img"
                        src={optionImage}
                        alt={`option-${optIdx}`}
                        sx={{
                          maxHeight: 40,
                          maxWidth: 40,
                          objectFit: "contain",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Text option */}
                    <Typography
                      variant="body1"
                      sx={{
                        userSelect: "none",
                        fontSize: "1.1rem",
                        lineHeight: 1.5,
                        flex: 1,
                        whiteSpace: "pre-wrap",
                        "& p": { margin: 0 },
                      }}
                      component="div"
                      dangerouslySetInnerHTML={{ __html: optionText }}
                    />
                  </Paper>
                );
              })}
            </Stack>
          )}

          {/* TRUE / FALSE */}
          {currentQuestion.type === "truefalse" && (
            <>
              {/* 🖼️ ẢNH MINH HỌA CÂU HỎI */}
              {currentQuestion.questionImage && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                  <Box
                    sx={{
                      maxHeight: 100,           // 🔥 GIẢM NHỎ HƠN
                      maxWidth: "85%",         // 🔥 gọn thêm
                      overflow: "hidden",
                      borderRadius: 1,
                      border: "1px solid #ddd",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: "100px",     // 🔥 khớp khung
                        maxWidth: "100%",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />
                  </Box>
                </Box>
              )}


              {/* ✅ OPTIONS – GIỮ NGUYÊN CHIỀU CAO GỐC */}
              {currentQuestion.options.map((opt, i) => {
                const userAns = answers[currentQuestion.id] || [];
                const selected = userAns[i] ?? "";

                const originalIdx = Array.isArray(currentQuestion.initialOrder)
                  ? currentQuestion.initialOrder[i]
                  : i;

                const correctArray = Array.isArray(currentQuestion.correct)
                  ? currentQuestion.correct
                  : [];

                const correctVal = correctArray[originalIdx] ?? "";

                const showResult = submitted && choXemDapAn;
                const isCorrect = showResult && selected === correctVal;
                const isWrong = showResult && selected !== "" && selected !== correctVal;

                const optionText =
                  typeof opt === "string" ? opt : opt?.text ?? "";

                const optionImage =
                  typeof opt === "object" ? opt?.image ?? null : null;

                return (
                  <Paper
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      borderRadius: 1,
                      minHeight: 40,
                      py: 0.5,
                      px: 1,
                      bgcolor: isCorrect
                        ? "#c8e6c9"
                        : isWrong
                        ? "#ffcdd2"
                        : "transparent",
                      border: "1px solid #90caf9",
                      boxShadow: "none",
                    }}
                  >
                    {optionImage && (
                      <Box
                        component="img"
                        src={optionImage}
                        alt={`truefalse-${i}`}
                        sx={{
                          maxHeight: 40,
                          objectFit: "contain",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      />
                    )}

                    <Typography
                      component="div"
                      sx={{
                        userSelect: "none",
                        fontSize: "1.1rem",
                        lineHeight: 1.5,
                        flex: 1,
                        whiteSpace: "pre-wrap",
                        "& p": { margin: 0 },
                      }}
                      dangerouslySetInnerHTML={{ __html: optionText }}
                    />

                    <FormControl size="small" sx={{ width: 90 }}>
                      <Select
                        value={selected}
                        onChange={(e) => {
                          if (submitted || !started) return;
                          const val = e.target.value;
                          setAnswers((prev) => {
                            const arr = Array.isArray(prev[currentQuestion.id])
                              ? [...prev[currentQuestion.id]]
                              : Array(currentQuestion.options.length).fill("");
                            arr[i] = val;
                            return { ...prev, [currentQuestion.id]: arr };
                          });
                        }}
                        sx={{
                          height: 32,
                          fontSize: "0.95rem",
                          "& .MuiSelect-select": { py: 0.5 },
                        }}
                      >
                        <MenuItem value="Đ">Đúng</MenuItem>
                        <MenuItem value="S">Sai</MenuItem>
                      </Select>
                    </FormControl>
                  </Paper>
                );
              })}
            </>
          )}


          {/* IMAGE MULTIPLE */}
          {currentQuestion.type === "image" && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={2}
              flexWrap="wrap"
              justifyContent="center"
              alignItems="center"
            >
              {currentQuestion.displayOrder.map((optIdx) => {
                const option = currentQuestion.options[optIdx];

                // ✅ ẢNH = option.text
                const imageUrl =
                  typeof option === "string"
                    ? option
                    : option?.text ?? "";

                if (!imageUrl) return null;

                const userAns = answers[currentQuestion.id] || [];
                const checked = userAns.includes(optIdx);

                const isCorrect =
                  submitted && currentQuestion.correct.includes(optIdx);
                const isWrong =
                  submitted && checked && !currentQuestion.correct.includes(optIdx);

                return (
                  <Paper
                    key={optIdx}
                    onClick={() => {
                      if (submitted || !started) return;
                      handleMultipleSelect(
                        currentQuestion.id,
                        optIdx,
                        !checked
                      );
                    }}
                    sx={{
                      width: 150,
                      height: 180,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1,
                      border: "1px solid #90caf9",
                      cursor: submitted || !started ? "default" : "pointer",
                      bgcolor:
                        submitted && choXemDapAn
                          ? isCorrect
                            ? "#c8e6c9"
                            : isWrong
                            ? "#ffcdd2"
                            : "transparent"
                          : "transparent",
                    }}
                  >
                    {/* ✅ IMAGE */}
                    <img
                      src={imageUrl}
                      alt={`option-${optIdx}`}
                      style={{
                        width: "50%",          // 🔥 chiếm 75% chiều rộng khung
                        height: "auto",        // 🔥 giữ tỉ lệ ảnh
                        maxHeight: "100%",     // không tràn khung
                        objectFit: "contain",
                        marginBottom: 6,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />

                    {/* ✅ CHECKBOX */}
                    <Checkbox
                      checked={checked}
                      disabled={submitted || !started}
                    />
                  </Paper>
                );
              })}
            </Stack>
          )}

          {/* FILLBLANK */}
          {currentQuestion.type === "fillblank" && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Stack spacing={2}>
                {/* ======================= HÌNH MINH HỌA ======================= */}
                {currentQuestion.questionImage && (
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <Box
                      sx={{
                        maxHeight: 150,
                        maxWidth: "100%",
                        overflow: "hidden",
                        borderRadius: 2,
                        border: "1px solid #ddd",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        bgcolor: "#fafafa",
                      }}
                    >
                      <img
                        src={currentQuestion.questionImage}
                        alt="Hình minh họa"
                        style={{
                          maxHeight: 150,
                          maxWidth: "100%",
                          objectFit: "contain",
                          cursor: "zoom-in",
                        }}
                        onClick={() => setZoomImage(currentQuestion.questionImage)}
                      />
                    </Box>
                  </Box>
                )}

                {/* ======================= CÂU HỎI + CHỖ TRỐNG ======================= */}
                <Box
                  sx={{
                    width: "100%",
                    lineHeight: 1.6,
                    fontSize: "1.1rem",
                    fontFamily: "Roboto, Arial, sans-serif",
                  }}
                >
                  {currentQuestion.option.split("[...]").map((part, idx) => (
                    <span key={idx}>

                      {/* Text */}
                      <Typography
                        component="span"
                        variant="body1"
                        sx={{
                          mr: 0.5,
                          fontSize: "1.1rem",
                          "& p, & div": { display: "inline", margin: 0 },
                        }}
                        dangerouslySetInnerHTML={{ __html: part }}
                      />

                      {/* Blank */}
                      {idx < currentQuestion.option.split("[...]").length - 1 && (
                        <Droppable droppableId={`blank-${idx}`} direction="horizontal">
                          {(provided) => {
                            const userWord = currentQuestion.filled?.[idx] ?? "";
                            // ✅ đáp án đúng nằm trong options[idx].text
                            const correctObj = currentQuestion.options?.[idx];
                            const correctWord =
                              typeof correctObj === "string"
                                ? correctObj
                                : correctObj?.text ?? "";

                            const color =
                              submitted && userWord
                                ? userWord.trim().toLowerCase() ===
                                  correctWord.trim().toLowerCase()
                                  ? "green"
                                  : "red"
                                : "#000";
                            return (
                              <Box
                                component="span"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: 80,
                                  px: 1,
                                  border: "1px dashed #90caf9",
                                  borderRadius: 1,
                                  fontSize: "1.1rem",
                                  color,
                                }}
                              >
                                {userWord && (
                                  <Draggable
                                    draggableId={`filled-${idx}`}
                                    index={0}
                                    isDragDisabled={submitted || !started}
                                  >
                                    {(prov) => (
                                      <Paper
                                        ref={prov.innerRef}
                                        {...prov.draggableProps}
                                        {...prov.dragHandleProps}
                                        sx={{
                                          px: 2,
                                          py: 0.5,
                                          bgcolor: "#e3f2fd",
                                          cursor: "grab",
                                          minHeight: 30,
                                          border: "1px solid #90caf9",
                                          boxShadow: "none",
                                          color,
                                        }}
                                      >
                                        {userWord}
                                      </Paper>
                                    )}
                                  </Draggable>
                                )}
                                {provided.placeholder}
                              </Box>
                            );
                          }}
                        </Droppable>
                      )}
                    </span>
                  ))}
                </Box>

                {/* ======================= WORD POOL ======================= */}
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ mb: 1, fontWeight: "bold", fontSize: "1.1rem" }}>
                    Các từ cần điền:
                  </Typography>

                  <Droppable droppableId="words" direction="horizontal">
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          p: 1,
                          minHeight: 50,
                          border: "1px solid #90caf9",
                          borderRadius: 2,
                          bgcolor: "#fff",
                        }}
                      >
                        {(currentQuestion.shuffledOptions || currentQuestion.options)
                          .filter(o => !(currentQuestion.filled ?? []).includes(o.text))
                          .map((word, idx) => (
                            <Draggable
                              key={word.text}
                              draggableId={`word-${word.text}`}
                              index={idx}
                              isDragDisabled={submitted || !started}
                            >
                              {(prov) => (
                                <Paper
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  elevation={0}
                                  sx={{
                                    px: 2,
                                    py: 0.5,
                                    bgcolor: "#e3f2fd",
                                    cursor: "grab",

                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",

                                    minHeight: 30,
                                    fontFamily: "Roboto, Arial, sans-serif",
                                    fontSize: "1.1rem",
                                    lineHeight: "normal",

                                    border: "1px solid #90caf9",
                                    boxShadow: "none",

                                    "&:hover": {
                                      bgcolor: "#bbdefb",
                                    },
                                  }}
                                >
                                  {word.text}
                                </Paper>

                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                </Box>

              </Stack>
            </DragDropContext>
          )}

        </Box>
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

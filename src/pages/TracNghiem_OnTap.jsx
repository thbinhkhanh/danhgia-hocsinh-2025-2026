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
import { useLocation, useNavigate } from "react-router-dom";


import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";
import { useSelectedClass } from "../context/SelectedClassContext";
import { exportQuizPDF } from "../utils/exportQuizPDF"; 

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AccessTimeIcon from "@mui/icons-material/AccessTime";


import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import IncompleteAnswersDialog from "../dialog/IncompleteAnswersDialog";
import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ResultDialog from "../dialog/ResultDialog";

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
  const monOnTap = config?.mon || "";

  const [saving, setSaving] = useState(false);
  const [openExitConfirm, setOpenExitConfirm] = useState(false);

  const location = useLocation();
  //const { studentId, studentName, studentClass, selectedWeek, mon } = location.state || {};
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);

  const [hocKi, setHocKi] = useState("");
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
  
  // Lấy trường từ tài khoản đăng nhập
  const account = localStorage.getItem("account") || "";
  const school = account === "TH Lâm Văn Bền" ? account : "TH Bình Khánh";
  const { selectedClass } = useSelectedClass();

  // Lấy lớp từ tên đề
  const detectedClass = selectedExam?.match(/Lớp\s*(\d+)/)?.[1] || "Test";

// Gán thông tin mặc định theo yêu cầu
  const studentInfo = {
    name: "Tên học sinh",
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
    const fetchExams = async () => {
      try {
        if (!selectedClass) return;

        const classNumber = selectedClass.split(".")[0]; // "5" từ "5.A"
        const monFromConfig = config?.mon?.trim();      // Tin học / Công nghệ
        const hocKyFromConfig = config?.hocKy;          // "Cuối kỳ I", "Cả năm", ...
        const namHocFromConfig = config?.namHoc;        // "2025-2026"

        const colName = "NGANHANG_DE"; // cố định

        const snapshot = await getDocs(collection(db, colName));

        // 🔹 map học kỳ sang code trong ID
        const hocKyMap = {
          "Giữa kỳ I": "GKI",
          "Cuối kỳ I": "CKI",
          "Giữa kỳ II": "GKII",
          "Cả năm": "CN",
        };
        const hocKyCode = hocKyMap[hocKyFromConfig] || "";

        // 🔹 tách năm học: "2025-2026" -> "25-26"
        const yearKey = namHocFromConfig
          ? namHocFromConfig.split("-").map(y => y.slice(2)).join("-")
          : "";

        console.log("💠 Lop:", classNumber, "Mon:", monFromConfig, "HocKyCode:", hocKyCode, "YearKey:", yearKey);
        console.log("📋 Tất cả ID trong NGANHANG_DE:", snapshot.docs.map(d => d.id));

        // 🔹 lọc đề
        const exams = snapshot.docs
          .map(d => d.id)
          .filter(id => {
            // ID ví dụ: quiz_Lớp 5_Công nghệ_CKI_25-26 (A)
            const match = id.match(/quiz_Lớp\s*(\d+)_([^_]+)_([^_]+)_([^_ ]+)/i);
            if (!match) return false;

            const lop = match[1];      // "5"
            const mon = match[2];      // "Công nghệ"
            const hocKyId = match[3];  // "CKI"
            const namHocId = match[4]; // "25-26"

            // 🔹 Lọc theo lớp
            if (lop !== classNumber) return false;

            // 🔹 Lọc theo môn
            if (monFromConfig && mon !== monFromConfig) return false;

            // 🔹 Lọc theo học kỳ
            if (hocKyCode && hocKyId !== hocKyCode) return false;

            // 🔹 Lọc theo năm học
            if (yearKey && namHocId !== yearKey) return false;

            // ✅ Không loại bỏ đề (C) nữa

            return true;
          });

        console.log("✅ Đề lọc được:", exams);

        setExamList(exams);

        if (!selectedExam || !exams.includes(selectedExam)) {
          setSelectedExam("");
        }
      } catch (error) {
        console.error("❌ Lỗi tải danh sách đề:", error);
        setExamList([]);
        setSelectedExam("");
      }
    };

    fetchExams();
  }, [selectedClass, config?.mon, config?.hocKy, config?.namHoc]);

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
        let collectionName = "NGANHANG_DE";
        let hocKiFromConfig = "";
        let monHocFromConfig = "";
        let timeLimitMinutes = 0; // ⬅ để lưu thời gian

        // 🔹 Lấy config dựa vào trường
        if (school === "TH Lâm Văn Bền") {
            // 🔹 Lấy lớp học sinh từ studentInfo
            const studentClass = studentInfo?.class || ""; // ví dụ: "3A"
            const classNumber = studentClass.match(/\d+/)?.[0]; // "3A" -> "3"
            if (!classNumber) {
            //setSnackbar({ open: true, message: "❌ Không xác định được lớp của học sinh!", severity: "error" });
            setLoading(false);
            return;
            }
            const classLabel = `Lớp ${classNumber}`; // "Lớp 3"

            // 🔹 Lấy config vẫn từ LAMVANBEN/config
            const lvbConfigRef = doc(db, "LAMVANBEN", "config");
            const lvbConfigSnap = await getDoc(lvbConfigRef);
            prog += 30;
            setProgress(prog);

            if (!lvbConfigSnap.exists()) {
            setSnackbar({ open: true, message: "❌ Không tìm thấy config LAMVANBEN!", severity: "error" });
            setLoading(false);
            return;
            }

            const lvbConfigData = lvbConfigSnap.data();
            hocKiFromConfig = lvbConfigData.hocKy || "";
            monHocFromConfig = lvbConfigData.mon || "";
            timeLimitMinutes = lvbConfigData.timeLimit ?? 0; // ⬅ lấy timeLimit
            setTimeLimitMinutes(timeLimitMinutes);
            setChoXemDiem(lvbConfigData.choXemDiem ?? false);
            setChoXemDapAn(lvbConfigData.choXemDapAn ?? false);

        } else {
            // 🔹 Trường khác, lấy config từ CONFIG/config
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
            
        }

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

              console.log("🔥 RAW MATCHING PAIRS:", pairs);

              const leftOptions = pairs.map((p, idx) => {
                // --- CASE 1: editor lưu { leftImage: { url, name } } ---
                if (p.leftImage && p.leftImage.url) {
                  console.log(`🔥 left[${idx}] = leftImage`, p.leftImage.url);
                  return { type: "image", url: p.leftImage.url, name: p.leftImage.name || `img-${idx}` };
                }

                // --- CASE 2: left là chuỗi URL ---
                if (typeof p.left === "string" && /^https?:\/\//i.test(p.left.trim())) {
                  console.log(`🔥 left[${idx}] = URL`, p.left);
                  return { type: "image", url: p.left.trim(), name: `img-${idx}` };
                }

                // --- CASE 3: để nguyên dạng text ---
                console.log(`🔥 left[${idx}] = text`, p.left);
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

        } catch (err) {
        console.error("❌ Lỗi khi load câu hỏi:", err);
        setQuestions([]);
        } finally {
        setLoading(false);
        }
    };

    fetchQuestions();
 }, [selectedExam]);

  //const studentClass = studentInfo.class;
  //const studentName = studentInfo.name;

  const studentName = location.state?.fullname || "...";
  const studentClass = location.state?.lop || "...";
  
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
  console.log(capitalizeName("thái phạm")); // "Thái Phạm"


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
      setUnansweredQuestions(
        unanswered.map(q => questions.findIndex(item => item.id === q.id) + 1)
      );
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
          const userOrder = Array.isArray(rawAnswer) ? rawAnswer : [];
          const userTexts = userOrder.map(idx => q.options[idx]);
          const correctTexts = Array.isArray(q.correctTexts) ? q.correctTexts : [];

          const isCorrect =
            userTexts.length === correctTexts.length &&
            userTexts.every((t, i) => t === correctTexts[i]);

          if (isCorrect) {
            total += q.score ?? 1;
          }
        } else if (q.type === "matching") {
          const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
          const correctArray = Array.isArray(q.correct) ? q.correct : [];

          const isCorrect =
            userArray.length === correctArray.length &&
            userArray.every((val, i) => val === correctArray[i]);

          if (isCorrect) {
            total += q.score ?? 1;
          }
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

          if (correctAnswers.length > 0 && userAnswers.length === correctAnswers.length) {
            const isAllCorrect = correctAnswers.every((correct, i) =>
              userAnswers[i] && userAnswers[i].trim() === correct.trim()
            );

            if (isAllCorrect) {
              total += q.score ?? 1;
            }
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

      // Tạo tiêu đề PDF
      const quizTitle = `KTĐK${hocKi ? ` ${hocKi.toUpperCase()}` : ""}${monHoc ? ` - ${monHoc.toUpperCase()}` : ""}`;

      // Gọi export PDF
      /*if (xuatFileBaiLam === true) {
        exportQuizPDF(studentInfo, quizClass, questions, answers, total, durationStr, quizTitle);
      }*/

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
          const userOrder = Array.isArray(rawAnswer) ? rawAnswer : [];
          const userTexts = userOrder.map(idx => q.options[idx]);
          const correctTexts = Array.isArray(q.correctTexts) ? q.correctTexts : [];

          const isCorrect =
            userTexts.length === correctTexts.length &&
            userTexts.every((t, i) => t === correctTexts[i]);

          if (isCorrect) {
            total += q.score ?? 1;
          }
        } else if (q.type === "matching") {
          const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
          const correctArray = Array.isArray(q.correct) ? q.correct : [];

          const isCorrect =
            userArray.length === correctArray.length &&
            userArray.every((val, i) => val === correctArray[i]);

          if (isCorrect) {
            total += q.score ?? 1;
          }
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

          if (correctAnswers.length > 0 && userAnswers.length === correctAnswers.length) {
            const isAllCorrect = correctAnswers.every((correct, i) =>
              userAnswers[i] && userAnswers[i].trim() === correct.trim()
            );

            if (isAllCorrect) {
              total += q.score ?? 1;
            }
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

      // Tạo tiêu đề PDF
      const quizTitle = `KTĐK${hocKi ? ` ${hocKi.toUpperCase()}` : ""}${monHoc ? ` - ${monHoc.toUpperCase()}` : ""}`;

      // Gọi export PDF
      /*if (xuatFileBaiLam === true) {
        exportQuizPDF(studentInfo, quizClass, questions, answers, total, durationStr, quizTitle);
      */

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

const formatExamName = (exam) => {
  // Lấy A, B, C...
  const match = exam.match(/\(([^)]+)\)$/);
  const version = match ? match[1] : "";

  // Bỏ quiz_ và phần _CKI_...
  const cleaned = exam
    .replace("quiz_", "")
    .replace(/_CKI_.*/, "");

  // cleaned: "Lớp 4_Tin học"
  const parts = cleaned.split("_");
  const subject = parts[1]; // Tin học / Công nghệ

  return `${subject} (Đề ${version})`;
};

const formatExamTitle = (examName = "") => {
  if (!examName) return "";

  // 1. Loại bỏ prefix "quiz_" nếu có
  let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;

  // 2. Tách các phần theo dấu "_"
  const parts = name.split("_");

  // 3. Tìm lớp
  const classPart = parts.find(p => p.toLowerCase().includes("lớp")) || "";
  const classNumber = classPart.match(/\d+/)?.[0] || "";

  // 4. Tìm chỉ số lớp trong mảng để lấy môn
  const classIndex = parts.indexOf(classPart);

  // 5. Tìm môn: phần ngay sau lớp (hoặc phần đầu nếu lớp là đầu)
  let subjectPart = "";
  for (let i = classIndex + 1; i < parts.length; i++) {
    // bỏ qua CKI, CKII, CN, năm học cuối, chỉ lấy môn
    const p = parts[i];
    if (!p.toLowerCase().includes("cki") && !p.toLowerCase().includes("cn") && !/\d{2}-\d{2}/.test(p)) {
      subjectPart = p;
      break;
    }
  }

  // 6. Tìm phần mở rộng (CKI/CKII/CN) sau môn và lớp
  let extraPart = "";
  for (let i = classIndex + 1; i < parts.length; i++) {
    const p = parts[i];
    if (p.toLowerCase().includes("cki") || p.toLowerCase() === "cn") {
      extraPart = p.toUpperCase();
      break;
    }
  }

  // 7. Tìm ký hiệu đề (A, B, ...) trong ngoặc
  const match = examName.match(/\(([^)]+)\)/);
  const examLetter = match ? match[1] : "";

  // 8. Kết hợp lại
  return `${subjectPart} ${classNumber}${extraPart ? ` - ${extraPart}` : ""} ${examLetter ? `(${examLetter})` : ""}`.trim();
};

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
      {/* 🔹 Thông tin học sinh ở góc trên/trái */}
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
        <Typography variant="subtitle1" fontWeight="bold">
          Tên: {studentName
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')}
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold">
          Lớp: {studentClass}
        </Typography>
      </Box>

      {/* Nút thoát */}
      <>
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

        <ExitConfirmDialog
          open={openExitConfirm}
          onClose={() => setOpenExitConfirm(false)}
        />
      </>

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
          {monOnTap
            ? `ÔN TẬP ${monOnTap.toUpperCase()}`
            : "ÔN TẬP"}
        </Typography>

        {/* Ô chọn đề */}
        <FormControl
          size="small"
          sx={{ width: 250, mb: -2 }}   // 👈 đặt độ rộng tại đây
        >
          <InputLabel
            id="exam-select-label"
            sx={{ fontSize: "16px", fontWeight: "bold" }}
          >
            Chọn đề
          </InputLabel>

          <Select
            labelId="exam-select-label"
            value={selectedExam}
            label="Chọn đề"
            onChange={(e) => setSelectedExam(e.target.value)}
            sx={{ fontSize: "16px", fontWeight: 500 }}
            renderValue={(value) => formatExamTitle(value)}  // ⬅ dùng hàm format
          >
            {examList.map((exam) => (
              <MenuItem key={exam.id || exam} value={exam.id || exam} sx={{ fontSize: "16px" }}>
                {formatExamTitle(exam.id || exam)}  {/* ⬅ dùng hàm format */}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

      </Box>

      {/* Đồng hồ với vị trí cố định */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 0.5,
          mb: -2,
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

      {/* KHU VỰC HIỂN THỊ CÂU HỎI */}
      <Box
        sx={{
          flexGrow: 1,              // ⬅ chiếm toàn bộ chiều cao còn lại
          overflowY: "auto",        // ⬅ chỉ scroll trong khung này
          pr: 1,                    // ⬅ tránh scrollbar che chữ
          mt: 1,
        }}
      >
        {!loading && currentQuestion && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Câu {currentIndex + 1}: {currentQuestion.question}
            </Typography>

            {currentQuestion.image && (
              <Box sx={{ width: "100%", textAlign: "center", mb: 2 }}>
                <img
                  src={currentQuestion.image}
                  alt="question"
                  style={{ 
                    maxWidth: "100%", 
                    maxHeight: 300, 
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
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: 8,
                        marginTop: "-12px",
                      }}
                    />
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

                      // Quy đổi index -> text đang hiển thị theo thứ tự người dùng
                      const userTexts = orderIdx.map((i) => currentQuestion.options[i]);
                      const correctTexts = currentQuestion.correctTexts ?? [];

                      return (
                        <Stack
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          spacing={2}
                        >
                          {orderIdx.map((optIdx, pos) => {
                            const userText = userTexts[pos];
                            const isCorrectPos =
                              submitted &&
                              choXemDapAn &&
                              correctTexts.length === userTexts.length &&
                              userText === correctTexts[pos];

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
                                      bgcolor: submitted && choXemDapAn
                                        ? (isCorrectPos ? "#c8e6c9" : "#ffcdd2")
                                        : (snapshot.isDragging ? "#e3f2fd" : "#fafafa"),
                                      border: "1px solid #90caf9",
                                      cursor: submitted || !started ? "default" : "grab",
                                      boxShadow: snapshot.isDragging ? 3 : 1,
                                      transition: "box-shadow 0.2s ease",
                                      minHeight: 35,
                                      py: 0.75,
                                      px: 1,
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Typography
                                      variant="body1"
                                      fontWeight="400"
                                      sx={{
                                        userSelect: "none",
                                        fontSize: "1.1rem",                // 👈 thêm cỡ chữ 1.1rem
                                        fontFamily: "Arial, Helvetica, sans-serif", // 👈 đồng bộ phông chữ
                                      }}
                                    >
                                      {currentQuestion.options[optIdx]}
                                    </Typography>
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
              <DragDropContext
                onDragEnd={(result) => {
                  if (!result.destination || submitted || !started) return;
  
                  const currentOrder =
                    answers[currentQuestion.id] ??
                    currentQuestion.rightOptions.map((_, idx) => idx);
  
                  const newOrder = reorder(
                    currentOrder,
                    result.source.index,
                    result.destination.index
                  );
  
                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newOrder }));
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="center"
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    overflowX: "hidden",
                    px: 1,
                  }}
                >
                  {/* LEFT COLUMN */}
                  <Stack
                    spacing={1.5}
                    sx={{
                      width: { xs: "calc(50% - 8px)", sm: "calc(50% - 8px)" },
                      maxHeight: { xs: "60vh", sm: "none" },
                      overflowY: { xs: "auto", sm: "visible" },
                      pr: 0.5,
                    }}
                  >
                    {currentQuestion.leftOptions.map((left, i) => {
                      const isImage =
                        (typeof left === "object" && left?.url) ||
                        (typeof left === "string" && /^https?:\/\//i.test(left));
  
                      const imgSrc = typeof left === "object" ? left?.url : left;
  
                      // Chiều cao đồng bộ với cột phải
                      const matchedHeight = isImage ? { xs: 60, sm: 90 } : { xs: 48, sm: 48 };
  
                      return (
                        <Paper
                          key={i}
                          sx={{
                            width: "100%",
                            minHeight: matchedHeight,   // ⭐ luôn dùng matchedHeight
                            height: matchedHeight,      // ⭐ đồng bộ với cột phải
                            px: 0.5,
                            py: 0.5,
  
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
  
                            backgroundColor: isImage ? "#ffffff" : "#fafafa",
                            border: "1px solid #64b5f6",
                            overflow: "hidden",
                            boxSizing: "border-box",
                            textAlign: "center",
                          }}
                        >
                          {isImage ? (
                            <img
                              src={imgSrc}
                              alt={`left-${i}`}
                              style={{
                                maxWidth: "90%",
                                maxHeight: "90%",
                                objectFit: "contain",
                              }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: 400,
                                fontFamily: "Arial, Helvetica, sans-serif",
                                wordBreak: "break-word",
                                whiteSpace: "normal",
                                padding: "4px 2px",
                                width: "100%",
                                textAlign: "center",
                              }}
                            >
                              {left}
                            </span>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
  
                  {/* RIGHT COLUMN */}
                  <Droppable droppableId="right-options">
                    {(provided) => (
                      <Stack
                        spacing={1.5}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          width: { xs: "calc(50% - 8px)", sm: "calc(50% - 8px)" },
                          boxSizing: "border-box",
                          maxHeight: { xs: "60vh", sm: "none" },
                          overflowY: { xs: "auto", sm: "visible" },
                          pl: 0.5,
                        }}
                      >
                        {(answers[currentQuestion.id] ??
                          currentQuestion.rightOptions.map((_, idx) => idx)
                        ).map((optIdx, pos) => {
                          const isCorrect = submitted && currentQuestion.correct[pos] === optIdx;
  
                          // Lấy dữ liệu ở cột trái theo vị trí
                          const left = currentQuestion.leftOptions?.[pos];
  
                          // Kiểm tra có phải hình không
                          const leftIsImage =
                            (typeof left === "object" && left?.url) ||
                            (typeof left === "string" && /^https?:\/\//i.test(left));
  
                          // CHIỀU CAO ĐÃ ĐỒNG BỘ VỚI CỘT TRÁI
                          const matchedHeight = leftIsImage
                            ? { xs: 60, sm: 90 }
                            : { xs: 48, sm: 48 };
  
                          return (
                            <Draggable
                              key={optIdx}
                              draggableId={String(optIdx)}
                              index={pos}
                              isDragDisabled={submitted || !started}
                            >
                              {(provided, snapshot) => (
                                <Paper
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  sx={{
                                    width: "100%",
                                    boxSizing: "border-box",
  
                                    minHeight: matchedHeight,
                                    height: matchedHeight,
  
                                    py: 1,
                                    px: 1,
  
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
  
                                    textAlign: "center",
  
                                    /* GIỮ NGUYÊN FONT */
                                    fontSize: "1.1rem",
                                    fontWeight: 400,
                                    fontFamily: "Arial, Helvetica, sans-serif",
  
                                    wordBreak: "break-word",
                                    whiteSpace: "normal",
  
                                    bgcolor:
                                      submitted && choXemDapAn
                                        ? isCorrect
                                          ? "#c8e6c9"
                                          : "#ffcdd2"
                                        : snapshot.isDragging
                                        ? "#e3f2fd"
                                        : "#fafafa",
  
                                    border: "1px solid #90caf9",
                                    cursor: submitted || !started ? "default" : "grab",
  
                                    boxShadow: snapshot.isDragging ? 3 : 1,
                                    transition: "box-shadow 0.2s ease",
                                  }}
                                >
                                  {/* Kiểm tra hình ở cột phải */}
                                  {(() => {
                                    const rightVal = currentQuestion.rightOptions[optIdx];
  
                                    const rightIsImage =
                                      (typeof rightVal === "object" && rightVal?.url) ||
                                      (typeof rightVal === "string" &&
                                        /^https?:\/\//i.test(rightVal));
  
                                    if (rightIsImage) {
                                      const src =
                                        typeof rightVal === "object" ? rightVal.url : rightVal;
  
                                      return (
                                        <img
                                          src={src}
                                          alt={`right-${optIdx}`}
                                          style={{
                                            maxWidth: "90%",
                                            maxHeight: "90%",
                                            objectFit: "contain",
                                          }}
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.style.display = "none";
                                          }}
                                        />
                                      );
                                    }
  
                                    return (
                                      <span style={{ width: "100%" }}>
                                        {currentQuestion.rightOptions[optIdx]}
                                      </span>
                                    );
                                  })()}
                                </Paper>
                              )}
                            </Draggable>
                          );
                        })}
  
                        {provided.placeholder}
                      </Stack>
                    )}
                  </Droppable>
  
                </Stack>
              </DragDropContext>
            )}


            {/* 1. Single */}
            {currentQuestion.type === "single" && (
              <Stack spacing={2}>
                {/* Hiển thị hình minh họa nếu có, căn giữa */}
                {currentQuestion.questionImage && (
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: 8,
                        marginTop: "-12px", // thay mt: -6, tự viết margin trên style
                      }}
                    />
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

                  return (
                    <Paper
                      key={optIdx}
                      onClick={handleSelect}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        borderRadius: 1,
                        cursor: submitted || !started ? "default" : "pointer",

                        // ⭐ màu nền khi nộp
                        bgcolor:
                          submitted && choXemDapAn
                            ? isCorrect
                              ? "#c8e6c9"
                              : isWrong
                              ? "#ffcdd2"
                              : "#fafafa"
                            : "#fafafa",

                        border: "1px solid #90caf9",

                        // ⭐ CHIỀU CAO GIỐNG SORT
                        minHeight: 30,   // tương đương p:1.5 của sort
                        py: 0.3,
                        px: 1,
                      }}
                    >
                      <Radio
                        checked={selected}
                        onChange={handleSelect}
                        sx={{ mr: 1 }}
                      />

                      <Typography
                        variant="body1"
                        sx={{
                          userSelect: "none",
                          fontSize: "1.1rem",                // 👈 thêm dòng này
                          fontFamily: "Arial, Helvetica, sans-serif", // 👈 nếu muốn đồng bộ phông chữ
                        }}
                      >
                        {currentQuestion.options[optIdx]}
                      </Typography>
                    </Paper>
                  );
                })}
              </Stack>
            )}

            {/* 2. Multiple */}
            {currentQuestion.type === "multiple" && (
              <Stack spacing={2}>
                {/* Hiển thị hình minh họa nếu có, căn giữa */}
                {currentQuestion.questionImage && (
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: 8,
                        marginTop: "-12px", // thay mt: -6, tự viết margin trên style
                      }}
                    />
                  </Box>
                )}

                {currentQuestion.displayOrder.map((optIdx) => {
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
                              : "#fafafa"
                            : "#fafafa",

                        border: "1px solid #90caf9",

                        // ⭐ CHIỀU CAO GIỐNG SORT
                        minHeight: 30,
                        py: 0.3,
                        px: 1,
                      }}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={handleSelect}
                        sx={{ mr: 1 }}
                      />

                      <Typography
                        variant="body1"
                        fontWeight="400"
                        sx={{
                          userSelect: "none",
                          fontSize: "1.1rem",                // 👈 thêm cỡ chữ 1.1rem
                          fontFamily: "Arial, Helvetica, sans-serif", // 👈 đồng bộ phông chữ
                        }}
                      >
                        {currentQuestion.options[optIdx]}
                      </Typography>
                    </Paper>
                  );
                })}
              </Stack>
            )}

            {/* TRUE / FALSE */}
            {currentQuestion.type === "truefalse" && (
              <Stack spacing={2}>
                {/* Hiển thị hình minh họa nếu có, căn giữa */}
                {currentQuestion.questionImage && (
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: 8,
                        marginTop: "-12px", // thay mt: -6, tự viết margin trên style
                      }}
                    />
                  </Box>
                )}
                
                {currentQuestion.options.map((opt, i) => {
                  const userAns = answers[currentQuestion.id] || [];
                  const selected = userAns[i] ?? "";

                  // Lấy index gốc của option đang hiển thị tại vị trí i
                  const originalIdx = Array.isArray(currentQuestion.initialOrder)
                    ? currentQuestion.initialOrder[i]
                    : i;

                  const correctArray = Array.isArray(currentQuestion.correct)
                    ? currentQuestion.correct
                    : [];

                  const correctVal = correctArray[originalIdx] ?? "";

                  const showResult = submitted && choXemDapAn;
                  const isCorrect = showResult && selected === correctVal;
                  const isWrong   = showResult && selected !== "" && selected !== correctVal;

                  return (
                    <Paper
                      key={i}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        minHeight: 30,
                        py: 0.4,
                        px: 1,
                        borderRadius: 1,
                        bgcolor: isCorrect ? "#c8e6c9"
                              : isWrong   ? "#ffcdd2"
                              : "#fafafa",
                        border: "1px solid #90caf9",
                      }}
                    >
                      <Typography
                        variant="body1"
                        fontWeight="400"
                        sx={{
                          userSelect: "none",
                          fontSize: "1.1rem",                // 👈 thêm cỡ chữ 1.1rem
                          fontFamily: "Arial, Helvetica, sans-serif", // 👈 đồng bộ phông chữ
                        }}
                      >
                        {opt}
                      </Typography>

                      <FormControl size="small" sx={{ width: 90 }}>
                        <Select
                          value={selected}
                          onChange={(e) => {
                            if (submitted || !started) return;
                            const val = e.target.value; // "Đ" | "S"
                            setAnswers((prev) => {
                              const arr = Array.isArray(prev[currentQuestion.id])
                                ? [...prev[currentQuestion.id]]
                                : Array(currentQuestion.options.length).fill("");
                              arr[i] = val;
                              return { ...prev, [currentQuestion.id]: arr };
                            });
                          }}
                        >
                          <MenuItem value="Đ">Đúng</MenuItem>
                          <MenuItem value="S">Sai</MenuItem>
                        </Select>
                      </FormControl>
                    </Paper>
                  );
                })}
              </Stack>
            )}

            {/* IMAGE MULTIPLE */}
            {currentQuestion.type === "image" && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                gap={2}
                flexWrap="wrap"
                justifyContent="center"
                alignItems="center"
                width="100%"
              >
                {currentQuestion.displayOrder.map((optIdx) => {
                  const userAns = answers[currentQuestion.id] || [];
                  const checked = userAns.includes(optIdx);

                  const isCorrect = submitted && currentQuestion.correct.includes(optIdx);
                  const isWrong = submitted && checked && !currentQuestion.correct.includes(optIdx);

                  return (
                    <Paper
                      key={optIdx}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                        p: 1,
                        border: "1px solid #90caf9",
                        cursor: submitted || !started ? "default" : "pointer",

                        // --- FIX MOBILE ---
                        width: { xs: "100%", sm: 150 },
                        height: { xs: "auto", sm: 150 },
                        boxSizing: "border-box",
                      }}
                      onClick={() => {
                        if (submitted || !started) return;
                        handleMultipleSelect(currentQuestion.id, optIdx, !checked);
                      }}
                    >
                      <img
                        src={currentQuestion.options[optIdx]}
                        alt={`option ${optIdx + 1}`}
                        style={{
                          maxHeight: 80,
                          maxWidth: "100%",
                          objectFit: "contain",
                          marginBottom: 8,
                        }}
                      />
                      <Checkbox
                        checked={checked}
                        disabled={submitted || !started}
                        onChange={() =>
                          handleMultipleSelect(
                            currentQuestion.id,
                            optIdx,
                            !checked
                          )
                        }
                        sx={{
                          color: !submitted
                            ? undefined
                            : isCorrect
                            ? "#388e3c"
                            : isWrong
                            ? "#d32f2f"
                            : undefined,
                          "&.Mui-checked": {
                            color: !submitted
                              ? undefined
                              : isCorrect
                              ? "#388e3c"
                              : isWrong
                              ? "#d32f2f"
                              : undefined,
                          },
                        }}
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

                  {/* ======================= CÂU HỎI + CHỖ TRỐNG ======================= */}
                  <Box
                      sx={{
                      width: "100%",
                      lineHeight: "1.5rem",
                      fontSize: "1.1rem",
                      whiteSpace: "normal",
                      fontFamily: "Arial, Helvetica, sans-serif",
                      }}
                  >
                      {currentQuestion.option.split("[...]").map((part, idx) => (
                      <span key={idx} style={{ display: "inline", fontFamily: "Roboto, Arial, sans-serif" }}>
                          
                          {/* Phần văn bản */}
                          <Typography
                          component="span"
                          sx={{ mr: 0.5, fontSize: "1.1rem", lineHeight: "1.5rem", verticalAlign: "middle" }}
                          >
                          {part}
                          </Typography>

                          {/* Chỗ trống */}
                          {idx < currentQuestion.option.split("[...]").length - 1 && (
                          <Droppable droppableId={`blank-${idx}`} direction="horizontal">
                              {(provided) => {
                              const userWord = currentQuestion.filled?.[idx] ?? "";
                              const correctWord = currentQuestion.options?.[idx] ?? "";
                              const color =
                                  submitted && userWord
                                  ? userWord.trim() === correctWord.trim()
                                      ? "green"
                                      : "red"
                                  : "#000";

                              return (
                                  <Box
                                  component="span"          // span để inline
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  sx={{
                                      display: "inline-flex", // giữ cùng dòng
                                      alignItems: "baseline", // căn với baseline của text
                                      justifyContent: "center",
                                      minWidth: 80,
                                      maxWidth: 300,
                                      // bỏ minHeight lớn và margin-bottom gây vỡ dòng
                                      px: 1,
                                      border: "1px dashed #90caf9",
                                      borderRadius: 1,
                                      fontFamily: "Arial, Helvetica, sans-serif",
                                      fontSize: "1.1rem",
                                      lineHeight: "normal",
                                      color: color,
                                      verticalAlign: "baseline",
                                  }}
                                  >
                                  {userWord && (
                                      <Draggable draggableId={`filled-${idx}`} index={0}>
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
                                              fontFamily: "Arial, Helvetica, sans-serif",
                                              fontSize: "1.1rem",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              minHeight: 30,
                                              maxWidth: "100%",
                                              color: color,
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

                  {/* ======================= KHU VỰC THẺ TỪ ======================= */}
                  <Box sx={{ mt: 2, textAlign: "left" }}>
                      <Typography sx={{ mb: 1, fontWeight: "bold", fontSize: "1.1rem", fontFamily: "Roboto, Arial, sans-serif" }}>
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
                              minHeight: 50,
                              maxHeight: 80,
                              p: 1,
                              border: "1px solid #90caf9",
                              borderRadius: 2,
                              bgcolor: "white",
                              overflowY: "auto",
                          }}
                          >
                          {(currentQuestion.shuffledOptions || currentQuestion.options)
                              .filter((o) => !(currentQuestion.filled ?? []).includes(o))
                              .map((word, idx) => (
                              <Draggable key={word} draggableId={`word-${word}`} index={idx}>
                                  {(prov) => (
                                  <Paper
                                      ref={prov.innerRef}
                                      {...prov.draggableProps}
                                      {...prov.dragHandleProps}
                                      sx={{
                                      px: 2,
                                      py: 1,
                                      bgcolor: "#e3f2fd",
                                      cursor: "grab",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontFamily: "Arial, Helvetica, sans-serif",
                                      fontSize: "1.1rem",
                                      }}
                                  >
                                      {word}
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
          </>
        )}
      </Box>

      {/* Nút điều hướng và bắt đầu/nộp bài */}
      <Stack
        direction="column"
        sx={{
          width: "100%",
          mt: 3,
          pt: 2,
          borderTop: "1px solid #e0e0e0",
        }}
        spacing={0}
      >
        {started && !loading && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ width: "100%" }}
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
                "&:hover": {
                  bgcolor: currentIndex === 0 ? "#e0e0e0" : "#90caf9",
                },
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
                sx={{
                  width: { xs: "120px", sm: "150px" },
                  borderRadius: 1,
                }}
              >
                Nộp bài
              </Button>
            )}
          </Stack>
        )}
      </Stack>

    </Paper>

    {/* Dialog cảnh báo chưa làm hết */}
    <IncompleteAnswersDialog
      open={openAlertDialog}
      onClose={() => setOpenAlertDialog(false)}
      unansweredQuestions={unansweredQuestions}
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
          p: 3,
          bgcolor: "#e3f2fd",
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
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
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>
          KẾT QUẢ
        </DialogTitle>
        <IconButton
          onClick={() => setOpenResultDialog(false)}
          sx={{
            ml: "auto",
            color: "#f44336",
            "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Nội dung */}
      <DialogContent sx={{ textAlign: "center" }}>
        <Typography sx={{ fontSize: 18, fontWeight: "bold", color: "#0d47a1", mb: 1 }}>
          {studentResult?.hoVaTen?.toUpperCase() || "HỌC SINH"}
        </Typography>

        <Typography sx={{ fontSize: 16, color: "#1565c0", mb: 1 }}>
          Lớp: <span style={{ fontWeight: 600 }}>{studentResult?.lop}</span>
        </Typography>

        {choXemDiem ? (
          <Typography sx={{ fontSize: 16, color: "#0d47a1", mt: 2 }}>
            Điểm:&nbsp;
            <span style={{ fontWeight: 700, color: "red" }}>
              {studentResult?.diem}
            </span>
          </Typography>
        ) : (
          <Typography
            sx={{
              fontSize: 16,
              mt: 2,
              textAlign: "center",
              fontWeight: 700,
              color: "red",
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

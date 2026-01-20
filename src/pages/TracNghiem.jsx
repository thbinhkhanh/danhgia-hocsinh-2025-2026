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
  Card,
} from "@mui/material";
import { doc, getDoc, getDocs, setDoc, collection, updateDoc } from "firebase/firestore";
// Thay cho react-beautiful-dnd
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


import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

import IncompleteAnswersDialog from "../dialog/IncompleteAnswersDialog";
import ExitConfirmDialog from "../dialog/ExitConfirmDialog";
import ResultDialog from "../dialog/ResultDialog";




// Hàm shuffle mảng
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [studentResult, setStudentResult] = useState(null);
  const [fillBlankStatus, setFillBlankStatus] = useState({});
  const [dialogMessage, setDialogMessage] = useState("");

  const [notFoundMessage, setNotFoundMessage] = useState(""); 
  const [selectedExamType, setSelectedExamType] = useState("Giữa kỳ I"); // mặc định
  const [configData, setConfigData] = useState(null);

  const locationState = location.state || {};
  //const { fullname, lop, school, studentId, selectedWeek, mon } = locationState;
  const [studentId, setStudentId] = useState(locationState.studentId || "HS001");
  const [fullname, setFullname] = useState(locationState.fullname || "Test");
  const [lop, setLop] = useState(locationState.lop || "4.1");
  const [selectedWeek, setSelectedWeek] = useState(locationState.selectedWeek || 13);
  const [mon, setMon] = useState(locationState.mon || "Tin học");

  const studentInfo = {
    id: studentId,
    name: fullname,
    className: lop,           // giữ key là className
    //school: school || "",
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

//console.log("📌 studentInfo:", studentInfo);



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
          //console.log("👉 CONFIG DATA:", configData);
          //console.log("👉 kiemTraDinhKi =", configData.kiemTraDinhKi);

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
              d.id.includes(classLabel) && d.id.includes(hocKiCode)
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

            // Nếu sortType là "shuffle" thì đảo, nếu là "fixed" thì giữ nguyên
            const processed =
              q.sortType === "shuffle"
                ? shuffleUntilDifferent(indexed)
                : indexed;

            const shuffledOptions = processed.map(i => i.opt);

            return {
              ...q,
              id: questionId,
              type,
              question: questionText,
              image: q.image ?? null,
              options: shuffledOptions,                    // hiển thị theo shuffle hoặc giữ nguyên
              initialSortOrder: processed.map(i => i.idx), // thứ tự index sau shuffle/giữ nguyên
              correctTexts: options,                       // đáp án đúng: text gốc Firestore
              score: q.score ?? 1,
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
    questions,
    answers,
    startTime,
    db,
    config,
    configData,
    selectedWeek,
    getQuestionMax,

    // state setters
    setSnackbar,
    setSaving,
    setSubmitted,
    setOpenResultDialog,
    setStudentResult,

    // hàm utils
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
        minWidth: { xs: "auto", sm: 700 },   // sửa minWidth giống mẫu
        minHeight: { xs: "auto", sm: 650 },  // sửa minHeight giống mẫu
        display: "flex",
        flexDirection: "column",
        gap: 2,
        position: "relative",
        boxSizing: "border-box",
        backgroundColor: "#fff",             // thêm nền trắng giống mẫu
        pb: 3,
      }}
    >
      {/* Nút thoát */}
      <Tooltip title="Thoát trắc nghiệm" arrow>
        <IconButton
          onClick={() => {
            if (submitted) {
              navigate(-1);
            } else {
              // Nếu không tìm thấy đề thì không mở dialog
              if (!notFoundMessage) {
                setOpenExitConfirm(true);
              } else {
                // Nếu muốn, có thể quay lại luôn
                navigate(-1);
              }
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

      {/* Thông tin học sinh */}
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
          Tên: {capitalizeName(studentInfo.name)}
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
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
                            flex: 1,
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
                              sx={{ flex: 1 }}
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
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <Box
                    sx={{
                      maxHeight: 150,
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
                                  sx={{
                                    px: 2,
                                    py: 0.5,
                                    bgcolor: "#e3f2fd",
                                    cursor: "grab",
                                    minHeight: 30,
                                    border: "1px solid #90caf9",
                                    boxShadow: "none",
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

      {/* Nút điều hướng luôn cố định ở đáy Paper */}
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


      {notFoundMessage && (
        <Card
          sx={{
            bgcolor: "#ffebee",
            border: "1px solid #f44336",
            p: 2,
            mb: 2,
            width: "60%",    // chiếm 50% chiều rộng
            mx: "auto",      // căn giữa ngang
            mt: 4            // optional: thêm khoảng cách từ trên
          }}
        >
          <Typography
            sx={{ color: "#d32f2f", fontWeight: "bold", fontSize: "1.5rem", textAlign: "center" }}
          >
            {notFoundMessage}
          </Typography>
        </Card>
      )}
    </Paper>

    {/* Dialog câu chưa làm */}
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

    {/* Dialog xáchiển thị kết quả */}
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

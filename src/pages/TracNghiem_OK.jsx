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

  const [notFoundMessage, setNotFoundMessage] = useState(""); 
  const [selectedExamType, setSelectedExamType] = useState("Giữa kỳ I"); // mặc định
  const [configData, setConfigData] = useState(null);

  const locationState = location.state || {};
  const { fullname, lop, school, studentId, selectedWeek, mon } = locationState;

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

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        let prog = 0;

        let docId = null;
          let collectionName = "TRACNGHIEM_BK"; // mặc định
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
          if (configData.kiemTraDinhKi === true) {
            // 1️⃣ Lấy tên đề từ DETHI_BK
            const deThiSnap = await getDocs(collection(db, "DETHI_BK"));
            const matchedDeThi = deThiSnap.docs.find(d => d.id.includes(classLabel));

            if (!matchedDeThi) {
              setNotFoundMessage(`❌ Không tìm thấy đề KTĐK ${classLabel}!`);
              setLoading(false);
              return;
            }

            const deThiName = matchedDeThi.id;

            // 2️⃣ Dò tên đề trong TRACNGHIEM_BK
            const tracNghiemSnap = await getDocs(collection(db, "TRACNGHIEM_BK"));
            const matchedDoc = tracNghiemSnap.docs.find(d => d.id === deThiName);

            collectionName = "TRACNGHIEM_BK";
            docId = matchedDoc?.id;

          } else if (configData.baiTapTuan === true) {

            // ⭐ NHÁNH BÀI TẬP TUẦN
            const studentClass = studentInfo.className;
            const classNumber = studentClass.match(/\d+/)?.[0];
            const selectedWeek = studentInfo.selectedWeek;
            const monHoc = studentInfo.mon;

            if (!classNumber || !selectedWeek || !monHoc) {
              showNotFoundDialog("❌ Thiếu thông tin lớp / tuần / môn để mở bài tập tuần!");
              setLoading(false);
              return;
            }

            // → Tạo đúng docId bạn yêu cầu
            const expectedDocId = `quiz_Lớp ${classNumber}_${monHoc}_${selectedWeek}`;
            //console.log("👉 Tìm đề trong BAITAP_TUAN:", expectedDocId);

            // 🔍 Load từ collection BAITAP_TUAN
            const baitapTuanSnap = await getDocs(collection(db, "BAITAP_TUAN"));
            const matchedDoc = baitapTuanSnap.docs.find(d => d.id === expectedDocId);

            // Kiểm tra xem có tìm thấy đề không
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
            const leftOptions = pairs.map(p => p.left);
            const rightOptionsOriginal = pairs.map((p, idx) => ({ opt: p.right, idx }));
            const processedRightOptions = shuffleArray(rightOptionsOriginal);
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
              image: q.image ?? null,          // ✅ Thêm image
              leftOptions, 
              rightOptions: processedRightOptions.map(i => i.opt), 
              correct: newCorrect, 
              score: q.score ?? 1 
            };
          }

          if (type === "sort") {
            const options = Array.isArray(q.options) && q.options.length > 0 ? [...q.options] : ["", "", "", ""];
            const indexed = options.map((opt, idx) => ({ opt, idx }));
            const processed = q.sortType === "shuffle" ? shuffleArray(indexed) : indexed;
            return { 
              ...q, 
              id: questionId, 
              type, 
              question: questionText, 
              image: q.image ?? null,          // ✅ Thêm image
              options, 
              initialSortOrder: processed.map(i => i.idx), 
              correct: options.map((_, i) => i), 
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
            const options = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Đúng", "Sai"];
            const correct = Array.isArray(q.correct) && q.correct.length === options.length ? q.correct : options.map(() => "");
            return { 
              ...q, 
              id: questionId, 
              type, 
              question: questionText, 
              image: q.image ?? null,          // ✅ Thêm image
              options, 
              correct, 
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

  const currentQuestion = questions[currentIndex] || null;
  const isEmptyQuestion = currentQuestion?.question === "";

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const handleCloseSnackbar = (event, reason) => { if (reason === "clickaway") return; setSnackbar(prev => ({ ...prev, open: false })); };

  const handleSubmit = async () => {
    const kiemTraDinhKi = config?.kiemTraDinhKi === true;
    const hocKiConfig = configData.hocKy || "UNKNOWN"; // fallback nếu chưa có
    const hocKiKey = mapHocKyToDocKey(hocKiConfig);
    
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
          const userArray = Array.isArray(rawAnswer) && rawAnswer.length > 0 ? rawAnswer : q.initialSortOrder;
          if (userArray.length === q.correct.length && userArray.every((val, i) => val === q.correct[i])) {
            total += q.score ?? 1;
          }

        } else if (q.type === "matching") {
          const userArray = Array.isArray(rawAnswer) && rawAnswer.length > 0 ? rawAnswer : q.correct;
          if (userArray.length === q.correct.length && userArray.every((val, i) => val === q.correct[i])) {
            total += q.score ?? 1;
          }

        } else if (q.type === "truefalse") {
          const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
          if (userArray.length === q.correct.length && userArray.every((val, i) => val === q.correct[i])) total += q.score ?? 1;

        } else if (q.type === "fillblank") {
            const userAnswers = Array.isArray(rawAnswer) ? rawAnswer : [];
            const correctAnswers = Array.isArray(q.options) ? q.options : [];
            //console.log(`Câu điền khuyết: ${q.question}`);
            //console.log(`Đáp án đúng:`, correctAnswers);
            //console.log(`Đáp án học sinh:`, userAnswers);

            if (correctAnswers.length > 0) {
              const perBlankScore = (q.score ?? 1) / correctAnswers.length;
              correctAnswers.forEach((correct, i) => {
                if (userAnswers[i] && userAnswers[i].trim() === correct.trim()) {
                  total += perBlankScore;
                  //console.log(`Ô thứ ${i + 1} đúng, cộng ${perBlankScore} điểm, tổng: ${total}`);
                } else {
                  //console.log(`Ô thứ ${i + 1} sai hoặc trống`);
                }
              });
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
      exportQuizPDF(studentInfo, studentInfo.className, questions, answers, total, durationStr, quizTitle);

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

       // --- LƯU FIRESTORE ---
      // Lấy key học kỳ từ loại kiểm tra
      if (!configData) return;
      const hocKiKey = mapHocKyToDocKey(configData.hocKy || "UNKNOWN");
      const lop = studentClass;
      const docId = studentInfo.id; // giữ đúng studentId làm key trong KTDK

      if (kiemTraDinhKi) {
        // --- Lưu kết quả cá nhân vào BINHKHANH ---
        const collectionRoot = "BINHKHANH";
        // Dùng tên học sinh chuẩn hóa làm document ID
        const studentDocId = normalizeName(studentName); 
        const docRef = doc(db, `${collectionRoot}/${configData.hocKy}/${lop}/${studentDocId}`);
        await setDoc(docRef, {
          hoVaTen: capitalizeName(studentName),
          lop,
          mon: monHoc,
          diem: total,
          ngayKiemTra,
          thoiGianLamBai: durationStr,
        }, { merge: true });


        // --- Chỉ lưu điểm vào lyThuyet trong KTDK ---
        const ktRef = doc(db, `KTDK/${hocKiKey}`);

        // Kiểm tra nếu document chưa có thì tạo rỗng
        const ktSnap = await getDoc(ktRef);
        if (!ktSnap.exists()) {
          await setDoc(ktRef, {});
        }

        // Lấy dữ liệu hiện tại của lớp nếu có
        const ktData = ktSnap.exists() ? ktSnap.data() : {};
        const lopData = ktData[studentClass] || {};
        const studentData = lopData[docId] || { 
          hoVaTen: capitalizeName(studentInfo.name),
          dgtx: "T",
          dgtx_gv: "",
          mucDat: "",
          nhanXet: "Em học tập nghiêm túc, thao tác nhanh, nắm vững kiến thức Tin học cơ bản.",
          thucHanh: null,
          tongCong: null,
          lyThuyet: null,
        };

        // Cập nhật lyThuyet
        studentData.lyThuyet = total;

        // Ghi lại vào Firestore đúng cấu trúc: lớp -> studentId -> fields
        await setDoc(
          ktRef,
          { 
            [studentClass]: { 
              ...lopData, 
              [docId]: studentData 
            } 
          },
          { merge: true }
        );
      }

 else {
        // --- Lưu vào DGTX (bài tập tuần) ---
        const classKey = config?.mon === "Công nghệ" ? `${studentClass}_CN` : studentClass;
        const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

        const percent = Math.round((total / questions.reduce((sum, q) => sum + (q.score ?? 1), 0)) * 100);
        const resultText = percent >= 75 ? "Hoàn thành tốt" : percent >= 50 ? "Hoàn thành" : "Chưa hoàn thành";

        await updateDoc(tuanRef, {
          [`${studentId}.hoVaTen`]: studentName,
          [`${studentId}.diemTracNghiem`]: resultText,
          [`${studentId}.diemTN`]: percent,
        }).catch(async err => {
          if (err.code === "not-found") {
            await setDoc(tuanRef, {
              [studentId]: {
                hoVaTen: studentName,
                status: "",
                diemTracNghiem: resultText,
                diemTN: percent,
              },
            });
          } else {
            throw err;
          }
        });

        //console.log(`✅ Đã lưu vào DGTX: ${resultText} và diemTN: ${percent} cho học sinh ${studentId}`);
      }

    } catch (err) {
      console.error("❌ Lỗi khi lưu điểm:", err);
    } finally {
      setSaving(false);
    }
  };

  const autoSubmit = async () => {
    if (!studentClass || !studentName) return;

    try {
      setSaving(true);

      // --- Tính điểm thô ---
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
          // Nếu HS chưa tương tác, dùng initialSortOrder
          const userArray = Array.isArray(rawAnswer) && rawAnswer.length > 0 ? rawAnswer : q.initialSortOrder;
          if (userArray.length === q.correct.length && userArray.every((val, i) => val === q.correct[i])) {
            total += q.score ?? 1;
          }

        } else if (q.type === "matching") {
          // Nếu HS chưa tương tác, mặc định coi như sắp xếp đúng nếu muốn
          const userArray = Array.isArray(rawAnswer) && rawAnswer.length > 0 ? rawAnswer : q.correct;
          if (userArray.length === q.correct.length && userArray.every((val, i) => val === q.correct[i])) {
            total += q.score ?? 1;
          }

        } else if (q.type === "truefalse") {
          const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
          if (userArray.length === q.correct.length && userArray.every((val, i) => val === q.correct[i])) total += q.score ?? 1;
        }
      });


      // --- Hiển thị điểm ngay ---
      setScore(total);
      setSubmitted(true);

      // --- Lấy trực tiếp thời gian từ fetchQuestions ---
      const durationSec = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : 0;
      const durationStr = formatTime(durationSec);

      const hocKi = window.currentHocKi || "GKI";
      const monHoc = window.currentMonHoc || "Không rõ";

      // --- Tạo tiêu đề PDF ---
      const quizTitle = `KTĐK${hocKi ? ` ${hocKi.toUpperCase()}` : ""}${monHoc ? ` - ${monHoc.toUpperCase()}` : ""}`;
      const ngayKiemTra = new Date().toLocaleDateString("vi-VN");

      exportQuizPDF(studentInfo, studentInfo.className, questions, answers, total, durationStr, quizTitle);

      // --- Lưu kết quả vào state để hiển thị dialog ---
      setStudentResult({
        hoVaTen: capitalizeName(studentName),
        lop: studentClass,
        diem: total,
      });
      setOpenResultDialog(true);

      // --- Lưu Firestore ---
      const normalizeName = (name) =>
        name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/Đ/g, "D")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");

      const lop = studentClass;
      const docId = normalizeName(studentName);
      const collectionRoot = "Students"; // Bỏ phân biệt trường, dùng chung collection

      const docRef = doc(db, `${collectionRoot}/${hocKi}/${lop}/${docId}`);
      await setDoc(
        docRef,
        {
          hoVaTen: capitalizeName(studentName),
          lop: lop,
          mon: monHoc,
          diem: total,
          ngayKiemTra,
          thoiGianLamBai: durationStr,
        },
        { merge: true }
      );

      //console.log(`✔ AutoSubmit lưu vào ${collectionRoot}:`, hocKi, lop, docId);


    } catch (err) {
      console.error("❌ Lỗi khi autoSubmit:", err);
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

const showNotFoundDialog = (msg) => {
  setDialogMessage(msg);
  setDialogMode("notFound");
  setOpenResultDialog(true);
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
        minHeight: { xs: "auto", sm: 500 },
        display: "flex",
        flexDirection: "column",
        gap: 2,
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
        {!loading && hocKi && monHoc
          ? `KTĐK ${hocKi.toUpperCase()} - ${monHoc.toUpperCase()}`
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

      {/* KHU VỰC HIỂN THỊ CÂU HỎI */}
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
                      marginTop: "-24px",
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
                  {(provided) => (
                    <Stack
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      spacing={2}
                    >
                      {(answers[currentQuestion.id] ??
                        currentQuestion.options.map((_, idx) => idx)
                      ).map((optIdx, pos) => {
                        const isCorrect =
                          submitted && currentQuestion.correct[pos] === optIdx;

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
                                  sx={{ userSelect: "none" }}
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
                  )}
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
                  boxSizing: "border-box",
                  // đảm bảo không tràn ngang
                  overflowX: "hidden",
                  px: 1,
                }}
              >
                {/* Cột trái: width = 50% - gap */}
                <Stack
                  spacing={2}
                  sx={{
                    width: { xs: "calc(50% - 8px)", sm: "calc(50% - 8px)" },
                    boxSizing: "border-box",
                    // nếu danh sách dài, cuộn riêng từng cột
                    maxHeight: { xs: "60vh", sm: "none" },
                    overflowY: { xs: "auto", sm: "visible" },
                    pr: 0.5,
                  }}
                >
                  {currentQuestion.leftOptions.map((left, i) => (
                    <Paper
                      key={i}
                      sx={{
                        width: "100%",           // chiếm toàn bộ cột
                        boxSizing: "border-box",
                        minHeight: 48,
                        py: 1,
                        px: 1,

                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",

                        textAlign: "center",
                        bgcolor: "#fafafa",
                        border: "1px solid #90caf9",

                        fontSize: "0.95rem",
                        fontWeight: 400,
                        fontFamily: "Arial, Helvetica, sans-serif",

                        wordBreak: "break-word", // cho xuống hàng
                        whiteSpace: "normal",
                      }}
                    >
                      {left}
                    </Paper>
                  ))}
                </Stack>

                {/* Cột phải: Droppable */}
                <Droppable droppableId="right-options">
                  {(provided) => (
                    <Stack
                      spacing={2}
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
                                  width: "100%",        // chiếm toàn bộ cột
                                  boxSizing: "border-box",
                                  minHeight: 48,
                                  py: 1,
                                  px: 1,

                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",

                                  textAlign: "center",

                                  fontSize: "0.95rem",
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
                                {currentQuestion.rightOptions[optIdx]}
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
                      marginTop: "-24px", // thay mt: -6, tự viết margin trên style
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

                    <Typography variant="body1" sx={{ userSelect: "none" }}>
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
                      marginTop: "-24px", // thay mt: -6, tự viết margin trên style
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

                    <Typography variant="body1" sx={{ userSelect: "none" }}>
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
                      marginTop: "-24px", // thay mt: -6, tự viết margin trên style
                    }}
                  />
                </Box>
              )}
              
              {currentQuestion.options.map((opt, i) => {
                const userAns = answers[currentQuestion.id] || [];
                const selected = userAns[i] ?? "";

                const correctArray = Array.isArray(currentQuestion.correct)
                  ? currentQuestion.correct
                  : [];

                const correctVal = correctArray[i] ?? "";

                const isCorrect = submitted && selected !== "" && selected === correctVal;
                const isWrong   = submitted && selected !== "" && selected !== correctVal;

                return (
                  <Paper
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",

                      // ⭐ ÁP DỤNG CHIỀU CAO ĐỒNG NHẤT
                      minHeight: 30,
                      py: 0.4,
                      px: 1,

                      borderRadius: 1,
                      bgcolor:
                        submitted && choXemDapAn
                          ? isCorrect
                            ? "#c8e6c9"
                            : isWrong
                            ? "#ffcdd2"
                            : "#fafafa"
                          : "#fafafa",
                      border: "1px solid #90caf9",
                    }}
                  >
                    {/* Text bên trái */}
                    <Typography
                      variant="body1"
                      sx={{
                        userSelect: "none",
                      }}
                    >
                      {opt}
                    </Typography>

                    {/* Select bên phải */}
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
                {/* Câu hỏi với chỗ trống */}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {currentQuestion.option.split("[...]").map((part, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{ mr: 0.5, lineHeight: 1.5 }}
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
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: 80,
                                  maxWidth: 300,
                                  minHeight: 40,
                                  mb: 1,
                                  border: "1px dashed #90caf9",
                                  borderRadius: 1,
                                  px: 1,
                                  fontFamily: "Roboto, Arial, sans-serif",
                                  fontSize: "1rem",
                                  lineHeight: "normal",
                                  color: color, // màu đúng/sai
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
                                          fontFamily: "Roboto, Arial, sans-serif",
                                          fontSize: "1rem",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          minHeight: 30,
                                          maxWidth: "100%",
                                          color: color, // màu đúng/sai cho thẻ
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
                    </Box>
                  ))}
                </Stack>

                {/* Khu vực thẻ từ */}
                <Box sx={{ mt: 2, textAlign: "left" }}>
                  <Typography sx={{ mb: 1, fontWeight: "bold" }}>Các từ cần điền:</Typography>
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
                                    minHeight: 30,
                                    fontFamily: "Roboto, Arial, sans-serif",
                                    fontSize: "1rem",
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

      {/* Nút điều hướng và bắt đầu/nộp bài */}
      <Stack direction="column" sx={{ width: "100%", mt: 3 }} spacing={0}>
        {/*{!started && !loading ? (
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setStarted(true)}
              sx={{ width: { xs: "150px", sm: "150px" } }}
            >
              Bắt đầu
            </Button>
          </Box>
        ) : null}*/}

        {started && !loading && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
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
      </Stack>

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

    {/* Dialog cảnh báo chưa làm hết */}
    <Dialog
      open={openAlertDialog}
      onClose={() => setOpenAlertDialog(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
          bgcolor: "#e3f2fd",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#ffc107",
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
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#ff6f00" }}>
          Chưa hoàn thành
        </DialogTitle>
      </Box>

      <DialogContent>
        <Typography sx={{ fontSize: 16, color: "#6b4c00" }}>
          Bạn chưa chọn đáp án cho câu: {unansweredQuestions.join(", ")}.<br />
          Vui lòng trả lời tất cả câu hỏi trước khi nộp.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="contained"
          color="warning"
          onClick={() => setOpenAlertDialog(false)}
          sx={{ borderRadius: 2, px: 4 }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>

    {/* Dialog xác nhận thoát */}
    <Dialog
      open={openExitConfirm}
      onClose={() => setOpenExitConfirm(false)}
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
          ℹ️
        </Box>
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>
          Xác nhận thoát
        </DialogTitle>
      </Box>

      <DialogContent>
        <Typography sx={{ fontSize: 16, color: "#0d47a1" }}>
          Bạn có chắc chắn muốn thoát khỏi bài trắc nghiệm?<br />
          Mọi tiến trình chưa nộp sẽ bị mất.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="outlined"
          onClick={() => setOpenExitConfirm(false)}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Hủy
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => navigate(-1)}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Thoát
        </Button>
      </DialogActions>
    </Dialog>

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
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#e3f2fd",
          boxShadow: 6,
        },
      }}
    >
      {/* Thanh tiêu đề */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "#1976d2",
          color: "#fff",
          px: 2,
          py: 1.2,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: "bold", fontSize: "1.1rem", letterSpacing: 0.5 }}
        >
          KẾT QUẢ
        </Typography>

        <IconButton
          onClick={() => setOpenResultDialog(false)}
          sx={{ color: "#fff", p: 0.6 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Nội dung */}
      <DialogContent sx={{ mt: 1 }}>
        {dialogMode === "notFound" ? (
          // ❌ Thông báo không tìm thấy đề
          <Stack spacing={2} sx={{ pl: 2.5 }}>
            <Typography
              sx={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "red",
                textAlign: "center",
              }}
            >
              {dialogMessage}
            </Typography>
          </Stack>
        ) : (
          // ✅ Hiển thị kết quả bài kiểm tra
          <Stack spacing={2} sx={{ pl: 2.5 }}>
            {/* Họ và tên */}
            <Typography sx={{ fontSize: "1.15rem" }}>
              Họ và tên:&nbsp;
              <span style={{ fontWeight: 600 }}>
                {studentResult?.hoVaTen?.toUpperCase()}
              </span>
            </Typography>

            {/* Lớp */}
            <Typography sx={{ fontSize: "1.15rem" }}>
              Lớp:&nbsp;
              <span style={{ fontWeight: 600 }}>
                {studentResult?.lop}
              </span>
            </Typography>

            {/* Nếu được xem điểm */}
            {choXemDiem ? (
              <Typography sx={{ fontSize: "1.15rem", mb: 1 }}>
                Điểm:&nbsp;
                <span style={{ fontWeight: 700, color: "red" }}>
                  {studentResult?.diem}
                </span>
              </Typography>
            ) : (
              <Typography
                sx={{
                  fontSize: "1.15rem",
                  mb: 2,
                  textAlign: "center",
                  fontWeight: 700,
                  color: "red",
                }}
              >
                ĐÃ HOÀN THÀNH BÀI KIỂM TRA
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
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

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Card,
  Tooltip,
  Radio, 
  Checkbox,
} from "@mui/material";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

import { db } from "../firebase"; // Firestore instance

import DeleteIcon from "@mui/icons-material/Delete";
import { useConfig } from "../context/ConfigContext";
import { useTracNghiem } from "../context/TracNghiemContext";

import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SaveIcon from "@mui/icons-material/Save";
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddIcon from '@mui/icons-material/Add';

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

/**
 * Phiên bản sửa:
 * - Giữ nguyên giao diện như cũ
 * - Loại bỏ hoàn toàn loại câu hỏi "single" (1 đáp án) và "multiple" (nhiều đáp án)
 * - Chỉ còn 2 loại: "sort" (sắp xếp) và "matching" (ghép đôi)
 */

export default function TracNghiemGV() {
  // ⚙️ State cho dialog mở đề
  const [openDialog, setOpenDialog] = useState(false);
  const [docList, setDocList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isEditingNewDoc, setIsEditingNewDoc] = useState(true);

  const { config: quizConfig, updateConfig: updateQuizConfig } = useTracNghiem();
  const [filterClass, setFilterClass] = useState("Tất cả");

  const [questions, setQuestions] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const { config } = useConfig();
  const deTracNghiem = config.deTracNghiem; // ✅ truy xuất đúng cách

  const hocKyMap = {
    "Giữa kỳ I": { from: 1, to: 9 },
    "Cuối kỳ I": { from: 10, to: 18 },
    "Giữa kỳ II": { from: 19, to: 27 },
    "Cả năm": { from: 28, to: 35 },
  };

  // State cho học kỳ và tuần
  const [semester, setSemester] = useState(config.hocKy || "");
  const [week, setWeek] = useState(config.tuan || 1);

  useEffect(() => {
    const savedId = localStorage.getItem("deTracNghiemId");
    if (savedId) {
      updateQuizConfig({ deTracNghiem: savedId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ khi config thay đổi
  useEffect(() => {
    if (config.hocKy) setSemester(config.hocKy);
    if (config.tuan) setWeek(config.tuan);
  }, [config.hocKy, config.tuan]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const classes = ["Lớp 4", "Lớp 5"];
  const subjects = ["Tin học", "Công nghệ"];

  useEffect(() => {
    const cfg = JSON.parse(localStorage.getItem("teacherConfig") || "{}");
    const savedQuiz = JSON.parse(localStorage.getItem("teacherQuiz") || "[]");

    const isEditingNew = !quizConfig.deTracNghiem; // đang soạn đề mới

    if (!cfg.selectedClass && !cfg.selectedSubject && !savedQuiz.length && !isEditingNew) {
      const fetchInitialQuiz = async () => {
        try {
          const colRef = collection(db, "TRACNGHIEM");
          const snap = await getDocs(colRef);
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

          const initialQuiz = docs.find(d => d.id === quizConfig.deTracNghiem) || docs[0];

          if (initialQuiz) {
            updateQuizConfig({ deTracNghiem: initialQuiz.id });

            setQuestions(initialQuiz.questions || []);
            setSelectedClass(initialQuiz.class || "");
            setSelectedSubject(initialQuiz.subject || "");
            setSemester(initialQuiz.semester || "");
            setWeek(initialQuiz.week || 1);
          }
        } catch (err) {
          console.error("❌ Lỗi khi fetch danh sách đề:", err);
        }
      };

      fetchInitialQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------
  // Load dữ liệu khi mount
  // -----------------------
  useEffect(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem("teacherConfig") || "{}");
      if (cfg?.selectedClass) setSelectedClass(cfg.selectedClass);
      if (cfg?.selectedSubject) setSelectedSubject(cfg.selectedSubject);

      const saved = JSON.parse(localStorage.getItem("teacherQuiz") || "[]");

      if (Array.isArray(saved) && saved.length) {
        const fixed = saved.map(q => {
          // Nếu q.type đã hợp lệ thì giữ nguyên
          if (["single", "multiple", "sort", "matching"].includes(q.type)) {
            return { ...q };
          }

          // Dữ liệu cũ không có type hoặc type lạ → fallback về sort
          return {
            ...q,
            type: "sort",
            options: q.options || ["", "", "", ""],
            correct: q.options ? q.options.map((_, i) => i) : [],
            pairs: [],
          };
        });

        setQuestions(fixed);
      } else {
        // 🔹 Nếu không có dữ liệu → tạo 1 câu hỏi trống
        setQuestions([createEmptyQuestion()]);
      }

    } catch (err) {
      console.error("❌ Không thể load dữ liệu:", err);
      // 🔹 Nếu lỗi → vẫn tạo 1 câu hỏi trống
      setQuestions([createEmptyQuestion()]);
    }
  }, []);


  // 🔹 Lưu config vào localStorage khi thay đổi
  useEffect(() => {
    const cfg = {
      selectedClass,
      selectedSubject,
      semester,
      week,
    };
    localStorage.setItem("teacherConfig", JSON.stringify(cfg));
  }, [selectedClass, selectedSubject, semester, week]);

  // -----------------------
  // Xử lý câu hỏi
  // -----------------------
  const createEmptyQuestion = () => ({
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    question: "",
    type: "single",        // mặc định là 1 lựa chọn
    options: ["", "", "", ""],
    score: 1,
    correct: [],           // chưa có đáp án đúng nào
    sortType: "fixed",
    pairs: [],             // chỉ dùng khi matching
  });


  // Hàm dùng để reorder khi kéo thả (nếu dùng sau)
  function reorder(list, startIndex, endIndex) {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  }

  const handleCreateNewQuiz = () => {
    setSelectedDoc(null);
    setQuestions([createEmptyQuestion()]);
    updateQuizConfig({ deTracNghiem: null });
    setIsEditingNewDoc(true);

    setSelectedClass("");
    setSelectedSubject("");

    localStorage.setItem("teacherQuiz", JSON.stringify([createEmptyQuestion()]));
    localStorage.setItem("teacherConfig", JSON.stringify({
      selectedClass: "",
      selectedSubject: "",
      semester: "",
      week: 1
    }));
  };

  const handleAddQuestion = () => setQuestions((prev) => [...prev, createEmptyQuestion()]);

  const handleDeleteQuestion = (index) => {
    if (window.confirm(`Bạn có chắc muốn xóa câu hỏi ${index + 1}?`)) {
      setQuestions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateQuestionAt = (index, patch) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const isQuestionValid = (q) => {
    if (!q.question?.trim()) return false;
    if (q.score <= 0) return false;

    if (q.type === "sort") {
      const nonEmptyOpts = (q.options || []).filter((o) => o?.trim());
      return nonEmptyOpts.length >= 2;
    }

    if (q.type === "matching") {
      const pairs = q.pairs || [];
      return pairs.length > 0 && pairs.every(p => p.left?.trim() && p.right?.trim());
    }

    if (q.type === "single") {
      return q.options.some((o) => o.trim()) && q.correct?.length === 1;
    }

    if (q.type === "multiple") {
      return q.options.some((o) => o.trim()) && q.correct?.length > 0;
    }

    return false;
  };

  function extractMatchingCorrect(pairs) {
    const correct = {};
    pairs.forEach((p) => {
      correct[p.left.trim()] = p.right.trim();
    });
    return correct;
  }

  const handleSaveAll = async () => {
    const invalid = questions
      .map((q, i) => (!isQuestionValid(q) ? `Câu ${i + 1}` : null))
      .filter(Boolean);

    if (invalid.length > 0) {
      setSnackbar({
        open: true,
        message: `❌ Các câu hỏi chưa hợp lệ: ${invalid.join(", ")}`,
        severity: "error",
      });
      return;
    }

    try {
      // 🔹 Map lại questions để đảm bảo sort/matching có correct
      const questionsToSave = questions.map(q => {
        if (q.type === "matching") {
          return { ...q, correct: q.pairs.map((_, i) => i) };
        }

        if (q.type === "sort") {
          return { ...q, correct: q.options.map((_, i) => i) };
        }

        if (q.type === "single") {
          return { ...q, correct: q.correct?.length ? q.correct : [0] };
        }

        if (q.type === "multiple") {
          return { ...q, correct: q.correct || [] };
        }

        return q;
      });

      // 🔹 Lưu vào localStorage
      localStorage.setItem("teacherQuiz", JSON.stringify(questionsToSave));
      const cfg = { selectedClass, selectedSubject, semester, week };
      localStorage.setItem("teacherConfig", JSON.stringify(cfg));

      if (!selectedClass || !selectedSubject || !week) {
        throw new Error("Vui lòng chọn lớp, môn và tuần trước khi lưu");
      }

      const docId = `quiz_${selectedClass}_${selectedSubject}_${week}`;
      const quizRef = doc(db, "TRACNGHIEM", docId);

      await setDoc(quizRef, {
        class: selectedClass,
        subject: selectedSubject,
        week,
        semester,
        questions: questionsToSave, // 🔹 lưu đúng questions đã chỉnh
      });

      // 🔄 Cập nhật context nếu là đề mới
      const newDoc = { id: docId, class: selectedClass, subject: selectedSubject, week, semester, questions: questionsToSave };
      const existed = quizConfig.quizList?.some((d) => d.id === docId);
      if (!existed) {
        const updatedList = [...(quizConfig.quizList || []), newDoc];
        updateQuizConfig({ quizList: updatedList });
      }

      setSnackbar({
        open: true,
        message: "✅ Đã lưu thành công!",
        severity: "success",
      });
      setIsEditingNewDoc(false);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi lưu đề: ${err.message}`,
        severity: "error",
      });
    }
  };

  // --- Hàm mở dialog và fetch danh sách document ---
  const handleOpenDialog = () => {
    setSelectedDoc(null);
    setFilterClass("Tất cả"); // reset về "Tất cả"
    setOpenDialog(true);
  };

  // 🔹 Hàm lấy danh sách đề trong Firestore
  const fetchQuizList = async () => {
    setLoadingList(true);
    setFilterClass("Tất cả"); // ← reset mỗi khi mở dialog

    try {
      // Nếu context đã có danh sách đề, dùng luôn
      if (quizConfig.quizList && quizConfig.quizList.length > 0) {
        setDocList(quizConfig.quizList);
        // Nếu context có deTracNghiem, đánh dấu là selected
        if (quizConfig.deTracNghiem) setSelectedDoc(quizConfig.deTracNghiem);
      } else {
        // Nếu context chưa có → fetch từ Firestore
        const colRef = collection(db, "TRACNGHIEM");
        const snap = await getDocs(colRef);
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setDocList(docs);

        // Lưu danh sách đề vào context
        updateQuizConfig({ quizList: docs });

        // Nếu context có deTracNghiem → đánh dấu selected
        if (quizConfig.deTracNghiem) setSelectedDoc(quizConfig.deTracNghiem);
      }
    } catch (err) {
      console.error("❌ Lỗi khi lấy danh sách đề:", err);
      setSnackbar({
        open: true,
        message: "❌ Không thể tải danh sách đề!",
        severity: "error",
      });
    } finally {
      setLoadingList(false);
      setOpenDialog(true);
    }
  };

  // 🔹 Hàm mở đề được chọn
  const handleOpenSelectedDoc = async () => {
    if (!selectedDoc) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn một đề trước khi mở.",
        severity: "warning",
      });
      return;
    }

    try {
      const docRef = doc(db, "TRACNGHIEM", selectedDoc);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // 🔹 Cập nhật dữ liệu lên UI
        setQuestions(data.questions || []);
        setSelectedClass(data.class || "");
        setSelectedSubject(data.subject || "");
        setSemester(data.semester || "");
        setWeek(data.week || 1);

        // 🔹 Cập nhật context
        updateQuizConfig({ deTracNghiem: data });

        // 🔹 Ghi vào localStorage để khôi phục sau này
        localStorage.setItem("teacherConfig", JSON.stringify({
          selectedClass: data.class,
          selectedSubject: data.subject,
          semester: data.semester,
          week: data.week,
        }));
        localStorage.setItem("teacherQuiz", JSON.stringify(data.questions));

        // 🔹 Đóng dialog
        setOpenDialog(false);

        // 🔹 Ghi lại tên đề vào CONFIG/config/deTracNghiem
        try {
          const configRef = doc(db, "CONFIG", "config");
          await setDoc(
            configRef,
            { deTracNghiem: selectedDoc },
            { merge: true }
          );
          console.log(`✅ Đã ghi deTracNghiem = "${selectedDoc}" vào CONFIG/config`);
          setIsEditingNewDoc(false);
        } catch (err) {
          console.error("❌ Lỗi khi ghi CONFIG/config/deTracNghiem:", err);
        }

      } else {
        setSnackbar({
          open: true,
          message: "❌ Không tìm thấy đề này!",
          severity: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi mở đề: ${err.message}`,
        severity: "error",
      });
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      createEmptyQuestion(),
    ]);
  };

  const handleDeleteSelectedDoc = async () => {
    if (!selectedDoc) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn một đề trước khi xóa.",
        severity: "warning",
      });
      return;
    }

    const docToDelete = docList.find(d => d.id === selectedDoc);
    const confirm = window.confirm(
      `❗ Bạn có chắc muốn xóa đề: ${docToDelete?.class || "?"} - ${docToDelete?.subject || "?"} - Tuần ${docToDelete?.week || "?"}?`
    );

    // Đóng dialog ngay sau khi xác nhận
    setOpenDialog(false);

    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "TRACNGHIEM", selectedDoc));

      const updatedList = docList.filter((d) => d.id !== selectedDoc);
      setDocList(updatedList);
      updateQuizConfig({ quizList: updatedList });
      setSelectedDoc(null);

      // 🔄 Nếu đề bị xóa trùng với đề đang mở → reset giao diện
      const isCurrentQuizDeleted =
        selectedClass === docToDelete?.class &&
        selectedSubject === docToDelete?.subject &&
        week === docToDelete?.week;

      if (isCurrentQuizDeleted) {
        setQuestions([createEmptyQuestion()]);
        updateQuizConfig({ deTracNghiem: null });
      }

      setSnackbar({
        open: true,
        message: "🗑️ Đã xóa đề thành công!",
        severity: "success",
      });
    } catch (err) {
      console.error("❌ Lỗi khi xóa đề:", err);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi xóa đề: ${err.message}`,
        severity: "error",
      });
    }
  };

  useEffect(() => {
    if (deTracNghiem) {
      setIsEditingNewDoc(false);
    } else {
      setIsEditingNewDoc(true);
    }
  }, [deTracNghiem]);

  return (
    <Box sx={{ minHeight: "100vh", p: 3, backgroundColor: "#e3f2fd", display: "flex", justifyContent: "center" }}>
      <Card elevation={4} sx={{ width: "100%", maxWidth: 970, p: 3, borderRadius: 3, position: "relative" }}>
        {/* Nút New, Mở đề và Lưu đề */}
        <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 8, left: 8 }}>
          {/* Icon New: soạn đề mới */}
          <IconButton onClick={handleCreateNewQuiz} sx={{ color: "#1976d2" }}>
            <AddIcon />
          </IconButton>

          {/* Icon mở đề */}
          <IconButton onClick={fetchQuizList} sx={{ color: "#1976d2" }}>
            <FolderOpenIcon />
          </IconButton>

          {/* Icon lưu đề */}
          <IconButton onClick={handleSaveAll} sx={{ color: "#1976d2" }}>
            <SaveIcon />
          </IconButton>
        </Stack>

        {/* Tiêu đề */}
        <Typography
          variant="h5"
          fontWeight="bold"
          textAlign="center"
          gutterBottom
          sx={{ textTransform: "uppercase", color: "#1976d2", mb: 1 }}
        >
          Tạo đề kiểm tra
        </Typography>

        <Typography
          variant="subtitle1"
          textAlign="center"
          fontWeight="bold"
          sx={{ color: "text.secondary", mb: 3 }}
        >
          {isEditingNewDoc || !selectedClass || !selectedSubject
            ? "🆕 Đang soạn đề mới"
            : `📝 Đề: ${selectedClass} - ${selectedSubject} - Tuần ${week}`}
        </Typography>

        {/* FORM LỚP / MÔN / HỌC KỲ / TUẦN */}
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "row", sm: "row" }} spacing={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Lớp</InputLabel>
                <Select value={selectedClass || ""} onChange={(e) => setSelectedClass(e.target.value)} label="Lớp">
                  {classes?.map((lop) => <MenuItem key={lop} value={lop}>{lop}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Môn học</InputLabel>
                <Select value={selectedSubject || ""} onChange={(e) => setSelectedSubject(e.target.value)} label="Môn học">
                  {subjects?.map((mon) => <MenuItem key={mon} value={mon}>{mon}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: "row", sm: "row" }} spacing={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Học kỳ</InputLabel>
                <Select value={semester || ""} onChange={(e) => setSemester(e.target.value)} label="Học kỳ">
                  {Object.keys(hocKyMap || {}).map((hk) => <MenuItem key={hk} value={hk}>{hk}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Tuần</InputLabel>
                <Select value={week || ""} onChange={(e) => setWeek(Number(e.target.value))} label="Tuần">
                  {semester &&
                    Array.from({ length: hocKyMap[semester].to - hocKyMap[semester].from + 1 }, (_, i) => i + hocKyMap[semester].from)
                      .map((t) => <MenuItem key={t} value={t}>Tuần {t}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Paper>

        {/* DANH SÁCH CÂU HỎI */}
        <Stack spacing={3}>
          {questions.map((q, qi) => (
            <Paper key={q.id || qi} elevation={3} sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Câu hỏi {qi + 1}
              </Typography>

              <TextField
                fullWidth
                multiline
                label="Nội dung câu hỏi"
                value={q.question || ""}
                onChange={(e) => updateQuestionAt(qi, { question: e.target.value })}
                sx={{ mb: 2 }}
              />

              <Stack direction={{ xs: "row", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ width: 180 }}>
                  <InputLabel>Loại câu hỏi</InputLabel>
                  <Select
                    value={q.type}
                    onChange={(e) => {
                      const newType = e.target.value;

                      let patch = { type: newType };

                      if (newType === "sort") {
                        patch.correct = q.options.map((_, i) => i);
                        patch.pairs = [];
                      }

                      if (newType === "matching") {
                        patch.pairs = q.pairs?.length
                          ? q.pairs
                          : Array.from({ length: 4 }, () => ({ left: "", right: "" }));
                      }

                      if (newType === "single") {
                        patch.correct = q.correct?.length ? q.correct : [0];
                        patch.pairs = [];
                      }

                      if (newType === "multiple") {
                        patch.correct = Array.isArray(q.correct) ? q.correct : [];
                        patch.pairs = [];
                      }

                      updateQuestionAt(qi, patch);
                    }}
                    label="Loại câu hỏi"
                  >
                    <MenuItem value="single">Một lựa chọn</MenuItem>
                    <MenuItem value="multiple">Nhiều lựa chọn</MenuItem>
                    <MenuItem value="sort">Sắp xếp</MenuItem>
                    <MenuItem value="matching">Ghép đôi</MenuItem>
                  </Select>


                </FormControl>

                <TextField
                  label="Điểm"
                  type="number"
                  size="small"
                  value={q.score}
                  onChange={(e) => updateQuestionAt(qi, { score: parseFloat(e.target.value) || 1 })}
                  sx={{ width: 80 }}
                />
              </Stack>

              {/* Danh sách đáp án */}
              <Stack spacing={1} sx={{ mb: 2 }}>
                {q.type === "matching" && (
                  <Stack spacing={1}>
                    {q.pairs?.map((pair, pi) => (
                      <Stack key={pi} direction="row" spacing={1} alignItems="center">
                        <TextField
                          label={`A ${pi + 1}`}
                          size="small"
                          value={pair.left}
                          onChange={(e) => {
                            const newPairs = [...q.pairs];
                            newPairs[pi].left = e.target.value;
                            updateQuestionAt(qi, { pairs: newPairs });
                          }}
                          fullWidth
                        />
                        <TextField
                          label={`B ${pi + 1}`}
                          size="small"
                          value={pair.right}
                          onChange={(e) => {
                            const newPairs = [...q.pairs];
                            newPairs[pi].right = e.target.value;
                            updateQuestionAt(qi, { pairs: newPairs });
                          }}
                          fullWidth
                        />

                        {/* 🔹 Icon xóa cặp */}
                        <IconButton
                          onClick={() => {
                            const newPairs = [...q.pairs];
                            newPairs.splice(pi, 1);
                            updateQuestionAt(qi, { pairs: newPairs });
                          }}
                        >
                          <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
                        </IconButton>
                      </Stack>
                    ))}

                    <Button
                      variant="outlined"
                      onClick={() =>
                        updateQuestionAt(qi, {
                          pairs: [...q.pairs, { left: "", right: "" }],
                        })
                      }
                    >
                      Thêm cặp
                    </Button>
                  </Stack>
                )}


                {(q.type === "sort" || q.type === "single" || q.type === "multiple") && (
                  <Stack spacing={1}>
                    {q.options?.map((opt, oi) => (
                      <Stack key={oi} direction="row" spacing={1} alignItems="center">
                        {/* 🔹 Radio / Checkbox đặt trước TextField */}
                        {q.type === "single" && (
                          <Radio
                            checked={q.correct?.[0] === oi}
                            onChange={() => updateQuestionAt(qi, { correct: [oi] })}
                            size="small"
                          />
                        )}
                        {q.type === "multiple" && (
                          <Checkbox
                            checked={q.correct?.includes(oi)}
                            onChange={(e) => {
                              let corr = [...(q.correct || [])];
                              if (e.target.checked) corr.push(oi);
                              else corr = corr.filter((c) => c !== oi);
                              updateQuestionAt(qi, { correct: corr });
                            }}
                            size="small"
                          />
                        )}

                        {/* 🔹 TextField đáp án */}
                        <TextField
                          value={opt}
                          size="small"
                          multiline
                          fullWidth
                          onChange={(e) => {
                            const newOptions = [...q.options];
                            newOptions[oi] = e.target.value;
                            updateQuestionAt(qi, { options: newOptions });
                          }}
                        />

                        {/* 🔹 Icon xóa đáp án */}
                        <IconButton
                          onClick={() => {
                            const newOptions = [...q.options];
                            newOptions.splice(oi, 1);

                            let newCorrect = [...(q.correct || [])];
                            if (q.type === "single") {
                              newCorrect = newCorrect[0] === oi ? [] : newCorrect;
                            } else {
                              newCorrect = newCorrect
                                .filter((c) => c !== oi)
                                .map((c) => (c > oi ? c - 1 : c));
                            }

                            updateQuestionAt(qi, { options: newOptions, correct: newCorrect });
                          }}
                        >
                          <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
                        </IconButton>
                      </Stack>
                    ))}

                    <Button
                      variant="outlined"
                      onClick={() => {
                        const newOptions = [...q.options, ""];
                        updateQuestionAt(qi, { options: newOptions });
                      }}
                    >
                      Thêm mục
                    </Button>
                  </Stack>
                )}



              </Stack>

              {/* Hàng cuối: Kiểu sắp xếp + Hợp lệ + Xóa câu hỏi */}
              <Stack direction={{ xs: "row", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
                <FormControl size="small" sx={{ width: 150 }}>
                  <InputLabel>Kiểu sắp xếp</InputLabel>
                  <Select
                    value={q.sortType || "fixed"}
                    onChange={(e) => updateQuestionAt(qi, { sortType: e.target.value })}
                    label="Kiểu sắp xếp"
                  >
                    <MenuItem value="fixed">Cố định</MenuItem>
                    <MenuItem value="shuffle">Đảo câu</MenuItem>
                  </Select>
                </FormControl>
                <Typography sx={{ color: isQuestionValid(q) ? "green" : "red" }}>
                  {isQuestionValid(q) ? "Hợp lệ" : "Chưa hợp lệ"}
                </Typography>

                {/* Icon xóa câu hỏi với Tooltip */}
                <Tooltip title={`Xóa câu ${qi + 1}`}>
                  <IconButton onClick={() => handleDeleteQuestion(qi)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </Tooltip>

              </Stack>

            </Paper>
          ))}
        </Stack>

        {/* Nút thêm câu hỏi + nút lưu đề */}
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button variant="contained" onClick={addQuestion}>Thêm câu hỏi</Button>
          <Button variant="outlined" color="secondary" onClick={handleSaveAll} disabled={questions.length === 0}>
            Lưu đề
          </Button>
        </Stack>

        {/* DIALOG MỞ ĐỀ */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: 6,
              bgcolor: "#f9f9f9",
            },
          }}
        >
          <DialogTitle
            sx={{
              textAlign: "center",
              py: 1.2,
              fontWeight: "bold",
              fontSize: "1.1rem",
              background: "linear-gradient(to right, #1976d2, #42a5f5)",
              color: "#fff",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            📂 Chọn đề để mở
          </DialogTitle>

          <DialogContent
            dividers
            sx={{
              maxHeight: 320,
              overflowY: "auto",
              px: 2,
              py: 2,
              bgcolor: "#fff",
            }}
          >
            {/* Bộ lọc lớp */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ alignSelf: "center" }}>
                Lọc theo lớp:
              </Typography>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  displayEmpty // để hiển thị giá trị mặc định
                >
                  <MenuItem value="Tất cả">Tất cả</MenuItem>
                  <MenuItem value="Lớp 4">Lớp 4</MenuItem>
                  <MenuItem value="Lớp 5">Lớp 5</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {loadingList ? (
              <Typography align="center" sx={{ py: 4, color: "text.secondary" }}>
                ⏳ Đang tải danh sách đề...
              </Typography>
            ) : docList.length === 0 ? (
              <Typography align="center" sx={{ py: 4, color: "text.secondary" }}>
                Không có đề nào.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {docList
                  .filter((doc) =>
                    filterClass === "Tất cả" ? true : doc.class === filterClass
                  )
                  .map((doc) => {
                    const isSelected = selectedDoc === doc.id;
                    return (
                      <Paper
                        key={doc.id}
                        elevation={isSelected ? 4 : 1}
                        onClick={() => setSelectedDoc(doc.id)}
                        onDoubleClick={() => {
                          setSelectedDoc(doc.id);
                          handleOpenSelectedDoc(doc.id);
                        }}
                        sx={{
                          px: 2,
                          py: 1.1,
                          borderRadius: 2,
                          cursor: "pointer",
                          userSelect: "none",
                          transition: "all 0.2s ease",
                          border: isSelected
                            ? "2px solid #1976d2"
                            : "1px solid #e0e0e0",
                          bgcolor: isSelected ? "#e3f2fd" : "#fff",
                          "&:hover": {
                            boxShadow: 3,
                            bgcolor: isSelected ? "#e3f2fd" : "#f5f5f5",
                          },
                        }}
                      >
                        <Typography variant="body1" fontWeight="600" color="#1976d2">
                          {doc.class} - {doc.subject} - Tuần {doc.week}
                        </Typography>
                      </Paper>
                    );
                  })}
              </Stack>
            )}
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              pb: 2,
              justifyContent: "center",
              gap: 1.5,
            }}
          >
            <Button
              onClick={() => handleOpenSelectedDoc(selectedDoc)}
              variant="contained"
            >
              Mở đề
            </Button>
            <Button
              onClick={handleDeleteSelectedDoc}
              variant="outlined"
              color="error"
            >
              Xóa đề
            </Button>
            <Button
              onClick={() => setOpenDialog(false)}
              variant="outlined"
            >
              Đóng
            </Button>
          </DialogActions>
        </Dialog>

        {/* SNACKBAR */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>

      </Card>
    </Box>
  );
}

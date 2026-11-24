
import React, { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Chip,
  Fade,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

export default function QuestionFormDialog({
  open,
  onClose,
  onSave,
  drawing = false,
  schoolYear = "2025-2026",
}) {
  const [questionInfo, setQuestionInfo] = useState({
    grade: "",
    subject: "",
    week: "",
    lesson: "",
    content: "",
  });

  const [lessonList, setLessonList] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // =========================
  // THÔNG BÁO
  // =========================
  const showNotification = (message, severity = "success") => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  // =========================
  // TẠO ID TÀI LIỆU FIRESTORE
  // =========================
  const getQuestionDocumentId = (grade, subject, week) => {
    return `quiz_Lớp ${grade}_${subject}_${week}`;
  };

  // =========================
  // THAY ĐỔI THÔNG TIN
  // =========================
  const handleQuestionInfoChange = (field, value) => {
    setQuestionInfo((prev) => ({
      ...prev,
      [field]: value,

      ...(field === "grade" || field === "subject"
        ? {
            lesson: "",
          }
        : {}),

      ...(field === "grade" ||
      field === "subject" ||
      field === "week"
        ? {
            content: "",
          }
        : {}),
    }));

    if (field === "grade" || field === "subject") {
      setLessonList([]);
    }
  };

  // =========================
  // TẢI DANH SÁCH BÀI HỌC
  // CHỈ DÀNH CHO MÔN TIN HỌC
  // =========================
  useEffect(() => {
    if (!open) return;

    const { grade, subject } = questionInfo;

    if (!grade || subject !== "Tin học") {
      setLessonList([]);
      setLoadingLessons(false);
      return;
    }

    let cancelled = false;

    const fetchLessonList = async () => {
      setLoadingLessons(true);
      setLessonList([]);

      try {
        const collectionName = `TRACNGHIEM${grade}_New`;

        console.log(
          "Đang tải danh sách bài học:",
          collectionName
        );

        const snapshot = await getDocs(
          collection(db, collectionName)
        );

        const lessons = snapshot.docs
          .map((document) => ({
            id: document.id,
            name: document.id,
          }))
          .sort((a, b) =>
            a.name.localeCompare(b.name, "vi", {
              numeric: true,
            })
          );

        if (!cancelled) {
          console.log("Danh sách bài học:", lessons);
          setLessonList(lessons);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách bài học:", error);

        if (!cancelled) {
          setLessonList([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingLessons(false);
        }
      }
    };

    fetchLessonList();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    questionInfo.grade,
    questionInfo.subject,
  ]);

  // =========================
  // TỰ ĐỘNG TẢI CÂU HỎI FIRESTORE
  // KHI CHỌN LỚP + MÔN + TUẦN
  // =========================
  useEffect(() => {
    if (!open) return;

    const { grade, subject, week } = questionInfo;

    if (!grade || !subject || !week) {
      setLoadingQuestions(false);
      return;
    }

    let cancelled = false;

    const fetchQuestions = async () => {
      setLoadingQuestions(true);

      try {
        const documentId = getQuestionDocumentId(
          grade,
          subject,
          week
        );

        console.log(
          "Đang tải câu hỏi từ Firestore:",
          documentId
        );

        const documentRef = doc(
          db,
          "CAUHOI_NGAUNHIEN",
          documentId
        );

        const snapshot = await getDoc(documentRef);

        if (cancelled) return;

        if (snapshot.exists()) {
          const data = snapshot.data();

          const questions = Array.isArray(data.cauHoi)
            ? data.cauHoi
                .filter((item) => typeof item === "string")
                .map((item) => item.trim())
                .filter(Boolean)
            : [];

          setQuestionInfo((prev) => ({
            ...prev,
            content: questions.join("\n"),
            lesson: data.tenBai || prev.lesson,
          }));

        } else {
          setQuestionInfo((prev) => ({
            ...prev,
            content: "",
          }));

          console.log(
            "Chưa có danh sách câu hỏi:",
            documentId
          );
        }
      } catch (error) {
        console.error("Lỗi tải câu hỏi:", error);

        if (!cancelled) {
          setQuestionInfo((prev) => ({
            ...prev,
            content: "",
          }));

          showNotification(
            "Không thể tải danh sách câu hỏi từ Firestore.",
            "error"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestions();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    questionInfo.grade,
    questionInfo.subject,
    questionInfo.week,
  ]);

  // =========================
  // ĐẾM CÂU HỎI
  // =========================
  const questionCount = questionInfo.content
    .split("\n")
    .filter((item) => item.trim()).length;

  // =========================
  // LƯU CÂU HỎI FIRESTORE
  // =========================
  const handleSave = async () => {
    if (drawing || saving || loadingQuestions) return;

    const list = questionInfo.content
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!questionInfo.grade) {
      showNotification("Vui lòng chọn lớp học.", "warning");
      return;
    }

    if (questionInfo.subject !== "Tin học") {
      showNotification(
        "Hiện tại chỉ hỗ trợ lưu câu hỏi môn Tin học.",
        "warning"
      );
      return;
    }

    if (!questionInfo.week) {
      showNotification("Vui lòng chọn tuần học.", "warning");
      return;
    }

    if (!questionInfo.lesson) {
      showNotification("Vui lòng chọn tên bài học.", "warning");
      return;
    }

    if (!list.length) {
      showNotification(
        "Vui lòng nhập danh sách câu hỏi.",
        "warning"
      );
      return;
    }

    setSaving(true);

    try {
      const documentId = getQuestionDocumentId(
        questionInfo.grade,
        questionInfo.subject,
        questionInfo.week
      );

      const documentData = {
        lop: `Lớp ${questionInfo.grade}`,
        monHoc: questionInfo.subject,
        tuan: Number(questionInfo.week),
        tenBai: questionInfo.lesson,
        cauHoi: list,
        soLuong: list.length,
        namHoc: schoolYear,
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "CAUHOI_NGAUNHIEN", documentId),
        documentData
      );

      showNotification(
        `Đã lưu câu hỏi thành công.`,
        "success"
      );

      // Giữ tương thích với component cha
      onSave?.(list, questionInfo);
    } catch (error) {
      console.error("Lỗi lưu câu hỏi:", error);

      showNotification(
        "Không thể lưu câu hỏi. Vui lòng kiểm tra kết nối và thử lại.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  
return (
  <>
    <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        TransitionComponent={Fade}
        PaperProps={{
            sx: {
            width: "100%",
            maxWidth: 900,
            height: "94dvh",
            maxHeight: "94dvh",
            borderRadius: 4,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "#F8FAFC",
            boxShadow: "0 25px 80px rgba(15,23,42,.25)",
            },
        }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          color: "#fff",
          background:
            "linear-gradient(115deg,#101b3c 0%,#173b82 55%,#087db5 100%)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2.5,
            bgcolor: "rgba(255,255,255,.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <EditNoteRoundedIcon sx={{ fontSize: 27 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={900} fontSize={17}>
            NHẬP CÂU HỎI
          </Typography>

          <Typography
            fontSize={11}
            color="rgba(219,234,254,.85)"
          >
            Thông tin bài học và danh sách câu hỏi
          </Typography>
        </Box>

        <IconButton
          onClick={onClose}
          disabled={drawing || saving}
          size="small"
          sx={{
            color: "#fff",
            bgcolor: "rgba(255,255,255,.12)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,.22)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent
        sx={{
          p: 2.5,
          bgcolor: "#f8fbff",
        }}
      >
        {/* THÔNG TIN BÀI HỌC */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            border: "1px solid #dbeafe",
            bgcolor: "#fff",
          }}
        >
          <Typography
            fontSize={13}
            fontWeight={900}
            color="#172554"
            mb={2}
          >
            <QuizRoundedIcon
              sx={{
                fontSize: 19,
                verticalAlign: "middle",
                mr: 1,
                color: "#2563eb",
              }}
            />
            THÔNG TIN BÀI HỌC
          </Typography>

          <Stack spacing={1.8}>
            <Stack
              direction="row"
              spacing={1.2}
              alignItems="center"
            >
              {/* LỚP */}
              <FormControl fullWidth size="small">
                <InputLabel>Lớp</InputLabel>

                <Select
                  value={questionInfo.grade}
                  label="Lớp"
                  onChange={(e) =>
                    handleQuestionInfoChange(
                      "grade",
                      e.target.value
                    )
                  }
                >
                  {[3, 4, 5].map((grade) => (
                    <MenuItem
                      key={grade}
                      value={String(grade)}
                    >
                      Lớp {grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* MÔN HỌC */}
              <FormControl fullWidth size="small">
                <InputLabel>Môn học</InputLabel>

                <Select
                  value={questionInfo.subject}
                  label="Môn học"
                  onChange={(e) =>
                    handleQuestionInfoChange(
                      "subject",
                      e.target.value
                    )
                  }
                >
                  {["Tin học", "Công nghệ"].map((subject) => (
                    <MenuItem
                      key={subject}
                      value={subject}
                    >
                      {subject}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* TUẦN */}
              <FormControl fullWidth size="small">
                <InputLabel>Tuần</InputLabel>

                <Select
                  value={questionInfo.week}
                  label="Tuần"
                  onChange={(e) =>
                    handleQuestionInfoChange(
                      "week",
                      e.target.value
                    )
                  }
                >
                  {Array.from(
                    { length: 35 },
                    (_, i) => i + 1
                  ).map((week) => (
                    <MenuItem
                      key={week}
                      value={String(week)}
                    >
                      Tuần {week}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* TÊN BÀI */}
            <FormControl fullWidth size="small">
              <InputLabel>Tên bài</InputLabel>

              <Select
                value={questionInfo.lesson}
                label="Tên bài"
                disabled={
                  !questionInfo.grade ||
                  questionInfo.subject !== "Tin học" ||
                  loadingLessons
                }
                onChange={(e) =>
                  handleQuestionInfoChange(
                    "lesson",
                    e.target.value
                  )
                }
              >
                {loadingLessons ? (
                  <MenuItem disabled value="">
                    Đang tải bài học...
                  </MenuItem>
                ) : lessonList.length > 0 ? (
                  lessonList.map((lesson) => (
                    <MenuItem
                      key={lesson.id}
                      value={lesson.id}
                    >
                      {lesson.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled value="">
                    {questionInfo.subject !== "Tin học"
                      ? "Chỉ hỗ trợ bài học môn Tin học"
                      : !questionInfo.grade
                      ? "Chọn lớp trước"
                      : "Không tìm thấy bài học"}
                  </MenuItem>
                )}
              </Select>

              {loadingLessons && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mt: 0.8,
                    ml: 1,
                  }}
                >
                  <CircularProgress size={14} />

                  <Typography
                    fontSize={11}
                    color="text.secondary"
                  >
                    Đang tải danh sách bài học...
                  </Typography>
                </Box>
              )}
            </FormControl>
          </Stack>
        </Paper>

        {/* DANH SÁCH CÂU HỎI */}
        <Paper
          elevation={0}
          sx={{
            mt: 1.8,
            p: 2,
            borderRadius: 3,
            border: "1px solid #dbeafe",
            bgcolor: "#fff",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={1}
          >
            <Typography
              fontSize={13}
              fontWeight={900}
              color="#172554"
            >
              DANH SÁCH CÂU HỎI
            </Typography>

            <Chip
              size="small"
              label={`${questionCount} câu`}
              sx={{
                fontWeight: 800,
                color: "#1d4ed8",
                bgcolor: "#dbeafe",
              }}
            />
          </Stack>

          <Typography
            fontSize={12}
            color="#64748b"
            mb={1}
          >
            Nhập mỗi câu hỏi trên một dòng riêng biệt.
          </Typography>

          {/* TRẠNG THÁI TẢI */}
          {loadingQuestions && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
                p: 1,
                borderRadius: 2,
                bgcolor: "#eff6ff",
              }}
            >
              <CircularProgress size={16} />

              <Typography
                fontSize={12}
                color="#2563eb"
                fontWeight={700}
              >
                Đang tải danh sách câu hỏi...
              </Typography>
            </Box>
          )}

          {/* BẢNG CÂU HỎI GIỐNG EXCEL */}
          <Box
            data-question-table
            sx={{
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "#fff",
            }}
          >
            {/* TIÊU ĐỀ CỘT */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "55px minmax(0, 1fr)",
                bgcolor: "#e8f0fe",
                borderBottom: "1px solid #cbd5e1",
              }}
            >
              <Box
                sx={{
                  py: 1,
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#334155",
                  borderRight: "1px solid #cbd5e1",
                }}
              >
                STT
              </Box>

              <Box
                sx={{
                  py: 1,
                  px: 1.5,
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#334155",
                }}
              >
                NỘI DUNG
              </Box>
            </Box>

            {/* CÁC DÒNG CÂU HỎI */}
            {questionInfo.content.split("\n").map((line, index, lines) => (
              <Box
                key={index}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "55px minmax(0, 1fr)",
                  minHeight: 46,
                  borderBottom:
                    index < lines.length - 1
                      ? "1px solid #e2e8f0"
                      : "none",
                  bgcolor:
                    index % 2 === 0 ? "#fff" : "#f8fafc",
                  "&:focus-within": {
                    bgcolor: "#eff6ff",
                  },
                }}
              >
                {/* SỐ THỨ TỰ */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRight: "1px solid #e2e8f0",
                    color: "#64748b",
                    fontSize: 14,
                    fontWeight: 700,
                    userSelect: "none",
                  }}
                >
                  {index + 1}
                </Box>

                {/* NỘI DUNG CÂU HỎI */}
                <Box
                    component="textarea"
                    value={line}
                    onChange={(e) => {
                        // Tự điều chỉnh chiều cao theo nội dung
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;

                        const updatedLines = lines.slice();
                        updatedLines[index] = e.target.value;
                        handleQuestionInfoChange("content", updatedLines.join("\n"));
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();

                        const updatedLines = lines.slice();
                        updatedLines.splice(index + 1, 0, "");

                        handleQuestionInfoChange("content", updatedLines.join("\n"));

                        const table = e.currentTarget.closest("[data-question-table]");
                        requestAnimationFrame(() => {
                            const inputs = table?.querySelectorAll("textarea");
                            inputs?.[index + 1]?.focus();
                        });
                        }

                        if (
                        e.key === "Backspace" &&
                        line === "" &&
                        lines.length > 1
                        ) {
                        e.preventDefault();

                        const updatedLines = lines.slice();
                        updatedLines.splice(index, 1);

                        handleQuestionInfoChange("content", updatedLines.join("\n"));

                        const table = e.currentTarget.closest("[data-question-table]");
                        requestAnimationFrame(() => {
                            const inputs = table?.querySelectorAll("textarea");
                            inputs?.[Math.max(0, index - 1)]?.focus();
                        });
                        }
                    }}
                    ref={(el) => {
                        if (el) {
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                        }
                    }}
                    rows={1}
                    style={{
                        width: "100%",
                        minHeight: 58,
                        padding: "10px 12px",
                        border: "none",
                        outline: "none",
                        resize: "none",
                        overflow: "hidden",
                        background: "transparent",
                        fontFamily: "inherit",
                        fontSize: 16,
                        lineHeight: 1.6,
                        boxSizing: "border-box",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "break-word",
                        display: "block",
                    }}
                    />
              </Box>
            ))}
          </Box>
        </Paper>

        {/* NÚT LƯU */}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
                variant="contained"
                startIcon={
                saving ? (
                    <CircularProgress size={17} color="inherit" />
                ) : (
                    <SaveRoundedIcon />
                )
                }
                onClick={handleSave}
                disabled={
                !questionInfo.grade ||
                questionInfo.subject !== "Tin học" ||
                !questionInfo.week ||
                !questionInfo.lesson ||
                !questionInfo.content.trim() ||
                drawing ||
                loadingLessons ||
                loadingQuestions ||
                saving
                }
                sx={{
                    mt: 2,
                    width: { xs: "100%", sm: "25%" },
                    py: 1.35,
                    borderRadius: 2.5,
                    fontWeight: 900,
                    fontSize: 13,
                    background: "linear-gradient(90deg,#2563eb,#0284c7)",
                    boxShadow: "0 6px 16px rgba(37,99,235,.22)",
                    "&:hover": {
                        background: "linear-gradient(90deg,#1d4ed8,#0369a1)",
                    },
                    display:
                        !questionInfo.grade ||
                        questionInfo.subject !== "Tin học" ||
                        !questionInfo.week ||
                        !questionInfo.lesson ||
                        !questionInfo.content.trim() ||
                        drawing ||
                        loadingLessons ||
                        loadingQuestions ||
                        saving
                        ? "none"
                        : "inline-flex",
                }}
            >
                {saving ? "ĐANG LƯU..." : "LƯU CÂU HỎI"}
            </Button>
        </Box>
      </DialogContent>
    </Dialog>

    {/* THÔNG BÁO */}
    <Snackbar
      open={notification.open}
      autoHideDuration={4000}
      onClose={() =>
        setNotification((prev) => ({
          ...prev,
          open: false,
        }))
      }
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
    >
      <Alert
        severity={notification.severity}
        variant="filled"
        onClose={() =>
          setNotification((prev) => ({
            ...prev,
            open: false,
          }))
        }
        sx={{ width: "100%" }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  </>
);

}

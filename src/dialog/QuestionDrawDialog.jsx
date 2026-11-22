
import React, { useEffect, useRef, useState } from "react";

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
  CircularProgress,
} from "@mui/material";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import CloseIcon from "@mui/icons-material/Close";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ReplayIcon from "@mui/icons-material/Replay";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";

import QuestionFormDialog from "./QuestionFormDialog";

export default function QuestionDrawDialog({
  open,
  onClose,
  selectedClass,
  week,
}) {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [drawing, setDrawing] = useState(false);

  // Trạng thái tải câu hỏi từ Firestore
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Dialog soạn câu hỏi
  const [openQuestionForm, setOpenQuestionForm] = useState(false);

  const timeoutRef = useRef(null);
  const drawingRef = useRef(false);

  // =====================================================
  // XÁC ĐỊNH LỚP VÀ TUẦN
  // =====================================================

  // Ví dụ: 4.4 => 4
  const grade =
    String(selectedClass || "").match(/\d+/)?.[0] || "";

  // Hỗ trợ week = 10 hoặc "Tuần 10"
  const weekNumber =
    String(week ?? "").match(/\d+/)?.[0] || "";

  // Ví dụ: quiz_Lớp 4_Tin học_10
  const documentId =
    grade && weekNumber
      ? `quiz_Lớp ${grade}_Tin học_${weekNumber}`
      : "";

  // =====================================================
  // TẢI CÂU HỎI TỪ FIRESTORE
  // =====================================================

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchQuestions = async () => {
      setQuestions([]);
      setSelectedQuestion("");
      setLoadError("");

      if (!grade) {
        setLoadingQuestions(false);
        setLoadError("Vui lòng chọn lớp trước khi bốc thăm.");
        return;
      }

      if (!weekNumber) {
        setLoadingQuestions(false);
        setLoadError(
          "Không tìm thấy tuần học trong CONFIG/config/tuan."
        );
        return;
      }

      setLoadingQuestions(true);

      try {
        console.log("Đang tải câu hỏi Firestore:", {
          collection: "CAUHOI_NGAUNHIEN",
          documentId,
          selectedClass,
          week,
        });

        const questionRef = doc(
          db,
          "CAUHOI_NGAUNHIEN",
          documentId
        );

        const snapshot = await getDoc(questionRef);

        if (cancelled) return;

        if (!snapshot.exists()) {
          setQuestions([]);
          setLoadError(
            `Không tìm thấy document: ${documentId}`
          );
          return;
        }

        const data = snapshot.data();

        console.log("Dữ liệu document:", data);

        const questionList = Array.isArray(data.cauHoi)
          ? data.cauHoi
              .filter(
                (item) =>
                  typeof item === "string" &&
                  item.trim() !== ""
              )
              .map((item) => item.trim())
          : [];

        setQuestions(questionList);

        if (questionList.length === 0) {
          setLoadError(
            "Document đã tồn tại nhưng trường cauHoi chưa có dữ liệu hợp lệ."
          );
        }
      } catch (error) {
        console.error(
          "Lỗi tải câu hỏi từ Firestore:",
          error
        );

        if (!cancelled) {
          setQuestions([]);
          setLoadError(
            "Không thể tải câu hỏi từ Firestore. Vui lòng kiểm tra quyền truy cập."
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
  }, [open, grade, weekNumber, documentId]);

  // =====================================================
  // NHẬN DANH SÁCH CÂU HỎI TỪ DIALOG SOẠN
  // =====================================================

  const handleSaveQuestionList = (list, info) => {
    if (drawingRef.current) return;
    if (!Array.isArray(list) || !list.length) return;

    const validQuestions = list.filter(
      (item) =>
        typeof item === "string" && item.trim() !== ""
    );

    if (!validQuestions.length) return;

    setQuestions(validQuestions);
    setSelectedQuestion("");
    setLoadError("");
    setOpenQuestionForm(false);
  };

  // =====================================================
  // BỐC THĂM CÂU HỎI
  // =====================================================

  const drawQuestion = () => {
    if (
      !questions.length ||
      drawingRef.current ||
      loadingQuestions
    ) {
      return;
    }

    drawingRef.current = true;

    setDrawing(true);
    setSelectedQuestion("");

    let count = 0;

    timeoutRef.current = setInterval(() => {
      const randomIndex = Math.floor(
        Math.random() * questions.length
      );

      setSelectedQuestion(questions[randomIndex]);

      count++;

      if (count >= 40) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;

        const finalIndex = Math.floor(
          Math.random() * questions.length
        );

        setSelectedQuestion(questions[finalIndex]);

        drawingRef.current = false;
        setDrawing(false);
      }
    }, 100);
  };

  // =====================================================
  // KHỞI TẠO KHI MỞ DIALOG
  // =====================================================

  useEffect(() => {
    if (open) {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }

      drawingRef.current = false;
      setSelectedQuestion("");
      setDrawing(false);
      setOpenQuestionForm(false);
    }
  }, [open]);

  // =====================================================
  // DỌN BỘ ĐẾM KHI UNMOUNT
  // =====================================================

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }

      drawingRef.current = false;
    };
  }, []);

  // =====================================================
  // ĐÓNG DIALOG
  // =====================================================

  const handleClose = () => {
    if (drawingRef.current) return;

    setOpenQuestionForm(false);
    onClose?.();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            maxWidth: 650,
            background: "#fff",
            boxShadow: "0 25px 80px rgba(15,23,42,.25)",
          },
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            position: "relative",
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            color: "#fff",
            background:
              "linear-gradient(115deg, #101b3c 0%, #173b82 55%, #087db5 100%)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* HIỆU ỨNG ÁNH SÁNG */}
          <Box
            sx={{
              position: "absolute",
              width: 240,
              height: 240,
              borderRadius: "50%",
              right: -100,
              top: -150,
              background:
                "radial-gradient(circle, rgba(56,189,248,.25), transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <Box
            sx={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: "50%",
              left: "35%",
              bottom: -155,
              background:
                "radial-gradient(circle, rgba(99,102,241,.2), transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* NÚT ĐÓNG */}
          <IconButton
            onClick={handleClose}
            disabled={drawing}
            size="small"
            sx={{
              position: "absolute",
              top: 12,
              right: 14,
              zIndex: 3,
              color: "rgba(255,255,255,.9)",
              bgcolor: "rgba(255,255,255,.10)",
              border: "1px solid rgba(255,255,255,.16)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,.2)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              pr: 6,
            }}
          >
            {/* ICON */}
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2.5,
                color: "#fff",
                background:
                  "linear-gradient(145deg, #fbbf24 0%, #f59e0b 45%, #ea580c 100%)",
                boxShadow:
                  "0 4px 14px rgba(245,158,11,.35), inset 0 1px 2px rgba(255,255,255,.4)",
                border: "1px solid rgba(255,255,255,.35)",
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 27 }} />
            </Box>

            {/* TIÊU ĐỀ */}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: { xs: 16, sm: 21 },
                  fontWeight: 900,
                  letterSpacing: { xs: 0.2, sm: 0.6 },
                  lineHeight: 1.25,
                  color: "#fff",
                }}
              >
                BỐC THĂM CÂU HỎI
              </Typography>

              <Typography
                sx={{
                  mt: 0.45,
                  fontSize: { xs: 11, sm: 12 },
                  fontWeight: 500,
                  color: "rgba(219,234,254,.85)",
                  lineHeight: 1.4,
                }}
              >
                Lớp {grade || "—"} · Tin học · Tuần{" "}
                {weekNumber || "—"}
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            {/* NÚT SOẠN CÂU HỎI */}
            <Button
              size="small"
              disabled={drawing}
              onClick={() => setOpenQuestionForm(true)}
              startIcon={<EditNoteRoundedIcon />}
              sx={{
                flexShrink: 0,
                minWidth: 0,
                px: 1.3,
                py: 0.8,
                borderRadius: 2,
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                whiteSpace: "nowrap",
                bgcolor: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.28)",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,.23)",
                },
              }}
            >
              SOẠN CÂU HỎI
            </Button>
          </Box>

          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)",
              opacity: 0.8,
            }}
          />
        </Box>

        {/* NỘI DUNG CHÍNH */}
        <DialogContent
          sx={{
            px: { xs: 1.5, sm: 3 },
            py: 2.5,
            background:
              "linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)",
            overflowY: "auto",
          }}
        >
          {/* THỐNG KÊ */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              minWidth={0}
            >
              <QuizRoundedIcon sx={{ color: "#2563eb" }} />

              <Typography
                color="#1e40af"
                fontWeight={800}
                fontSize={12}
              >
                SỐ CÂU HỎI
              </Typography>
            </Stack>

            <Chip
              label={
                loadingQuestions
                  ? "Đang tải..."
                  : `${questions.length} câu`
              }
              size="small"
              sx={{
                fontWeight: 900,
                color: "#1d4ed8",
                bgcolor: "#dbeafe",
                border: "1px solid #bfdbfe",
              }}
            />
          </Paper>

          {/* VÙNG BỐC THĂM - HỘP BÍ MẬT */}
          <Paper
            elevation={0}
            sx={{
              position: "relative",
              overflow: "hidden",
              mt: 2,
              minHeight: 250,
              boxSizing: "border-box",
              borderRadius: 4,
              border: drawing
                ? "2px solid #818cf8"
                : selectedQuestion
                ? "2px solid #60a5fa"
                : "1px solid #bfdbfe",
              background: drawing
                ? "linear-gradient(135deg,#172554 0%,#312e81 55%,#1e40af 100%)"
                : selectedQuestion
                ? "linear-gradient(135deg,#eff6ff 0%,#dbeafe 55%,#e0f2fe 100%)"
                : "linear-gradient(135deg,#eff6ff 0%,#dbeafe 50%,#f0f9ff 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              px: 2.5,
              py: 3,
              textAlign: "center",
              transition: "background .5s ease, border .5s ease",
              boxShadow: drawing
                ? "0 12px 35px rgba(49,46,129,.25)"
                : "0 8px 25px rgba(37,99,235,.10)",
            }}
          >
            {/* ÁNH SÁNG TRANG TRÍ */}
            <Box
              sx={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: "50%",
                top: -130,
                right: -80,
                background: drawing
                  ? "radial-gradient(circle,rgba(129,140,248,.35),transparent 70%)"
                  : "radial-gradient(circle,rgba(56,189,248,.22),transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <Box
              sx={{
                position: "absolute",
                width: 200,
                height: 200,
                borderRadius: "50%",
                bottom: -130,
                left: -80,
                background: drawing
                  ? "radial-gradient(circle,rgba(56,189,248,.25),transparent 70%)"
                  : "radial-gradient(circle,rgba(129,140,248,.2),transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* TIÊU ĐỀ TRẠNG THÁI */}
            <Typography
              sx={{
                position: "relative",
                zIndex: 2,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1.5,
                color: drawing ? "#c7d2fe" : "#2563eb",
                mb: 2,
              }}
            >
              {loadingQuestions
                ? "ĐANG CHUẨN BỊ..."
                : drawing
                ? "HỘP BÍ MẬT ĐANG MỞ..."
                : selectedQuestion
                ? "🎉 CÂU HỎI MAY MẮN"
                : "BẠN SẼ NHẬN ĐƯỢC CÂU HỎI NÀO?"}
            </Typography>

            {/* HỘP / THẺ CÂU HỎI */}
            {loadingQuestions ? (
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#dbeafe",
                  boxShadow: "0 8px 25px rgba(37,99,235,.15)",
                }}
              >
                <CircularProgress size={42} thickness={4} />
              </Box>
            ) : drawing ? (
              /* TRẠNG THÁI ĐANG QUAY: THẺ BÍ MẬT */
              <Box
                sx={{
                  position: "relative",
                  width: 116,
                  height: 116,
                  perspective: 600,
                  animation: "mysteryFloat 1s ease-in-out infinite",
                  "@keyframes mysteryFloat": {
                    "0%, 100%": {
                      transform: "translateY(0) rotate(-4deg)",
                    },
                    "50%": {
                      transform: "translateY(-9px) rotate(4deg)",
                    },
                  },
                }}
              >
                {/* VÒNG SÁNG */}
                <Box
                  sx={{
                    position: "absolute",
                    inset: -12,
                    borderRadius: 5,
                    border: "2px dashed rgba(191,219,254,.65)",
                    animation: "mysterySpin 5s linear infinite",
                    "@keyframes mysterySpin": {
                      to: { transform: "rotate(360deg)" },
                    },
                  }}
                />

                {/* THẺ */}
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 4,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    background:
                      "linear-gradient(145deg,#38bdf8 0%,#2563eb 48%,#4338ca 100%)",
                    border: "2px solid rgba(255,255,255,.75)",
                    boxShadow:
                      "0 12px 30px rgba(37,99,235,.45), inset 0 1px 8px rgba(255,255,255,.4)",
                    animation: "cardFlip 0.65s ease-in-out infinite alternate",
                    "@keyframes cardFlip": {
                      from: {
                        transform: "rotateY(-18deg) scale(.94)",
                      },
                      to: {
                        transform: "rotateY(18deg) scale(1.04)",
                      },
                    },
                  }}
                >
                  <QuizRoundedIcon
                    sx={{
                      fontSize: 43,
                      mb: 0.5,
                      filter: "drop-shadow(0 3px 5px rgba(0,0,0,.2))",
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 27,
                      fontWeight: 1000,
                      lineHeight: 1,
                      color: "#fff",
                      textShadow: "0 3px 8px rgba(0,0,0,.2)",
                    }}
                  >
                    ?
                  </Typography>
                </Box>
              </Box>
            ) : selectedQuestion ? (
              /* TRẠNG THÁI ĐÃ CHỌN: MỞ THẺ */
              <Fade in timeout={700}>
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    animation: "questionReveal .65s cubic-bezier(.2,.8,.2,1)",
                    "@keyframes questionReveal": {
                      "0%": {
                        opacity: 0,
                        transform: "translateY(25px) scale(.85)",
                      },
                      "70%": {
                        opacity: 1,
                        transform: "translateY(-4px) scale(1.02)",
                      },
                      "100%": {
                        opacity: 1,
                        transform: "translateY(0) scale(1)",
                      },
                    },
                  }}
                >
                  {/* BIỂU TƯỢNG CHÚC MỪNG */}
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      mx: "auto",
                      mb: 1.5,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      background:
                        "linear-gradient(145deg,#fbbf24,#f97316)",
                      boxShadow: "0 6px 18px rgba(249,115,22,.3)",
                      animation: "trophyPop .7s ease-out",
                      "@keyframes trophyPop": {
                        "0%": { transform: "scale(0) rotate(-45deg)" },
                        "75%": { transform: "scale(1.15) rotate(8deg)" },
                        "100%": { transform: "scale(1) rotate(0)" },
                      },
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: 30 }} />
                  </Box>

                  {/* THẺ KẾT QUẢ */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      borderRadius: 3,
                      background: "rgba(255,255,255,.88)",
                      border: "1px solid #bfdbfe",
                      boxShadow: "0 8px 25px rgba(37,99,235,.10)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: 1,
                        color: "#2563eb",
                        mb: 1,
                      }}
                    >
                      CÂU HỎI ĐƯỢC LỰA CHỌN
                    </Typography>

                    <Typography
                      sx={{
                        width: "100%",
                        fontSize: { xs: 16, sm: 19 },
                        fontWeight: 900,
                        color: "#172554",
                        lineHeight: 1.65,
                        overflowWrap: "anywhere",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedQuestion}
                    </Typography>
                  </Paper>

                  
                </Box>
              </Fade>
            ) : (
              /* TRẠNG THÁI CHƯA BỐC THĂM */
              <Box
                sx={{
                  width: 116,
                  height: 116,
                  borderRadius: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  background:
                    "linear-gradient(145deg,#60a5fa 0%,#2563eb 55%,#4338ca 100%)",
                  border: "3px solid #fff",
                  boxShadow: "0 10px 25px rgba(37,99,235,.25)",
                  animation: "idleFloat 2.5s ease-in-out infinite",
                  "@keyframes idleFloat": {
                    "0%,100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-7px)" },
                  },
                }}
              >
                <QuizRoundedIcon sx={{ fontSize: 43, mb: 0.5 }} />
                <Typography
                  sx={{ fontSize: 27, fontWeight: 1000, lineHeight: 1 }}
                >
                  ?
                </Typography>
              </Box>
            )}

            {/* HƯỚNG DẪN / THÔNG BÁO */}
            {!selectedQuestion && (
              <Typography
                sx={{
                  position: "relative",
                  zIndex: 2,
                  mt: 2,
                  fontSize: 13,
                  fontWeight: 600,
                  color: drawing ? "#dbeafe" : loadError ? "#dc2626" : "#64748b",
                  lineHeight: 1.6,
                }}
              >
                {loadingQuestions
                  ? "Vui lòng chờ trong giây lát..."
                  : drawing
                  ? "Đang hồi hộp tìm ra câu hỏi bí mật..."
                  : loadError ||
                    (questions.length
                      ? "Nhấn nút bên dưới để mở hộp câu hỏi bí mật"
                      : "Chưa có câu hỏi để bốc thăm")}
              </Typography>
            )}
          </Paper>


          {/* THÔNG BÁO */}
          <Typography
            sx={{
              textAlign: "center",
              mt: 2,
              mb: 2.5,
              minHeight: 22,
              fontSize: 12,
              color: selectedQuestion ? "#2563eb" : "#64748b",
              fontWeight: 600,
            }}
          >
            {loadingQuestions
              ? "Hệ thống đang tải dữ liệu từ Firestore..."
              : drawing
              ? "Hệ thống đang chọn câu hỏi ngẫu nhiên..."
              : selectedQuestion
              ? "Chúc các em trả lời thật tốt!"
              : loadError
              ? "Chưa thể bắt đầu bốc thăm."
              : "Mỗi câu hỏi đều có cơ hội được chọn."}
          </Typography>

          {/* NÚT BỐC THĂM */}
          <Button
            fullWidth
            disabled={
              drawing ||
              loadingQuestions ||
              questions.length === 0
            }
            onClick={drawQuestion}
            startIcon={
              drawing ? (
                <ShuffleIcon />
              ) : selectedQuestion ? (
                <ReplayIcon />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            sx={{
              py: 1.8,
              borderRadius: 3,
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 0.6,
              color: "#fff",
              background: drawing
                ? "linear-gradient(90deg,#64748b,#94a3b8)"
                : "linear-gradient(90deg,#2563eb,#0ea5e9)",
              boxShadow: "0 7px 18px rgba(37,99,235,.25)",
              "&:hover": {
                background:
                  "linear-gradient(90deg,#1d4ed8,#0284c7)",
                transform: "translateY(-2px)",
                boxShadow: "0 10px 25px rgba(37,99,235,.3)",
              },
              "&.Mui-disabled": {
                color: "#fff",
                opacity: 0.7,
              },
              transition: "all .2s ease",
            }}
          >
            {loadingQuestions
              ? "ĐANG TẢI CÂU HỎI..."
              : drawing
              ? "ĐANG BỐC THĂM..."
              : selectedQuestion
              ? "BỐC THĂM CÂU HỎI TIẾP"
              : "BẮT ĐẦU BỐC THĂM"}
          </Button>

          {!questions.length && !loadingQuestions && (
            <Typography
              sx={{
                mt: 1.5,
                textAlign: "center",
                color: loadError ? "#dc2626" : "#64748b",
                fontSize: 11,
              }}
            >
              {loadError ||
                "Chưa có câu hỏi. Vui lòng soạn câu hỏi để bắt đầu."}
            </Typography>
          )}

          <Typography
            sx={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 11,
              mt: 2.5,
            }}
          >
            HỆ THỐNG HỖ TRỢ GIÁO VIÊN · BÌNH KHÁNH
          </Typography>
        </DialogContent>
      </Dialog>

      {/* DIALOG SOẠN CÂU HỎI RIÊNG */}
      <QuestionFormDialog
        open={openQuestionForm}
        onClose={() => setOpenQuestionForm(false)}
        onSave={handleSaveQuestionList}
        drawing={drawing}
      />
    </>
  );
}

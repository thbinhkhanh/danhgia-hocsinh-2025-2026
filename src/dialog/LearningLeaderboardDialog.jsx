
import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Stack,
  Chip,
  Fade,
  Tooltip,
  CircularProgress,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import { useConfig } from "../context/ConfigContext";
import { StudentContext } from "../context/StudentContext";
import { db } from "../firebase";

import {
  collection,
  getDocs,
} from "firebase/firestore";

// =====================================================
// LẤY TÊN HỌC SINH
// =====================================================
const getStudentName = (student) =>
  student?.hoVaTen ||
  student?.hoTen ||
  student?.tenHocSinh ||
  student?.name ||
  student?.fullName ||
  student?.ten ||
  "";

// =====================================================
// CHUẨN HÓA MÃ LỚP
// =====================================================
const normalizeClassKey = (className = "") =>
  String(className).trim().replace(/\./g, "_");

// =====================================================
// CHUẨN HÓA MÃ NĂM HỌC
// =====================================================
const normalizeYearKey = (year = "2025-2026") =>
  String(year).trim().replace(/-/g, "_");

// =====================================================
// SẮP XẾP TÊN TIẾNG VIỆT TỪ PHẢI SANG TRÁI
// Tên gọi → tên đệm → họ
// =====================================================
const compareVietnameseName = (nameA = "", nameB = "") => {
  const partsA = String(nameA)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .reverse();

  const partsB = String(nameB)
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .reverse();

  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const result = (partsA[i] || "").localeCompare(
      partsB[i] || "",
      "vi",
      { sensitivity: "base" }
    );

    if (result !== 0) return result;
  }

  return 0;
};

// =====================================================
// CHUẨN HÓA DANH SÁCH HỌC SINH
// =====================================================
const normalizeStudentList = (students = []) =>
  students
    .map((student, index) => ({
      id:
        student?.maDinhDanh ||
        student?.id ||
        student?.stt ||
        `student-${index}`,
      name: getStudentName(student),
      score: Number(student?.score) || 0,
      stt: Number(student?.stt) || index + 1,
    }))
    .filter((student) => student.name.trim() !== "")
    .sort((a, b) =>
      compareVietnameseName(a.name, b.name)
    );

// =====================================================
// COMPONENT
// =====================================================
export default function LearningLeaderboardDialog({
  open,
  onClose,
}) {
  const { config } = useConfig();

  const {
    studentData,
    getStudentsForClass,
    setStudentsForClass,
  } = useContext(StudentContext);

  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================================
  // LỚP VÀ NĂM HỌC HIỆN TẠI
  // =====================================================
  const selectedClass = config?.lop || "";
  const selectedYear = config?.namHoc || "2025-2026";

  const classKey = normalizeClassKey(selectedClass);
  const namHocKey = normalizeYearKey(selectedYear);

  // =====================================================
  // LẤY DANH SÁCH HỌC SINH
  // ƯU TIÊN CONTEXT → FIRESTORE → LƯU CONTEXT
  // =====================================================
  useEffect(() => {
    if (!open) return;

    if (!selectedClass) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStudents = async () => {
      try {
        setLoading(true);

        // -------------------------------------------------
        // 1. ƯU TIÊN LẤY DANH SÁCH TỪ STUDENTCONTEXT
        // -------------------------------------------------
        let contextStudents = null;

        // Tìm trong các termDoc đã lưu.
        // Ưu tiên đúng classKey của lớp hiện tại.
        if (studentData && typeof studentData === "object") {
          for (const [termDoc, classList] of Object.entries(studentData)) {
            const students =
              classList?.[classKey] ||
              classList?.[selectedClass];

            if (Array.isArray(students) && students.length > 0) {
              contextStudents = students;
              break;
            }
          }
        }

        // Thử lấy trực tiếp qua helper của Context
        if (
          !contextStudents &&
          typeof getStudentsForClass === "function"
        ) {
          const termDoc =
            config?.termDoc ||
            config?.hocKy ||
            config?.kyHoc;

          if (termDoc) {
            const students = getStudentsForClass(
              termDoc,
              classKey
            );

            if (Array.isArray(students) && students.length > 0) {
              contextStudents = students;
            }
          }
        }

        // -------------------------------------------------
        // 2. CONTEXT CÓ DỮ LIỆU → SỬ DỤNG
        // -------------------------------------------------
        if (contextStudents?.length > 0) {
          const studentList = normalizeStudentList(contextStudents);

          if (!cancelled) {
            setItems(studentList);
            setNewName("");
            setLoading(false);
          }

          return;
        }

        // -------------------------------------------------
        // 3. CONTEXT CHƯA CÓ → TẢI FIRESTORE
        // -------------------------------------------------
        const studentsRef = collection(
          db,
          `DATA_${namHocKey}`,
          classKey,
          "HOCSINH"
        );

        const snapshot = await getDocs(studentsRef);

        const firestoreStudents = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));

        const studentList = normalizeStudentList(firestoreStudents);

        // -------------------------------------------------
        // 4. LƯU DANH SÁCH VÀO STUDENTCONTEXT
        // -------------------------------------------------
        if (typeof setStudentsForClass === "function") {
          const termDoc =
            config?.termDoc ||
            config?.hocKy ||
            config?.kyHoc ||
            "DANH_SACH_HOC_SINH";

          setStudentsForClass(
            termDoc,
            classKey,
            firestoreStudents
          );
        }

        // -------------------------------------------------
        // 5. CẬP NHẬT GIAO DIỆN
        // -------------------------------------------------
        if (!cancelled) {
          setItems(studentList);
          setNewName("");
        }
      } catch (error) {
        console.error(
          "Lỗi tải danh sách học sinh:",
          error
        );

        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStudents();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    selectedClass,
    classKey,
    namHocKey,
    studentData,
    getStudentsForClass,
    setStudentsForClass,
    config?.termDoc,
    config?.hocKy,
    config?.kyHoc,
  ]);

  // =====================================================
  // XẾP HẠNG
  // =====================================================
  const ranking = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          b.score - a.score ||
          compareVietnameseName(a.name, b.name)
      ),
    [items]
  );

  // =====================================================
  // TỔNG ĐIỂM TOÀN LỚP
  // =====================================================
  const totalScore = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.score,
        0
      ),
    [items]
  );

  // =====================================================
  // CỘNG / TRỪ ĐIỂM
  // =====================================================
  const changeScore = (id, amount) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              score: Math.max(0, item.score + amount),
            }
          : item
      )
    );
  };

  // =====================================================
  // THÊM HỌC SINH
  // =====================================================
  const addStudent = () => {
    const name = newName.trim();

    if (!name) return;

    const newStudent = {
      id: `custom-${Date.now()}`,
      name,
      score: 0,
      stt: 999999,
    };

    setItems((prev) => [
      ...prev,
      newStudent,
    ]);

    setNewName("");
  };

  // =====================================================
  // ĐẶT LẠI ĐIỂM
  // =====================================================
  const resetScores = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        score: 0,
      }))
    );
  };

  // =====================================================
  // ĐÓNG DIALOG
  // =====================================================
  const handleClose = (event, reason) => {
    // Không đóng khi bấm ra ngoài Dialog
    if (reason === "backdropClick") return;

    setNewName("");
    onClose?.();
    };

  // =====================================================
  // XẾP HẠNG HUY CHƯƠNG
  // =====================================================
  const getRank = (index) => {
    if (index === 0) {
      return {
        symbol: "🥇",
        color: "#f59e0b",
        background: "#fffbeb",
        border: "#fcd34d",
      };
    }

    if (index === 1) {
      return {
        symbol: "🥈",
        color: "#64748b",
        background: "#f8fafc",
        border: "#cbd5e1",
      };
    }

    if (index === 2) {
      return {
        symbol: "🥉",
        color: "#b45309",
        background: "#fff7ed",
        border: "#fed7aa",
      };
    }

    return {
      symbol: index + 1,
      color: "#64748b",
      background: "#f1f5f9",
      border: "#e2e8f0",
    };
  };

  // =====================================================
  // GIAO DIỆN
  // =====================================================
  return (
    <Dialog
        open={open}
        onClose={(event, reason) => {
            if (
            reason === "backdropClick" ||
            reason === "escapeKeyDown"
            ) {
            return;
            }
            handleClose();
        }}
        disableEscapeKeyDown
        fullWidth
        maxWidth="md"
        TransitionComponent={Fade}
        PaperProps={{
            sx: {
            borderRadius: 4,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 25px 80px rgba(15,23,42,.25)",
            position: "relative",
            height: "94dvh",
            maxHeight: "94dvh",
            display: "flex",
            flexDirection: "column",
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
            "linear-gradient(115deg,#101b3c 0%,#173b82 55%,#087db5 100%)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            right: -100,
            top: -150,
            background:
              "radial-gradient(circle,rgba(56,189,248,.25),transparent 70%)",
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
              "radial-gradient(circle,rgba(99,102,241,.2),transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <IconButton
          onClick={handleClose}
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
          <CloseRoundedIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 1.5 },
            pr: 5,
          }}
        >
          <Box
            sx={{
              width: { xs: 38, sm: 46 },
              height: { xs: 38, sm: 46 },
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 2.5,
              color: "#fff",
              background:
                "linear-gradient(145deg,#fbbf24 0%,#f59e0b 45%,#ea580c 100%)",
              boxShadow: "0 4px 14px rgba(245,158,11,.35)",
              border: "1px solid rgba(255,255,255,.35)",
            }}
          >
            <EmojiEventsRoundedIcon
              sx={{ fontSize: { xs: 23, sm: 29 } }}
            />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: { xs: 14, sm: 21 },
                fontWeight: 900,
                letterSpacing: { xs: 0, sm: 0.6 },
                lineHeight: 1.25,
                color: "#fff",
              }}
            >
              BẢNG THI ĐUA HỌC TẬP
            </Typography>

            <Typography
              sx={{
                mt: 0.45,
                fontSize: { xs: 10, sm: 12 },
                color: "rgba(219,234,254,.85)",
              }}
            >
              {`Lớp ${selectedClass || "Chưa chọn lớp"} · Ghi nhận thành tích học tập`}
            </Typography>
          </Box>

          <Chip
            icon={<GroupsRoundedIcon />}
            label={`${items.length} HS`}
            size="small"
            sx={{
              display: { xs: "none", sm: "flex" },
              height: 32,
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              bgcolor: "rgba(255,255,255,.11)",
              border: "1px solid rgba(255,255,255,.25)",
              "& .MuiChip-icon": {
                color: "#bae6fd",
              },
            }}
          />
        </Box>

        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "2px",
            background:
              "linear-gradient(90deg,transparent,#38bdf8,#818cf8,transparent)",
          }}
        />
      </Box>

      {/* NỘI DUNG */}
      <DialogContent
        sx={{
            px: { xs: 1.5, sm: 3 },
            py: { xs: 1, sm: 1.5 },
            background:
            "linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)",
            display: "flex",
            flexDirection: "column",
            flex: "1 1 0",
            minHeight: 0,
            overflow: "hidden",
        }}
        >
        {!selectedClass && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 2,
              borderRadius: 3,
              textAlign: "center",
              border: "1px dashed #cbd5e1",
              bgcolor: "#fff",
            }}
          >
            <GroupsRoundedIcon
              sx={{
                fontSize: 40,
                color: "#94a3b8",
                mb: 1,
              }}
            />

            <Typography
              sx={{
                fontWeight: 800,
                color: "#475569",
              }}
            >
              Chưa chọn lớp học
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                color: "#64748b",
                mt: 0.5,
              }}
            >
              Vui lòng chọn lớp để tải danh sách học sinh.
            </Typography>
          </Paper>
        )}

        {/* ĐANG TẢI */}
        {loading && selectedClass && (
          <Box
            sx={{
              py: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <CircularProgress size={30} thickness={4} />

            <Typography
              sx={{
                fontSize: 12,
                color: "#2563eb",
                fontWeight: 700,
              }}
            >
              Đang tải danh sách học sinh lớp {selectedClass}...
            </Typography>
          </Box>
        )}

        {/* THỐNG KÊ VÀ XẾP HẠNG */}
        {!loading && selectedClass && (
          <>
            {/* THỐNG KÊ */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2,minmax(0,1fr))",
                  sm: "repeat(3,minmax(0,1fr))",
                },
                gap: 1.2,
                mb: 2.5,
              }}
            >
              {[
                {
                  label: "HỌC SINH",
                  value: items.length,
                  suffix: "em",
                  color: "#2563eb",
                  bg: "#eff6ff",
                  icon: <GroupsRoundedIcon />,
                },
                {
                  label: "TỔNG ĐIỂM",
                  value: totalScore,
                  suffix: "điểm",
                  color: "#059669",
                  bg: "#ecfdf5",
                  icon: <AutoAwesomeRoundedIcon />,
                },
                {
                  label: "DẪN ĐẦU",
                  value: ranking[0]?.score || 0,
                  suffix: "điểm",
                  color: "#d97706",
                  bg: "#fffbeb",
                  icon: <EmojiEventsRoundedIcon />,
                },
              ].map((stat) => (
                <Paper
                  key={stat.label}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#fff",
                    minWidth: 0,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                  >
                    <Box
                      sx={{
                        width: 35,
                        height: 35,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        color: stat.color,
                        bgcolor: stat.bg,
                        flexShrink: 0,
                      }}
                    >
                      {stat.icon}
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#94a3b8",
                        }}
                      >
                        {stat.label}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: { xs: 17, sm: 21 },
                          fontWeight: 900,
                          color: stat.color,
                          lineHeight: 1.3,
                        }}
                      >
                        {stat.value}
                        <Typography
                          component="span"
                          sx={{
                            ml: 0.5,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {stat.suffix}
                        </Typography>
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Box>

            {/* TIÊU ĐỀ BẢNG XẾP HẠNG */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
              sx={{ mb: 1.5 }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: { xs: 14, sm: 16 },
                    fontWeight: 900,
                    color: "#172554",
                  }}
                >
                  BẢNG XẾP HẠNG
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11,
                    color: "#64748b",
                    mt: 0.3,
                  }}
                >
                  Thành tích được sắp xếp tự động theo điểm
                </Typography>
              </Box>

              <Button
                size="small"
                color="warning"
                startIcon={<RestartAltRoundedIcon />}
                onClick={resetScores}
                disabled={items.length === 0}
                sx={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "none",
                }}
              >
                Đặt lại điểm
              </Button>
            </Stack>

            {/* HỌC SINH DẪN ĐẦU */}
            {ranking.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  mb: 2,
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  border: "1px solid #fcd34d",
                  background:
                    "linear-gradient(120deg,#fffbeb 0%,#fff7d6 55%,#fff 100%)",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    right: -15,
                    top: -20,
                    opacity: 0.12,
                    transform: "rotate(15deg)",
                  }}
                >
                  <EmojiEventsRoundedIcon
                    sx={{
                      fontSize: 110,
                      color: "#d97706",
                    }}
                  />
                </Box>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "#fef3c7",
                      border: "1px solid #fcd34d",
                      fontSize: 27,
                      flexShrink: 0,
                    }}
                  >
                    🥇
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10,
                        fontWeight: 900,
                        color: "#b77900",
                        letterSpacing: 1,
                      }}
                    >
                      HỌC SINH DẪN ĐẦU
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.4,
                        fontSize: { xs: 16, sm: 20 },
                        fontWeight: 900,
                        color: "#172554",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {ranking[0].name}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: 20, sm: 25 },
                        fontWeight: 900,
                        color: "#d97706",
                      }}
                    >
                      {ranking[0].score}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 10,
                        color: "#92400e",
                        fontWeight: 700,
                      }}
                    >
                      ĐIỂM
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* DANH SÁCH XẾP HẠNG */}
            {ranking.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  py: 5,
                  borderRadius: 3,
                  textAlign: "center",
                  border: "1px dashed #cbd5e1",
                  bgcolor: "#fff",
                }}
              >
                <GroupsRoundedIcon
                  sx={{
                    fontSize: 42,
                    color: "#94a3b8",
                    mb: 1,
                  }}
                />

                <Typography
                  sx={{
                    fontWeight: 800,
                    color: "#475569",
                    fontSize: 14,
                  }}
                >
                  Chưa có danh sách học sinh
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12,
                    color: "#94a3b8",
                    mt: 0.5,
                  }}
                >
                  Không tìm thấy học sinh trong lớp {selectedClass}.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={1}>
                {ranking.map((item, index) => {
                  const rank = getRank(index);

                  return (
                    <Paper
                      key={item.id}
                      elevation={0}
                      sx={{
                        p: { xs: 1.2, sm: 1.5 },
                        borderRadius: 2.5,
                        border: `1px solid ${rank.border}`,
                        bgcolor: index === 0 ? "#fffdf5" : "#fff",
                        transition: "all .2s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow:
                            "0 5px 15px rgba(15,23,42,.07)",
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.2}
                      >
                        {/* THỨ HẠNG */}
                        <Box
                          sx={{
                            width: 37,
                            height: 37,
                            flexShrink: 0,
                            borderRadius: 2,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: rank.background,
                            color: rank.color,
                            fontWeight: 900,
                            fontSize: index < 3 ? 21 : 14,
                            border: `1px solid ${rank.border}`,
                          }}
                        >
                          {rank.symbol}
                        </Box>

                        {/* TÊN HỌC SINH */}
                        <Box
                          sx={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: { xs: 12, sm: 14 },
                              fontWeight: 800,
                              color: "#1e293b",
                              overflowWrap: "anywhere",
                              lineHeight: 1.4,
                            }}
                          >
                            {item.name}
                          </Typography>

                          {index === 0 && (
                            <Typography
                              sx={{
                                fontSize: 10,
                                color: "#d97706",
                                fontWeight: 800,
                                mt: 0.2,
                              }}
                            >
                              HẠNG NHẤT
                            </Typography>
                          )}
                        </Box>

                        {/* ĐIỂM */}
                        <Chip
                          label={`${item.score} điểm`}
                          size="small"
                          sx={{
                            height: 27,
                            fontWeight: 900,
                            fontSize: 11,
                            color:
                              index === 0 ? "#92400e" : "#334155",
                            bgcolor:
                              index === 0 ? "#fef3c7" : "#f1f5f9",
                            border: "1px solid #e2e8f0",
                            flexShrink: 0,
                          }}
                        />

                        {/* NÚT CỘNG TRỪ ĐIỂM */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.3}
                        >
                          <Tooltip title="Trừ 1 điểm">
                            <span>
                              <IconButton
                                size="small"
                                disabled={item.score <= 0}
                                onClick={() =>
                                  changeScore(item.id, -1)
                                }
                                sx={{
                                  color: "#dc2626",
                                  bgcolor: "#fef2f2",
                                  width: 29,
                                  height: 29,
                                  "&:hover": {
                                    bgcolor: "#fee2e2",
                                  },
                                }}
                              >
                                <RemoveRoundedIcon
                                  sx={{ fontSize: 18 }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Cộng 1 điểm">
                            <IconButton
                              size="small"
                              onClick={() =>
                                changeScore(item.id, 1)
                              }
                              sx={{
                                color: "#059669",
                                bgcolor: "#ecfdf5",
                                width: 29,
                                height: 29,
                                "&:hover": {
                                  bgcolor: "#d1fae5",
                                },
                              }}
                            >
                              <AddRoundedIcon
                                sx={{ fontSize: 18 }}
                              />
                            </IconButton>
                          </Tooltip>

                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              changeScore(item.id, 5)
                            }
                            sx={{
                              minWidth: 38,
                              height: 29,
                              px: 0.8,
                              borderRadius: 2,
                              fontSize: 11,
                              fontWeight: 900,
                              bgcolor: "#2563eb",
                              boxShadow: "none",
                              "&:hover": {
                                bgcolor: "#1d4ed8",
                                boxShadow: "none",
                              },
                            }}
                          >
                            +5
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}

            {/* THÔNG TIN CUỐI */}
            <Typography
              sx={{
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 10,
                mt: 2.5,
              }}
            >
              HỆ THỐNG HỖ TRỢ GIÁO VIÊN · BÌNH KHÁNH
            </Typography>
          </>
        )}
      </DialogContent>

      {/* FOOTER */}
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderTop: "1px solid #e2e8f0",
          bgcolor: "#fff",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Button
          onClick={handleClose}
          variant="contained"
          sx={{
            minWidth: 120,
            py: 1,
            borderRadius: 2.5,
            fontWeight: 900,
            textTransform: "none",
            background:
              "linear-gradient(90deg,#2563eb,#0ea5e9)",
            boxShadow: "0 5px 14px rgba(37,99,235,.22)",
            "&:hover": {
              background:
                "linear-gradient(90deg,#1d4ed8,#0284c7)",
            },
          }}
        >
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}

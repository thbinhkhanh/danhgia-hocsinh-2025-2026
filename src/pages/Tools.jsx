
import React, { useContext, useEffect, useState } from "react";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import RotateRightRoundedIcon from "@mui/icons-material/RotateRightRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";

import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase";
import { ConfigContext } from "../context/ConfigContext";
import { StudentContext } from "../context/StudentContext";
import { useSelectedClass } from "../context/SelectedClassContext";

// Các Dialog công cụ
import CountdownTimerDialog from "../dialog/CountdownTimerDialog";
import RandomStudentDialog from "../dialog/RandomStudentDialog";
import LuckyWheelDialog from "../dialog/LuckyWheelDialog";
import StopwatchDialog from "../dialog/StopwatchDialog";
import GroupStudentsDialog from "../dialog/GroupStudentsDialog";
import DiceDialog from "../dialog/DiceDialog";
import NoiseMeterDialog from "../dialog/NoiseMeterDialog";
import QuestionDrawDialog from "../dialog/QuestionDrawDialog";
import TreasureMapGame from "../dialog/TreasureMapGame";
import QuickQuestionDialog from "../dialog/QuickQuestionDialog";
import LearningLeaderboardDialog from "../dialog/LearningLeaderboardDialog";
import KnowledgeArenaDialog from "../dialog/KnowledgeArenaDialog";

export default function Tools() {
  const navigate = useNavigate();

  const { config } = useContext(ConfigContext);
  const { studentData, setStudentData } = useContext(StudentContext);

  const {
    classes = [],
    selectedClass,
    setSelectedClass,
  } = useSelectedClass();

  // =========================================
  // XÁC ĐỊNH CÔNG CỤ ĐANG MỞ
  // =========================================

  const searchParams = new URLSearchParams(window.location.search);
  const activeToolId = searchParams.get("tool");

  // =========================================
  // DANH SÁCH HỌC SINH
  // =========================================

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

  // =========================================
  // DANH SÁCH CÁC NHÓM CÔNG CỤ
  // =========================================

  const toolGroups = [
    {
      title: "TỔ CHỨC LỚP HỌC",
      color: "#1976d2",
      tools: [
        {
          id: "random-student",
          title: "Gọi tên ngẫu nhiên",
          description: "Chọn ngẫu nhiên một học sinh trong lớp",
          icon: <SchoolRoundedIcon />,
          iconColor: "#2563EB",
          iconBg: "#DBEAFE",
          needStudents: true,
        },
        {
          id: "lucky-wheel",
          title: "Vòng quay may mắn",
          description: "Quay vòng tròn để chọn học sinh",
          icon: <RotateRightRoundedIcon />,
          iconColor: "#D97706",
          iconBg: "#FEF3C7",
          needStudents: true,
        },
      ],
    },

    {
      title: "TRÒ CHƠI HỌC TẬP",
      color: "#7C3AED",
      tools: [
        {
          id: "treasure-map",
          title: "Đi tìm kho báu",
          description:
            "Tổ chức trò chơi khám phá và chinh phục kho báu kiến thức",
          icon: <AutoAwesomeIcon />,
          iconColor: "#7C3AED",
          iconBg: "#EDE9FE",
        },
        {
          id: "question-draw",
          title: "Bốc thăm câu hỏi",
          description: "Nhập câu hỏi và chọn ngẫu nhiên",
          icon: <QuizRoundedIcon />,
          iconColor: "#7C3AED",
          iconBg: "#EDE9FE",
        },
        {
          id: "leaderboard",
          title: "Bảng thi đua học tập",
          description: "Cộng điểm, trừ điểm và xếp hạng học sinh",
          icon: <EmojiEventsRoundedIcon />,
          iconColor: "#D97706",
          iconBg: "#FEF3C7",
        },
        {
          id: "knowledge-arena",
          title: "Đấu trường kiến thức",
          description: "Thi trắc nghiệm, tính điểm và công bố kết quả",
          icon: <SchoolRoundedIcon />,
          iconColor: "#7C3AED",
          iconBg: "#EDE9FE",
        },
      ],
    },

    {
      title: "QUẢN LÝ HOẠT ĐỘNG",
      color: "#00897b",
      tools: [
        {
          id: "countdown",
          title: "Đồng hồ đếm ngược",
          description: "Thiết lập thời gian cho hoạt động",
          icon: <HourglassEmptyRoundedIcon />,
          iconColor: "#EA580C",
          iconBg: "#FFEDD5",
        },
        {
          id: "stopwatch",
          title: "Bấm giờ hoạt động",
          description: "Theo dõi thời gian thực hiện nhiệm vụ",
          icon: <TimerRoundedIcon />,
          iconColor: "#0D9488",
          iconBg: "#CCFBF1",
        },
        {
          id: "dice",
          title: "Xúc xắc ngẫu nhiên",
          description: "Tung xúc xắc để chọn số ngẫu nhiên",
          icon: <CasinoRoundedIcon />,
          iconColor: "#4F46E5",
          iconBg: "#E0E7FF",
        },
        {
          id: "group-students",
          title: "Chia nhóm học sinh",
          description: "Tự động chia học sinh thành các nhóm",
          icon: <GroupsRoundedIcon />,
          iconColor: "#0891B2",
          iconBg: "#CFFAFE",
          needStudents: true,
        },
      ],
    },
  ];

  // =========================================
  // TÌM TÊN CÔNG CỤ
  // =========================================

  const allTools = toolGroups.flatMap((group) => group.tools);

  const activeTool = allTools.find(
    (tool) => tool.id === activeToolId
  );

  // =========================================
  // ĐẶT TÊN TAB TRÌNH DUYỆT
  // =========================================

  useEffect(() => {
    document.title = activeToolId
      ? activeTool?.title || "Công cụ giảng dạy"
      : "Công cụ hỗ trợ giảng dạy";
  }, [activeToolId, activeTool]);

  // =========================================
  // MỞ CÔNG CỤ TRONG TAB MỚI
  // =========================================

  const openToolInNewTab = (toolId) => {
    const url = new URL(window.location.href);

    url.searchParams.set("tool", toolId);

    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  // =========================================
  // ĐÓNG CÔNG CỤ
  // =========================================

  const handleToolClose = () => {
    // Đóng tab công cụ hiện tại
    window.close();

    // Nếu trình duyệt không cho phép đóng tab,
    // chuyển về trang danh sách công cụ.
    setTimeout(() => {
      if (!window.closed) {
        const url = new URL(window.location.href);
        url.searchParams.delete("tool");

        navigate(
          {
            pathname: url.pathname,
            search: url.search,
          },
          { replace: true }
        );
      }
    }, 100);
  };

  // =========================================
  // TỰ ĐỘNG CHỌN LỚP MẶC ĐỊNH
  // =========================================

  useEffect(() => {
    if (!selectedClass && config?.lop) {
      setSelectedClass(config.lop);
    }
  }, [selectedClass, config?.lop, setSelectedClass]);

  // =========================================
  // LẤY DANH SÁCH HỌC SINH
  // =========================================

  useEffect(() => {
    let isMounted = true;

    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([]);
        setLoadingStudents(false);
        return;
      }

      setLoadingStudents(true);

      try {
        // 1. Ưu tiên dữ liệu trong Context
        const cachedStudents = studentData?.[selectedClass];

        if (
          Array.isArray(cachedStudents) &&
          cachedStudents.length > 0
        ) {
          if (isMounted) {
            setStudents(cachedStudents);
            setLoadingStudents(false);
          }

          return;
        }

        // 2. Context chưa có dữ liệu thì lấy từ Firestore
        const classKey = selectedClass.replace(/\./g, "_");

        const studentsRef = collection(
          db,
          `DATA_${namHocKey}`,
          classKey,
          "HOCSINH"
        );

        const snapshot = await getDocs(studentsRef);

        const studentList = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          return {
            maDinhDanh: docSnap.id,
            hoVaTen: data.hoVaTen || "",
            ghiChu: data.ghiChu || "",
            stt: data.stt ?? 0,
          };
        });

        // 3. Sắp xếp theo tên học sinh
        studentList.sort((a, b) => {
          const nameA =
            a.hoVaTen.trim().split(" ").slice(-1)[0] || "";

          const nameB =
            b.hoVaTen.trim().split(" ").slice(-1)[0] || "";

          return nameA.localeCompare(nameB, "vi");
        });

        // 4. Đánh số thứ tự
        const formattedStudents = studentList.map(
          (student, index) => ({
            ...student,
            stt: student.stt || index + 1,
          })
        );

        if (isMounted) {
          setStudents(formattedStudents);

          // 5. Lưu vào Context
          setStudentData((prev) => ({
            ...prev,
            [selectedClass]: formattedStudents,
          }));
        }
      } catch (error) {
        console.error("Lỗi tải danh sách học sinh:", error);

        if (isMounted) {
          setStudents([]);
        }
      } finally {
        if (isMounted) {
          setLoadingStudents(false);
        }
      }
    };

    fetchStudents();

    return () => {
      isMounted = false;
    };
  }, [
    selectedClass,
    namHocKey,
    studentData,
    setStudentData,
  ]);

  // =========================================
  // HIỂN THỊ CÔNG CỤ
  // =========================================

  const renderTool = (toolId) => {
    switch (toolId) {
      case "countdown":
        return (
          <CountdownTimerDialog
            open={true}
            onClose={handleToolClose}
          />
        );

      case "random-student":
        return (
          <RandomStudentDialog
            open={true}
            onClose={handleToolClose}
            students={students}
          />
        );

      case "group-students":
        return (
          <GroupStudentsDialog
            open={true}
            onClose={handleToolClose}
            students={students}
          />
        );

      case "dice":
        return (
          <DiceDialog
            open={true}
            onClose={handleToolClose}
          />
        );

      case "lucky-wheel":
        return (
          <LuckyWheelDialog
            open={true}
            onClose={handleToolClose}
            students={students}
          />
        );

      case "noise":
        return (
          <NoiseMeterDialog
            open={true}
            onClose={handleToolClose}
          />
        );

      case "question-draw":
        return (
          <QuestionDrawDialog
            open={true}
            onClose={handleToolClose}
            selectedClass={selectedClass}
            week={config?.tuan}
          />
        );

      case "stopwatch":
        return (
          <StopwatchDialog
            open={true}
            onClose={handleToolClose}
          />
        );

      case "treasure-map":
        return (
          <TreasureMapGame
            open={true}
            onClose={handleToolClose}
          />
        );

      case "quick-question":
        return (
          <QuickQuestionDialog
            open={true}
            onClose={handleToolClose}
          />
        );

      case "leaderboard":
        return (
          <LearningLeaderboardDialog
            open={true}
            onClose={handleToolClose}
            students={students}
          />
        );

      case "knowledge-arena":
        return (
          <KnowledgeArenaDialog
            open={true}
            onClose={handleToolClose}
          />
        );

      default:
        return null;
    }
  };

  // =========================================
  // TAB CÔNG CỤ RIÊNG
  // =========================================

  if (activeToolId) {
    if (!activeTool) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography fontWeight={700}>
            Không tìm thấy công cụ
          </Typography>

          <Typography color="text.secondary">
            Công cụ này không tồn tại hoặc đã được thay đổi.
          </Typography>

          <Box
            component="button"
            onClick={handleToolClose}
            sx={{
              border: 0,
              borderRadius: 2,
              px: 2.5,
              py: 1,
              color: "#fff",
              background: "#1976d2",
              cursor: "pointer",
            }}
          >
            Quay lại
          </Box>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          width: "100%",
          minHeight: "100vh",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
          background: "#fff",
        }}
      >
        {renderTool(activeToolId)}
      </Box>
    );
  }

  // =========================================
  // GIAO DIỆN DANH SÁCH CÔNG CỤ
  // =========================================

  
  // =========================================
  // GIAO DIỆN DANH SÁCH CÔNG CỤ
  // =========================================

  const totalTools = toolGroups.reduce(
    (total, group) => total + group.tools.length,
    0
  );

  const availableTools = allTools.filter(
    (tool) =>
      !tool.needStudents ||
      (selectedClass && students.length > 0 && !loadingStudents)
  ).length;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        p: { xs: 1.5, sm: 2.5, md: 3 },
        background:
          "radial-gradient(circle at 5% 0%, #dbeafe 0, transparent 28%), radial-gradient(circle at 95% 15%, #ede9fe 0, transparent 25%), #f4f7fc",
      }}
    >
      <Box
        sx={{
          maxWidth: { xs: "100%", sm: 760, md: 820, lg: 860 },
          mx: "auto",
        }}
      >
        {/* ================= HEADER ================= */}
        <Paper
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: { xs: 3, sm: 4 },
            color: "#fff",
            background:
              "linear-gradient(120deg, #102b57 0%, #1555a5 52%, #287de0 100%)",
            boxShadow: "0 12px 35px rgba(21, 78, 150, 0.20)",
          }}
        >
          {/* HỌA TIẾT TRANG TRÍ */}
          <Box
            sx={{
              position: "absolute",
              width: 260,
              height: 260,
              borderRadius: "50%",
              right: -75,
              top: -145,
              background: "rgba(255,255,255,0.09)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              width: 190,
              height: 190,
              borderRadius: "50%",
              right: 100,
              bottom: -145,
              background: "rgba(255,255,255,0.07)",
            }}
          />

          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              px: { xs: 2, sm: 3.5, md: 4 },
              py: { xs: 2.5, sm: 3.5 },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 1.5, sm: 2.2 },
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: { xs: 48, sm: 62 },
                  height: { xs: 48, sm: 62 },
                  flexShrink: 0,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 5px 18px rgba(0,0,0,0.12)",
                  "& svg": {
                    fontSize: { xs: 29, sm: 36 },
                  },
                }}
              >
                <AutoAwesomeIcon />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: { xs: 17, sm: 23, md: 26 },
                    fontWeight: 900,
                    letterSpacing: { xs: 0, sm: 0.4 },
                    lineHeight: 1.3,
                  }}
                >
                  CÔNG CỤ HỖ TRỢ GIẢNG DẠY
                </Typography>

                <Typography
                  sx={{
                    mt: 0.7,
                    fontSize: { xs: 11.5, sm: 13 },
                    color: "rgba(255,255,255,0.82)",
                    lineHeight: 1.5,
                  }}
                >
                  Trợ thủ thông minh cho các hoạt động dạy và học
                </Typography>
              </Box>
            </Box>

            <Tooltip title="Đóng">
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  color: "#fff",
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 2.5,
                  background: "rgba(255,255,255,0.13)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.25)",
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* THỐNG KÊ NHANH */}
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              px: { xs: 2, sm: 3.5, md: 4 },
              pb: { xs: 2.5, sm: 3 },
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                icon: <AutoAwesomeIcon />,
                value: totalTools,
                label: "Công cụ",
              },
              {
                icon: <GroupsRoundedIcon />,
                value: students.length,
                label: "Học sinh",
              },
              {
                icon: <SchoolRoundedIcon />,
                value: selectedClass ? `Lớp ${selectedClass}` : "Chưa chọn",
                label: "Lớp học",
              },
            ].map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.9,
                  borderRadius: 2.5,
                  background: "rgba(255,255,255,0.13)",
                  border: "1px solid rgba(255,255,255,0.13)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: "#bfdbfe",
                    "& svg": { fontSize: 19 },
                  }}
                >
                  {item.icon}
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 900,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.72)",
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* ================= CHỌN LỚP ================= */}
        <Paper
          elevation={0}
          sx={{
            mt: 2.5,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: "1px solid #e3eaf4",
            background: "#fff",
            boxShadow: "0 5px 20px rgba(30,64,110,0.045)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              flexWrap: "wrap",
              mb: 1.7,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb",
                  background: "#eff6ff",
                }}
              >
                <SchoolRoundedIcon />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#1e293b",
                  }}
                >
                  LỚP HỌC ĐANG SỬ DỤNG
                </Typography>
                <Typography
                  sx={{ fontSize: 11.5, color: "#94a3b8", mt: 0.2 }}
                >
                  Chọn lớp để sử dụng dữ liệu học sinh tương ứng
                </Typography>
              </Box>
            </Box>

            {selectedClass && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.7,
                  px: 1.3,
                  py: 0.7,
                  borderRadius: 2,
                  color: "#16704b",
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                }}
              >
                {loadingStudents ? (
                  <CircularProgress
                    size={13}
                    sx={{ color: "#16a34a" }}
                  />
                ) : (
                  <GroupsRoundedIcon sx={{ fontSize: 17 }} />
                )}

                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                  {loadingStudents
                    ? "Đang tải dữ liệu"
                    : `${students.length} học sinh`}
                </Typography>
              </Box>
            )}
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel id="tools-class-label">Chọn lớp</InputLabel>

            <Select
              labelId="tools-class-label"
              value={selectedClass || ""}
              label="Chọn lớp"
              onChange={(event) =>
                setSelectedClass(event.target.value)
              }
              sx={{
                borderRadius: 2.5,
                background: "#f8fafc",
                fontWeight: 800,
                color: "#1e3a5f",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#dbe5f1",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3b82f6",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#2563eb",
                },
              }}
            >
              {classes.map((className) => (
                <MenuItem key={className} value={className}>
                  Lớp {className}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* ================= TRẠNG THÁI DỮ LIỆU ================= */}
        {loadingStudents && (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 2.5,
              borderRadius: 3,
              border: "1px solid #dbeafe",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
            }}
          >
            <CircularProgress size={21} />
            <Typography
              sx={{ fontSize: 13, color: "#2563eb", fontWeight: 700 }}
            >
              Đang tải danh sách học sinh...
            </Typography>
          </Paper>
        )}

        {!selectedClass && !loadingStudents && (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 3,
              textAlign: "center",
              borderRadius: 3,
              border: "1px dashed #cbd5e1",
              background: "rgba(255,255,255,0.75)",
            }}
          >
            <SchoolRoundedIcon
              sx={{ fontSize: 42, color: "#94a3b8", mb: 0.7 }}
            />
            <Typography
              sx={{ fontSize: 14, fontWeight: 800, color: "#475569" }}
            >
              Chưa có lớp được chọn
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#94a3b8", mt: 0.5 }}>
              Hãy chọn lớp để bắt đầu sử dụng các công cụ.
            </Typography>
          </Paper>
        )}

        {selectedClass &&
          !loadingStudents &&
          students.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 2.5,
                textAlign: "center",
                borderRadius: 3,
                border: "1px solid #fed7aa",
                background: "#fff7ed",
              }}
            >
              <GroupsRoundedIcon
                sx={{ fontSize: 36, color: "#ea580c", mb: 0.5 }}
              />
              <Typography
                sx={{ fontSize: 14, fontWeight: 800, color: "#9a3412" }}
              >
                Lớp chưa có dữ liệu học sinh
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#c2410c", mt: 0.5 }}>
                Vui lòng kiểm tra lại danh sách học sinh của lớp.
              </Typography>
            </Paper>
          )}

        {/* ================= DANH SÁCH CÔNG CỤ ================= */}
        {!loadingStudents && (
          <Box sx={{ mt: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                mb: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: { xs: 16, sm: 18 },
                    fontWeight: 900,
                    color: "#172b4d",
                  }}
                >
                  Khám phá công cụ
                </Typography>
                <Typography
                  sx={{ fontSize: 12, color: "#8492a6", mt: 0.3 }}
                >
                  Chọn tiện ích phù hợp với hoạt động trên lớp
                </Typography>
              </Box>

              <Box
                sx={{
                  px: 1.2,
                  py: 0.65,
                  borderRadius: 2,
                  background: "#eef2ff",
                  color: "#4f46e5",
                  fontSize: 11,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {availableTools}/{totalTools} sẵn sàng
              </Box>
            </Box>

            {toolGroups.map((group, groupIndex) => (
              <Box key={group.title} sx={{ mb: 3.2 }}>
                {/* TIÊU ĐỀ NHÓM */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    mb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: group.color,
                      background: `${group.color}13`,
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {String(groupIndex + 1).padStart(2, "0")}
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: "#334155",
                        letterSpacing: 0.35,
                      }}
                    >
                      {group.title}
                    </Typography>
                    <Box
                      sx={{
                        mt: 0.45,
                        height: 2,
                        width: 42,
                        borderRadius: 5,
                        background: group.color,
                      }}
                    />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: 700,
                    }}
                  >
                    {group.tools.length} công cụ
                  </Typography>
                </Box>

                {/* CÁC THẺ CÔNG CỤ */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: { xs: 1.2, sm: 1.5 },
                    alignItems: "stretch",
                  }}
                >
                  {group.tools.map((tool) => {
                    const disabled =
                      tool.needStudents &&
                      (!selectedClass ||
                        !students.length ||
                        loadingStudents);

                    return (
                      <Paper
                        key={tool.id}
                        elevation={0}
                        onClick={() => {
                          if (!disabled) {
                            openToolInNewTab(tool.id);
                          }
                        }}
                        sx={{
                          position: "relative",
                          minWidth: 0,
                          minHeight: 112,
                          boxSizing: "border-box",
                          p: { xs: 1.6, sm: 1.9 },
                          display: "flex",
                          alignItems: "center",
                          gap: 1.6,
                          overflow: "hidden",
                          borderRadius: 3,
                          border: "1px solid",
                          borderColor: disabled
                            ? "#e2e8f0"
                            : "#e5eaf2",
                          background: disabled ? "#f8fafc" : "#fff",
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.55 : 1,
                          transition: "all .22s ease",
                          boxShadow: disabled
                            ? "none"
                            : "0 3px 12px rgba(30,64,110,0.045)",

                          "&::before": {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 3,
                            background: disabled
                              ? "#cbd5e1"
                              : group.color,
                            opacity: disabled ? 0.5 : 0.9,
                          },

                          "&:hover": disabled
                            ? {}
                            : {
                                transform: "translateY(-3px)",
                                borderColor: `${group.color}85`,
                                boxShadow: `0 9px 24px ${group.color}20`,
                                background: `linear-gradient(115deg, #fff, ${group.color}08)`,
                                "& .tool-icon": {
                                  transform: "scale(1.08) rotate(-4deg)",
                                },
                                "& .tool-arrow": {
                                  transform: "translateX(3px)",
                                  opacity: 1,
                                },
                              },

                          "&:active": disabled
                            ? {}
                            : { transform: "scale(0.985)" },
                        }}
                      >
                        {/* ICON */}
                        <Box
                          className="tool-icon"
                          sx={{
                            width: { xs: 50, sm: 56 },
                            height: { xs: 50, sm: 56 },
                            flexShrink: 0,
                            borderRadius: 2.7,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: tool.iconColor,
                            background: tool.iconBg,
                            border: `1px solid ${tool.iconColor}20`,
                            transition: "all .22s ease",
                            "& svg": {
                              fontSize: { xs: 27, sm: 30 },
                            },
                          }}
                        >
                          {tool.icon}
                        </Box>

                        {/* NỘI DUNG */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: { xs: 13.5, sm: 14 },
                              fontWeight: 900,
                              color: disabled ? "#94a3b8" : "#1e293b",
                              lineHeight: 1.4,
                            }}
                          >
                            {tool.title}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 11.5,
                              color: disabled ? "#a8b1bf" : "#8492a6",
                              mt: 0.55,
                              lineHeight: 1.5,
                            }}
                          >
                            {tool.description}
                          </Typography>

                          {disabled && tool.needStudents && (
                            <Typography
                              sx={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#b45309",
                                mt: 0.6,
                              }}
                            >
                              Cần chọn lớp có danh sách học sinh
                            </Typography>
                          )}
                        </Box>

                        {/* MŨI TÊN */}
                        {!disabled && (
                          <Box
                            className="tool-arrow"
                            sx={{
                              width: 27,
                              height: 27,
                              flexShrink: 0,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: group.color,
                              background: `${group.color}12`,
                              fontSize: 21,
                              lineHeight: 1,
                              opacity: 0.75,
                              transition: "all .2s ease",
                            }}
                          >
                            ›
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* FOOTER */}
        <Box
          sx={{
            mt: 1,
            py: 2,
            textAlign: "center",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 600,
            }}
          >
            CÔNG CỤ HỖ TRỢ GIẢNG DẠY · DẠY HỌC SÁNG TẠO VÀ HIỆU QUẢ
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}


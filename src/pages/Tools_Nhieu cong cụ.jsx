
import React, {
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

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
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";

import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase";

import { ConfigContext } from "../context/ConfigContext";
import { StudentContext } from "../context/StudentContext";
import { useSelectedClass } from "../context/SelectedClassContext";

import FloatingToolWindow from "../components/FloatingToolWindow";

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

// =============================================
// TÊN CÁC CÔNG CỤ
// =============================================

const TOOL_TITLES = {
  timer: "Đồng hồ đếm ngược",
  random: "Gọi tên ngẫu nhiên",
  group: "Chia nhóm học sinh",
  dice: "Xúc xắc ngẫu nhiên",
  wheel: "Vòng quay may mắn",
  noise: "Đo âm lượng lớp học",
  question: "Bốc thăm câu hỏi",
  stopwatch: "Bấm giờ hoạt động",
  treasure: "Đi tìm kho báu",
  quickQuestion: "Thẻ câu hỏi nhanh",
  leaderboard: "Bảng thi đua học tập",
  arena: "Đấu trường kiến thức",
};

export default function Tools() {
  const navigate = useNavigate();

  const { config } = useContext(ConfigContext);

  const {
    studentData,
    setStudentData,
  } = useContext(StudentContext);

  const {
    classes = [],
    selectedClass,
    setSelectedClass,
  } = useSelectedClass();

  // =========================================
  // DANH SÁCH HỌC SINH
  // =========================================

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const namHocKey = (
    config?.namHoc || "2025-2026"
  ).replace(/-/g, "_");

  // =========================================
  // QUẢN LÝ CỬA SỔ
  // =========================================

  const [openTools, setOpenTools] = useState([]);

  const nextZIndex = useRef(10);

  // =========================================
  // MỞ CÔNG CỤ
  // =========================================

  const openTool = (toolId) => {
    const zIndex = ++nextZIndex.current;

    setOpenTools((prev) => {
      const exists = prev.find(
        (item) => item.id === toolId
      );

      if (exists) {
        return prev.map((item) =>
          item.id === toolId
            ? {
                ...item,
                minimized: false,
                zIndex,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          id: toolId,
          minimized: false,
          zIndex,
        },
      ];
    });
  };

  // =========================================
  // ĐÓNG CÔNG CỤ
  // =========================================

  const closeTool = (toolId) => {
    setOpenTools((prev) =>
      prev.filter((item) => item.id !== toolId)
    );
  };

  // =========================================
  // THU NHỎ
  // =========================================

  const minimizeTool = (toolId) => {
    setOpenTools((prev) =>
      prev.map((item) =>
        item.id === toolId
          ? {
              ...item,
              minimized: true,
            }
          : item
      )
    );
  };

  // =========================================
  // KHÔI PHỤC
  // =========================================

  const restoreTool = (toolId) => {
    const zIndex = ++nextZIndex.current;

    setOpenTools((prev) =>
      prev.map((item) =>
        item.id === toolId
          ? {
              ...item,
              minimized: false,
              zIndex,
            }
          : item
      )
    );
  };

  // =========================================
  // ĐƯA CỬA SỔ LÊN TRÊN
  // =========================================

  const focusTool = (toolId) => {
    const zIndex = ++nextZIndex.current;

    setOpenTools((prev) =>
      prev.map((item) =>
        item.id === toolId
          ? {
              ...item,
              zIndex,
            }
          : item
      )
    );
  };

  // =========================================
  // DANH SÁCH THU NHỎ
  // =========================================

  const minimizedTools = openTools.filter(
    (item) => item.minimized
  );

  // =========================================
  // TỰ ĐỘNG CHỌN LỚP
  // =========================================

  useEffect(() => {
    if (!selectedClass && config?.lop) {
      setSelectedClass(config.lop);
    }
  }, [
    selectedClass,
    config?.lop,
    setSelectedClass,
  ]);

  // =========================================
  // LẤY DANH SÁCH HỌC SINH
  // ƯU TIÊN CONTEXT, SAU ĐÓ FIRESTORE
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
        // 1. Ưu tiên Context
        const cachedStudents =
          studentData?.[selectedClass];

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

        // 2. Nếu chưa có thì lấy Firestore
        const classKey = selectedClass.replace(
          /\./g,
          "_"
        );

        const studentsRef = collection(
          db,
          `DATA_${namHocKey}`,
          classKey,
          "HOCSINH"
        );

        const snapshot = await getDocs(studentsRef);

        const studentList = snapshot.docs.map(
          (docSnap) => {
            const data = docSnap.data();

            return {
              maDinhDanh: docSnap.id,
              hoVaTen: data.hoVaTen || "",
              ghiChu: data.ghiChu || "",
              stt: data.stt ?? 0,
            };
          }
        );

        // 3. Sắp xếp theo tên
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
        console.error(
          "Lỗi tải danh sách học sinh:",
          error
        );

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
  // DANH SÁCH NHÓM CÔNG CỤ
  // =========================================

  const toolGroups = [
    {
      title: "TỔ CHỨC LỚP HỌC",
      color: "#1976d2",

      tools: [
        {
          id: "random",
          title: "Gọi tên ngẫu nhiên",
          description:
            "Chọn ngẫu nhiên một học sinh trong lớp",
          icon: <SchoolRoundedIcon />,
          iconColor: "#2563EB",
          iconBg: "#DBEAFE",
          needStudents: true,
        },

        {
          id: "wheel",
          title: "Vòng quay may mắn",
          description:
            "Quay vòng tròn để chọn học sinh",
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
          id: "treasure",
          title: "Đi tìm kho báu",
          description:
            "Tổ chức trò chơi khám phá và chinh phục kho báu kiến thức",
          icon: <AutoAwesomeIcon />,
          iconColor: "#7C3AED",
          iconBg: "#EDE9FE",
        },

        {
          id: "question",
          title: "Bốc thăm câu hỏi",
          description:
            "Nhập câu hỏi và chọn ngẫu nhiên",
          icon: <QuizRoundedIcon />,
          iconColor: "#7C3AED",
          iconBg: "#EDE9FE",
        },

        {
          id: "leaderboard",
          title: "Bảng thi đua học tập",
          description:
            "Cộng điểm, trừ điểm và xếp hạng học sinh",
          icon: <EmojiEventsRoundedIcon />,
          iconColor: "#D97706",
          iconBg: "#FEF3C7",
        },

        {
          id: "arena",
          title: "Đấu trường kiến thức",
          description:
            "Thi trắc nghiệm, tính điểm và công bố kết quả",
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
          id: "timer",
          title: "Đồng hồ đếm ngược",
          description:
            "Thiết lập thời gian cho hoạt động",
          icon: <HourglassEmptyRoundedIcon />,
          iconColor: "#EA580C",
          iconBg: "#FFEDD5",
        },

        {
          id: "stopwatch",
          title: "Bấm giờ hoạt động",
          description:
            "Theo dõi thời gian thực hiện nhiệm vụ",
          icon: <TimerRoundedIcon />,
          iconColor: "#0D9488",
          iconBg: "#CCFBF1",
        },

        {
          id: "dice",
          title: "Xúc xắc ngẫu nhiên",
          description:
            "Tung xúc xắc để chọn số ngẫu nhiên",
          icon: <CasinoRoundedIcon />,
          iconColor: "#4F46E5",
          iconBg: "#E0E7FF",
        },

        {
          id: "group",
          title: "Chia nhóm học sinh",
          description:
            "Tự động chia học sinh thành các nhóm",
          icon: <GroupsRoundedIcon />,
          iconColor: "#0891B2",
          iconBg: "#CFFAFE",
          needStudents: true,
        },
      ],
    },
  ];

  // =========================================
  // RENDER TỪNG CÔNG CỤ
  // =========================================

  const renderTool = (toolId) => {
    switch (toolId) {
      case "timer":
        return (
          <CountdownTimerDialog
            open={true}
            onClose={() => closeTool("timer")}
          />
        );

      case "random":
        return (
          <RandomStudentDialog
            open={true}
            onClose={() => closeTool("random")}
            students={students}
          />
        );

      case "group":
        return (
          <GroupStudentsDialog
            open={true}
            onClose={() => closeTool("group")}
            students={students}
          />
        );

      case "dice":
        return (
          <DiceDialog
            open={true}
            onClose={() => closeTool("dice")}
          />
        );

      case "wheel":
        return (
          <LuckyWheelDialog
            open={true}
            onClose={() => closeTool("wheel")}
            students={students}
          />
        );

      case "noise":
        return (
          <NoiseMeterDialog
            open={true}
            onClose={() => closeTool("noise")}
          />
        );

      case "question":
        return (
          <QuestionDrawDialog
            open={true}
            onClose={() => closeTool("question")}
            selectedClass={selectedClass}
            week={config?.tuan}
          />
        );

      case "stopwatch":
        return (
          <StopwatchDialog
            open={true}
            onClose={() => closeTool("stopwatch")}
          />
        );

      case "treasure":
        return (
          <TreasureMapGame
            open={true}
            onClose={() => closeTool("treasure")}
          />
        );

      case "quickQuestion":
        return (
          <QuickQuestionDialog
            open={true}
            onClose={() => closeTool("quickQuestion")}
          />
        );

      case "leaderboard":
        return (
          <LearningLeaderboardDialog
            open={true}
            onClose={() => closeTool("leaderboard")}
            students={students}
          />
        );

      case "arena":
        return (
          <KnowledgeArenaDialog
            open={true}
            onClose={() => closeTool("arena")}
          />
        );

      default:
        return null;
    }
  };

  // =========================================
  // GIAO DIỆN CHÍNH
  // =========================================

  return (
    <>
      <Box
        sx={{
          minHeight: "100%",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
          p: { xs: 1.5, sm: 2.5 },
          pb: minimizedTools.length ? 9 : 2.5,
          background: "#f5f7fb",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 760,
            mx: "auto",
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid #e5eaf2",
            background: "#fff",
          }}
        >
          {/* HEADER */}

          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 2.5,
              background:
                "linear-gradient(135deg,#1565c0,#1976d2)",
              color: "#fff",
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
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.18)",
                  flexShrink: 0,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 27 }} />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: { xs: 18, sm: 21 },
                    fontWeight: 800,
                    lineHeight: 1.3,
                  }}
                >
                  CÔNG CỤ HỖ TRỢ GIẢNG DẠY
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12,
                    opacity: 0.9,
                    mt: 0.4,
                  }}
                >
                  Các tiện ích hỗ trợ tổ chức hoạt động học tập
                </Typography>
              </Box>
            </Box>

            <Tooltip title="Đóng">
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  color: "#fff",
                  background: "rgba(255,255,255,0.12)",
                  flexShrink: 0,

                  "&:hover": {
                    background: "rgba(255,255,255,0.25)",
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* NỘI DUNG */}

          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {/* CHỌN LỚP */}

            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2,
                border: "1px solid #e2e8f0",
                borderRadius: 2.5,
                background:
                  "linear-gradient(135deg,#f8fbff,#ffffff)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  flexWrap: "wrap",
                  mb: 1.2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <SchoolRoundedIcon
                    sx={{ color: "#1976d2", fontSize: 21 }}
                  />

                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#26364a",
                    }}
                  >
                    LỚP ĐANG SỬ DỤNG
                  </Typography>
                </Box>

                {selectedClass && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.7,
                      px: 1.2,
                      py: 0.55,
                      borderRadius: 5,
                      background: "#eaf3ff",
                      color: "#1565c0",
                    }}
                  >
                    <GroupsRoundedIcon
                      sx={{ fontSize: 17 }}
                    />

                    <Typography
                      sx={{ fontSize: 12, fontWeight: 800 }}
                    >
                      {loadingStudents
                        ? "Đang tải..."
                        : `${students.length} HS`}
                    </Typography>
                  </Box>
                )}
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel id="tools-class-label">
                  Chọn lớp
                </InputLabel>

                <Select
                  labelId="tools-class-label"
                  value={selectedClass || ""}
                  label="Chọn lớp"
                  onChange={(event) =>
                    setSelectedClass(event.target.value)
                  }
                  sx={{
                    background: "#fff",
                    borderRadius: 2,
                    fontWeight: 700,
                    color: "#1e3a5f",

                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#dbe5f1",
                    },
                  }}
                >
                  {classes.map((className) => (
                    <MenuItem
                      key={className}
                      value={className}
                    >
                      Lớp {className}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* ĐANG TẢI */}

            {loadingStudents && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1.5,
                  py: 3,
                }}
              >
                <CircularProgress size={22} />

                <Typography
                  sx={{ fontSize: 14, color: "#64748b" }}
                >
                  Đang tải danh sách học sinh...
                </Typography>
              </Box>
            )}

            {/* CHƯA CHỌN LỚP */}

            {!selectedClass && !loadingStudents && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 3,
                  color: "#94a3b8",
                }}
              >
                <SchoolRoundedIcon
                  sx={{
                    fontSize: 42,
                    mb: 0.5,
                    opacity: 0.6,
                  }}
                />

                <Typography fontWeight={600}>
                  Chưa có lớp được chọn
                </Typography>

                <Typography sx={{ fontSize: 13, mt: 0.5 }}>
                  Hãy chọn lớp để sử dụng các công cụ hỗ trợ giảng dạy.
                </Typography>
              </Box>
            )}

            {/* KHÔNG CÓ HỌC SINH */}

            {selectedClass &&
              !loadingStudents &&
              students.length === 0 && (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 2.5,
                    color: "#94a3b8",
                  }}
                >
                  <Typography fontWeight={600}>
                    Lớp chưa có dữ liệu học sinh
                  </Typography>

                  <Typography sx={{ fontSize: 13, mt: 0.5 }}>
                    Vui lòng kiểm tra lại danh sách học sinh của lớp.
                  </Typography>
                </Box>
              )}

            {/* DANH SÁCH CÔNG CỤ */}

            {!loadingStudents &&
              toolGroups.map((group) => (
                <Box
                  key={group.title}
                  sx={{ mb: 2.5 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 18,
                        borderRadius: 2,
                        background: group.color,
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#334155",
                        letterSpacing: 0.3,
                      }}
                    >
                      {group.title}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2,minmax(0,1fr))",
                      },
                      gap: 1.5,
                      alignItems: "stretch",
                    }}
                  >
                    {group.tools.map((tool) => {
                      const disabled =
                        tool.needStudents &&
                        (
                          !selectedClass ||
                          !students.length ||
                          loadingStudents
                        );

                      const isOpen = openTools.some(
                        (item) =>
                          item.id === tool.id &&
                          !item.minimized
                      );

                      const isMinimized = openTools.some(
                        (item) =>
                          item.id === tool.id &&
                          item.minimized
                      );

                      return (
                        <Paper
                          key={tool.id}
                          elevation={0}
                          onClick={() => {
                            if (!disabled) {
                              openTool(tool.id);
                            }
                          }}
                          sx={{
                            minWidth: 0,
                            minHeight: 92,
                            boxSizing: "border-box",
                            p: { xs: 1.5, sm: 1.8 },
                            borderRadius: 2.5,

                            border: "1px solid",

                            borderColor: disabled
                              ? "#e2e8f0"
                              : isOpen
                                ? group.color
                                : `${group.color}55`,

                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,

                            cursor: disabled
                              ? "not-allowed"
                              : "pointer",

                            opacity: disabled ? 0.45 : 1,

                            background: disabled
                              ? "#f8fafc"
                              : isOpen
                                ? `${group.color}12`
                                : `linear-gradient(135deg,#ffffff 0%,${group.color}0D 100%)`,

                            boxShadow: disabled
                              ? "none"
                              : `0 3px 10px ${group.color}18`,

                            transition: "all .22s ease",

                            "&:hover": disabled
                              ? {}
                              : {
                                  borderColor: group.color,

                                  background:
                                    `linear-gradient(135deg,#ffffff 0%,${group.color}20 100%)`,

                                  transform: "translateY(-3px)",

                                  boxShadow:
                                    `0 7px 18px ${group.color}30`,
                                },
                          }}
                        >
                          {/* ICON */}

                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              flexShrink: 0,
                              borderRadius: 2.5,

                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",

                              color: tool.iconColor,
                              background: tool.iconBg,

                              border: `1px solid ${tool.iconColor}25`,

                              boxShadow:
                                `0 3px 9px ${tool.iconColor}18`,

                              "& svg": {
                                fontSize: 29,
                              },
                            }}
                          >
                            {tool.icon}
                          </Box>

                          {/* NỘI DUNG */}

                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: 14,
                                fontWeight: 800,

                                color: disabled
                                  ? "#94a3b8"
                                  : "#1e3a5f",

                                lineHeight: 1.4,
                              }}
                            >
                              {tool.title}
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 12,

                                color: disabled
                                  ? "#a1aab8"
                                  : "#64748b",

                                mt: 0.5,
                                lineHeight: 1.45,
                              }}
                            >
                              {tool.description}
                            </Typography>
                          </Box>

                          {/* TRẠNG THÁI */}

                          {!disabled && (
                            <Box
                              sx={{
                                color: group.color,
                                fontSize: 11,
                                fontWeight: 800,
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isOpen
                                ? "ĐANG MỞ"
                                : isMinimized
                                  ? "THU NHỎ"
                                  : "›"}
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              ))}
          </Box>
        </Paper>
      </Box>

      {/* ===================================== */}
      {/* HỆ THỐNG CỬA SỔ NỔI */}
      {/* ===================================== */}

      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 1400,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {openTools.map((item, index) => (
          <FloatingToolWindow
            key={item.id}
            id={item.id}
            title={TOOL_TITLES[item.id]}
            zIndex={item.zIndex}
            minimized={item.minimized}
            initialPosition={{
              x: 30 + (index % 5) * 35,
              y: 35 + (index % 5) * 30,
            }}
            onClose={() => closeTool(item.id)}
            onMinimize={minimizeTool}
            onFocus={() => focusTool(item.id)}
          >
            {renderTool(item.id)}
          </FloatingToolWindow>
        ))}
      </Box>

      {/* ===================================== */}
      {/* THANH CÔNG CỤ THU NHỎ */}
      {/* ===================================== */}

      {minimizedTools.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            zIndex: 1500,

            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",

            display: "flex",
            alignItems: "center",
            gap: 0.8,

            maxWidth: "calc(100vw - 24px)",
            overflowX: "auto",

            px: 1.2,
            py: 0.8,

            borderRadius: 3,
            border: "1px solid #dbe5f1",

            background: "rgba(255,255,255,0.97)",

            backdropFilter: "blur(12px)",
          }}
        >
          <AppsRoundedIcon
            sx={{
              color: "#1976d2",
              fontSize: 20,
              flexShrink: 0,
              mr: 0.3,
            }}
          />

          {minimizedTools.map((item) => (
            <Tooltip
              key={item.id}
              title={`Mở lại ${TOOL_TITLES[item.id]}`}
            >
              <Box
                onClick={() => restoreTool(item.id)}
                sx={{
                  px: 1.3,
                  py: 0.8,

                  borderRadius: 2,

                  background: "#eff6ff",
                  color: "#1d4ed8",

                  display: "flex",
                  alignItems: "center",
                  gap: 0.7,

                  cursor: "pointer",
                  whiteSpace: "nowrap",

                  "&:hover": {
                    background: "#dbeafe",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {TOOL_TITLES[item.id]}
                </Typography>

                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTool(item.id);
                  }}
                  sx={{
                    p: 0.2,
                    color: "#64748b",

                    "&:hover": {
                      color: "#dc2626",
                    },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Tooltip>
          ))}
        </Paper>
      )}
    </>
  );
}

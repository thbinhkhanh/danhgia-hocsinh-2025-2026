
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
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";

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
  // DANH SÁCH HỌC SINH
  // =========================================

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // =========================================
  // TRẠNG THÁI CÁC DIALOG
  // =========================================

  const [openTimerDialog, setOpenTimerDialog] = useState(false);
  const [openRandomDialog, setOpenRandomDialog] = useState(false);
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [openDiceDialog, setOpenDiceDialog] = useState(false);
  const [openWheelDialog, setOpenWheelDialog] = useState(false);
  const [openNoiseDialog, setOpenNoiseDialog] = useState(false);
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const [openStopwatchDialog, setOpenStopwatchDialog] = useState(false);
  const [openTreasureMap, setOpenTreasureMap] = useState(false);

  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

  // =========================================
  // KIỂM TRA CÓ CÔNG CỤ ĐANG MỞ
  // =========================================

  const isAnyToolOpen =
    openTimerDialog ||
    openRandomDialog ||
    openGroupDialog ||
    openDiceDialog ||
    openWheelDialog ||
    openNoiseDialog ||
    openQuestionDialog ||
    openStopwatchDialog ||
    openTreasureMap;

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
        // 1. Ưu tiên dữ liệu trong Context nếu có học sinh
        const cachedStudents = studentData?.[selectedClass];

        if (Array.isArray(cachedStudents) && cachedStudents.length > 0) {
          if (isMounted) {
            setStudents(cachedStudents);
            setLoadingStudents(false);
          }
          return;
        }

        // 2. Nếu Context chưa có dữ liệu, lấy từ Firestore
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
          const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0] || "";
          const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0] || "";

          return nameA.localeCompare(nameB, "vi");
        });

        // 4. Đánh số thứ tự
        const formattedStudents = studentList.map((student, index) => ({
          ...student,
          stt: student.stt || index + 1,
        }));

        if (isMounted) {
          setStudents(formattedStudents);

          // 5. Lưu vào Context để tái sử dụng
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
  }, [selectedClass, namHocKey, studentData, setStudentData]);


  // =========================================
  // DANH SÁCH CÁC NHÓM CÔNG CỤ
  // =========================================

  const toolGroups = [
    {
      title: "TỔ CHỨC LỚP HỌC",
      color: "#1976d2",
      tools: [
        {
          title: "Gọi tên ngẫu nhiên",
          description: "Chọn ngẫu nhiên một học sinh trong lớp",
          icon: <SchoolRoundedIcon />,
          iconColor: "#2563EB",
          iconBg: "#DBEAFE",
          action: () => setOpenRandomDialog(true),
          needStudents: true,
        },
        {
          title: "Vòng quay may mắn",
          description: "Quay vòng tròn để chọn học sinh",
          icon: <RotateRightRoundedIcon />,
          iconColor: "#D97706",
          iconBg: "#FEF3C7",
          action: () => setOpenWheelDialog(true),
          needStudents: true,
        },
        {
          title: "Chia nhóm học sinh",
          description: "Tự động chia học sinh thành các nhóm",
          icon: <GroupsRoundedIcon />,
          iconColor: "#0891B2",
          iconBg: "#CFFAFE",
          action: () => setOpenGroupDialog(true),
          needStudents: true,
        },
        {
          title: "Bốc thăm câu hỏi",
          description: "Nhập câu hỏi và chọn ngẫu nhiên",
          icon: <QuizRoundedIcon />,
          iconColor: "#7C3AED",
          iconBg: "#EDE9FE",
          action: () => setOpenQuestionDialog(true),
        },
      ],
    },
    {
      title: "QUẢN LÝ HOẠT ĐỘNG",
      color: "#00897b",
      tools: [
        {
          title: "Đồng hồ đếm ngược",
          description: "Thiết lập thời gian cho hoạt động",
          icon: <TimerRoundedIcon />,
          iconColor: "#EA580C",
          iconBg: "#FFEDD5",
          action: () => setOpenTimerDialog(true),
        },
        {
          title: "Bấm giờ hoạt động",
          description: "Theo dõi thời gian thực hiện nhiệm vụ",
          icon: <TimerRoundedIcon />,
          iconColor: "#0D9488",
          iconBg: "#CCFBF1",
          action: () => setOpenStopwatchDialog(true),
        },
        {
          title: "Đo âm lượng lớp học",
          description: "Theo dõi mức độ âm thanh trong lớp",
          icon: <GraphicEqRoundedIcon />,
          iconColor: "#DB2777",
          iconBg: "#FCE7F3",
          action: () => setOpenNoiseDialog(true),
        },
        {
          title: "Xúc xắc ngẫu nhiên",
          description: "Tung xúc xắc để chọn số ngẫu nhiên",
          icon: <CasinoRoundedIcon />,
          iconColor: "#4F46E5",
          iconBg: "#E0E7FF",
          action: () => setOpenDiceDialog(true),
        },
      ],
    },

    {
      title: "TRÒ CHƠI HỌC TẬP",
      color: "#7C3AED",
      tools: [
        {
          title: "Bản đồ đi tìm kho báu",
          description: "Tổ chức trò chơi khám phá và chinh phục kho báu kiến thức",
          icon: <AutoAwesomeIcon />,
          iconColor: "#7C3AED",
          iconBg: "#EDE9FE",
          action: () => setOpenTreasureMap(true),
        },
      ],
    },
  ];

  // =========================================
  // GIAO DIỆN CHÍNH
  // =========================================

  return (
    <>
      {/* ===================================== */}
      {/* TRANG TOOLS - ẨN KHI MỞ CÔNG CỤ */}
      {/* ===================================== */}

      {!isAnyToolOpen && (
        <Box
          sx={{
            minHeight: "100%",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflowX: "hidden",
            p: { xs: 1.5, sm: 2.5 },
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
                background: "linear-gradient(135deg, #1565c0, #1976d2)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
                  background: "linear-gradient(135deg, #f8fbff, #ffffff)",
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                      <GroupsRoundedIcon sx={{ fontSize: 17 }} />

                      <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
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
                      <MenuItem key={className} value={className}>
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

                  <Typography sx={{ fontSize: 14, color: "#64748b" }}>
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
                  <Box key={group.title} sx={{ mb: 2.5 }}>
                    {/* TIÊU ĐỀ NHÓM */}
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

                    {/* CÁC THẺ CÔNG CỤ */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                        },
                        gap: 1.5,
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
                            key={tool.title}
                            elevation={0}
                            onClick={() => {
                              if (!disabled) {
                                tool.action();
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
                                : `${group.color}55`,

                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,

                              cursor: disabled ? "not-allowed" : "pointer",
                              opacity: disabled ? 0.45 : 1,

                              background: disabled
                                ? "#f8fafc"
                                : `linear-gradient(135deg, #ffffff 0%, ${group.color}0D 100%)`,

                              boxShadow: disabled
                                ? "none"
                                : `0 3px 10px ${group.color}18`,

                              transition: "all 0.22s ease",

                              "&:hover": disabled
                                ? {}
                                : {
                                    borderColor: group.color,
                                    background: `linear-gradient(135deg, #ffffff 0%, ${group.color}20 100%)`,
                                    transform: "translateY(-3px)",
                                    boxShadow: `0 7px 18px ${group.color}30`,
                                  },

                              "&:active": disabled
                                ? {}
                                : {
                                    transform: "scale(0.98)",
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
                                boxShadow: `0 3px 9px ${tool.iconColor}18`,

                                transition: "all .22s ease",

                                "& svg": {
                                  fontSize: 29,
                                },

                                ".MuiPaper-root:hover &": disabled
                                  ? {}
                                  : {
                                      transform: "scale(1.08) rotate(-4deg)",
                                      boxShadow: `0 5px 13px ${tool.iconColor}30`,
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
                                  color: disabled ? "#94a3b8" : "#1e3a5f",
                                  lineHeight: 1.4,
                                }}
                              >
                                {tool.title}
                              </Typography>

                              <Typography
                                sx={{
                                  fontSize: 12,
                                  color: disabled ? "#a1aab8" : "#64748b",
                                  mt: 0.5,
                                  lineHeight: 1.45,
                                }}
                              >
                                {tool.description}
                              </Typography>
                            </Box>

                            {/* MŨI TÊN */}
                            {!disabled && (
                              <Box
                                sx={{
                                  color: group.color,
                                  fontSize: 20,
                                  fontWeight: 800,
                                  flexShrink: 0,
                                  opacity: 0.8,
                                  transition: "transform 0.2s ease",
                                  ".MuiPaper-root:hover &": {
                                    transform: "translateX(3px)",
                                  },
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
          </Paper>
        </Box>
      )}

      {/* ===================================== */}
      {/* CÁC DIALOG CÔNG CỤ */}
      {/* Luôn đặt ngoài điều kiện ẩn trang */}
      {/* ===================================== */}

      <CountdownTimerDialog
        open={openTimerDialog}
        onClose={() => setOpenTimerDialog(false)}
      />

      <RandomStudentDialog
        open={openRandomDialog}
        onClose={() => setOpenRandomDialog(false)}
        students={students}
      />

      <GroupStudentsDialog
        open={openGroupDialog}
        onClose={() => setOpenGroupDialog(false)}
        students={students}
      />

      <DiceDialog
        open={openDiceDialog}
        onClose={() => setOpenDiceDialog(false)}
      />

      <LuckyWheelDialog
        open={openWheelDialog}
        onClose={() => setOpenWheelDialog(false)}
        students={students}
      />

      <NoiseMeterDialog
        open={openNoiseDialog}
        onClose={() => setOpenNoiseDialog(false)}
      />

      <QuestionDrawDialog
        open={openQuestionDialog}
        onClose={() => setOpenQuestionDialog(false)}
        selectedClass={selectedClass}
        week={config?.tuan}
      />

      <StopwatchDialog
        open={openStopwatchDialog}
        onClose={() => setOpenStopwatchDialog(false)}
      />

      <TreasureMapGame
        open={openTreasureMap}
        onClose={() => setOpenTreasureMap(false)}
      />
    </>
  );
}

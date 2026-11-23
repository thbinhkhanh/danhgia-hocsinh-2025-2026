
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
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExploreIcon from "@mui/icons-material/Explore";
import FlagIcon from "@mui/icons-material/Flag";
import GroupsIcon from "@mui/icons-material/Groups";
import SchoolIcon from "@mui/icons-material/School";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

const MAP_THEMES = {
  tropical: {
    name: "Đảo Nhiệt Đới",
    emoji: "🏝️",
    description: "Khám phá hòn đảo xanh",
    color: "#0ea5e9",
    light: "#e0f2fe",
  },
  arctic: {
    name: "Vương Quốc Băng Giá",
    emoji: "❄️",
    description: "Chinh phục miền băng tuyết",
    color: "#6366f1",
    light: "#eef2ff",
  },
  desert: {
    name: "Sa Mạc Kim Tự Tháp",
    emoji: "🏜️",
    description: "Tìm kho báu giữa sa mạc",
    color: "#d97706",
    light: "#fef3c7",
  },
  volcano: {
    name: "Đảo Núi Lửa Thần",
    emoji: "🌋",
    description: "Vượt thử thách núi lửa",
    color: "#e11d48",
    light: "#ffe4e6",
  },
};

const THEME_KEYS = Object.keys(MAP_THEMES);

export default function TreasureMapConfigDialog({
  open,
  onClose,
  themeId = "tropical",
  stageCount = 4,
  mode = "teacher",
  onApply,
}) {
  const [draftThemeId, setDraftThemeId] = useState(themeId);
  const [draftStageCount, setDraftStageCount] = useState(stageCount);
  const [draftMode, setDraftMode] = useState(mode);

  useEffect(() => {
    if (open) {
      setDraftThemeId(themeId);
      setDraftStageCount(stageCount);
      setDraftMode(mode);
    }
  }, [open, themeId, stageCount, mode]);

  const handleApply = () => {
    onApply?.({
      themeId: draftThemeId,
      stageCount: draftStageCount,
      mode: draftMode,
    });
  };

  const selectedTheme = MAP_THEMES[draftThemeId] || MAP_THEMES.tropical;

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          return;
        }
        onClose?.();
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
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          position: "relative",
          px: { xs: 2, sm: 3 },
          py: { xs: 1.8, sm: 2.2 },
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
            width: 230,
            height: 230,
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
          onClick={onClose}
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
                "linear-gradient(145deg,#38bdf8 0%,#2563eb 55%,#4338ca 100%)",
              boxShadow:
                "0 4px 14px rgba(56,189,248,.3),inset 0 1px 2px rgba(255,255,255,.4)",
              border: "1px solid rgba(255,255,255,.3)",
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: { xs: 23, sm: 28 } }} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: { xs: 15, sm: 20 },
                fontWeight: 900,
                letterSpacing: { xs: 0, sm: 0.5 },
                lineHeight: 1.25,
                color: "#fff",
              }}
            >
              CẤU HÌNH TRÒ CHƠI
            </Typography>

            <Typography
              sx={{
                mt: 0.45,
                fontSize: { xs: 10, sm: 12 },
                color: "rgba(219,234,254,.85)",
                lineHeight: 1.4,
              }}
            >
              Tùy chỉnh hành trình tìm kho báu
            </Typography>
          </Box>
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
            opacity: 0.8,
          }}
        />
      </Box>

      {/* NỘI DUNG */}
      <DialogContent
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: 2.5,
          background: "linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        {/* CHỌN BẢN ĐỒ */}
        <Box>
            {/* TIÊU ĐỀ */}
            <Box
                sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.3,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <ExploreIcon sx={{ fontSize: 20, color: "#2563eb" }} />

                <Typography
                    sx={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#172554",
                    letterSpacing: 0.4,
                    }}
                >
                    CHỌN BẢN ĐỒ
                </Typography>
                </Box>

                <Chip
                size="small"
                label="4 bản đồ"
                sx={{
                    height: 23,
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#2563eb",
                    bgcolor: "#dbeafe",
                }}
                />
            </Box>

            {/* 4 BẢN ĐỒ TRÊN CÙNG MỘT HÀNG */}
            <Box
                sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: { xs: 0.6, sm: 1.2 },
                width: "100%",
                }}
            >
                {THEME_KEYS.map((key) => {
                const selected = draftThemeId === key;
                const item = MAP_THEMES[key];

                return (
                    <Paper
                    key={key}
                    elevation={0}
                    onClick={() => setDraftThemeId(key)}
                    sx={{
                        position: "relative",
                        minWidth: 0,
                        p: { xs: 0.7, sm: 1.5 },
                        borderRadius: { xs: 2, sm: 3 },
                        cursor: "pointer",
                        textAlign: "center",
                        border: selected
                        ? `2px solid ${item.color}`
                        : "1px solid #dbe4f0",
                        background: selected ? item.light : "#fff",
                        boxShadow: selected
                        ? `0 5px 15px ${item.color}22`
                        : "0 2px 8px rgba(15,23,42,.035)",
                        transition: "all .2s ease",
                        "&:hover": {
                        borderColor: item.color,
                        transform: "translateY(-2px)",
                        },
                    }}
                    >
                    {/* DẤU TÍCH ĐÃ CHỌN */}
                    {selected && (
                        <CheckCircleIcon
                        sx={{
                            position: "absolute",
                            top: { xs: 3, sm: 7 },
                            right: { xs: 3, sm: 7 },
                            fontSize: { xs: 14, sm: 19 },
                            color: item.color,
                        }}
                        />
                    )}

                    {/* BIỂU TƯỢNG */}
                    <Typography
                        sx={{
                        fontSize: { xs: 21, sm: 30 },
                        lineHeight: 1.3,
                        mb: { xs: 0.3, sm: 0.7 },
                        }}
                    >
                        {item.emoji}
                    </Typography>

                    {/* TÊN BẢN ĐỒ */}
                    <Typography
                        sx={{
                        fontSize: { xs: 9, sm: 12 },
                        fontWeight: 900,
                        color: selected ? item.color : "#1e293b",
                        lineHeight: 1.35,
                        overflowWrap: "anywhere",
                        }}
                    >
                        {item.name}
                    </Typography>

                    {/* MÔ TẢ: ẨN TRÊN ĐIỆN THOẠI */}
                    <Typography
                        sx={{
                        display: { xs: "none", sm: "block" },
                        mt: 0.4,
                        fontSize: 10,
                        color: "#64748b",
                        lineHeight: 1.35,
                        }}
                    >
                        {item.description}
                    </Typography>
                    </Paper>
                );
                })}
            </Box>
            </Box>

        {/* SỐ LƯỢNG CHẶNG */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1.3 }}>
            <FlagIcon sx={{ fontSize: 20, color: "#2563eb" }} />
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 900,
                color: "#172554",
                letterSpacing: 0.4,
              }}
            >
              SỐ LƯỢNG CHẶNG
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 3,
              border: "1px solid #dbeafe",
              background:
                "linear-gradient(110deg,#eff6ff 0%,#fff 65%,#f0f9ff 100%)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#334155",
                  }}
                >
                  Hành trình khám phá
                </Typography>
                <Typography
                  sx={{
                    mt: 0.35,
                    fontSize: 10,
                    color: "#64748b",
                  }}
                >
                  Từ 3 đến 8 chặng
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  size="small"
                  disabled={draftStageCount <= 3}
                  onClick={() =>
                    setDraftStageCount((prev) => Math.max(3, prev - 1))
                  }
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    color: "#2563eb",
                    border: "1px solid #bfdbfe",
                    bgcolor: "#fff",
                    "&:hover": { bgcolor: "#dbeafe" },
                  }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>

                <Box sx={{ minWidth: 72, textAlign: "center" }}>
                  <Typography
                    sx={{
                      fontSize: 22,
                      lineHeight: 1.1,
                      fontWeight: 900,
                      color: "#1d4ed8",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {draftStageCount}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#64748b",
                    }}
                  >
                    CHẶNG
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  disabled={draftStageCount >= 8}
                  onClick={() =>
                    setDraftStageCount((prev) => Math.min(8, prev + 1))
                  }
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    color: "#fff",
                    bgcolor: "#2563eb",
                    "&:hover": { bgcolor: "#1d4ed8" },
                    "&.Mui-disabled": {
                      bgcolor: "#e2e8f0",
                      color: "#94a3b8",
                    },
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* DẢI HIỂN THỊ CÁC CHẶNG */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mt: 1.6,
              }}
            >
              {Array.from({ length: 8 }, (_, index) => {
                const active = index < draftStageCount;

                return (
                  <Box
                    key={index}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 5,
                      bgcolor: active ? "#3b82f6" : "#e2e8f0",
                      transition: "background .2s ease",
                    }}
                  />
                );
              })}
            </Box>
          </Paper>
        </Box>

        {/* CHẾ ĐỘ TỔ CHỨC */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1.3 }}>
            <GroupsIcon sx={{ fontSize: 20, color: "#2563eb" }} />
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 900,
                color: "#172554",
                letterSpacing: 0.4,
              }}
            >
              CHẾ ĐỘ TỔ CHỨC
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 1.2,
            }}
          >
            {[
              {
                id: "teacher",
                emoji: "👩‍🏫",
                title: "GV chuyển chặng",
                description: "Giáo viên điều khiển",
                icon: <SchoolIcon />,
              },
              {
                id: "quiz",
                emoji: "❓",
                title: "HS trả lời",
                description: "Học sinh trả lời câu hỏi",
                icon: <GroupsIcon />,
              },
            ].map((item) => {
              const selected = draftMode === item.id;

              return (
                <Paper
                  key={item.id}
                  elevation={0}
                  onClick={() => setDraftMode(item.id)}
                  sx={{
                    position: "relative",
                    minWidth: 0,
                    p: { xs: 1.2, sm: 1.5 },
                    borderRadius: 3,
                    cursor: "pointer",
                    textAlign: "center",
                    border: selected
                      ? "2px solid #2563eb"
                      : "1px solid #dbe4f0",
                    bgcolor: selected ? "#eff6ff" : "#fff",
                    boxShadow: selected
                      ? "0 5px 15px rgba(37,99,235,.10)"
                      : "none",
                    transition: "all .2s ease",
                    "&:hover": {
                      borderColor: "#60a5fa",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {selected && (
                    <CheckCircleIcon
                      sx={{
                        position: "absolute",
                        top: 7,
                        right: 7,
                        fontSize: 18,
                        color: "#2563eb",
                      }}
                    />
                  )}

                  <Typography sx={{ fontSize: 27, lineHeight: 1.4 }}>
                    {item.emoji}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      fontWeight: 900,
                      color: selected ? "#1d4ed8" : "#334155",
                    }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.4,
                      fontSize: 10,
                      color: "#64748b",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.description}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </Box>

        {/* TÓM TẮT CẤU HÌNH */}
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            p: 1.3,
            borderRadius: 2.5,
            bgcolor: "#f1f5f9",
            border: "1px solid #e2e8f0",
          }}
        >
          <Typography sx={{ fontSize: 25 }}>
            {selectedTheme.emoji}
          </Typography>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 900,
                color: "#334155",
              }}
            >
              CẤU HÌNH ĐANG CHỌN
            </Typography>
            <Typography
              sx={{
                mt: 0.3,
                fontSize: 11,
                color: "#64748b",
                overflowWrap: "anywhere",
              }}
            >
              {selectedTheme.name} · {draftStageCount} chặng ·{" "}
              {draftMode === "teacher" ? "GV chuyển chặng" : "HS trả lời"}
            </Typography>
          </Box>
        </Paper>

        {/* ÁP DỤNG */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleApply}
          startIcon={<CheckCircleIcon />}
          sx={{
            py: 1.6,
            borderRadius: 3,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 0.4,
            color: "#fff",
            background: "linear-gradient(90deg,#2563eb,#0ea5e9)",
            boxShadow: "0 7px 18px rgba(37,99,235,.25)",
            "&:hover": {
              background: "linear-gradient(90deg,#1d4ed8,#0284c7)",
              transform: "translateY(-2px)",
              boxShadow: "0 10px 25px rgba(37,99,235,.3)",
            },
            transition: "all .2s ease",
          }}
        >
          ÁP DỤNG CẤU HÌNH
        </Button>

        <Typography
          sx={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 10,
            mt: -1.3,
          }}
        >
          HỆ THỐNG HỖ TRỢ GIÁO VIÊN · BÌNH KHÁNH
        </Typography>
      </DialogContent>
    </Dialog>
  );
}


import React, { useEffect, useState } from "react";

import {
  Box,
  Paper,
  Typography,
  Dialog,
  DialogContent,
  Button,
  Slider,
  Chip,
  Grid,
  IconButton,
  Fade,
  Stack,
} from "@mui/material";

import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

const shuffleArray = (array) => {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

const getStudentName = (student) =>
  student?.hoVaTen || student?.ten || "Chưa có tên";

const groupColors = [
  {
    main: "#2563EB",
    light: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    main: "#059669",
    light: "#ECFDF5",
    border: "#A7F3D0",
  },
  {
    main: "#9333EA",
    light: "#FAF5FF",
    border: "#E9D5FF",
  },
  {
    main: "#D97706",
    light: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    main: "#E11D48",
    light: "#FFF1F2",
    border: "#FECDD3",
  },
  {
    main: "#0891B2",
    light: "#ECFEFF",
    border: "#A5F3FC",
  },
];

export default function GroupStudentsDialog({
  open,
  onClose,
  students = [],
}) {
  const [groupCount, setGroupCount] = useState(4);
  const [groups, setGroups] = useState([]);

  const maxGroups = Math.max(
    2,
    Math.min(12, students.length || 12)
  );

  const handleCreateGroups = () => {
    if (!students.length) return;

    const shuffled = shuffleArray(students);

    const result = Array.from(
      { length: groupCount },
      () => []
    );

    shuffled.forEach((student, index) => {
      result[index % groupCount].push(student);
    });

    setGroups(result);
  };

  useEffect(() => {
    if (open) {
      setGroups([]);
      setGroupCount((prev) =>
        Math.min(prev, maxGroups)
      );
    }
  }, [open, maxGroups]);

  
return (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    TransitionComponent={Fade}
    PaperProps={{
      sx: {
        borderRadius: 4,
        overflow: "hidden",
        maxWidth: 650,
        background: "#F8FAFC",
        boxShadow: "0 24px 70px rgba(15, 23, 42, 0.2)",
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
          "linear-gradient(115deg, #101B3C 0%, #173B82 55%, #087DB5 100%)",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2.5,
          bgcolor: "rgba(56,189,248,0.18)",
          border: "1px solid rgba(125,211,252,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GroupsRoundedIcon sx={{ fontSize: 27, color: "#7DD3FC" }} />
      </Box>

      <Box flex={1}>
        <Typography
          fontWeight={900}
          fontSize={18}
          letterSpacing={0.3}
        >
          CHIA NHÓM HỌC SINH
        </Typography>

        <Typography
          fontSize={12}
          sx={{ opacity: 0.9 }}
        >
          Xáo trộn ngẫu nhiên và phân chia đồng đều
        </Typography>
      </Box>

      <IconButton
        onClick={onClose}
        sx={{
          color: "#fff",
          bgcolor: "rgba(56,189,248,0.16)",
          "&:hover": {
            bgcolor: "rgba(56,189,248,0.3)",
          },
        }}
      >
        <CloseRoundedIcon />
      </IconButton>
    </Box>

    <DialogContent
      sx={{
        p: { xs: 2, sm: 2.5 },
        background: "#F8FAFC",
      }}
    >
      {/* THÔNG TIN SĨ SỐ */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: "#ECFDF5",
              border: "1px solid #A7F3D0",
              textAlign: "center",
            }}
          >
            <GroupsRoundedIcon
              sx={{ color: "#059669", fontSize: 25 }}
            />

            <Typography
              fontSize={25}
              fontWeight={900}
              color="#047857"
              lineHeight={1.3}
            >
              {students.length}
            </Typography>

            <Typography
              fontSize={11}
              fontWeight={700}
              color="#047857"
            >
              TỔNG SỐ HỌC SINH
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6}>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              textAlign: "center",
            }}
          >
            <ShuffleRoundedIcon
              sx={{ color: "#2563EB", fontSize: 25 }}
            />

            <Typography
              fontSize={25}
              fontWeight={900}
              color="#1D4ED8"
              lineHeight={1.3}
            >
              {groupCount}
            </Typography>

            <Typography
              fontSize={11}
              fontWeight={700}
              color="#1D4ED8"
            >
              SỐ NHÓM DỰ KIẾN
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ĐIỀU CHỈNH SỐ NHÓM */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          bgcolor: "#fff",
          mb: 2,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Typography
            fontWeight={800}
            fontSize={14}
            color="#334155"
          >
            SỐ NHÓM MUỐN CHIA
          </Typography>

          <Chip
            label={`${groupCount} nhóm`}
            sx={{
              fontWeight: 800,
              color: "#1D4ED8",
              bgcolor: "#DBEAFE",
              border: "1px solid #BFDBFE",
            }}
          />
        </Stack>

        <Slider
          value={groupCount}
          onChange={(_, value) => {
            setGroupCount(value);
            setGroups([]);
          }}
          min={2}
          max={maxGroups}
          marks
          step={1}
          valueLabelDisplay="auto"
          sx={{
            color: "#2563EB",
            mt: 1,
            "& .MuiSlider-thumb": {
              width: 19,
              height: 19,
              boxShadow: "0 0 0 5px rgba(37,99,235,0.12)",
            },
            "& .MuiSlider-rail": {
              opacity: 0.2,
            },
          }}
        />

        <Typography
          fontSize={12}
          color="text.secondary"
          textAlign="center"
        >
          Kéo thanh trượt để chọn số nhóm từ 2 đến {maxGroups}
        </Typography>
      </Paper>

      {/* NÚT CHIA NHÓM */}
      <Button
        fullWidth
        variant="contained"
        startIcon={<ShuffleRoundedIcon />}
        onClick={handleCreateGroups}
        disabled={!students.length}
        sx={{
          py: 1.5,
          borderRadius: 2.5,
          fontWeight: 900,
          fontSize: 14,
          letterSpacing: 0.3,
          color: "#fff",
          background:
            "linear-gradient(90deg, #2563EB, #0EA5E9)",
          boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
          "&:hover": {
            background:
              "linear-gradient(90deg, #1D4ED8, #0284C7)",
            boxShadow: "0 6px 16px rgba(37,99,235,0.4)",
          },
          "&.Mui-disabled": {
            color: "#FFFFFF",
            background: "#94A3B8",
          },
        }}
      >
        XÁO TRỘN VÀ CHIA NHÓM
      </Button>

      {/* KẾT QUẢ CHIA NHÓM */}
      {groups.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            mb={1.5}
          >
            <AutoAwesomeRoundedIcon sx={{ color: "#2563EB" }} />

            <Typography
              fontWeight={900}
              fontSize={15}
              color="#0F172A"
            >
              KẾT QUẢ CHIA NHÓM
            </Typography>

            <Chip
              size="small"
              label={`${students.length} học sinh`}
              sx={{
                ml: "auto !important",
                fontWeight: 700,
                bgcolor: "#DBEAFE",
                color: "#1D4ED8",
              }}
            />
          </Stack>

          <Grid container spacing={2} alignItems="stretch">
            {groups.map((group, index) => {
              const color =
                groupColors[index % groupColors.length];

              return (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  key={index}
                  sx={{
                    display: "flex",
                    minWidth: 0,
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.7,
                      width: "100%",
                      minWidth: 0,
                      height: "100%",
                      minHeight: 210,
                      boxSizing: "border-box",
                      borderRadius: 2.5,
                      border: `1px solid ${color.border}`,
                      bgcolor: color.light,
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow:
                          "0 5px 14px rgba(15,23,42,0.07)",
                      },
                    }}
                  >
                    {/* TIÊU ĐỀ NHÓM */}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1.2}
                      sx={{ flexShrink: 0 }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                      >
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            flexShrink: 0,
                            borderRadius: 2,
                            bgcolor: color.main,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: 14,
                          }}
                        >
                          {index + 1}
                        </Box>

                        <Typography
                          fontWeight={900}
                          color={color.main}
                          fontSize={14}
                        >
                          NHÓM {index + 1}
                        </Typography>
                      </Stack>

                      <Chip
                        size="small"
                        label={`${group.length} HS`}
                        sx={{
                          fontWeight: 800,
                          color: color.main,
                          bgcolor: "#fff",
                          border: `1px solid ${color.border}`,
                        }}
                      />
                    </Stack>

                    {/* DANH SÁCH HỌC SINH */}
                    <Box
                      sx={{
                        borderTop: `1px dashed ${color.border}`,
                        pt: 1,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {group.map((student, studentIndex) => (
                        <Box
                          key={
                            student.maDinhDanh ||
                            `${index}-${studentIndex}`
                          }
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                            py: 0.65,
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            fontSize={12}
                            fontWeight={700}
                            color={color.main}
                            sx={{
                              minWidth: 19,
                              flexShrink: 0,
                              textAlign: "right",
                            }}
                          >
                            {studentIndex + 1}.
                          </Typography>

                          <Typography
                            fontSize={13}
                            color="#334155"
                            fontWeight={500}
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              lineHeight: 1.5,
                              overflowWrap: "anywhere",
                              wordBreak: "normal",
                            }}
                          >
                            {getStudentName(student)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {/* THÔNG BÁO */}
          <Paper
            elevation={0}
            sx={{
              mt: 1.5,
              p: 1.3,
              borderRadius: 2,
              bgcolor: "#EFF6FF",
              border: "1px solid #BFDBFE",
            }}
          >
            <Typography
              fontSize={12}
              color="#1E40AF"
              textAlign="center"
              fontWeight={600}
            >
              <AutoAwesomeRoundedIcon
                sx={{
                  fontSize: 15,
                  verticalAlign: "middle",
                  mr: 0.5,
                }}
              />
              Đã chia đều {students.length} học sinh thành{" "}
              {groups.length} nhóm
            </Typography>
          </Paper>
        </Box>
      )}

      {!students.length && (
        <Typography
          textAlign="center"
          color="text.secondary"
          fontSize={13}
          sx={{ mt: 2 }}
        >
          Chưa có danh sách học sinh để chia nhóm.
        </Typography>
      )}
    </DialogContent>
  </Dialog>
);

}

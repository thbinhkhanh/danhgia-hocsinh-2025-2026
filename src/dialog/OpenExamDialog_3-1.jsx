// src/dialog/OpenExamDialog.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Hàm format tên đề
const formatExamTitle = (examName = "") => {
    if (!examName) return "";
    let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;
    const parts = name.split("_");

    const classPart = parts.find(p => p.toLowerCase().includes("lớp")) || "";
    const classNumber = classPart.match(/\d+/)?.[0] || "";

    const classIndex = parts.indexOf(classPart);

    let subjectPart = "";
    for (let i = classIndex + 1; i < parts.length; i++) {
      const p = parts[i];
      if (!p.toLowerCase().includes("cki") && !p.toLowerCase().includes("cn") && !/\d{2}-\d{2}/.test(p)) {
        subjectPart = p;
        break;
      }
    }

    let extraPart = "";
    for (let i = classIndex + 1; i < parts.length; i++) {
      const p = parts[i];
      if (p.toLowerCase().includes("cki") || p.toLowerCase() === "cn") {
        extraPart = p.toUpperCase();
        break;
      }
    }

    const match = examName.match(/\(([^)]+)\)/);
    const examLetter = match ? match[1] : "";

    return `${subjectPart} ${classNumber}${extraPart ? ` - ${extraPart}` : ""} ${examLetter ? `(${examLetter})` : ""}`.trim();
  };

const OpenExamDialog = ({
  open,
  onClose,
  dialogExamType,
  setDialogExamType,
  filterClass,
  setFilterClass,
  classes,
  loadingList,
  docList,
  selectedDoc,
  setSelectedDoc,
  handleOpenSelectedDoc,
  handleDeleteSelectedDoc,
  fetchQuizList,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 6,
          bgcolor: "#f9f9f9",
          overflow: "hidden",
        },
      }}
    >
      {/* ===== HEADER ===== */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(to right, #1976d2, #42a5f5)",
          color: "#fff",
          px: 2,
          py: 2,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: "bold", fontSize: "1.1rem" }}
        >
          📂 Danh sách đề
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff", p: 0.6 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ===== CONTENT ===== */}
      <DialogContent
        dividers
        sx={{ maxHeight: 350, overflowY: "auto", px: 2, py: 2, bgcolor: "#fff" }}
      >
        {/* Loại đề + Lọc lớp */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Loại đề</InputLabel>
            <Select
              value={dialogExamType || "bt"}
              onChange={(e) => {
                const type = e.target.value;
                setDialogExamType(type);
                fetchQuizList(type);
              }}
              label="Loại đề"
            >
              <MenuItem value="bt">Bài tập tuần</MenuItem>
              <MenuItem value="ktdk">KTĐK</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Lọc lớp</InputLabel>
            <Select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              label="Lọc lớp"
            >
              <MenuItem value="Tất cả">Tất cả</MenuItem>
              {classes.map((lop) => (
                <MenuItem key={lop} value={lop}>
                  {lop}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Danh sách đề */}
        <Box
          sx={{
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid #ccc",
            borderRadius: 2,
          }}
        >
          {loadingList ? (
            <Typography align="center" sx={{ p: 2, color: "gray" }}>
              ⏳ Đang tải danh sách đề...
            </Typography>
          ) : docList.length === 0 ? (
            <Typography align="center" sx={{ p: 2, color: "gray" }}>
              Không có đề nào.
            </Typography>
          ) : (
            docList
              .filter((doc) =>
                filterClass === "Tất cả" ? true : doc.class === filterClass
              )
              .filter((doc) =>
                dialogExamType === "bt"
                  ? doc.collection === "BAITAP_TUAN"
                  : doc.collection === "NGANHANG_DE"
              )
              .map((doc) => (
                <Stack
                  key={doc.id}
                  direction="row"
                  alignItems="center"
                  sx={{
                    px: 1,
                    py: 0.5,
                    height: 36,
                    cursor: "pointer",
                    borderRadius: 1,
                    backgroundColor:
                      selectedDoc === doc.id ? "#E3F2FD" : "transparent",
                    "&:hover": { backgroundColor: "#f5f5f5" },
                  }}
                  onClick={() => setSelectedDoc(doc.id)}
                  onDoubleClick={() => handleOpenSelectedDoc(doc.id)}
                >
                  <Typography variant="subtitle1">
                    {formatExamTitle(doc.id)}
                  </Typography>
                </Stack>
              ))
          )}
        </Box>
      </DialogContent>

      {/* ===== ACTIONS ===== */}
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "center", gap: 1.5 }}>
        <Button
          onClick={() => handleOpenSelectedDoc(selectedDoc)}
          variant="contained"
          disabled={!selectedDoc}
        >
          Mở đề
        </Button>
        <Button
          onClick={handleDeleteSelectedDoc}
          variant="outlined"
          color="error"
          disabled={!selectedDoc}
        >
          Xóa đề
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OpenExamDialog;

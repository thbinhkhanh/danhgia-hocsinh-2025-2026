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

/* ===================== FORMAT TITLE ===================== */

// Format tên đề KTĐK
const formatExamTitle = (examName = "") => {
  if (!examName) return "";
  let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;
  const parts = name.split("_");

  const classPart = parts.find((p) => p.toLowerCase().includes("lớp")) || "";
  const classNumber = classPart.match(/\d+/)?.[0] || "";
  const classIndex = parts.indexOf(classPart);

  let subjectPart = "";
  for (let i = classIndex + 1; i < parts.length; i++) {
    const p = parts[i];
    if (
      !p.toLowerCase().includes("cki") &&
      !p.toLowerCase().includes("cn") &&
      !/\d{2}-\d{2}/.test(p)
    ) {
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

  return `${subjectPart} ${classNumber}${
    extraPart ? ` - ${extraPart}` : ""
  } ${examLetter ? `(${examLetter})` : ""}`.trim();
};

// Format tên đề Bài tập tuần
const formatBtTitle = (examName = "") => {
  if (!examName) return "";
  let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;
  const parts = name.split("_");

  const classPart = parts.find((p) => p.toLowerCase().includes("lớp")) || "";
  const classNumber = classPart.match(/\d+/)?.[0] || "";
  const subjectPart =
    parts.find((p) => !p.toLowerCase().includes("lớp") && !/\d+/.test(p)) ||
    "";
  const weekNumber = parts[parts.length - 1];

  return `${subjectPart} ${classNumber} (tuần ${weekNumber})`;
};

// Lấy năm học từ ID
const getExamYearFromId = (examId) => {
  const match = examId.match(/(\d{2}-\d{2})/);
  if (!match) return "";
  const [y1, y2] = match[1].split("-");
  return `20${y1}-20${y2}`;
};

// Check collection theo loại đề
const isDocMatchType = (doc, type) => {
  if (type === "bt") return doc.collection === "BAITAP_TUAN";
  if (type === "ktdk") return doc.collection === "NGANHANG_DE";
  if (type === "luyentap") return doc.collection?.startsWith("TRACNGHIEM");
  return false;
};

// Lấy lớp từ collection luyện tập: TRACNGHIEM3 → Lớp 3
const getClassFromLuyenTapCollection = (collection = "") => {
  const match = collection.match(/TRACNGHIEM(\d+)/);
  return match ? `Lớp ${match[1]}` : "";
};

/* ===================== COMPONENT ===================== */

const OpenExamDialog = ({
  open,
  onClose,
  dialogExamType,
  setDialogExamType,
  filterClass,
  setFilterClass,
  filterYear,
  setFilterYear,
  classes,
  loadingList,
  docList,
  selectedDoc,
  setSelectedDoc,
  handleOpenSelectedDoc,
  handleDeleteSelectedDoc,
  fetchQuizList,
}) => {
  const years = [
    "2025-2026",
    "2026-2027",
    "2027-2028",
    "2028-2029",
    "2029-2030",
  ];

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
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(to right, #1976d2, #42a5f5)",
          color: "#fff",
          px: 2,
          py: 2,
        }}
      >
        <Typography fontWeight="bold">📂 Danh sách đề</Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ===== CONTENT ===== */}
      <DialogContent
        dividers
        sx={{
          height: 380,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* FILTER */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Loại đề</InputLabel>
            <Select
              value={dialogExamType || "bt"}
              label="Loại đề"
              onChange={(e) => {
                const type = e.target.value;
                setDialogExamType(type);
                if (type !== "ktdk") setFilterYear("Tất cả");
                fetchQuizList(type);
              }}
            >
              <MenuItem value="bt">Bài tập tuần</MenuItem>
              <MenuItem value="ktdk">KTĐK</MenuItem>
              <MenuItem value="luyentap">Luyện tập tin học</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Lọc lớp</InputLabel>
            <Select
              value={filterClass}
              label="Lọc lớp"
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <MenuItem value="Tất cả">Tất cả</MenuItem>
              {classes
                .filter((lop) => {
                  const n = parseInt(lop.replace(/\D/g, ""));
                  return n >= 3 && n <= 5;
                })
                .map((lop) => (
                  <MenuItem key={lop} value={lop}>
                    {lop}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {dialogExamType === "ktdk" && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Năm học</InputLabel>
              <Select
                value={filterYear}
                label="Năm học"
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <MenuItem value="Tất cả">Tất cả</MenuItem>
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        {/* LIST */}
        <Box sx={{ flex: 1, overflowY: "auto", border: "1px solid #ccc", borderRadius: 2 }}>
          {loadingList ? (
            <Typography align="center" sx={{ p: 2 }}>
              ⏳ Đang tải danh sách đề...
            </Typography>
          ) : (
            docList
              // lọc theo loại đề
              .filter((doc) => isDocMatchType(doc, dialogExamType))
              // lọc theo lớp (BT, KTĐK & LUYỆN TẬP)
              .filter((doc) => {
                if (filterClass === "Tất cả") return true;

                if (dialogExamType === "luyentap") {
                  return (
                    getClassFromLuyenTapCollection(doc.collection) ===
                    filterClass
                  );
                }

                return doc.class === filterClass;
              })
              // lọc năm (chỉ KTĐK)
              .filter((doc) => {
                if (dialogExamType !== "ktdk") return true;
                return filterYear === "Tất cả"
                  ? true
                  : getExamYearFromId(doc.id) === filterYear;
              })
              .map((doc) => (
                <Box
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc.id)}
                  onDoubleClick={() => handleOpenSelectedDoc(doc.id)}
                  sx={{
                    px: 1,
                    py: 0.5,
                    cursor: "pointer",
                    bgcolor: selectedDoc === doc.id ? "#E3F2FD" : "transparent",
                    "&:hover": { bgcolor: "#f5f5f5" },
                  }}
                >
                  <Typography>
                    {dialogExamType === "ktdk" && formatExamTitle(doc.id)}
                    {dialogExamType === "bt" && formatBtTitle(doc.id)}
                    {dialogExamType === "luyentap" && doc.id}
                  </Typography>
                </Box>
              ))
          )}
        </Box>
      </DialogContent>

      {/* ===== ACTIONS ===== */}
      <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
        <Button
          variant="contained"
          disabled={!selectedDoc}
          onClick={() => handleOpenSelectedDoc(selectedDoc)}
        >
          Mở đề
        </Button>
        <Button
          variant="outlined"
          color="error"
          disabled={!selectedDoc}
          onClick={handleDeleteSelectedDoc}
        >
          Xóa đề
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OpenExamDialog;

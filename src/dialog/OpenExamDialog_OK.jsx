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

  console.log("🟡 OpenExamDialog PROPS:");
  console.log("dialogExamType:", dialogExamType);
  console.log("filterYear:", filterYear);
  console.log("filterClass:", filterClass);
  
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
              value={dialogExamType}
              label="Loại đề"
              onChange={(e) => {
                const type = e.target.value;

                setDialogExamType(type);

                fetchQuizList(type, filterYear, filterClass);
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
              onChange={(e) => {
                const newClass = e.target.value;

                console.log("🔵 đổi lớp:", newClass, "type hiện tại:", dialogExamType);

                setFilterClass(newClass);

                // chỉ gọi lại fetch khi cần, KHÔNG reset type
                fetchQuizList(dialogExamType, filterYear, newClass);
              }}
            >
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

          {(dialogExamType === "ktdk" || dialogExamType === "luyentap") && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Năm học</InputLabel>
              <Select
                value={filterYear}
                label="Năm học"
                onChange={(e) => {
                  const newYear = e.target.value;

                  setFilterYear(newYear);

                  fetchQuizList(dialogExamType, newYear, filterClass);
                }}
              >
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
            (() => {
              const normalize = (s = "") =>
                s
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "");

              const getNumber = (text = "") => {
                const match = text.match(/\d+/);
                return match ? parseInt(match[0], 10) : 9999;
              };

              const getGroupOrder = (title = "") => {
                const t = normalize(title);

                // 1. bài / tuần
                if (t.includes("bai") || t.includes("tuan")) return 1;

                // 2. ôn tập học kỳ
                if (t.includes("on tap hoc ki")) return 2;

                // 3. ôn tập cuối năm → xuống cuối
                if (t.includes("on tap cuoi nam")) return 3;

                return 4;
              };

              return docList
                // lọc theo loại đề
                .filter((doc) => isDocMatchType(doc, dialogExamType))

                // lọc theo lớp
                .filter((doc) => {
                  if (dialogExamType === "luyentap") {
                    return getClassFromLuyenTapCollection(doc.collection) === filterClass;
                  }
                  return doc.class === filterClass;
                })

                // lọc năm
                .filter((doc) => {
                  if (dialogExamType !== "ktdk") return true;
                  return getExamYearFromId(doc.id) === filterYear;
                })

                // ⭐ SORT MỚI
                .sort((a, b) => {
                  const titleA =
                    dialogExamType === "ktdk"
                      ? formatExamTitle(a.id)
                      : dialogExamType === "bt"
                      ? formatBtTitle(a.id)
                      : a.id;

                  const titleB =
                    dialogExamType === "ktdk"
                      ? formatExamTitle(b.id)
                      : dialogExamType === "bt"
                      ? formatBtTitle(b.id)
                      : b.id;

                  const normalize = (s = "") =>
                    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                  const tA = normalize(titleA);
                  const tB = normalize(titleB);

                  // =========================
                  // 🔥 GROUP LOGIC
                  // =========================
                  const getGroup = (t) => {
                    // bài tập tuần / tuần (BT + LT nếu có)
                    if (t.includes("bai") || t.includes("tuan")) return 1;

                    // ôn tập học kỳ
                    if (t.includes("on tap hoc ki")) return 2;

                    // ôn tập cuối năm
                    if (t.includes("on tap cuoi nam")) return 3;

                    return 4;
                  };

                  const groupA = getGroup(tA);
                  const groupB = getGroup(tB);

                  if (groupA !== groupB) return groupA - groupB;

                  // =========================
                  // 🔥 NUMBER EXTRACT CHUẨN
                  // =========================

                  const getNumber = (text = "") => {
                    // ưu tiên "tuần X"
                    const weekMatch = text.match(/tuần\s*(\d+)/i);
                    if (weekMatch) return parseInt(weekMatch[1], 10);

                    // fallback: bài X
                    const baiMatch = text.match(/bài\s*(\d+)/i);
                    if (baiMatch) return parseInt(baiMatch[1], 10);

                    // fallback cuối
                    const any = text.match(/\d+/);
                    return any ? parseInt(any[0], 10) : 9999;
                  };

                  return getNumber(titleA) - getNumber(titleB);
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
                ));
            })()
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

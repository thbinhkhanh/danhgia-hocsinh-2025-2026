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

  const classPart = parts.find((p) => p.toLowerCase().includes("lớp")) || "";
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

// Format tên đề Bài tập tuần: "Tin học 4 (tuần 11)"
const formatBtTitle = (examName = "") => {
  if (!examName) return "";
  // Loại bỏ tiền tố "quiz_"
  let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;
  const parts = name.split("_"); // ["Lớp 4", "Tin học", "11"]

  const classPart = parts.find((p) => p.toLowerCase().includes("lớp")) || "";
  const classNumber = classPart.match(/\d+/)?.[0] || ""; // "4"

  const subjectPart = parts.find((p) => !p.toLowerCase().includes("lớp") && !/\d+/.test(p)) || ""; // "Tin học"

  const numberPart = parts[parts.length - 1]; // phần cuối, chắc chắn là số thứ tự tuần
  const weekNumber = /\d+/.test(numberPart) ? numberPart : "";

  return `${subjectPart} ${classNumber} (tuần ${weekNumber})`;
};

// Lấy năm học dạng "2026-2027" từ ID đề
const getExamYearFromId = (examId) => {
  const match = examId.match(/(\d{2}-\d{2})/); // tìm "25-26", "26-27"...
  if (!match) return "";
  const years = match[1].split("-");
  return `20${years[0]}-20${years[1]}`; // ví dụ "26-27" -> "2026-2027"
};

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
  // Danh sách năm học cố định
  const years = ["2025-2026", "2026-2027", "2027-2028", "2028-2029", "2029-2030"];

  const sortedDocList = docList
    .filter((doc) =>
      dialogExamType === "bt" ? doc.collection === "BAITAP_TUAN" : doc.collection === "NGANHANG_DE"
    )
    .filter((doc) => (filterClass === "Tất cả" ? true : doc.class === filterClass))
    .filter((doc) => (filterYear === "Tất cả" ? true : getExamYearFromId(doc.id) === filterYear))
    .sort((a, b) => {
      // Chỉ sắp xếp KTĐK
      if (dialogExamType !== "ktdk") return 0;

      // Lấy thông tin môn, lớp, chữ đề
      const regex = /(.*) (\d+)-? ?(CKI)? ?\(?([A-Z])?\)?/i;

      const matchA = formatExamTitle(a.id).match(regex);
      const matchB = formatExamTitle(b.id).match(regex);

      if (!matchA || !matchB) return 0;

      const [_, subjectA, classA, , letterA] = matchA;
      const [__, subjectB, classB, , letterB] = matchB;

      // Sắp theo môn
      if (subjectA !== subjectB) return subjectA.localeCompare(subjectB);
      // Sắp theo lớp
      if (classA !== classB) return parseInt(classA) - parseInt(classB);
      // Sắp theo chữ cái đề
      return (letterA || "").localeCompare(letterB || "");
    });

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
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
          📂 Danh sách đề
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff", p: 0.6 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ===== CONTENT ===== */}
      <DialogContent
        dividers
        sx={{
          height: 380,         // ✅ chiều cao cố định toàn bộ DialogContent
          px: 2,
          py: 2,
          bgcolor: "#fff",
          display: "flex",
          flexDirection: "column",
          // ❌ bỏ overflowY: "hidden" để scroll Box con hoạt động
        }}
      >
        {/* Loại đề + Lọc lớp + Lọc năm */}
        <Stack
          direction={{ xs: "column", sm: "row" }} // xs = mobile → cột, sm+ = hàng
          spacing={2}
          sx={{ mb: 2, flexWrap: "wrap" }}
        >
          {/* Loại đề */}
          <FormControl size="small" sx={{ minWidth: 150, width: { xs: "100%", sm: "auto" } }}>
            <InputLabel>Loại đề</InputLabel>
            <Select
              value={dialogExamType || "bt"}
              onChange={(e) => {
                const type = e.target.value;
                setDialogExamType(type);
                if (type === "bt") setFilterYear("Tất cả"); // reset năm khi BT
                fetchQuizList(type);
              }}
              label="Loại đề"
            >
              <MenuItem value="bt">Bài tập tuần</MenuItem>
              <MenuItem value="ktdk">KTĐK</MenuItem>
            </Select>
          </FormControl>

          {/* Lọc lớp */}
          <FormControl size="small" sx={{ minWidth: 120, width: { xs: "100%", sm: "auto" } }}>
            <InputLabel>Lọc lớp</InputLabel>
            <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} label="Lọc lớp">
              <MenuItem value="Tất cả">Tất cả</MenuItem>
              {classes
                .filter((lop) => {
                  const num = parseInt(lop.replace(/\D/g, "")); // lấy số trong tên lớp
                  return num >= 3 && num <= 5; // chỉ lấy lớp 3-5
                })
                .map((lop) => (
                  <MenuItem key={lop} value={lop}>
                    {lop}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>


          {/* Chỉ hiển thị Select Năm học khi KTĐK */}
          {dialogExamType === "ktdk" && (
            <FormControl
              size="small"
              sx={{
                minWidth: 140,
                width: { xs: "100%", sm: "auto" }, // mobile = full width
              }}
            >
              <InputLabel>Năm học</InputLabel>
              <Select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} label="Năm học">
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



        {/* Danh sách đề chiếm toàn bộ chiều cao còn lại */}
        <Box
          sx={{
            flex: 1,                  // chiếm hết không gian còn lại
            overflowY: "auto",        // ✅ scroll khi danh sách dài
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
            .filter((doc) => (filterClass === "Tất cả" ? true : doc.class === filterClass))
            .filter((doc) => (filterYear === "Tất cả" ? true : getExamYearFromId(doc.id) === filterYear))
            .filter((doc) =>
              dialogExamType === "bt" ? doc.collection === "BAITAP_TUAN" : doc.collection === "NGANHANG_DE"
            )
            // Thêm sort chỉ khi KTĐK
            .sort((a, b) => {
              if (dialogExamType !== "ktdk") return 0;

              const regex = /(.*) (\d+).*?\(?([A-Z])?\)?$/i;

              const matchA = formatExamTitle(a.id).match(regex);
              const matchB = formatExamTitle(b.id).match(regex);

              if (!matchA || !matchB) return 0;

              const [_, subjectA, classA, letterA] = matchA;
              const [__, subjectB, classB, letterB] = matchB;

              // Sắp theo môn
              if (subjectA !== subjectB) return subjectA.localeCompare(subjectB);
              // Sắp theo lớp
              if (classA !== classB) return parseInt(classA) - parseInt(classB);
              // Sắp theo chữ cái đề
              return (letterA || "").localeCompare(letterB || "");
            })
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
                  backgroundColor: selectedDoc === doc.id ? "#E3F2FD" : "transparent",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
                onClick={() => setSelectedDoc(doc.id)}
                onDoubleClick={() => handleOpenSelectedDoc(doc.id)}
              >
                <Typography variant="subtitle1">
                  {dialogExamType === "ktdk" ? formatExamTitle(doc.id) : formatBtTitle(doc.id)}
                </Typography>
              </Stack>
            ))

          )}
        </Box>
      </DialogContent>

      {/* ===== ACTIONS ===== */}
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "center", gap: 1.5 }}>
        <Button onClick={() => handleOpenSelectedDoc(selectedDoc)} variant="contained" disabled={!selectedDoc}>
          Mở đề
        </Button>
        <Button onClick={handleDeleteSelectedDoc} variant="outlined" color="error" disabled={!selectedDoc}>
          Xóa đề
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OpenExamDialog;

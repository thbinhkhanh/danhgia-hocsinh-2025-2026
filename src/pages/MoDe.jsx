import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function OpenExamDialog({
  openDialog,
  setOpenDialog,
  classes = [],
  fetchQuizList,          // (type) => Promise<void>
  docList = [],
  loadingList = false,
  handleOpenSelectedDoc,  // (docId) => void
  handleDeleteSelectedDoc,// (docId) => void
}) {
  const [dialogExamType, setDialogExamType] = useState("bt"); // mặc định Bài tập tuần
  const [filterClass, setFilterClass] = useState("Tất cả");
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Mỗi lần mở dialog: reset state và fetch theo "bt"
  useEffect(() => {
    if (openDialog) {
      setSelectedDoc(null);
      setDialogExamType("bt");
      fetchQuizList?.("bt");
    }
  }, [openDialog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đổi loại đề: cập nhật + fetch tương ứng
  const onChangeExamType = (type) => {
    setDialogExamType(type);
    setSelectedDoc(null);
    fetchQuizList?.(type);
  };

  // Lọc danh sách đề theo loại và lớp
  const filteredDocs = (docList || [])
    .filter((doc) => (filterClass === "Tất cả" ? true : doc.class === filterClass))
    .filter((doc) =>
      dialogExamType === "bt"
        ? doc.collection === "BAITAP_TUAN"
        : doc.collection === "TRACNGHIEM_BK"
    );

  return (
    <Dialog
      open={openDialog}
      onClose={() => setOpenDialog(false)}
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
      {/* Thanh tiêu đề */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(to right, #1976d2, #42a5f5)",
          color: "#fff",
          px: 2,
          py: 1.2,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: "bold", fontSize: "1.1rem", letterSpacing: 0.5 }}
        >
          📂 Danh sách đề
        </Typography>
        <IconButton onClick={() => setOpenDialog(false)} sx={{ color: "#fff", p: 0.6 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Nội dung Dialog */}
      <DialogContent dividers sx={{ maxHeight: 350, overflowY: "auto", px: 2, py: 2, bgcolor: "#fff" }}>
        {/* Loại đề + Lọc lớp */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
          {/* Chọn loại đề */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="label-loai-de">Loại đề</InputLabel>
            <Select
              labelId="label-loai-de"
              label="Loại đề"
              value={dialogExamType}
              onChange={(e) => onChangeExamType(e.target.value)}
            >
              <MenuItem value="bt">Bài tập tuần</MenuItem>
              <MenuItem value="ktdk">KTĐK</MenuItem>
            </Select>
          </FormControl>

          {/* Bộ lọc lớp */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="label-loc-lop">Lọc lớp</InputLabel>
            <Select
              labelId="label-loc-lop"
              label="Lọc lớp"
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setSelectedDoc(null);
              }}
            >
              <MenuItem value="Tất cả">Tất cả</MenuItem>
              {classes.map((lop) => (
                <MenuItem key={lop} value={lop}>{lop}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Bảng danh sách đề */}
        <Box sx={{ maxHeight: 260, overflowY: "auto", border: "1px solid #ccc", borderRadius: 2, mb: 1 }}>
          {loadingList ? (
            <Typography align="center" sx={{ p: 2, color: "gray" }}>
              ⏳ Đang tải danh sách đề...
            </Typography>
          ) : filteredDocs.length === 0 ? (
            <Typography align="center" sx={{ p: 2, color: "gray" }}>
              Không có đề nào.
            </Typography>
          ) : (
            filteredDocs.map((doc) => (
              <Stack
                key={doc.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2,
                  py: 1,
                  height: 36,
                  cursor: "pointer",
                  borderRadius: 1,
                  backgroundColor: selectedDoc === doc.id ? "#E3F2FD" : "transparent",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
                // Khi chọn đề, lưu cả object
                onClick={() => setSelectedDoc(doc)}
                onDoubleClick={() => handleOpenSelectedDoc(doc)}
              >
                <Typography variant="subtitle1">{doc.id}</Typography>
              </Stack>
            ))
          )}
        </Box>
      </DialogContent>

      {/* Nút hành động */}
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "center", gap: 1.5 }}>
        <Button
            onClick={() => handleOpenSelectedDoc(selectedDoc)}
            variant="contained"
            disabled={!selectedDoc}
            >
            Mở đề
            </Button>
        <Button
          onClick={() => handleDeleteSelectedDoc(selectedDoc)}
          variant="outlined"
          color="error"
          disabled={!selectedDoc}
        >
          Xóa đề
        </Button>
      </DialogActions>
    </Dialog>
  );
}
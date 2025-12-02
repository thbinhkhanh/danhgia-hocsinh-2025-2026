// src/dialog/OpenExamDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
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
        <IconButton onClick={onClose} sx={{ color: "#fff", p: 0.6 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Nội dung Dialog */}
      <DialogContent
        dividers
        sx={{ maxHeight: 350, overflowY: "auto", px: 2, py: 2, bgcolor: "#fff" }}
      >
        {/* Loại đề + Lọc lớp */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
          {/* Chọn loại đề */}
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

          {/* Bộ lọc lớp */}
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

        {/* Bảng danh sách đề */}
        <Box
          sx={{
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid #ccc",
            borderRadius: 2,
            mb: 1,
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
              .filter((doc) => {
                if (dialogExamType === "bt") return doc.collection === "BAITAP_TUAN";
                else return doc.collection === "TRACNGHIEM_BK"; // KTĐK
              })
              .map((doc) => (
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
                    backgroundColor:
                      selectedDoc === doc.id ? "#E3F2FD" : "transparent",
                    "&:hover": { backgroundColor: "#f5f5f5" },
                  }}
                  onClick={() => setSelectedDoc(doc.id)}
                  onDoubleClick={() => handleOpenSelectedDoc(doc.id)}
                >
                  <Typography variant="subtitle1">{doc.id}</Typography>
                </Stack>
              ))
          )}
        </Box>
      </DialogContent>

      {/* Nút hành động */}
      <DialogActions
        sx={{ px: 3, pb: 2, justifyContent: "center", gap: 1.5 }}
      >
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
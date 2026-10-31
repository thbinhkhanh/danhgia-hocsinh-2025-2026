import React from "react";
import { Card, Box, Typography, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import AssessmentIcon from "@mui/icons-material/Assessment";
import RefreshIcon from "@mui/icons-material/Refresh";
import RateReviewIcon from "@mui/icons-material/RateReview";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // Điều chỉnh lại đường dẫn firebase cho đúng với dự án của bạn

import BangNhapDiemKTDK from "./BangNhapDiemKTDK";

export default function VungNhapDiemCard({
  config,
  setConfig,
  students,
  setStudents,
  selectedClass,
  setSelectedClass,
  selectedSubject,
  setSelectedSubject,
  classes,
  fetchStudentsAndStatus,
  fillLyThuyet,
  setFillLyThuyet,
  fillThucHanh,
  setFillThucHanh,
  handleCellChange,
  handleKeyNavigation,
  generateNhanXet,
  nhanXetData,
  handleSaveAll,
  handleDownload,
  handlePrint,
  handleTongHopDGTX,
  setOpenNhanXet,
  isMobile
}) {
  const navigate = useNavigate();

  return (
    <Card
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        maxWidth: 1420,
        mx: "auto",
        position: "relative"
      }}
    >
      {/* Nút đóng / quay lại */}
      <IconButton
        onClick={() => navigate("/dashboard")}
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          color: "#64748b",
          backgroundColor: "#f1f5f9",
          "&:hover": {
            backgroundColor: "#e2e8f0",
            color: "#ef4444",
          },
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          zIndex: 10,
        }}
      >
        <CloseIcon />
      </IconButton>

      {/* 🟩 Nút Lưu, Tải Excel, In, Tổng hợp */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          gap: 1,
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <Tooltip title="Lưu dữ liệu" arrow>
          <IconButton
            onClick={handleSaveAll}
            sx={{
              color: "primary.main",
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": { bgcolor: "primary.light", color: "white" },
            }}
          >
            <SaveIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Tải xuống Excel" arrow>
          <IconButton
            onClick={handleDownload}
            sx={{
              color: "primary.main",
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": { bgcolor: "primary.light", color: "white" },
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="In danh sách KTĐK" arrow>
          <IconButton
            onClick={handlePrint}
            sx={{
              color: "primary.main",
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": { bgcolor: "primary.light", color: "white" },
            }}
          >
            <PrintIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Tổng hợp điểm ĐGTX và lưu vào KTĐK" arrow>
          <IconButton
            onClick={handleTongHopDGTX}
            sx={{
              color: "#ed6c02",
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": {
                bgcolor: "#fff3e0",
              },
            }}
          >
            <AssessmentIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Làm mới nhận xét" arrow>
          <IconButton
            onClick={() => {
              setStudents((prev) =>
                prev.map((s) => ({
                  ...s,
                  nhanXet: generateNhanXet(
                    s,
                    selectedSubject,
                    s.tongCong,
                    s.mucDat
                  ),
                }))
              );
            }}
            sx={{
              color: "primary.main",
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": { bgcolor: "primary.light", color: "white" },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* NÚT QUẢN LÝ NHẬN XÉT */}
        <Tooltip title="Quản lý nhận xét" arrow>
          <IconButton
            onClick={() => setOpenNhanXet(true)}
            sx={{
              color: "#1976d2",
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": {
                bgcolor: "#e3f2fd",
              },
            }}
          >
            <RateReviewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 🟨 Tiêu đề & Học kỳ hiện tại */}
      <Box sx={{ textAlign: "center", mt: 3, mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          color="primary"
          sx={{ mb: 1 }}
        >
          {`NHẬP ĐIỂM ${config.hocKy?.toUpperCase() || "KTĐK"}`}
        </Typography>
      </Box>

      {/* 🟩 Hàng chọn Lớp – Môn */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          flexWrap: isMobile ? "nowrap" : "wrap",
          overflowX: isMobile ? "auto" : "visible",
          px: isMobile ? 1 : 0,
          mb: 3,
        }}
      >
        {/* Lớp */}
        <FormControl size="small" sx={{ minWidth: 80, flexShrink: 0, mt: 1 }}>
          <InputLabel id="lop-label">Lớp</InputLabel>
          <Select
            labelId="lop-label"
            value={selectedClass}
            label="Lớp"
            onChange={async (e) => {
              const newClass = e.target.value;
              setSelectedClass(newClass);
              setConfig(prev => ({ ...prev, lop: newClass }));
              setStudents([]);
              await fetchStudentsAndStatus(newClass);
            }}
          >
            {classes.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Môn học */}
        <FormControl size="small" sx={{ minWidth: 120, flexShrink: 0, mt: 1 }}>
          <InputLabel id="monhoc-label">Môn</InputLabel>
          <Select
            labelId="monhoc-label"
            value={selectedSubject}
            label="Môn"
            onChange={async (e) => {
              const value = e.target.value;
              setSelectedSubject(value);
              setConfig(prev => ({ ...prev, mon: value }));
              await setDoc(doc(db, "CONFIG", "config"), { mon: value }, { merge: true });
            }}
          >
            <MenuItem value="Tin học">Tin học</MenuItem>
            <MenuItem value="Công nghệ">Công nghệ</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 🧾 Bảng học sinh */}
      <BangNhapDiemKTDK
        {...{
          students,
          selectedSubject,
          config,
          fillLyThuyet,
          setFillLyThuyet,
          fillThucHanh,
          setFillThucHanh,
          handleCellChange,
          handleKeyNavigation,
          generateNhanXet,
          nhanXetData,
          setStudents,
        }}
      />
    </Card>
  );
}
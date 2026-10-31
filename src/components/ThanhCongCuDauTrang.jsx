import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import AssessmentIcon from "@mui/icons-material/Assessment";
import RefreshIcon from "@mui/icons-material/Refresh";
import RateReviewIcon from "@mui/icons-material/RateReview";
import { useNavigate } from "react-router-dom";

export default function ThanhCongCuDauTrang({
  handleSaveAll,
  handleDownload,
  handlePrint,
  handleTongHopDGTX,
  setStudents,
  generateNhanXet,
  selectedSubject,
  setOpenNhanXet,
}) {
  const navigate = useNavigate();

  return (
    <>
      {/* Nút đóng / quay lại dashboard */}
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

      {/* 🟩 Nút Lưu, Tải Excel, In, Tổng hợp,... */}
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
    </>
  );
}
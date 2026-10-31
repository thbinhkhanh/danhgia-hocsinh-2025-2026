import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import RateReviewIcon from "@mui/icons-material/RateReview";
import { useNavigate } from "react-router-dom";

export default function ThanhCongCuDauTrang({
  handleSaveAll,
  handleDownload,
  handlePrint,
  setOpenNhanXet,
  onRefresh, // Nhận trực tiếp hàm fetchStudentsAndStatus (hoặc hàm bọc gọi lại từ đầu) từ trang cha
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

      {/* 🟩 Nút Lưu, Tải Excel, In, Làm mới,... */}
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

        {/* Nút Làm mới: Gọi trực tiếp hàm tải lại từ đầu */}
        <Tooltip title="Tải lại dữ liệu từ đầu" arrow>
          <IconButton
            onClick={onRefresh}
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
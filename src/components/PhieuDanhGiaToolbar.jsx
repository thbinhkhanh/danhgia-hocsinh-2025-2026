import React from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { 
  FolderUp, 
  Printer, 
  FileSpreadsheet, 
  FileChartColumn, 
  Settings2 
} from "lucide-react";

export default function PhieuDanhGiaToolbar({
  students = [],
  onNavigate,
  handleFolderUpload,
  handleOpenPrintDialog,
  bangTongHopInputRef,
  setBangTongHopFile,
  setPrintDialogOpen,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 0.8,
        position: "absolute",
        top: 14,
        left: 16,
        zIndex: 2,
      }}
    >
      {/* CHỌN THƯ MỤC */}
      <Tooltip title="Chọn thư mục dữ liệu" arrow>
        <IconButton
          component="label"
          size="small"
          sx={{
            width: 36,
            height: 36,
            color: "#1976d2",
            backgroundColor: "#eaf3fc",
            border: "1px solid #cfe2f5",
            borderRadius: "9px",
            "&:hover": {
              backgroundColor: "#d8eafb",
            },
          }}
        >
          <FolderUp size={19} />
          <input
            type="file"
            hidden
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderUpload}
          />
        </IconButton>
      </Tooltip>

      {/* IN TOÀN BỘ */}
      <Tooltip
        title={`In toàn bộ danh sách (${students.length} học sinh)`}
        arrow
      >
        <span>
          <IconButton
            size="small"
            onClick={handleOpenPrintDialog}
            disabled={students.length === 0}
            sx={{
              width: 36,
              height: 36,
              color: "#16834a",
              backgroundColor: "#e8f5ed",
              border: "1px solid #c9e7d3",
              borderRadius: "9px",
              "&:hover": {
                backgroundColor: "#d5eddf",
              },
              "&.Mui-disabled": {
                backgroundColor: "#f1f3f5",
                color: "#b0b8c1",
              },
            }}
          >
            <Printer size={19} />
          </IconButton>
        </span>
      </Tooltip>
      
      {/* MỞ TRANG BẢNG TỔNG HỢP (Đang ẩn) */}
      {/* <Tooltip title="Mở bảng tổng hợp kết quả đánh giá" arrow>
        <IconButton
          size="small"
          onClick={() => onNavigate?.("/in-bang-tong-hop")}
          sx={{
            width: 36,
            height: 36,
            color: "#2563a6",
            backgroundColor: "#eaf3fc",
            border: "1px solid #cfe2f5",
            borderRadius: "9px",
            "&:hover": {
              backgroundColor: "#d8eafb",
            },
          }}
        >
          <FileSpreadsheet size={19} />
        </IconButton>
      </Tooltip> */}

      {/* MỞ FILE BẢNG TỔNG HỢP TỪ MÁY TÍNH */}
      <Tooltip title="Mở bảng tổng hợp" arrow>
        <IconButton
          size="small"
          onClick={() => bangTongHopInputRef?.current?.click()}
          sx={{
            width: 36,
            height: 36,
            color: "#2563a6",
            backgroundColor: "#eaf3fc",
            border: "1px solid #cfe2f5",
            borderRadius: "9px",
            "&:hover": {
              backgroundColor: "#d8eafb",
            },
          }}
        >
          <FileChartColumn size={19} />
        </IconButton>
      </Tooltip>

      {/* INPUT CHỌN FILE EXCEL */}
      <input
        ref={bangTongHopInputRef}
        type="file"
        hidden
        accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && setBangTongHopFile) {
            setBangTongHopFile(file);
          }
          e.target.value = "";
        }}
      />

      {/* SỐ LƯỢNG HỌC SINH (Đang ẩn) */}
      {/* <Typography
        sx={{
          fontSize: "8.5pt",
          fontWeight: 700,
          color: "#64748b",
          ml: 0.3,
        }}
      >
        {students.length} học sinh
      </Typography> */}

      {/* TÙY CHỌN NỘI DUNG IN (Đang ẩn) */}
      {/* <Tooltip title="Tùy chọn nội dung in" arrow>
        <IconButton
          size="small"
          onClick={() => setPrintDialogOpen?.(true)}
          sx={{
            width: 36,
            height: 36,
            color: "#7c3aed",
            backgroundColor: "#f3eefe",
            border: "1px solid #ddd0fa",
            borderRadius: "9px",
            "&:hover": {
              backgroundColor: "#e9ddfc",
            },
          }}
        >
          <Settings2 size={19} />
        </IconButton>
      </Tooltip> */}
    </Box>
  );
}
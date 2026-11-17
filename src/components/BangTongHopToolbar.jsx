import React from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { 
  FolderUp, 
  Download, 
  Printer, 
  Edit, 
  Upload, 
  Settings2, 
  X 
} from "lucide-react";

export default function BangTongHopToolbar({
  worksheet,
  originalFile,
  studentCount = 0,
  handleUpload,
  handleDownload,
  handlePrint,
  handleUploadPhanCong,
  setOpenCapNhatPhanCong,
  setOpenPrintDialog,
  onClose,
}) {
  return (
    <Box
      className="no-print"
      component="div"
      sx={{
        mt: -1,
        minHeight: 42,
        position: "relative",
      }}
    >
      {/* CỤM ICON GÓC TRÊN BÊN TRÁI */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 0.8,
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 2,
        }}
      >
        {/* CHỌN FILE EXCEL */}
        <Tooltip title="Chọn file Excel" arrow>
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
              accept=".xlsx,.xls"
              onChange={handleUpload}
            />
          </IconButton>
        </Tooltip>

        {/* TẢI FILE EXCEL GỐC (Đang ẩn theo yêu cầu) */}
        {/* <Tooltip title="Tải file Excel gốc" arrow>
          <span>
            <IconButton
              size="small"
              onClick={handleDownload}
              disabled={!originalFile}
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
              <Download size={19} />
            </IconButton>
          </span>
        </Tooltip> */}

        {/* IN BẢNG TỔNG HỢP */}
        <Tooltip title="In bảng tổng hợp" arrow>
          <span>
            <IconButton
              size="small"
              onClick={handlePrint}
              disabled={!worksheet}
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

        {/* CẬP NHẬT PHÂN CÔNG */}
        <Tooltip title="Cập nhật dữ liệu phân công" arrow>
          <IconButton
            color="primary"
            size="small"
            onClick={() => setOpenCapNhatPhanCong(true)}
            sx={{
              width: 36,
              height: 36,
              borderRadius: "9px",
            }}
          >
            <Edit size={20} />
          </IconButton>
        </Tooltip>

        {/* TẢI FILE PHÂN CÔNG (Đang ẩn theo yêu cầu) */}
        {/* <Tooltip title="Tải file phân công lên" arrow>
          <IconButton
            component="label"
            color="success"
            size="small"
            sx={{
              width: 36,
              height: 36,
              borderRadius: "9px",
            }}
          >
            <Upload size={20} />
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={handleUploadPhanCong}
            />
          </IconButton>
        </Tooltip> */}

        {/* SĨ SỐ (Đang ẩn theo yêu cầu) */}
        {/* {studentCount > 0 && (
          <Typography
            sx={{
              fontSize: "8.5pt",
              fontWeight: 700,
              color: "#64748b",
              ml: 0.3,
            }}
          >
            {studentCount} học sinh
          </Typography>
        )} */}

        {/* TÙY CHỈNH IN BẢNG TỔNG HỢP (Đang ẩn theo yêu cầu) */}
        {/* <Tooltip title="Tùy chỉnh in bảng tổng hợp" arrow>
          <IconButton
            onClick={() => setOpenPrintDialog(true)}
            sx={{
              width: 36,
              height: 36,
              color: "#64748b",
              backgroundColor: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "9px",
              "&:hover": {
                color: "#1d4ed8",
                backgroundColor: "#dbeafe",
                borderColor: "#bfdbfe",
              },
            }}
          >
            <Settings2 size={19} />
          </IconButton>
        </Tooltip> */}
      </Box>

      {/* TIÊU ĐỀ (Đang ẩn theo yêu cầu) */}
      {/* <Box sx={{ textAlign: "center", pt: 0.5 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          color="primary"
        >
          BẢNG TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ GIÁO DỤC
        </Typography>
      </Box> */}

      {/* NÚT ĐÓNG GÓC TRÊN BÊN PHẢI */}
      <Tooltip title="Đóng bảng tổng hợp" arrow>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 3,
            width: 36,
            height: 36,
            color: "#64748b",
            backgroundColor: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: "9px",
            "&:hover": {
              color: "#dc2626",
              backgroundColor: "#fee2e2",
              borderColor: "#fecaca",
            },
          }}
        >
          <X size={20} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
import React from 'react';
import { Box, Typography, Select, MenuItem } from '@mui/material';
import { FolderUp } from 'lucide-react';

export default function ThongTinHocSinh({
  formData = {},
  students = [],
  selectedStudentIndex = 0,
  setSelectedStudentIndex
}) {
  const infoItems = [
    {
      label: "HỌ VÀ TÊN HỌC SINH",
      value: formData.studentName || "...",
      highlight: true
    },
    {
      label: "MÃ ĐỊNH DANH BỘ GD&ĐT",
      value: formData.idCode
    },
    {
      label: "TRƯỜNG",
      value: formData.schoolName
    },
    {
      label: "GIÁO VIÊN CHỦ NHIỆM",
      value: formData.teacherName?.toLocaleUpperCase("vi-VN")
    },
    {
      label: "ĐIỆN THOẠI",
      value: formData.phone
    },    
    {
      label: "SỐ NGÀY NGHỈ",
      value: formData.absentDays || "..."
    },    
    {
      label: "CHIỀU CAO",
      value: formData.height ? `${formData.height}` : "........ cm"
    },
    {
      label: "CÂN NẶNG",
      value: formData.weight ? `${formData.weight}` : "........ kg"
    },
    {
      label: "HIỆU TRƯỞNG",
      value: formData.principalName?.toLocaleUpperCase("vi-VN") || "..."
    },
  ];

  return (
    <Box
      className="mb-2"
      sx={{
        width: "100%",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
        color: "#263449",
        fontSize: "10pt",
        lineHeight: 1.3,
        "@media print": {
          borderRadius: "5px",
          breakInside: "avoid",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact"
        }
      }}
    >
      {/* TIÊU ĐỀ */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.2,
          py: 0.65,
          backgroundColor: "#edf3f9",
          borderBottom: "1px solid #d6e0ea"
        }}
      >
        <Box
          sx={{
            width: 25,
            height: 25,
            borderRadius: "6px",
            backgroundColor: "#d8e7f5",
            color: "#245783",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <FolderUp size={14} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: "10pt",
              fontWeight: 800,
              color: "#245783",
              letterSpacing: "0.3px"
            }}
          >
            THÔNG TIN HỌC SINH
          </Typography>

          <Typography
            sx={{
              fontSize: "7.5pt",
              color: "#718096"
            }}
          >
            HỒ SƠ ĐÁNH GIÁ HỌC TẬP
          </Typography>
        </Box>

        <Box
            sx={{
                px: 2,
                py: 0.8,
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                display: "inline-block"
            }}
            >
            <Typography
                sx={{
                fontSize: "12pt",
                fontWeight: 800,
                color: "#d32f2f",
                letterSpacing: "0.3px",
                textAlign: "center"
                }}
            >
                LỚP {formData.className}
            </Typography>
        </Box>
      </Box>

      {/* CÁC THẺ THÔNG TIN - 3 CỘT */}
      <Box
        sx={{
          p: 0.8,
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 0.7
        }}
      >
        {infoItems.map((item, index) => (
          <Box
            key={index}
            sx={{
              minWidth: 0,
              px: 0.9,
              py: 0.55,
              border: item.highlight
                ? "1px solid #c5d9eb"
                : "1px solid #e1e7ee",
              borderLeft: item.highlight
                ? "3px solid #3975a8"
                : "1px solid #e1e7ee",
              borderRadius: "5px",
              backgroundColor: item.highlight ? "#f1f6fb" : "#fff"
            }}
          >
            {/* NHÃN THÔNG TIN */}
            <Typography
              sx={{
                fontSize: "8pt",
                color: "#718096",
                fontWeight: 700,
                mb: 0.25,
                whiteSpace: "nowrap"
              }}
            >
              {item.label}
            </Typography>

            {/* GIÁ TRỊ THÔNG TIN */}
            {item.highlight ? (
              <Select
                value={selectedStudentIndex}
                onChange={(e) => setSelectedStudentIndex(Number(e.target.value))}
                disabled={students.length === 0}
                variant="standard"
                disableUnderline
                fullWidth
                displayEmpty
                renderValue={(selected) =>
                  students[selected]?.hoTen || "Chọn học sinh"
                }
                sx={{
                  fontSize: "11pt",
                  fontWeight: 800,
                  color: "#1e4d75",
                  "& .MuiSelect-select": {
                    padding: "1px 22px 1px 0",
                    minHeight: "unset",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  },
                  "& .MuiSelect-icon": {
                    color: "#3975a8",
                    right: 0
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 350,
                      minWidth: 250,
                      "& .MuiMenuItem-root": {
                        fontSize: "10pt",
                        py: 0.8
                      }
                    }
                  }
                }}
              >
                {students.map((stu, idx) => (
                  <MenuItem key={idx} value={idx}>
                    {idx + 1}. {stu.hoTen}
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <Typography
                sx={{
                  fontSize: "10pt",
                  fontWeight: 600,
                  color: "#263449",
                  overflowWrap: "anywhere"
                }}
              >
                {item.value || "..."}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
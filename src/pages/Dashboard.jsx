import React from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, Navigate } from "react-router-dom";

function DashboardCard({ item, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: "white",
        borderRadius: 4,
        p: 4,
        minHeight: 220,
        cursor: "pointer",
        transition: "0.25s",
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: "0 14px 28px rgba(0,0,0,0.18)",
        },
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          bgcolor: item.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          color: "white",
          mb: 2,
        }}
      >
        {item.icon}
      </Box>

      <Typography fontWeight={700} fontSize={18} sx={{ mb: 1 }}>
        {item.label}
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: "#64748b", lineHeight: 1.6 }}
      >
        {item.description}
      </Typography>
    </Box>
  );
}

export default function Dashboard({ isLoggedIn }) {
  const navigate = useNavigate();

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  const cards = [
  {
    label: "Phòng thi trực tuyến",
    description: "Làm bài kiểm tra và thi trực tuyến",
    path: "/hocsinh",
    icon: "🎓",
    color: "#1976d2",
  },
  {
    label: "Theo dõi, quản lí KTĐK",
    description: "Tra cứu kết quả kiểm tra và ôn tập của học sinh theo lớp",
    path: "/giaovien",
    icon: "👨‍🏫",
    color: "#2e7d32",
  },
  {
    label: "Kết quả KTĐK",
    description: "Tra cứu và tổng hợp kết quả kiểm tra định kỳ, ôn tập",
    path: "/ketqua",
    icon: "📊",
    color: "#9c27b0",
  },
  {
    label: "Nhập điểm, đánh giá",
    description: "Nhập điểm KTĐK, đánh giá mức đạt và nhận xét học sinh",
    path: "/nhapdiemktdk",   // ✅ FIX
    icon: "✏️",
    color: "#ed6c02",
  },
  {
    label: "Xuất đánh giá ra C1",
    description: "Xuất dữ liệu đánh giá sang biểu mẫu C1",
    path: "/xuatdanhgia",    // ✅ FIX
    icon: "📄",
    color: "#0288d1",
  },
  {
    label: "Danh sách học sinh",
    description: "Thêm, sửa, xóa học sinh và quản lý dữ liệu lớp học",
    path: "/danhsach",
    icon: "📋",
    color: "#00796b",
  },
  {
    label: "Soạn đề",
    description: "Tạo đề thi và quản lý ngân hàng câu hỏi",
    path: "/tracnghiem-gv",
    icon: "🧠",
    color: "#c2185b",
  },
  {
    label: "Test đề",
    description: "Kiểm tra thử đề thi trước khi sử dụng",
    path: "/tracnghiem-test",
    icon: "🧪",
    color: "#6a1b9a",
  },
  {
    label: "Đề thi",
    description: "Chọn đề thi và đề ôn tập từ ngân hàng đề",
    path: "/de-thi",
    icon: "📝",
    color: "#ef6c00",
  },
  {
    label: "Cài đặt hệ thống",
    description: "Quản trị và cấu hình hệ thống",
    path: "/quan-tri",
    icon: "⚙️",
    color: "#455a64",
  },
];

  return (
    <Box sx={{ minHeight: "100vh", p: 5, bgcolor: "#f4f6f8" }}>
      <Typography
        variant="h5"
        fontWeight={700}
        mb={5}
        sx={{
          fontFamily: '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
        }}
      >
        CHỨC NĂNG CHÍNH
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 4,
        }}
      >
        {cards.map((item) => (
          <DashboardCard
            key={item.path}
            item={item}
            onClick={() => navigate(item.path)}
          />
        ))}
      </Box>
    </Box>
  );
}
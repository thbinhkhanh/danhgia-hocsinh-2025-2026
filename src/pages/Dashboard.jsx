import React from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, Navigate } from "react-router-dom";

function DashboardCard({ item, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: "white",
        borderRadius: 3,
        p: 2.5,
        minHeight: 160,
        cursor: "pointer",
        transition: "0.25s",
        boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          bgcolor: item.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          color: "white",
          mb: 1.5,
        }}
      >
        {item.icon}
      </Box>

      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 15,
          mb: 0.8,
          lineHeight: 1.3,
        }}
      >
        {item.label}
      </Typography>

      <Typography
        sx={{
          fontSize: 13,
          color: "#64748b",
          lineHeight: 1.5,
        }}
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
      path: "/nhapdiemktdk",
      icon: "✏️",
      color: "#ed6c02",
    },
    {
      label: "Xuất đánh giá ra C1",
      description: "Xuất dữ liệu đánh giá sang biểu mẫu C1",
      path: "/xuatdanhgia",
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
  <Box
    sx={{
      minHeight: "100vh",
      p: { xs: 2, md: 3 },
      bgcolor: "#f4f6f8",
    }}
  >
    <Box
      sx={{
        maxWidth: 1180,
        mx: "auto",
      }}
    >
      <Typography
        variant="h6"
        fontWeight={700}
        mb={3}
        sx={{
          fontFamily:
            '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
        }}
      >
        CHỨC NĂNG CHÍNH
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          justifyContent: "center",

          gridTemplateColumns: {
            xs: "95%",                // điện thoại: card rộng ~75%
            sm: "repeat(2, 220px)",   // tablet
            md: "repeat(3, 220px)",   // laptop nhỏ
            lg: "repeat(5, 220px)",   // desktop
          },
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
  </Box>
);
}
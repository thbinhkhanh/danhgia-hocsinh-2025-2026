import React from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, Navigate } from "react-router-dom";

function DashboardCard({ item, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#fff",
        borderRadius: "24px",
        p: 2.5,
        minHeight: 170,
        cursor: "pointer",
        border: "1px solid #e5e7eb",
        transition: "all .25s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",

        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 15px 35px rgba(0,0,0,0.12)",
          borderColor: item.color,
        },

        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 5,
          background: item.color,
        },
      }}
    >
      {/* ICON */}
      <Box
        sx={{
          width: 54,
          height: 54,
          borderRadius: "18px",
          bgcolor: `${item.color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
        }}
      >
        {item.icon}
      </Box>

      {/* TEXT */}
      <Box sx={{ flexGrow: 1 }}>
        <Typography
          sx={{
            mt: 2,
            fontWeight: 700,
            fontSize: 16,
            color: "#0f172a",
            lineHeight: 1.35,
          }}
        >
          {item.label}
        </Typography>

        <Typography
          sx={{
            mt: 1,
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          {item.description}
        </Typography>
      </Box>

      {/* ARROW */}
      <Box
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "12px",
            bgcolor: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "#64748b",
            transition: ".2s",

            ".dashboard-card:hover &": {
              bgcolor: item.color,
              color: "#fff",
            },
          }}
        >
          →
        </Box>
      </Box>
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
        bgcolor: "#f4f6f8",
        p: { xs: 2, md: 3 },
      }}
    >
      <Box
        sx={{
          maxWidth: 1180,
          mx: "auto",
        }}
      >
        {/* TITLE */}
        <Typography
          variant="h6"
          fontWeight={700}
          mb={3}
          sx={{
            color: "#0f172a",
            fontFamily:
              '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
          }}
        >
          CHỨC NĂNG CHÍNH
        </Typography>

        {/* GRID */}
        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            justifyContent: "center",

            gridTemplateColumns: {
              xs: "92%", // điện thoại
              sm: "repeat(2, 220px)",
              md: "repeat(3, 220px)",
              lg: "repeat(5, 220px)", // desktop: 5 thẻ mỗi hàng
            },
          }}
        >
          {cards.map((item) => (
            <Box
              key={item.path}
              className="dashboard-card"
            >
              <DashboardCard
                item={item}
                onClick={() => navigate(item.path)}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
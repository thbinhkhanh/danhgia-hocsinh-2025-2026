import React from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, Navigate } from "react-router-dom";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

function DashboardCard({ item, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#fff",
        borderRadius: "24px",

        p: {
          xs: 1.75,
          sm: 2.5,
        },

        height: {
          xs: 165,
          sm: 180,
        },

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
      <Box
        sx={{
          width: { xs: 46, sm: 54 },
          height: { xs: 46, sm: 54 },
          borderRadius: "18px",
          bgcolor: `${item.color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          "& svg": {
            fontSize: {
              xs: 24,
              sm: 28,
            },
          },
        }}
      >
        {item.icon}
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Typography
          sx={{
            mt: 2,
            fontWeight: 700,
            fontSize: {
              xs: 14,
              sm: 16,
            },
            color: "#0f172a",
            lineHeight: 1.35,

            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.label}
        </Typography>

        <Typography
          sx={{
            mt: 1,
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.5,

            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description}
        </Typography>
      </Box>

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
      icon: <SchoolRoundedIcon sx={{ fontSize: 28, color: "#1976d2" }} />,
      color: "#1976d2",
    },
    {
      label: "Quản lí KTĐK",
      description: "Tra cứu kết quả kiểm tra và ôn tập của học sinh theo lớp",
      path: "/giaovien",
      icon: <AnalyticsRoundedIcon sx={{ fontSize: 28, color: "#2e7d32" }} />,
      color: "#2e7d32",
    },
    {
      label: "Kết quả KTĐK",
      description: "Tra cứu và tổng hợp kết quả kiểm tra định kỳ, ôn tập",
      path: "/ketqua",
      icon: <LeaderboardRoundedIcon sx={{ fontSize: 28, color: "#9c27b0" }} />,
      color: "#9c27b0",
    },
    {
      label: "Nhập điểm, đánh giá",
      description: "Nhập điểm KTĐK, đánh giá mức đạt và nhận xét học sinh",
      path: "/nhapdiemktdk",
      icon: <FactCheckRoundedIcon sx={{ fontSize: 28, color: "#ed6c02" }} />,
      color: "#ed6c02",
    },
    {
      label: "Xuất đánh giá ra C1",
      description: "Xuất dữ liệu đánh giá sang biểu mẫu C1",
      path: "/xuatdanhgia",
      icon: <SummarizeRoundedIcon sx={{ fontSize: 28, color: "#0288d1" }} />,
      color: "#0288d1",
    },
    {
      label: "Danh sách học sinh",
      description: "Thêm, sửa, xóa học sinh và quản lý dữ liệu lớp học",
      path: "/danhsach",
      icon: <GroupsRoundedIcon sx={{ fontSize: 28, color: "#00796b" }} />,
      color: "#00796b",
    },
    {
      label: "Soạn đề",
      description: "Tạo đề thi và quản lý ngân hàng câu hỏi",
      path: "/tracnghiem-gv",
      icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 28, color: "#c2185b" }} />,
      color: "#c2185b",
    },
    {
      label: "Test đề",
      description: "Kiểm tra thử đề thi trước khi sử dụng",
      path: "/tracnghiem-test",
      icon: <BugReportRoundedIcon sx={{ fontSize: 28, color: "#6a1b9a" }} />,
      color: "#6a1b9a",
    },
    {
      label: "Đề thi",
      description: "Chọn đề thi và đề ôn tập từ ngân hàng đề",
      path: "/de-thi",
      icon: <LibraryBooksRoundedIcon sx={{ fontSize: 28, color: "#ef6c00" }} />,
      color: "#ef6c00",
    },
    {
      label: "Cài đặt hệ thống",
      description: "Quản trị và cấu hình hệ thống",
      path: "/quan-tri",
      icon: <SettingsRoundedIcon sx={{ fontSize: 28, color: "#455a64" }} />,
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
            gap: 2,

            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
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
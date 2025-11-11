import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AppBar, Toolbar, Button, Typography, Box } from "@mui/material";

// 🔹 Import các trang
import HocSinh from "./pages/HocSinh";
import Login from "./pages/Login";
import QuanTri from "./pages/QuanTri";
import GiaoVien from "./pages/GiaoVien";
import TongHopDanhGia from "./pages/TongHopDanhGia";
import NhapdiemKTDK from "./pages/NhapdiemKTDK";
import XuatDanhGia from "./pages/XuatDanhGia";
import ThongKe from "./pages/ThongKe";
import DanhSachHS from "./pages/DanhSachHS";

// 🔹 Import context
import { StudentProvider } from "./context/StudentContext";
import { ConfigProvider } from "./context/ConfigContext";
import { StudentDataProvider } from "./context/StudentDataContext";
import { StudentKTDKProvider } from "./context/StudentKTDKContext";

// 🔹 Import icon
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import SummarizeIcon from "@mui/icons-material/Summarize";
import SettingsIcon from "@mui/icons-material/Settings";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import BarChartIcon from "@mui/icons-material/BarChart";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn") === "true";
    setIsLoggedIn(loggedIn);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(localStorage.getItem("loggedIn") === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("account");
    setIsLoggedIn(false);
    navigate("/login");
  };

  const navItems = [
    { path: "/hocsinh", label: "Học sinh", icon: <MenuBookIcon fontSize="small" /> },
    ...(isLoggedIn
      ? [
          { path: "/giaovien", label: "Đánh giá", icon: <SummarizeIcon fontSize="small" /> },
          { path: "/tonghopdanhgia", label: "ĐGTX", icon: <SummarizeIcon fontSize="small" /> },
          { path: "/nhapdiemktdk", label: "KTĐK", icon: <SummarizeIcon fontSize="small" /> },
          { path: "/xuatdanhgia", label: "Xuất đánh giá", icon: <SummarizeIcon fontSize="small" /> },
          { path: "/thongke", label: "Thống kê", icon: <BarChartIcon fontSize="small" /> },
          { path: "/danhsach", label: "Danh sách", icon: <SchoolIcon fontSize="small" /> },
          { path: "/quan-tri", label: "Hệ thống", icon: <SettingsIcon fontSize="small" /> },
          { label: "Đăng xuất", onClick: handleLogout, icon: <LogoutIcon fontSize="small" /> },
        ]
      : [
          { path: "/login", label: "Đăng nhập", icon: <LoginIcon fontSize="small" /> },
        ]),
  ];

  return (
    <>
      <AppBar position="fixed" sx={{ background: "#1976d2" }}>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            minHeight: "48px !important",
            paddingTop: 0,
            paddingBottom: 0,
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="img"
              src="/Logo.png"
              alt="Logo"
              sx={{
                height: 34,
                flexShrink: 0,
                ml: { xs: -1, sm: -2 },
                mr: 1,
              }}
            />
            {navItems.map((item) => (
              <Button
                key={item.path || item.label}
                component={item.path ? Link : "button"}
                to={item.path || undefined}
                onClick={item.onClick || undefined}
                sx={{
                  color: "white",
                  textTransform: "none",
                  padding: "4px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.8,
                  minHeight: "auto",
                  flexShrink: 0,
                  borderBottom:
                    location.pathname === item.path
                      ? "3px solid #fff"
                      : "3px solid transparent",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                {item.icon}
                <Typography variant="body2" sx={{ ml: 0.3 }}>
                  {item.label}
                </Typography>
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ paddingTop: "44px" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/hocsinh" replace />} />
          <Route path="/hocsinh" element={<HocSinh />} />
          <Route path="/login" element={<Login />} />
          <Route path="/danhsach" element={isLoggedIn ? <DanhSachHS /> : <Navigate to="/login" replace />} />
          <Route path="/giaovien" element={isLoggedIn ? <GiaoVien /> : <Navigate to="/login" replace />} />
          <Route path="/nhapdiemktdk" element={isLoggedIn ? <NhapdiemKTDK /> : <Navigate to="/login" replace />} />
          <Route path="/xuatdanhgia" element={isLoggedIn ? <XuatDanhGia /> : <Navigate to="/login" replace />} />
          <Route path="/tonghopdanhgia" element={isLoggedIn ? <TongHopDanhGia /> : <Navigate to="/login" replace />} />
          <Route path="/thongke" element={isLoggedIn ? <ThongKe /> : <Navigate to="/login" replace />} />
          <Route path="/quan-tri" element={isLoggedIn ? <QuanTri /> : <Navigate to="/login" replace />} />
        </Routes>
      </Box>
    </>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <StudentProvider>
        <StudentDataProvider>
          <StudentKTDKProvider>
            <AppContent />
          </StudentKTDKProvider>
        </StudentDataProvider>
      </StudentProvider>
    </ConfigProvider>
  );
}
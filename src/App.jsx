import React, { useContext } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AppBar, Toolbar, Button, Typography, Box } from "@mui/material";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase"; // 🔹 import db

// 🔹 Import các trang
import Home from "./pages/Home";
import Login from "./pages/Login";
import QuanTri from "./pages/QuanTri";
import GiaoVien from "./pages/GiaoVien";
import TongHopDanhGia from "./pages/TongHopDanhGia";

// 🔹 Import context
import { StudentProvider } from "./context/StudentContext";
import { ConfigProvider, ConfigContext } from "./context/ConfigContext";

// 🔹 Import icon
//import HomeIcon from "@mui/icons-material/Home";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import SummarizeIcon from "@mui/icons-material/Summarize";
import SettingsIcon from "@mui/icons-material/Settings";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, setConfig } = useContext(ConfigContext);

  console.log("📦 Config trong AppContent:", config);

  // ✅ Hàm xử lý đăng xuất
  const handleLogout = () => {
    // 1. Xóa thông tin đăng nhập khỏi localStorage
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("account");

    // 2. Cập nhật context và localStorage
    const updatedConfig = { ...config, login: false };
    localStorage.setItem("appConfig", JSON.stringify(updatedConfig));
    setConfig(updatedConfig);

    // 3. Điều hướng về trang đăng nhập
    navigate("/login");

    // 4. Ghi login: false vào Firestore (nền)
    setTimeout(() => {
      const docRef = doc(db, "CONFIG", "config");
      setDoc(docRef, { login: false }, { merge: true })
        .then(() => console.log("✅ Đã ghi login: false vào Firestore"))
        .catch((err) =>
          console.error("❌ Lỗi khi ghi login: false vào Firestore:", err)
        );
    }, 0);
  };

  // ✅ Danh sách menu
  const navItems = [
    { path: "/home", label: "Học sinh", icon: <MenuBookIcon fontSize="small" /> },
    ...(config.login
      ? [
          {
            path: "/giaovien",
            label: "Giáo viên",
            icon: <SchoolIcon fontSize="small" />,
          },
          {
            path: "/tonghopdanhgia",
            label: "Tổng hợp",
            icon: <SummarizeIcon fontSize="small" />,
          },
          {
            path: "/quan-tri",
            label: "Hệ thống",
            icon: <SettingsIcon fontSize="small" />,
          },
          {
            label: "Đăng xuất",
            onClick: handleLogout,
            icon: <LogoutIcon fontSize="small" />,
          },
        ]
      : [
          {
            path: "/login",
            label: "Đăng nhập",
            icon: <LoginIcon fontSize="small" />,
          },
        ]),
  ];

  return (
    <>
      <AppBar position="fixed" sx={{ background: "#1976d2" }}>
        <Toolbar
          sx={{
            display: "flex",
            gap: 1,
            minHeight: "48px !important",
            paddingTop: 0,
            paddingBottom: 0,
            overflowX: "auto",
            whiteSpace: "nowrap",
            position: "relative",
          }}
        >
          {/* 🔹 Logo */}
          <Box
            component="img"
            src="/Logo.png"
            alt="Logo"
            sx={{ height: 34, marginRight: 2, flexShrink: 0 }}
          />

          {/* 🔹 Menu */}
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

          {/* 🔹 Hiển thị tuần ở giữa (hoặc cố định bên phải nếu muốn) */}
          <Typography
            variant="body2"
            sx={{
              position: { xs: "static", md: "absolute" },
              top: { xs: "auto", md: "50%" },
              left: { xs: "auto", md: "50%" },
              transform: { xs: "none", md: "translate(-50%, -50%)" },
              backgroundColor: "transparent",
              color: "white",
              padding: "10px 20px",
              borderRadius: "6px",
              border: "1px solid white",
              lineHeight: 1,
              textAlign: "center",
              zIndex: 1,
              whiteSpace: "nowrap",
              mt: { xs: 1, md: 0 },
            }}
          >
            {`TUẦN ${config.tuan || "?"}`}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 🔹 Nội dung các trang */}
      <Box sx={{ paddingTop: "44px" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/giaovien"
            element={
              config.login ? <GiaoVien /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/tonghopdanhgia"
            element={
              config.login ? (
                <TongHopDanhGia />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/quan-tri"
            element={
              config.login ? <QuanTri /> : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </Box>
    </>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <StudentProvider>
        <AppContent />
      </StudentProvider>
    </ConfigProvider>
  );
}

import React, { useContext } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Button, Typography, Box } from "@mui/material";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase"; // 🔹 import db

import Home from "./pages/Home";
import Login from "./pages/Login";
import QuanTri from "./pages/QuanTri";
import GiaoVien from "./pages/GiaoVien";
import TongHopDanhGia from "./pages/TongHopDanhGia";

import { StudentProvider } from "./context/StudentContext";
import { ConfigProvider, ConfigContext } from "./context/ConfigContext";

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

    // 2. Cập nhật context và localStorage ngay lập tức
    const updatedConfig = {
      ...config,
      login: false,
    };
    localStorage.setItem("appConfig", JSON.stringify(updatedConfig));
    setConfig(updatedConfig);

    console.log("🚪 Đã đăng xuất, config mới:", updatedConfig);

    // 3. Điều hướng về trang đăng nhập ngay lập tức
    navigate("/login");

    // 4. Ghi login: false vào Firestore trong background (không chặn UI)
    setTimeout(() => {
      const docRef = doc(db, "CONFIG", "config");
      setDoc(docRef, { login: false }, { merge: true })
        .then(() => console.log("✅ Đã ghi login: false vào Firestore"))
        .catch((err) =>
          console.error("❌ Lỗi khi ghi login: false vào Firestore:", err)
        );
    }, 0);
  };

  const navItems = [
    { path: "/home", label: "Học sinh" },
    ...(config.login
      ? [
          { path: "/giaovien", label: "Giáo viên" },
          { path: "/tonghopdanhgia", label: "Tổng hợp" },
          { path: "/quan-tri", label: "Hệ thống" }, // ✅ thêm menu mới
          { label: "Đăng xuất", onClick: handleLogout },
        ]
      : [{ path: "/login", label: "Đăng nhập" }]),
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
          <Box
            component="img"
            src="/Logo.png"
            alt="Logo"
            sx={{ height: 34, marginRight: 2, flexShrink: 0 }}
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
                padding: "4px 12px",
                minHeight: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                whiteSpace: "nowrap",
                flexShrink: 0,
                borderBottom:
                  location.pathname === item.path
                    ? "3px solid #fff"
                    : "3px solid transparent",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
              }}
            >
              {item.icon || item.label}
            </Button>
          ))}

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

      <Box sx={{ paddingTop: "44px" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/quan-tri" element={<QuanTri />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/giaovien"
            element={config.login ? <GiaoVien /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/tonghopdanhgia"
            element={config.login ? <TongHopDanhGia /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/quan-tri"
            element={config.login ? <QuanTri /> : <Navigate to="/login" replace />}
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
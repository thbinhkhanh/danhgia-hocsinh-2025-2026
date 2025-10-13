import React, { useContext } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Button, Typography, Box } from "@mui/material";

// 🧩 Import các trang
import Home from "./pages/Home";
import Login from "./pages/Login";
import QuanTri from "./pages/QuanTri";
import GiaoVien from "./pages/GiaoVien";

// 🧠 Import Context
import { StudentProvider } from "./context/StudentContext";
import { ConfigProvider, ConfigContext } from "./context/ConfigContext";

function AppContent() {
  const location = useLocation();
  const { config } = useContext(ConfigContext);

  const navItems = [
    { path: "/home", label: "ĐÁNH GIÁ", icon: null }, // chữ thay icon Home
    { path: "/login", label: "HỆ THỐNG" },
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
              key={item.path}
              component={Link}
              to={item.path}
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

          {/* Typography căn giữa */}
          <Typography
  variant="body2"
  sx={{
    // Desktop: căn giữa
    position: { xs: "static", md: "absolute" },
    top: { xs: "auto", md: "50%" },
    left: { xs: "auto", md: "50%" },
    transform: { xs: "none", md: "translate(-50%, -50%)" },
    
    // Nền và chữ
    backgroundColor: "transparent",
    color: "white",
    padding: "10px 20px",
    borderRadius: "6px",
    border: "1px solid white",
    lineHeight: 1,
    textAlign: "center",
    zIndex: 1,
    whiteSpace: "nowrap",

    // Margin khi mobile để cách nút HỆ THỐNG
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
          <Route path="/giaovien" element={<GiaoVien />} />
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

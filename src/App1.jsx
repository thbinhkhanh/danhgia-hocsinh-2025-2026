import React, { useContext } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Button, Typography, Box } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";

// 🧩 Import các trang
import Home from "./pages/Home";
import Login from "./pages/Login";
import QuanTri from "./pages/QuanTri";

// 🧠 Import Context
import { StudentProvider } from "./context/StudentContext";
import { ConfigProvider, ConfigContext } from "./context/ConfigContext";

function AppContent() {
  const location = useLocation();
  const { config } = useContext(ConfigContext);

  const navItems = [
    { path: "/home", label: "Home", icon: <HomeIcon /> },
    //{ path: "/quan-tri", label: "QUẢN TRỊ" },
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
            position: "relative", // ✅ thêm
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

          {/* ✅ Đặt Typography căn giữa */}
          <Typography
            variant="body2"
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "transparent",   // ✅ nền trong suốt
              color: "white",                   // ✅ chữ trắng
              padding: "10px 20px",             // padding rộng
              borderRadius: "6px",              // bo góc nhẹ
              border: "1px solid white",        // ✅ viền trắng
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {`ĐÁNH GIÁ TUẦN ${config.tuan || "?"}`}
          </Typography>
        </Toolbar>
      </AppBar>


      <Box sx={{ paddingTop: "44px" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/quan-tri" element={<QuanTri />} />
          <Route path="/login" element={<Login />} />
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

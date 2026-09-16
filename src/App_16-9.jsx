import React, { useContext, useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AppBar, 
  Toolbar, 
  Button, 
  Typography, 
  Box,
  IconButton,
  Menu,
} from "@mui/material";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// 🔹 Import các trang
import HocSinh from "./pages/HocSinh";
import Login from "./pages/Login";
import QuanTri from "./pages/QuanTri";
//import QuanTri_KTDK from "./pages/QuanTri_KTDK";

import GiaoVien from "./pages/GiaoVien";
import TongHopDanhGia from "./pages/TongHopDanhGia";
import NhapdiemKTDK from "./pages/NhapdiemKTDK";
import XuatDanhGia from "./pages/XuatDanhGia";
import TongHopKQ from "./pages/TongHopKQ";
import ThongKe from "./pages/ThongKe";
import DanhSachHS from "./pages/DanhSachHS";
import TracNghiem from "./pages/TracNghiem";
import TracNghiemGV from "./pages/TracNghiemGV";
//import TracNghiemGV_TN from "./pages/TracNghiemGV_TN";
import DeThi from "./pages/DeThi";
import TracNghiemTest from "./pages/TracNghiem_Test";
import TracNghiem_OnTap from "./pages/TracNghiem_OnTap"; // Thêm vào các import page
import Dashboard from "./pages/Dashboard";
import ChangePasswordDialog from "./dialog/ChangePasswordDialog";

// 🔹 Import context
import { StudentProvider } from "./context/StudentContext";
import { ConfigProvider, ConfigContext } from "./context/ConfigContext";
//import { LamVanBenConfigProvider } from "./context/LamVanBenConfigContext"; // 👈 thêm
import { TracNghiemProvider } from "./context/TracNghiemContext";
import { StudentDataProvider } from "./context/StudentDataContext";
import { StudentKTDKProvider } from "./context/StudentKTDKContext";
import { AdminProvider, AdminContext } from "./context/AdminContext";
import { SelectedClassProvider } from "./context/SelectedClassContext";


// 🔹 Import icon
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import SummarizeIcon from "@mui/icons-material/Summarize";
import SettingsIcon from "@mui/icons-material/Settings";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import BarChartIcon from "@mui/icons-material/BarChart";
import AppsIcon from "@mui/icons-material/Apps";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LockResetIcon from "@mui/icons-material/LockReset";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, setConfig } = useContext(ConfigContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); 
  const account = localStorage.getItem("account"); // thêm dòng này trước <Routes>
  const [openLogo, setOpenLogo] = useState(false);
  
  const [openChangePw, setOpenChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };


  // ✅ Lấy trạng thái login ban đầu
  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn") === "true";
    setIsLoggedIn(loggedIn);
    setLoading(false); 
  }, []);

  // ✅ Theo dõi thay đổi login giữa các tab
  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(localStorage.getItem("loggedIn") === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ✅ Hàm xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("account");

    setIsLoggedIn(false);
    setConfig((prev) => ({ ...prev, login: false }));

    setAnchorEl(null);

    // 🔥 delay để đảm bảo state update xong
    setTimeout(() => {
      navigate("/hocsinh", { replace: true });
    }, 0);

    setTimeout(() => {
      const docRef = doc(db, "CONFIG", "config");
      setDoc(docRef, { login: false }, { merge: true }).catch(() => {});
    }, 0);
  };

  // ✅ Hàm thay đổi học kỳ
  const handleHocKyChange = (e) => {
    const hocKy = e.target.value;

    // 🔹 Cập nhật ngay trong context (merge với config cũ)
    const newConfig = { ...config, hocKy };
    setConfig(newConfig);

    // 🔹 Lưu vào localStorage để không mất khi reload
    localStorage.setItem("appConfig", JSON.stringify(newConfig));
  };

  if (loading) return null;

  const handleChangePassword = async () => {
    if (!newPw.trim()) {
      setPwError("❌ Mật khẩu mới không được để trống!");
      return;
    }

    if (newPw !== confirmPw) {
      setPwError("❌ Mật khẩu nhập lại không khớp!");
      return;
    }

    setPwError("");
    setOpenChangePw(false);

    setSnackbar({
      open: true,
      message: "Đổi mật khẩu thành công!",
      severity: "success",
    });

    const docId = "ADMIN";

    // 🔥 FIRESTORE chạy nền (KHÔNG CHẶN UI)
    setDoc(doc(db, "MATKHAU", docId), {
      pass: newPw,
    }).catch((err) => {
      console.error("Lỗi lưu mật khẩu:", err);

      setSnackbar({
        open: true,
        message: "Lưu mật khẩu thất bại!",
        severity: "error",
      });
    });

    setNewPw("");
    setConfirmPw("");
  };

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
          {/* 🔹 LEFT: LOGO + DASHBOARD */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="img"
              src="/Logo.png"
              alt="Logo"
              onClick={() => setOpenLogo(true)}
              sx={{
                height: 34,
                flexShrink: 0,
                ml: { xs: -1, sm: -2 },
                mr: 1,
                cursor: "pointer",
              }}
            />          

            <Button
              onClick={() =>
                navigate(isLoggedIn ? "/dashboard" : "/hocsinh")
              }
              sx={{
                color: "#fff",
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              {isLoggedIn ? "DASHBOARD" : "HỌC SINH"}
            </Button>
          </Box>

          {/* 🔹 RIGHT: USER AREA */}
          {isLoggedIn ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>

              {/* 📅 NĂM HỌC */}
              <Box
                sx={{
                  px: 1.5,
                  py: 0.4,
                  borderRadius: 999,
                  fontSize: 14,
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  whiteSpace: "nowrap",
                }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  Năm học:{" "}
                </Box>

                {config?.namHoc || "2025-2026"}
              </Box>

              {/* 👤 ICON TÀI KHOẢN */}
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: "#FFD700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(255,215,0,0.4)",
                }}
              >
                <AdminPanelSettingsIcon
                  sx={{
                    color: "#5D4037",
                    fontSize: 22,
                  }}
                />
              </Box>

              {/* 🟦 MENU 9 Ô VUÔNG */}
            <IconButton onClick={handleMenuOpen} sx={{ color: "#fff" }}>
              <AppsIcon />
            </IconButton>

            </Box>
          ) : (
            <Button
              component={Link}
              to="/login"
              sx={{
                color: "#fff",
                ml: "auto",
                textDecoration: "none",
                "&:hover": {
                  color: "#fff",
                  textDecoration: "none",
                },
                "&:visited": {
                  color: "#fff",
                },
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <LoginIcon sx={{ fontSize: 20 }} />
              Đăng nhập
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 180,
            //borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 12px 35px rgba(0,0,0,0.18)",
            p: 0,
          },
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "#fff",
            fontWeight: 600,
            fontSize: 14,
            borderBottom: "1px solid #eee",
            color: "#d32f2f", // 🔴 màu đỏ
          }}
        >
          THÔNG TIN
        </Box>

        {/* ITEM 1 */}
        <Box
          onClick={() => {
            handleMenuClose();
            setOpenChangePw(true);
          }}
          sx={{
            px: 2,
            py: 1.5,
            cursor: "pointer",
            bgcolor: "#f5f7fa",
            transition: "0.2s",
            display: "flex",
            alignItems: "center",
            gap: 1,
            "&:hover": { bgcolor: "#e9eef5" },
          }}
        >
          <LockResetIcon sx={{ fontSize: 18, color: "#1976d2" }} />
          Đổi mật khẩu
        </Box>

        {/* 🔥 LINE NGĂN CÁCH */}
        <Box
          sx={{
            height: "1px",
            bgcolor: "#e5e7eb",
            mx: 1,
          }}
        />

        {/* ITEM 2 */}
        <Box
          onClick={() => {
            handleMenuClose();
            handleLogout();
          }}
          sx={{
            px: 2,
            py: 1.5,
            cursor: "pointer",
            bgcolor: "#f5f7fa",
            transition: "0.2s",
            display: "flex",
            alignItems: "center",
            gap: 1,
            "&:hover": { bgcolor: "#e9eef5" },
          }}
        >
          <LogoutIcon sx={{ fontSize: 18, color: "#d32f2f" }} />
          Đăng xuất
        </Box>
      </Menu>

      <ChangePasswordDialog
        open={openChangePw}
        onClose={() => setOpenChangePw(false)}
        newPw={newPw}
        confirmPw={confirmPw}
        setNewPw={setNewPw}
        setConfirmPw={setConfirmPw}
        pwError={pwError}
        onSave={handleChangePassword}
      />

      {openLogo && (
        <Box
          onClick={() => setOpenLogo(false)}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            cursor: "pointer"
          }}
        >
          {/* Khung trắng */}
          <Box
            onClick={() => setOpenLogo(false)}
            sx={{
              width: "clamp(180px, 60vw, 320px)",
              height: "clamp(180px, 60vw, 320px)",
              bgcolor: "white",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              animation: "zoomIn 0.3s ease"
            }}
          >
            <Box
              component="img"
              src="/Logo.png"
              alt="Logo lớn"
              sx={{
                maxWidth: "85%",
                maxHeight: "85%",
                objectFit: "contain"
              }}
            />
          </Box>
        </Box>
      )}

      {/* 🔹 Nội dung các trang */}
      <Box sx={{ paddingTop: "44px" }}>
        <Routes>
          {/* ROOT → DASHBOARD */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* LOGIN */}
          <Route path="/login" element={<Login />} />

          {/* DASHBOARD (TRUNG TÂM 9 Ô) */}
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <Dashboard isLoggedIn={isLoggedIn} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* PUBLIC */}
          <Route path="/hocsinh" element={<HocSinh />} />
          <Route path="/tracnghiem" element={<TracNghiem />} />
          <Route path="/tracnghiem-ontap" element={<TracNghiem_OnTap />} />

          {/* PRIVATE FUNCTIONS */}
          <Route
            path="/giaovien"
            element={isLoggedIn ? <GiaoVien /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/danhsach"
            element={isLoggedIn ? <DanhSachHS /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/nhapdiemktdk"
            element={isLoggedIn ? <NhapdiemKTDK /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/xuatdanhgia"
            element={isLoggedIn ? <XuatDanhGia /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/ketqua"
            element={isLoggedIn ? <TongHopKQ /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/thongke"
            element={isLoggedIn ? <ThongKe /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/tracnghiem-gv"
            element={isLoggedIn ? <TracNghiemGV /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/tracnghiem-test"
            element={isLoggedIn ? <TracNghiemTest /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/de-thi"
            element={isLoggedIn ? <DeThi /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/quan-tri"
            element={isLoggedIn ? <QuanTri /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </Box>
    </>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <AdminProvider>        
          <TracNghiemProvider>
            <StudentProvider>
              <StudentDataProvider>
                <StudentKTDKProvider>
                  <SelectedClassProvider>  {/* ← Thêm vào đây */}
                    <AppContent />
                  </SelectedClassProvider>
                </StudentKTDKProvider>
              </StudentDataProvider>
            </StudentProvider>
          </TracNghiemProvider>        
      </AdminProvider>
    </ConfigProvider>
  );
}


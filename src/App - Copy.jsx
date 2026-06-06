import React, { useEffect, useState, useContext } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from "react-router-dom";

import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Box,
  IconButton,
  Menu,
  Dialog,
  DialogContent,
  TextField,
  Stack,
  Snackbar, 
  Alert,
  Tooltip
} from "@mui/material";

import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

import AppsIcon from "@mui/icons-material/Apps";
import CloseIcon from "@mui/icons-material/Close";

import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LoginIcon from "@mui/icons-material/Login";
import LockResetIcon from "@mui/icons-material/LockReset";
import LogoutIcon from "@mui/icons-material/Logout";

// 🔹 Pages
import Info from "./pages/Info";
import HocSinh from "./pages/HocSinh";
import GiaoVien from "./pages/GiaoVien";
import DanhSach from "./pages/DanhSach";
import NhapdiemKTDK from "./pages/NhapdiemKTDK";
import XuatDanhGia from "./pages/XuatDanhGia";
import Login from "./pages/Login";
import TongHopKQ from "./pages/TongHopKQ";
import TracNghiemGV from "./pages/TracNghiemGV";
import TracNghiemTest from "./pages/TracNghiem_Test";
import DeThi from "./pages/DeThi";
import QuanTri from "./pages/QuanTri";
import TracNghiem from "./pages/TracNghiem";
import Dashboard from "./pages/Dashboard";
import ChangePasswordDialog from "./dialog/ChangePasswordDialog";

// 🔹 Provider
import { QuizProvider } from "./context/QuizContext";
import { StudentQuizProvider } from "./context/StudentQuizContext";
import { TeacherQuizProvider } from "./context/TeacherQuizContext";
import { ConfigProvider, ConfigContext } from "./context/ConfigContext";
import { AdminProvider } from "./context/AdminContext";
import { TracNghiemProvider } from "./context/TracNghiemContext";
import { StudentProvider } from "./context/StudentContext";
import { StudentDataProvider } from "./context/StudentDataContext";
import { StudentKTDKProvider } from "./context/StudentKTDKContext";
import { SelectedClassProvider } from "./context/SelectedClassContext";

// 🔥 APP CONTENT
function AppContent() {
  const navigate = useNavigate();
  const { config, setConfig } = useContext(ConfigContext);

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("loggedIn") === "true"
  );

  const [openLogo, setOpenLogo] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const [openChangePw, setOpenChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("loggedIn") === "true");
  }, []);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("account");

    setIsLoggedIn(false);
    setConfig((prev) => ({ ...prev, login: false }));

    navigate("/hocsinh", { replace: true });
  };

  useEffect(() => {
    const logged = localStorage.getItem("loggedIn") === "true";
    setIsLoggedIn(logged);

    if (!logged) {
      navigate("/hocsinh", { replace: true });
    }
  }, []);

  const account = localStorage.getItem("account") || "";

  const handleChangePassword = async () => {
    if (!newPw.trim()) {
      setPwError("❌ Mật khẩu mới không được để trống!");
      return;
    }

    if (newPw !== confirmPw) {
      setPwError("❌ Mật khẩu nhập lại không khớp!");
      return;
    }

    // ✅ PASS VALID → đóng dialog + báo thành công ngay
    setPwError("");
    setOpenChangePw(false);

    setSnackbar({
      open: true,
      message: "✅ Đổi mật khẩu thành công!",
      severity: "success",
    });

    const docId = account === "TH Lâm Văn Bền" ? "lvb" : "admin";

    // 🔥 Firestore chạy nền (không chặn UI)
    setDoc(
      doc(db, "MATKHAU", docId),
      { pass: newPw },
      { merge: true }
    ).catch((err) => {
      console.error("Lỗi lưu mật khẩu:", err);

      setSnackbar({
        open: true,
        message: "❌ Lưu mật khẩu thất bại!",
        severity: "error",
      });
    });

    // reset input
    setNewPw("");
    setConfirmPw("");
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  function RequireAuth({ isLoggedIn, children }) {
    if (!isLoggedIn) {
      return <Navigate to="/hocsinh" replace />;
    }
    return children;
  }

  return (
    <>
      {/* APP BAR */}
      <AppBar position="fixed" sx={{ background: "#1976d2" }}>
        <Toolbar
          variant="dense"
          sx={{
            minHeight: "50px !important",
            px: 1.5,
            gap: 1,
          }}
        >
          <Box
            component="img"
            src="/Logo.png"
            sx={{ height: 34, cursor: "pointer" }}
            onClick={() => setOpenLogo(true)}
          />

          {!isLoggedIn ? (
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
          ) : (
            <>
              <Button
                component={Link}
                to="/dashboard"
                sx={{
                  color: "#fff",
                  "&:hover": {
                    color: "#fff",
                  },
                }}
              >
                Dashboard
              </Button>

              <Box
                sx={{
                  ml: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    minWidth: { xs: 70, sm: 130 },
                    px: 1.3,
                    py: 0.4,
                    borderRadius: 999,
                    fontSize: 14,
                    bgcolor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    textAlign: "center",
                  }}
                >
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                    Năm học:{" "}
                  </Box>

                  {config?.namHoc || "2025-2026"}
                </Box>

                {account === "Admin" ? (
                  <Tooltip title="Quản trị viên" arrow>
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
                  </Tooltip>
                ) : (
                  <Tooltip title="Lâm Văn Bền" arrow>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(255,255,255,0.25)",
                      }}
                    >
                      <PersonIcon
                        sx={{
                          color: "#1976d2",
                          fontSize: 22,
                        }}
                      />
                    </Box>
                  </Tooltip>
                )}

                <IconButton onClick={handleMenuOpen} sx={{ color: "white" }}>
                  <AppsIcon sx={{ fontSize: 32 }} />
                </IconButton>
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* MENU */}
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
      
      {/* DIALOG ĐỔI MẬT KHẨU */}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() =>
          setSnackbar((prev) => ({ ...prev, open: false }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Toolbar variant="dense" />   

      {/* ROUTES */}
      <Box>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth isLoggedIn={isLoggedIn}>
                <Dashboard isLoggedIn={isLoggedIn} />
              </RequireAuth>
            }
          />
          <Route
            path="/hocsinh"
            element={
              config?.giaoDien === "the_ten" ? (
                <HocSinh />
              ) : (
                <Info />
              )
            }
          />
          <Route path="/giaovien" element={<GiaoVien />} />
          <Route path="/danhsach" element={<DanhSach />} />
          <Route path="/nhapdiem-ktdk" element={<NhapdiemKTDK />} />
          <Route path="/xuat-danh-gia" element={<XuatDanhGia />} />
          <Route path="/ketqua" element={<TongHopKQ />} />
          <Route path="/tracnghiem-gv" element={<TracNghiemGV />} />
          <Route path="/tracnghiem-test" element={<TracNghiemTest />} />
          <Route path="/de-thi" element={<DeThi />} />
          <Route path="/quan-tri" element={<QuanTri />} />
          <Route path="/tracnghiem" element={<TracNghiem />} />
        </Routes>
      </Box>

      {/* LOGO POPUP (ZOOM FULL VERSION) */}
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
            cursor: "pointer",
          }}
        >
          {/* Khung trắng */}
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              width: "clamp(160px, 42vw, 260px)",
              height: "clamp(160px, 42vw, 260px)",
              bgcolor: "white",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              animation: "zoomIn 0.25s ease",
            }}
          >
            <Box
              component="img"
              src="/Logo.png"
              alt="Logo lớn"
              sx={{
                maxWidth: "85%",
                maxHeight: "85%",
                objectFit: "contain",
              }}
            />
          </Box>
        </Box>
      )}
    </>
  );
}

// PROVIDER
export default function App() {
  return (
    <TeacherQuizProvider>
      <StudentQuizProvider>
        <QuizProvider>
          <ConfigProvider>
            <AdminProvider>
              <TracNghiemProvider>
                <StudentProvider>
                  <StudentDataProvider>
                    <StudentKTDKProvider>
                      <SelectedClassProvider>
                        <AppContent />
                      </SelectedClassProvider>
                    </StudentKTDKProvider>
                  </StudentDataProvider>
                </StudentProvider>
              </TracNghiemProvider>
            </AdminProvider>
          </ConfigProvider>
        </QuizProvider>
      </StudentQuizProvider>
    </TeacherQuizProvider>
  );
}
import React, { useContext, useEffect, useState } from "react";
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

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { config, setConfig } = useContext(ConfigContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true); 
  const account = localStorage.getItem("account"); // thêm dòng này trước <Routes>
   const [openLogo, setOpenLogo] = useState(false);

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

    // chỉ cập nhật config.login = false, không reset học kỳ
    setConfig((prev) => ({ ...prev, login: false }));

    navigate("/login");

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

  const navItems = [
    /*{ path: "/tracnghiem-ontap", label: "Ôn tập" }, // thêm vào đầu menu*/
    { path: "/hocsinh", label: "Học sinh" },
    ...(isLoggedIn
      ? [                     
          { path: "/giaovien", label: "Đánh giá" },
          { path: "/tonghopdanhgia", label: "ĐGTX" },
          { path: "/nhapdiemktdk", label: "KTĐK" },
          { path: "/xuatdanhgia", label: "Xuất đánh giá" },
          { path: "/ketqua", label: "Kết quả" },
          { path: "/thongke", label: "Thống kê" },
          { path: "/danhsach", label: "PPCT - DS" },
          //{ path: "/tracnghiem", label: "Trắc nghiệm" },
          { path: "/tracnghiem-gv", label: "Soạn đề" },
          { path: "/tracnghiem-test", label: "Test đề" }, 
          { path: "/de-thi", label: "Đề thi" },
          { path: "/quan-tri", label: "Hệ thống" },
          { label: "Đăng xuất", onClick: handleLogout }
        ]
      : [{ path: "/login", label: "Đăng nhập" }]),
  ];

  if (loading) return null;

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
          {/* 🔹 Logo + Menu */}
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
                cursor: "pointer"
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

                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                    opacity: 1,               // 🔴 QUAN TRỌNG
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    ml: 0.3,
                    color: "white",           // 🔴 FIX CHÍNH
                    opacity: 1,               // 🔴 FIX CHÍNH
                  }}
                >
                  {item.label}
                </Typography>
              </Button>

            ))}
          </Box>

          {/* 🔹 Dropdown chọn Học kỳ (chỉ khi đã đăng nhập) */}
          {isLoggedIn && (
            <Box sx={{ minWidth: 140, mr: 1 }}>
              <select
                value={config?.hocKy || "Giữa kỳ I"}
                onChange={handleHocKyChange}
                style={{
                  backgroundColor: "transparent",
                  color: "white",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  border: "2px solid white",
                  outline: "none",
                  fontSize: "0.95rem",
                  width: "100%",
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg fill='white' height='18' viewBox='0 0 24 24' width='18' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPositionX: "calc(100% - 10px)",
                  backgroundPositionY: "center",
                  cursor: "pointer",
                }}
              >
                <option style={{ color: "#1976d2" }} value="Giữa kỳ I">
                  Giữa kỳ I
                </option>
                <option style={{ color: "#1976d2" }} value="Cuối kỳ I">
                  Cuối kỳ I
                </option>
                <option style={{ color: "#1976d2" }} value="Giữa kỳ II">
                  Giữa kỳ II
                </option>
                <option style={{ color: "#1976d2" }} value="Cuối năm">
                  Cuối năm
                </option>
              </select>
            </Box>
          )}
        </Toolbar>
      </AppBar>

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
          {/* 🔹 Mặc định mở trang Học Sinh */}
          <Route path="/" element={<Navigate to="/hocsinh" replace />} />

          <Route path="/tracnghiem-ontap" element={<TracNghiem_OnTap />} />
          <Route path="/hocsinh" element={<HocSinh />} />
          <Route path="/tracnghiem" element={<TracNghiem />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/danhsach"
            element={isLoggedIn ? <DanhSachHS /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/giaovien"
            element={isLoggedIn ? <GiaoVien /> : <Navigate to="/login" replace />}
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
            path="/tonghopdanhgia"
            element={isLoggedIn ? <TongHopDanhGia /> : <Navigate to="/login" replace />}
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
            element={
              isLoggedIn
                ? account === "Admin"
                  ? <TracNghiemGV />
                  : <TracNghiemGV />
                : <Navigate to="/login" replace />
            }
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


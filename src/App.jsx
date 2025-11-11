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
import { ConfigProvider, ConfigContext } from "./context/ConfigContext";
import { StudentDataProvider } from "./context/StudentDataContext";
import { StudentKTDKProvider } from "./context/StudentKTDKContext";

// 🔹 Import icon
//import HocSinhIcon from "@mui/icons-material/HocSinh";
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

  // ✅ Hàm xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("account");

    const updatedConfig = { ...config, login: false };
    localStorage.setItem("appConfig", JSON.stringify(updatedConfig));
    setConfig(updatedConfig);

    navigate("/login");

    /*setTimeout(() => {
      const docRef = doc(db, "CONFIG", "config");
      setDoc(docRef, { login: false }, { merge: true }).catch(() => {});
    }, 0);*/
  };

  // ✅ Hàm thay đổi học kỳ
  const handleHocKyChange = async (e) => {
    const hocKy = e.target.value;
    await setConfig({ hocKy }); // 🔹 Dùng context updateConfig
  };


  // ✅ Danh sách menu
  const navItems = [
    { path: "/hocsinh", label: "Học sinh", icon: <MenuBookIcon fontSize="small" /> },
    ...(config.login
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
          {/* 🔹 Logo + Menu */}
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

            {/* 🔹 Menu buttons */}
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

          {/* 🔹 Dropdown chọn Học kỳ */}
          {config.login && (
            <Box sx={{ minWidth: 140, mr: 1 }}>
              <select
                value={config.hocKy || "Giữa kỳ I"}
                onChange={handleHocKyChange}
                style={{
                  backgroundColor: "transparent",   // 🔹 Nền trong suốt
                  color: "white",                   // 🔹 Chữ trắng
                  borderRadius: "4px",              // 🔹 Bo góc nhẹ
                  padding: "6px 12px",
                  border: "2px solid white",        // 🔹 Viền trắng
                  outline: "none",
                  fontSize: "0.95rem",
                  width: "100%",
                  appearance: "none",               // 🔹 Ẩn mũi tên mặc định
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
                <option style={{ color: "#1976d2" }} value="Giữa kỳ I">Giữa kỳ I</option>
                <option style={{ color: "#1976d2" }} value="Cuối kỳ I">Cuối kỳ I</option>
                <option style={{ color: "#1976d2" }} value="Giữa kỳ II">Giữa kỳ II</option>
                <option style={{ color: "#1976d2" }} value="Cả năm">Cả năm</option>
              </select>
            </Box>

          )}

        </Toolbar>
      </AppBar>

      {/* 🔹 Nội dung các trang */}
      <Box sx={{ paddingTop: "44px" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/hocsinh" replace />} />
          <Route path="/hocsinh" element={<HocSinh />} />
          <Route
            path="/danhsach"
            element={config.login ? <DanhSachHS /> : <Navigate to="/login" replace />}
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/giaovien"
            element={config.login ? <GiaoVien /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/nhapdiemktdk"
            element={config.login ? <NhapdiemKTDK /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/xuatdanhgia"
            element={config.login ? <XuatDanhGia /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/tonghopdanhgia"
            element={config.login ? <TongHopDanhGia /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/thongke"
            element={config.login ? <ThongKe /> : <Navigate to="/login" replace />}
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
        <StudentDataProvider>
          <StudentKTDKProvider> {/* 🔹 thêm context mới */}
            <AppContent />
          </StudentKTDKProvider>
        </StudentDataProvider>
      </StudentProvider>
    </ConfigProvider>
  );
}


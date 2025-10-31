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

    // 🟢 Tự động chuyển sang trang Học sinh khi vào root "/"
  React.useEffect(() => {
    if (location.pathname === "/") {
      navigate("/hocsinh", { replace: true });
    }
  }, [location.pathname, navigate]);


  // ✅ Hàm xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("account");

    const updatedConfig = { ...config, login: false };
    localStorage.setItem("appConfig", JSON.stringify(updatedConfig));
    setConfig(updatedConfig);

    navigate("/login");

    setTimeout(() => {
      const docRef = doc(db, "CONFIG", "config");
      setDoc(docRef, { login: false }, { merge: true }).catch(() => {});
    }, 0);
  };

  // ✅ Danh sách menu
  const navItems = [
    { path: "/hocsinh", label: "Học sinh", icon: <MenuBookIcon fontSize="small" /> },
    ...(config.login
      ? [
          //{ path: "/danhsach", label: "Danh sách", icon: <SchoolIcon fontSize="small" /> },
          { path: "/giaovien", label: "Đánh giá", icon: <SummarizeIcon fontSize="small" /> },          
          //{ path: "/tonghopdanhgia", label: "Tổng hợp", icon: <SummarizeIcon fontSize="small" /> },
          { path: "/tonghopdanhgia", label: "ĐGTX", icon: <SummarizeIcon fontSize="small" /> },
          //{ path: "/nhapdiemktdk", label: "Nhập điểm", icon: <SummarizeIcon fontSize="small" /> },
          { path: "/nhapdiemktdk", label: "KTĐK", icon: <SummarizeIcon fontSize="small" /> },
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
            sx={{
              height: 34,
              flexShrink: 0,
              ml: { xs: -1, sm: -2 },
              mr: 1,
            }}
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

          {/* 🔹 TUẦN: 
              - Nếu đã đăng nhập → nằm cuối menu (sau Đăng xuất)
              - Nếu chưa đăng nhập → vẫn căn giữa như cũ */}
          {config.login ? (
            <Typography
              variant="body2"
              sx={{
                ml: 25, // 🔹 tăng khoảng cách giữa "Đăng xuất" và "TUẦN ..."
                px: 2,
                py: 0.5,
                border: "1px solid white",
                borderRadius: "6px",
                color: "white",
                flexShrink: 0,
              }}
            >
              {`TUẦN ${config.tuan || "?"}${config.mon ? " - " + config.mon.toUpperCase() : ""}`}
            </Typography>
          ) : (
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
              {`TUẦN ${config.tuan || "?"}${config.mon ? " - " + config.mon.toUpperCase() : ""}`}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      {/* 🔹 Nội dung các trang */}
      <Box sx={{ paddingTop: "44px" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/hocsinh" replace />} />
          <Route path="/hocsinh" element={<HocSinh />} />
          
          {/* Danh sách chỉ hiển thị khi đã đăng nhập */}
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


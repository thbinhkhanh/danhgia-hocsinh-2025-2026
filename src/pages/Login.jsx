import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, TextField, Button, Stack, Card, IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from "react-router-dom";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const DEFAULT_USERNAME = "Admin";
const DEFAULT_PASSWORD = "1";

export default function Login() {
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setConfig } = useContext(ConfigContext);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig(prev => ({
            ...prev,
            tuan: data.tuan || prev.tuan || 1,
            hethong: data.hethong ?? prev.hethong ?? false,
            mon: data.mon || prev.mon || "Tin học", // ✅ giữ lại môn học
            lop: data.lop || prev.lop || "",
            //giaovien: data.giaovien ?? prev.giaovien ?? false,
            th_tuan_from: data.th_tuan_from ?? prev.th_tuan_from,
            th_tuan_to: data.th_tuan_to ?? prev.th_tuan_to,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfig();
  }, [setConfig]);

  const handleLogin = () => {
    if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("account", DEFAULT_USERNAME);

      const storedConfig = localStorage.getItem("appConfig");
      const parsedConfig = storedConfig ? JSON.parse(storedConfig) : {};
      const updatedConfig = { ...parsedConfig, login: true };
      localStorage.setItem("appConfig", JSON.stringify(updatedConfig));
      setConfig(updatedConfig);

      //navigate("/giaovien");
      navigate("/tonghopdanhgia");
      
      // Ghi login: true vào Firestore (không log ra console)
      setTimeout(() => {
        const docRef = doc(db, "CONFIG", "config");
        updateDoc(docRef, { login: true }).catch(() => {});
      }, 0);
    } else {
      alert("❌ Tài khoản hoặc mật khẩu sai!");
    }
  };

  const handleClose = () => {
    navigate("/hocsinh");
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 4 }}>
      <Box sx={{ width: { xs: "95%", sm: 400 }, mx: "auto", position: "relative" }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
          {/* Nút X góc trên phải */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "red",
            }}
          >
            <CloseIcon />
          </IconButton>

          <Stack spacing={3} alignItems="center">
            <div style={{ fontSize: 50 }}>🔐</div>
            <Typography variant="h5" fontWeight="bold" color="primary" textAlign="center">
              ĐĂNG NHẬP
            </Typography>

            <TextField
              label="Tài khoản"
              value={username}
              size="small"
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              size="small"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleLogin}
              fullWidth
              sx={{ fontWeight: "bold", textTransform: "none", fontSize: "1rem" }}
            >
              🔐 Đăng nhập
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}

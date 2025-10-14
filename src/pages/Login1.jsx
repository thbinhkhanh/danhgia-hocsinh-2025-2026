import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, TextField, Button, Stack, Card } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc } from "firebase/firestore"; // 🔹 import firestore
import { db } from "../firebase"; // 🔹 import db

const DEFAULT_USERNAME = "Admin";
//const DEFAULT_PASSWORD = "@minhduy123";
const DEFAULT_PASSWORD = "1";

export default function Login() {
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const { setConfig } = useContext(ConfigContext);

  // 🔹 Luôn fetch config từ Firestore khi Login mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const tuan = data.tuan || 1;
          const hethong = data.hethong ?? false;

          setConfig({ tuan, hethong });
        } else {
          console.warn("⚠️ Không tìm thấy document config trong Firestore.");
          setConfig({ tuan: 1, hethong: false });
        }
      } catch (err) {
        console.error("❌ Lỗi lấy config từ Firestore:", err);
        setConfig({ tuan: 1, hethong: false });
      }
    };

    fetchConfig();
  }, [setConfig]);

  const handleLogin = () => {
    if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("account", DEFAULT_USERNAME);
      navigate("/quan-tri");
    } else {
      alert("❌ Tài khoản hoặc mật khẩu sai!");
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 4 }}>
      <Box sx={{ width: { xs: "95%", sm: 400 }, mx: "auto" }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
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

            <Stack direction="row" spacing={2} width="100%">
              <Button
                variant="contained"
                color="primary"
                onClick={handleLogin}
                fullWidth
                sx={{ fontWeight: "bold", textTransform: "none", fontSize: "1rem" }}
              >
                🔐 Đăng nhập
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleBack}
                fullWidth
                sx={{ fontWeight: "bold", textTransform: "none", fontSize: "1rem" }}
              >
                🔙 Quay lại
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}

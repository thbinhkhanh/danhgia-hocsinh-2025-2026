import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, TextField, Button, Stack, Card, IconButton, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from "react-router-dom";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const ACCOUNTS = ["Admin"];

export default function Login() {
  const [username, setUsername] = useState(ACCOUNTS[0]);
  const [password, setPassword] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
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
            mon: data.mon || prev.mon || "Tin học",
            lop: data.lop || prev.lop || "",
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

  const handleLogin = async () => {
    try {
      const docRef = doc(db, "MATKHAU", "ADMIN");
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setSnackbar({ open: true, message: "❌ Không tìm thấy thông tin Admin!", severity: "error" });
        return;
      }

      const storedPassword = docSnap.data().pass;

      if (username === "Admin" && password === storedPassword) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("account", username);

        window.dispatchEvent(new Event("storage"));
        setSnackbar({ open: true, message: "✅ Đăng nhập thành công!", severity: "success" });
        navigate("/tonghopdanhgia");
      } else {
        setSnackbar({ open: true, message: "❌ Sai mật khẩu!", severity: "error" });
      }
    } catch (err) {
      console.error("❌ Lỗi đăng nhập:", err);
      setSnackbar({ open: true, message: "❌ Lỗi khi đăng nhập!", severity: "error" });
    }
  };

  const handleClose = () => {
    navigate("/hocsinh");
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 4 }}>
      <Box sx={{ width: { xs: "95%", sm: 400 }, mx: "auto", position: "relative" }}>
        <Card elevation={10} sx={{ p: 3, borderRadius: 4 }}>
          <IconButton
            onClick={handleClose}
            sx={{ position: "absolute", top: 8, right: 8, color: "red" }}
          >
            <CloseIcon />
          </IconButton>

          <Stack spacing={3} alignItems="center">
            <div style={{ fontSize: 50 }}>🔐</div>
            <Typography variant="h5" fontWeight="bold" color="primary" textAlign="center">
              ĐĂNG NHẬP
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Tài khoản</InputLabel>
              <Select
                value={username}
                label="Tài khoản"
                onChange={(e) => setUsername(e.target.value)}
              >
                {ACCOUNTS.map((acc) => (
                  <MenuItem key={acc} value={acc}>{acc}</MenuItem>
                ))}
              </Select>
            </FormControl>

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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

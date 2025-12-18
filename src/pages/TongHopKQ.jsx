import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Snackbar,
  Alert,
  Dialog, 
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { Delete, FileDownload } from "@mui/icons-material";
import { exportKetQuaExcel } from "../utils/exportKetQuaExcel";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

export default function TongHopKQ() {
  const [classesList, setClassesList] = useState([]);
  const [selectedLop, setSelectedLop] = useState("");
  const [selectedMon, setSelectedMon] = useState("Tin học");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hocKi, setHocKi] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [dialogSeverity, setDialogSeverity] = useState("info");

  const [kieuHienThi, setKieuHienThi] = useState("KTĐK"); 

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogContent, setDialogContent] = useState("");
  const [dialogAction, setDialogAction] = useState(null);

  const folder = "BINHKHANH";

  // Lấy học kỳ
  useEffect(() => {
    const fetchHocKi = async () => {
      try {
        const configRef = doc(db, folder, "config");
        const configSnap = await getDoc(configRef);
        const hocKiValue = configSnap.exists() ? configSnap.data().hocKy : "GKI";
        setHocKi(hocKiValue);
      } catch (err) {
        console.error("❌ Lỗi khi lấy học kỳ:", err);
        setHocKi("GKI");
      }
    };
    fetchHocKi();
  }, []);

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snapshot = await getDocs(collection(db, "DANHSACH"));
        const classList = snapshot.docs.map(doc => doc.id).sort((a, b) => a.localeCompare(b));
        setClassesList(classList);
        setSelectedLop(classList[0] || "");
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, []);

  // Load kết quả và sắp xếp tên chuẩn Việt Nam
  const loadResults = async () => {
    if (!selectedLop || !selectedMon || !hocKi) return;
    setLoading(true);

    try {
      // 👉 Chọn collection theo kieuHienThi
      const folderToUse = kieuHienThi === "KTĐK" ? "BINHKHANH" : "BINHKHANH_ONTAP";
      const colRef = collection(db, folderToUse, hocKi, selectedLop);

      const snapshot = await getDocs(colRef);

      if (snapshot.empty) {
        setResults([]);
        setSnackbarSeverity("warning");
        setSnackbarMessage(`Không tìm thấy kết quả cho lớp ${selectedLop}`);
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      const data = snapshot.docs.map(docSnap => {
        const raw = docSnap.data();
        return {
          docId: docSnap.id,
          ...raw,

          // ✅ Chuẩn hóa field ngày
          ngayHienThi:
            kieuHienThi === "KTĐK"
              ? raw.ngayKiemTra || ""
              : raw.ngayLam || "",
        };
      });

      // Hàm sắp xếp tên chuẩn Việt Nam: tên → tên đệm → họ
      const compareVietnameseName = (a, b) => {
        const namePartsA = (a.hoVaTen || "").trim().split(" ").reverse();
        const namePartsB = (b.hoVaTen || "").trim().split(" ").reverse();
        const len = Math.max(namePartsA.length, namePartsB.length);

        for (let i = 0; i < len; i++) {
          const partA = (namePartsA[i] || "").toLowerCase();
          const partB = (namePartsB[i] || "").toLowerCase();
          const cmp = partA.localeCompare(partB);
          if (cmp !== 0) return cmp;
        }
        return 0;
      };

      data.sort(compareVietnameseName);

      const numberedData = data.map((item, idx) => ({ stt: idx + 1, ...item }));
      setResults(numberedData);

    } catch (err) {
      console.error("❌ Lỗi khi load kết quả:", err);
      setResults([]);
      setSnackbarSeverity("error");
      setSnackbarMessage("❌ Lỗi khi load kết quả!");
      setSnackbarOpen(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadResults();
  }, [selectedLop, selectedMon, hocKi, kieuHienThi]);

  // Xóa toàn bộ lớp
  const handleDeleteClass = () => {
    openConfirmDialog(
      "Xóa kết quả lớp",
      `⚠️ Bạn có chắc muốn xóa toàn bộ kết quả lớp ${selectedLop}?\nHành động này không thể hoàn tác!`,
      async () => {
        try {
          const folderToUse = kieuHienThi === "KTĐK" ? "BINHKHANH" : "BINHKHANH_ONTAP";
          const colRef = collection(db, folderToUse, hocKi, selectedLop);
          const snapshot = await getDocs(colRef);

          if (snapshot.empty) {
            setSnackbarSeverity("warning");
            setSnackbarMessage(`Không có dữ liệu để xóa cho lớp ${selectedLop}!`);
            setSnackbarOpen(true);
            return;
          }

          const batch = writeBatch(db);
          snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();

          setResults([]);
          setSnackbarSeverity("success");
          setSnackbarMessage("✅ Đã xóa kết quả của lớp thành công!");
          setSnackbarOpen(true);

        } catch (err) {
          console.error("❌ Firestore: Xóa lớp thất bại:", err);
          setSnackbarSeverity("error");
          setSnackbarMessage("❌ Xóa lớp thất bại!");
          setSnackbarOpen(true);
        }
      }
    );
  };

  const handleDeleteSchool = () => {
    // ❌ KHÔNG CÓ LỚP NÀO
    if (!classesList || classesList.length === 0) {
      setSnackbarSeverity("warning");
      setSnackbarMessage("Không có lớp nào để xóa!");
      setSnackbarOpen(true);
      return;
    }

    openConfirmDialog(
      "Xóa toàn trường",
      `⚠️ Bạn có chắc muốn xóa kết quả ${
        kieuHienThi === "KTĐK" ? "KIỂM TRA ĐỊNH KỲ" : "ÔN TẬP"
      } của toàn trường?\nHành động này không thể hoàn tác!`,
      async () => {
        try {
          const folderToUse =
            kieuHienThi === "KTĐK" ? "BINHKHANH" : "BINHKHANH_ONTAP";

          let totalDeleted = 0;
          let hasData = false;
          const CHUNK_SIZE = 450;

          await Promise.all(
            classesList.map(async (lop) => {
              const colRef = collection(db, folderToUse, hocKi, lop);
              const snapshot = await getDocs(colRef);

              if (snapshot.empty) return;

              hasData = true;

              for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                snapshot.docs
                  .slice(i, i + CHUNK_SIZE)
                  .forEach((docSnap) => {
                    batch.delete(docSnap.ref);
                    totalDeleted++;
                  });
                await batch.commit();
              }
            })
          );

          // ❌ Có lớp nhưng không có dữ liệu
          if (!hasData) {
            setSnackbarSeverity("warning");
            setSnackbarMessage("Không có dữ liệu để xóa!");
            setSnackbarOpen(true);
            return;
          }

          // ✅ Thành công
          setResults([]);
          setSnackbarSeverity("success");
          setSnackbarMessage(
            `✅ Đã xóa toàn trường (${totalDeleted} học sinh)`
          );
          setSnackbarOpen(true);

        } catch (err) {
          console.error("❌ Firestore:", err);
          setSnackbarSeverity("error");
          setSnackbarMessage("❌ Lỗi khi xóa toàn trường!");
          setSnackbarOpen(true);
        }
      },
      "error"
    );
  };


  // Xuất Excel
  const handleExportExcel = () => {
    openConfirmDialog(
      "Xuất Excel",
      `Bạn có muốn xuất kết quả lớp ${selectedLop} ra file Excel không?`,
      () => {
        if (!results || results.length === 0) {
          setSnackbarSeverity("error");
          setSnackbarMessage("Không có dữ liệu để xuất Excel!");
          setSnackbarOpen(true);
          return;
        }

        exportKetQuaExcel(results, selectedLop, selectedMon, hocKi);
        setSnackbarSeverity("success");
        setSnackbarMessage("✅ Xuất file Excel thành công!");
        setSnackbarOpen(true);
      }
    );
  };

  const openConfirmDialog = (title, content, onConfirm, severity = "info") => {
    setDialogTitle(title);
    setDialogContent(content);
    setDialogSeverity(severity);

    setDialogAction(() => () => {
      setDialogOpen(false);
      setTimeout(onConfirm, 0);
    });

    setDialogOpen(true);
  };

  const snackbarStyleMap = {
    success: {
      backgroundColor: "#2e7d32",
      color: "#fff",
      fontWeight: "bold",
    },
    error: {
      backgroundColor: "#d32f2f",
      color: "#fff",
      fontWeight: "bold",
    },
    warning: {
      backgroundColor: "#ed6c02",
      color: "#fff",
      fontWeight: "bold",
    },
    info: {
      backgroundColor: "#0288d1",
      color: "#fff",
      fontWeight: "bold",
    },
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)", pt: 3, px: 2, display: "flex", justifyContent: "center" }}>
      <Paper sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 900, bgcolor: "white" }} elevation={6}>
        <Box
          sx={{
            position: "relative",
            mb: 2,
          }}
        >
          {/* ICONS – luôn căn trái */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <Stack direction="row" spacing={1}>
              <Tooltip title="Xuất Excel">
                <IconButton onClick={handleExportExcel} color="primary">
                  <FileDownload />
                </IconButton>
              </Tooltip>

              <Tooltip title="Xóa lớp">
                <IconButton
                  onClick={handleDeleteClass}
                  color="error"
                  disabled={deleting}
                >
                  <Delete />
                </IconButton>
              </Tooltip>

              <Tooltip title="Xóa toàn trường">
                <IconButton
                  onClick={handleDeleteSchool}
                  sx={{ color: "#d32f2f" }}
                >
                  <DeleteForeverIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* TIÊU ĐỀ */}
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              color: "#1976d2",

              // 📱 Mobile: xuống dòng, căn giữa
              textAlign: "center",
              mt: 1,

              // 🖥 Desktop: căn giữa tuyệt đối
              position: { md: "absolute" },
              left: { md: "50%" },
              transform: { md: "translateX(-50%)" },
              top: { md: 0 },
            }}
          >
            KẾT QUẢ KIỂM TRA
          </Typography>
        </Box>


        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", justifyContent: "center" }}>
          <TextField
            select
            label="Lớp"
            value={selectedLop}
            onChange={(e) => setSelectedLop(e.target.value)}
            size="small"
            sx={{ width: 80 }}
          >
            {classesList.map(lop => <MenuItem key={lop} value={lop}>{lop}</MenuItem>)}
          </TextField>

          <TextField
            select
            label="Môn"
            value={selectedMon}
            onChange={(e) => setSelectedMon(e.target.value)}
            size="small"
            sx={{ width: 130 }}
          >
            {["Tin học", "Công nghệ"].map(mon => <MenuItem key={mon} value={mon}>{mon}</MenuItem>)}
          </TextField>

          <TextField
            select
            label="Loại"
            value={kieuHienThi}
            onChange={(e) => setKieuHienThi(e.target.value)}
            size="small"
            sx={{ width: 120 }}
          >
            <MenuItem value="KTĐK">KTĐK</MenuItem>
            <MenuItem value="ONTAP">Ôn tập</MenuItem>
          </TextField>

        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <TableContainer component={Paper} sx={{ boxShadow: "none", minWidth: 750 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 50 }}>STT</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 200 }}>Họ và tên</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 80 }}>Lớp</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 100 }}>Môn</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 120 }}>Ngày</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 120 }}>Thời gian</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 80 }}>Điểm</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(results.length > 0 ? results : Array.from({ length: 5 }, (_, i) => ({
                    stt: i + 1,
                    hoVaTen: "",
                    lop: "",
                    mon: "",
                    ngayKiemTra: "",
                    thoiGianLamBai: "",
                    diem: ""
                  }))).map(r => (
                    <TableRow key={r.stt}>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)" }}>{r.stt}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "left", border: "1px solid rgba(0,0,0,0.12)" }}>{r.hoVaTen}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)" }}>{r.lop}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)" }}>{r.mon}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)" }}>{r.ngayHienThi}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)" }}>{r.thoiGianLamBai}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)", fontWeight: "bold" }}>{r.diem}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{
              width: "100%",
              ...snackbarStyleMap[snackbarSeverity],

              // ✅ icon luôn màu trắng (kể cả warning)
              "& .MuiAlert-icon": {
                color: "#fff",
              },
            }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
        
        <Dialog
          open={dialogOpen}
          onClose={(_, reason) => {
            if (reason === "backdropClick" || reason === "escapeKeyDown") return;
            setDialogOpen(false);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 3,
              bgcolor: "#fff",
              boxShadow: "0 4px 12px rgba(33,150,243,0.15)",
            },
          }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Box
              sx={{
                bgcolor: "#42a5f5",
                color: "#fff",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1.5,
                fontWeight: "bold",
                fontSize: 18,
              }}
            >
              ❓
            </Box>

            <DialogTitle
              sx={{
                p: 0,
                fontWeight: "bold",
                color: "#1565c0",
                flex: 1,
              }}
            >
              {dialogTitle}
            </DialogTitle>

            {/* Nút đóng */}
            <IconButton
              onClick={() => setDialogOpen(false)}
              sx={{
                ml: "auto",
                color: "#f44336",
                "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Nội dung */}
          <DialogContent dividers>
            <Typography
              sx={{
                fontSize: 16,
                color: "#333",
                whiteSpace: "pre-line",
                mb: 2, // ✅ chỉ tăng khoảng cách text ↔ divider
              }}
            >
              {dialogContent}
            </Typography>
          </DialogContent>

          {/* Actions */}
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={dialogAction}
              sx={{ fontWeight: "bold" }}
            >
              Xác nhận
            </Button>
          </DialogActions>
        </Dialog>


      </Paper>
    </Box>
  );
}


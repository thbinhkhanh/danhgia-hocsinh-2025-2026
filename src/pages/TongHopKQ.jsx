import React, { useState, useEffect, useContext } from "react";
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
import { ConfigContext } from "../context/ConfigContext";

export default function TongHopKQ() {
  const [classesList, setClassesList] = useState([]);
  const [selectedLop, setSelectedLop] = useState("");
  const [selectedMon, setSelectedMon] = useState("Tin học");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [dialogSeverity, setDialogSeverity] = useState("info");

  const [kieuHienThi, setKieuHienThi] = useState("KTĐK"); 

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogContent, setDialogContent] = useState("");
  const [dialogAction, setDialogAction] = useState(null);
  const { config } = useContext(ConfigContext);

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
  const hocKyMap = {
    "Giữa kỳ I": "GKI",
    "Cuối kỳ I": "CKI",
    "Giữa kỳ II": "GKII",
    "Cả năm": "CN",
  };

  const loadResults = async () => {
    if (!selectedLop || !selectedMon || !config?.hocKy) return;
    setLoading(true);

    try {
      const classKey = selectedLop.replace(".", "_");
      const colRef = collection(db, "DATA", classKey, "HOCSINH");
      const snapshot = await getDocs(colRef);

      if (snapshot.empty) {
        setResults([]);
        setSnackbarSeverity("warning");
        setSnackbarMessage(`Không tìm thấy học sinh trong lớp ${selectedLop}`);
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      const subjectKey = selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";
      const hocKyCode = hocKyMap[config.hocKy];

      const data = snapshot.docs.map(docSnap => {
        const studentData = docSnap.data();
        const studentId = docSnap.id;

        let diem, diemTN, ngayHienThi, thoiGianLamBai, nhanXet;

        if (kieuHienThi === "KTĐK") {
          const ktdkData = studentData?.[subjectKey]?.ktdk?.[hocKyCode] || {};
          diem = ktdkData.lyThuyet ?? "";
          ngayHienThi = ktdkData.ngayKiemTra ?? "";
          thoiGianLamBai = ktdkData.thoiGianLamBai ?? "";
        } else if (kieuHienThi === "ONTAP") {
          const onTapData = studentData?.[subjectKey]?.ktdk?.[hocKyCode] || {};
          diem = onTapData.lyThuyet_onTap ?? "";
          ngayHienThi = onTapData.ngayKiemTra_onTap ?? "";
          thoiGianLamBai = onTapData.thoiGianLamBai_onTap ?? "";
        }

        return {
          docId: studentId,
          hoVaTen: studentData.hoVaTen || "",
          diem,
          diemTN,
          ngayHienThi,
          thoiGianLamBai,
          nhanXet,
        };
      });

      // Sắp xếp tên chuẩn Việt Nam: tên → tên đệm → họ
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
    if (!config?.hocKy) return;
    loadResults();
  }, [selectedLop, selectedMon, config?.hocKy, kieuHienThi]);


  // Xóa toàn bộ lớp
  const handleDeleteClass = () => {
    openConfirmDialog(
      "Xóa kết quả lớp",
      `⚠️ Bạn có chắc muốn xóa toàn bộ kết quả lớp ${selectedLop}?\nHành động này không thể hoàn tác!`,
      async () => {
        try {
          if (!selectedLop) {
            setSnackbarSeverity("warning");
            setSnackbarMessage("Vui lòng chọn lớp để xóa!");
            setSnackbarOpen(true);
            return;
          }

          // 1️⃣ Xóa trên giao diện ngay lập tức
          setResults([]);
          setSnackbarSeverity("success");
          setSnackbarMessage(`✅ Đã xóa kết quả lớp ${selectedLop}`);
          setSnackbarOpen(true);

          // 2️⃣ Xóa Firestore nền (không block UI)
          const classKey = selectedLop.replace(".", "_");
          const hsRef = collection(db, "DATA", classKey, "HOCSINH");
          const snapshot = await getDocs(hsRef);

          if (snapshot.empty) return; // Không có dữ liệu Firestore

          const subjectKey = selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";
          const hocKyMap = ["GKI", "CKI", "GKII", "CN"];
          const CHUNK_SIZE = 450;

          const updatesList = snapshot.docs.map(docSnap => {
            const studentId = docSnap.id;
            const studentData = docSnap.data();
            const updates = {};

            if (kieuHienThi === "KTĐK") {
              const ktdkData = studentData?.[subjectKey]?.ktdk || {};
              hocKyMap.forEach(hocKyCode => {
                if (ktdkData[hocKyCode]) {
                  updates[`${subjectKey}.ktdk.${hocKyCode}.lyThuyet`] = null;
                  updates[`${subjectKey}.ktdk.${hocKyCode}.lyThuyetPhanTram`] = null;
                  updates[`${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`] = null;
                  updates[`${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`] = null;
                  updates[`${subjectKey}.ktdk.${hocKyCode}.thucHanh`] = null;
                  updates[`${subjectKey}.ktdk.${hocKyCode}.tongCong`] = null;
                }
              });
            }

            return Object.keys(updates).length > 0
              ? { docRef: doc(db, "DATA", classKey, "HOCSINH", studentId), updates }
              : null;
          }).filter(Boolean);

          // Dùng batch chunk để tránh Firestore limit
          for (let i = 0; i < updatesList.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            updatesList.slice(i, i + CHUNK_SIZE).forEach(item => batch.update(item.docRef, item.updates));
            await batch.commit(); // Không block UI, vẫn chạy nền
          }

        } catch (err) {
          console.error("❌ Firestore: Xóa lớp thất bại:", err);
          setSnackbarSeverity("error");
          setSnackbarMessage("❌ Xóa lớp thất bại (FireStore)!");
          setSnackbarOpen(true);
        }
      }
    );
  };

  const handleDeleteSchool = () => {
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
          const hocKyList = ["GKI", "CKI", "GKII", "CN"];
          let totalUpdated = 0;
          const CHUNK_SIZE = 450; // tối đa 500 thao tác/batch, dùng 450 an toàn

          await Promise.all(
            classesList.map(async (lop) => {
              const classKey = lop.replace(".", "_");
              const hsRef = collection(db, "DATA", classKey, "HOCSINH");
              const snapshot = await getDocs(hsRef);

              if (snapshot.empty) return;

              const subjectKey = selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";
              const updatesList = snapshot.docs.map(docSnap => {
                const studentId = docSnap.id;
                const studentData = docSnap.data();
                const updates = {};

                if (kieuHienThi === "KTĐK") {
                  const ktdkData = studentData?.[subjectKey]?.ktdk || {};
                  hocKyList.forEach(hocKyCode => {
                    if (ktdkData[hocKyCode]) {
                      updates[`${subjectKey}.ktdk.${hocKyCode}.lyThuyet`] = null;
                      updates[`${subjectKey}.ktdk.${hocKyCode}.lyThuyetPhanTram`] = null;
                      updates[`${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`] = null;
                      updates[`${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`] = null;
                      updates[`${subjectKey}.ktdk.${hocKyCode}.thucHanh`] = null;
                      updates[`${subjectKey}.ktdk.${hocKyCode}.tongCong`] = null;
                    }
                  });
                }

                if (Object.keys(updates).length > 0) {
                  return { docRef: doc(db, "DATA", classKey, "HOCSINH", studentId), updates };
                }
                return null;
              }).filter(Boolean);

              // Chia thành chunk và commit song song
              for (let i = 0; i < updatesList.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                updatesList.slice(i, i + CHUNK_SIZE).forEach(item => batch.update(item.docRef, item.updates));
                await batch.commit();
                totalUpdated += updatesList.slice(i, i + CHUNK_SIZE).length;
              }
            })
          );

          if (totalUpdated > 0) {
            setResults([]);
            setSnackbarSeverity("success");
            setSnackbarMessage(`✅ Đã xóa toàn trường (${totalUpdated} học sinh)`);
          } else {
            setSnackbarSeverity("warning");
            setSnackbarMessage("Không có dữ liệu để xóa!");
          }
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

        exportKetQuaExcel(results, selectedLop, selectedMon, config.hocKy);

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
      <Paper sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 700, bgcolor: "white" }} elevation={6}>
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
            <TableContainer component={Paper} sx={{ boxShadow: "none", minWidth: 700 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 50 }}>STT</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 200 }}>Họ và tên</TableCell>

                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 70 }}>Điểm</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 70 }}>Thời gian</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 100 }}>Ngày</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(results.length > 0 ? results : Array.from({ length: 5 }, (_, i) => ({
                    stt: i + 1,
                    hoVaTen: "",
                    diem: "",
                    thoiGianLamBai: "",
                    ngayHienThi: ""
                  }))).map(r => (
                    <TableRow key={r.stt}>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)" }}>{r.stt}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "left", border: "1px solid rgba(0,0,0,0.12)" }}>{r.hoVaTen}</TableCell>

                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)", fontWeight: "bold" }}>{r.diem}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)" }}>{r.thoiGianLamBai}</TableCell>
                      <TableCell sx={{ px: 1, textAlign: "center", border: "1px solid rgba(0,0,0,0.12)" }}>{r.ngayHienThi}</TableCell>
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


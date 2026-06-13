import React, { useState, useEffect, useContext } from "react";

// ================= MUI =================
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

import { useNavigate } from "react-router-dom";
// ================= ICONS =================
import { Delete, FileDownload } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

import DeleteDataClassesDialog from "../dialog/DeleteDataClassesDialog";
import DeleteStudentConfirmDialog from "../dialog/DeleteStudentConfirmDialog";
import ConfirmExportExcelDialog from "../dialog/ConfirmExportExcelDialog";

// ================= FIREBASE =================
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  deleteDoc,
  updateDoc
} from "firebase/firestore";

// ================= CONTEXT =================
import { ConfigContext } from "../context/ConfigContext";

// ================= UTILS =================
import { exportKetQuaExcel } from "../utils/exportKetQuaExcel";
import { syncONTAPToDATA_ONTAP } from "../utils/syncONTAPToDATA_ONTAP";
import SyncIcon from "@mui/icons-material/Sync";

export default function TongHopKQ() {
  const navigate = useNavigate();
  // ================= CONTEXT =================
  const { config } = useContext(ConfigContext);
  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

  // ================= DATA STATE =================
  const [classesList, setClassesList] = useState([]);
  const [selectedLop, setSelectedLop] = useState("");
  const [selectedMon, setSelectedMon] = useState("Tin học");
  const [results, setResults] = useState([]);

  // ================= LOADING / ACTION =================
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ================= SNACKBAR =================
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // ================= DIALOG =================
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogContent, setDialogContent] = useState("");
  const [dialogAction, setDialogAction] = useState(null);
  const [dialogSeverity, setDialogSeverity] = useState("info");
  const [openExportDialog, setOpenExportDialog] = useState(false);

  // ================= VIEW MODE =================
  const [ExamType, setExamType] = useState("ktdk");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [openDeleteRow, setOpenDeleteRow] = useState(false);

  const circleIconStyle = {
    bgcolor: "white",
    boxShadow: 1,
    p: 0.5,              // 🔴 giảm padding
    width: 35,           // 🔴 kích thước vòng tròn
    height: 35,
    "& svg": {
      fontSize: 20,      // 🔴 giảm kích thước icon
    },
    "&:hover": {
      bgcolor: "primary.light",
      color: "white",
    },
  };

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snap = await getDoc(
          doc(db, "DANHSACH_LOP", namHocKey)
        );

        let classList = [];

        if (snap.exists()) {
          classList = (snap.data().list || []).sort((a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: "base",
            })
          );
        }

        setClassesList(classList);

        // chỉ set mặc định nếu chưa có lớp được chọn
        setSelectedLop((prev) => {
          if (prev) return prev;

          if (config?.lop && classList.includes(config.lop)) {
            return config.lop;
          }

          return classList[0] || "";
        });

      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách lớp:", err);
        setClassesList([]);
        setSelectedLop("");
      }
    };

    fetchClasses();
  }, [namHocKey, config?.lop]);

  // Load kết quả và sắp xếp tên chuẩn Việt Nam
  const hocKyMap = {
    "Giữa kỳ I": "GKI",
    "Cuối kỳ I": "CKI",
    "Giữa kỳ II": "GKII",
    "Cuối năm": "CN",
  };

  const loadResults = async () => {
    if (!selectedLop || !selectedMon || !config?.hocKy) return;

    setLoading(true);

    try {
      const classKey = selectedLop.replace(".", "_");
      const subjectKey = selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";
      const hocKyCode = hocKyMap[config.hocKy];
      const isOnTap = ExamType === "ontap";

      const colRef = collection(
        db,
        `DATA_${namHocKey}`,
        classKey,
        "HOCSINH"
      );

      const snapshot = await getDocs(colRef);

      if (snapshot.empty) {
        setResults([]);
        setSnackbarSeverity("warning");
        setSnackbarMessage(
          isOnTap
            ? `Không có dữ liệu ôn tập lớp ${selectedLop}`
            : `Không tìm thấy học sinh trong lớp ${selectedLop}`
        );
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      const data = snapshot.docs.map(docSnap => {
        const d = docSnap.data();

        // ================== LẤY NODE ==================
        let node = {};

        if (isOnTap) {
          node =
            d?.[subjectKey]?.ontap?.CN ||
            d?.ontap?.[subjectKey]?.CN ||
            {};
        } else {
          node = d?.[subjectKey]?.ktdk?.[hocKyCode] || {};
        }

        return {
          docId: docSnap.id,
          hoVaTen: d.hoVaTen || "",
          diem: node.lyThuyet ?? "",
          ngayHienThi: node.ngayLam ?? node.ngayKiemTra ?? "",
          soLanLam: node.soLanLam ?? "",
          thoiGianLamBai: node.thoiGianLamBai ?? "",
          phanTram: node.phanTram ?? "",
        };
      });

      // ================== SORT ==================
      const compareVietnameseName = (a, b) => {
        const namePartsA = (a.hoVaTen || "").trim().split(" ").reverse();
        const namePartsB = (b.hoVaTen || "").trim().split(" ").reverse();

        const len = Math.max(namePartsA.length, namePartsB.length);

        for (let i = 0; i < len; i++) {
          const cmp = (namePartsA[i] || "")
            .toLowerCase()
            .localeCompare((namePartsB[i] || "").toLowerCase());

          if (cmp !== 0) return cmp;
        }
        return 0;
      };

      data.sort(compareVietnameseName);

      setResults(
        data.map((item, idx) => ({
          stt: idx + 1,
          ...item,
        }))
      );
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
  }, [selectedLop, selectedMon, config?.hocKy, ExamType]);

  const handleResetStudent = async (student) => {
    if (!student) return;

    const classKey = selectedLop.replace(".", "_");
    const subjectKey = selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";
    const hocKyCode = hocKyMap?.[config?.hocKy];
    const isOnTap = ExamType === "ontap";

    const docRef = doc(
      db,
      `DATA_${namHocKey}`,
      classKey,
      "HOCSINH",
      student.docId
    );

    // ================= UI OPTIMISTIC =================
    setResults((prev) =>
      prev.map((r) =>
        r.docId === student.docId
          ? {
              ...r,
              diem: "",
              ngayHienThi: "",
              soLanLam: "",
              thoiGianLamBai: "",
              phanTram: "",
            }
          : r
      )
    );

    setSnackbarSeverity("success");
    setSnackbarMessage("🧹 Đã reset dữ liệu học sinh!");
    setSnackbarOpen(true);

    setOpenDeleteRow(false);
    setDeleteItem(null);

    // ================= FIRESTORE BATCH =================
    const batch = writeBatch(db);

    let updates = isOnTap
      ? {
          [`${subjectKey}.ontap.CN.lyThuyet`]: null,
          [`${subjectKey}.ontap.CN.ngayLam`]: "",
          [`${subjectKey}.ontap.CN.phanTram`]: null,
          [`${subjectKey}.ontap.CN.soLanLam`]: null,
          [`${subjectKey}.ontap.CN.thoiGianLamBai`]: "",
        }
      : {
          [`${subjectKey}.ktdk.${hocKyCode}.lyThuyet`]: null,
          [`${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`]: "",
          [`${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`]: "",
          [`${subjectKey}.ktdk.${hocKyCode}.mucDat`]: "",
          [`${subjectKey}.ktdk.${hocKyCode}.nhanXet`]: "",
          [`${subjectKey}.ktdk.${hocKyCode}.tongCong`]: null,
        };

    batch.update(docRef, updates);

    try {
      await batch.commit();
    } catch (err) {
      console.error("RESET FAIL:", err);

      setSnackbarSeverity("error");
      setSnackbarMessage("❌ Reset thất bại trên server!");
      setSnackbarOpen(true);
    }
  };

  //Xóa điểm nhiều lớp
  const handleResetMultipleClasses = async (selectedClasses) => {
    try {
      setResults([]);
      setSnackbarSeverity("success");
      setSnackbarMessage("🧹 Đang reset dữ liệu...");
      setSnackbarOpen(true);

      const subjectKey =
        selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";

      const hocKyCode = hocKyMap?.[config?.hocKy];

      if (!hocKyCode || !selectedClasses?.length) return;

      // =========================
      // 1. LOAD ALL CLASSES PARALLEL
      // =========================
      const classKeys = selectedClasses.map((lop) =>
        lop.replace(".", "_")
      );

      const snapshots = await Promise.all(
        classKeys.map((classKey) =>
          getDocs(
            collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH")
          )
        )
      );

      // =========================
      // 2. BUILD UPDATE TASKS
      // =========================
      const updatesTasks = [];

      snapshots.forEach((snapshot, index) => {
        const classKey = classKeys[index];

        snapshot.docs.forEach((docSnap) => {
          const docRef = doc(
            db,
            `DATA_${namHocKey}`,
            classKey,
            "HOCSINH",
            docSnap.id
          );

          const updates =
            ExamType === "ktdk"
              ? {
                  [`${subjectKey}.ktdk.${hocKyCode}.lyThuyet`]: null,
                  [`${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`]: "",
                  [`${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`]: "",
                  [`${subjectKey}.ktdk.${hocKyCode}.mucDat`]: "",
                  [`${subjectKey}.ktdk.${hocKyCode}.nhanXet`]: "",
                  [`${subjectKey}.ktdk.${hocKyCode}.tongCong`]: null,
                  [`${subjectKey}.ktdk.${hocKyCode}.thucHanh`]: null,
                }
              : {
                  [`${subjectKey}.ontap.CN.lyThuyet`]: null,
                  [`${subjectKey}.ontap.CN.ngayLam`]: "",
                  [`${subjectKey}.ontap.CN.phanTram`]: null,
                  [`${subjectKey}.ontap.CN.soLanLam`]: null,
                  [`${subjectKey}.ontap.CN.thoiGianLamBai`]: "",
                };

          updatesTasks.push({ docRef, updates });
        });
      });

      // =========================
      // 3. FIRESTORE BATCH PARALLEL
      // =========================
      const CHUNK_SIZE = 450;

      const commitTasks = [];

      for (let i = 0; i < updatesTasks.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);

        updatesTasks
          .slice(i, i + CHUNK_SIZE)
          .forEach(({ docRef, updates }) => {
            batch.update(docRef, updates);
          });

        commitTasks.push(batch.commit());
      }

      await Promise.all(commitTasks);

      // =========================
      // 4. DONE
      // =========================
      setSnackbarSeverity("success");
      setSnackbarMessage("✅ Reset dữ liệu hoàn tất!");
      setSnackbarOpen(true);

    } catch (err) {
      console.error("RESET MULTI FAIL:", err);

      setSnackbarSeverity("error");
      setSnackbarMessage("❌ Reset dữ liệu thất bại!");
      setSnackbarOpen(true);
    }
  };

  /*const syncOntapAllClasses = async () => {
    const hocKy = "CN"; // ⭐ cố định Cuối năm

    const classList = [
      "4_1","4_2","4_3","4_4","4_5","4_6",
      "5_1","5_2","5_3","5_4"
    ];

    try {
      await Promise.all(
        classList.map(async (classKey) => {
          const colRef = collection(
            db,
            `DATA_ONTAP_${namHocKey}`,
            classKey,
            "HOCSINH"
          );

          const snapshot = await getDocs(colRef);
          if (snapshot.empty) return;

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            const congNghe = data?.subjects?.CongNghe;
            const tinHoc = data?.subjects?.TinHoc;

            if (!congNghe && !tinHoc) return;

            const studentRef = doc(
              db,
              `DATA_${namHocKey}`,
              classKey,
              "HOCSINH",
              docSnap.id
            );

            const updateData = {};

            // ================= CÔNG NGHỆ =================
            if (congNghe) {
              updateData["CongNghe.ontap.CN"] = {
                lyThuyet: congNghe.lyThuyet ?? null,
                ngayLam: congNghe.ngayLam ?? null,
                phanTram: congNghe.phanTram ?? null,
                soLanLam: congNghe.soLanLam ?? null,
                thoiGianLamBai: congNghe.thoiGianLamBai ?? null,
              };
            }

            // ================= TIN HỌC =================
            if (tinHoc) {
              updateData["TinHoc.ontap.CN"] = {
                lyThuyet: tinHoc.lyThuyet ?? null,
                ngayLam: tinHoc.ngayLam ?? null,
                phanTram: tinHoc.phanTram ?? null,
                soLanLam: tinHoc.soLanLam ?? null,
                thoiGianLamBai: tinHoc.thoiGianLamBai ?? null,
              };
            }

            return updateDoc(studentRef, updateData);
          });
        })
      );

      console.log("🎉 Sync ôn tập CN hoàn tất!");
    } catch (err) {
      console.error("❌ Lỗi sync ôn tập:", err);
    }
  };*/

  // Xuất Excel
  const handleExportExcel = () => {
      setOpenExportDialog(true);
    };

    const handleConfirmExport = () => {
    setOpenExportDialog(false);

    if (!results || results.length === 0) {
      setSnackbarSeverity("error");
      setSnackbarMessage("Không có dữ liệu để xuất Excel!");
      setSnackbarOpen(true);
      return;
    }

    exportKetQuaExcel(
      results,
      selectedLop,
      selectedMon,
      config.hocKy
    );

    setSnackbarSeverity("success");
    setSnackbarMessage("✅ Xuất file Excel thành công!");
    setSnackbarOpen(true);
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
      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          width: "100%",
          maxWidth: 800,
          bgcolor: "white",
          position: "relative", // ⭐ BẮT BUỘC
        }}
        elevation={6}
      >
        <IconButton
          onClick={() => navigate("/dashboard")}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "#64748b",
            backgroundColor: "#f1f5f9",
            "&:hover": {
              backgroundColor: "#e2e8f0",
              color: "#ef4444",
            },
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          sx={{
            position: "relative",
            mb: 2,
          }}
        >
          {/* ICONS – luôn căn trái */}
          <Box sx={{ display:"flex", alignItems:"center", mt:-2, ml:-2 }}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Xuất Excel">
                <IconButton
                  onClick={handleExportExcel}
                  sx={{
                    ...circleIconStyle,
                    color: "primary.main",
                  }}
                >
                  <FileDownload />
                </IconButton>
              </Tooltip>

              <Tooltip title="Xóa lớp">
                <IconButton
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{
                    ...circleIconStyle,
                    color: "error.main",
                    "&:hover": {
                      bgcolor: "error.main",
                      color: "white",
                    },
                  }}
                >
                  <Delete />
                </IconButton>
              </Tooltip>

              {/*<Tooltip title="Đồng bộ ONTAP → DATA_ONTAP">
                <IconButton
                  onClick={async () => {
                    try {
                      await syncONTAPToDATA_ONTAP({
                        db,
                      });

                      alert("✅ Đồng bộ thành công!");
                    } catch (err) {
                      console.error(err);
                      alert("❌ Đồng bộ thất bại!");
                    }
                  }}
                  sx={{
                    ...circleIconStyle,
                    color: "#1976d2",
                    "&:hover": {
                      bgcolor: "#1976d2",
                      color: "white",
                    },
                  }}
                >
                  <SyncIcon />
                </IconButton>
              </Tooltip>*/}

              {/*<Tooltip title="Đồng bộ ONTAP → DATA_...">
                <IconButton
                  onClick={async () => {
                    try {
                      await syncOntapAllClasses({
                        db,
                      });

                      alert("✅ Đồng bộ thành công!");
                    } catch (err) {
                      console.error(err);
                      alert("❌ Đồng bộ thất bại!");
                    }
                  }}
                  sx={{
                    ...circleIconStyle,
                    color: "#1976d2",
                    "&:hover": {
                      bgcolor: "#1976d2",
                      color: "white",
                    },
                  }}
                >
                  <SyncIcon />
                </IconButton>
              </Tooltip>*/}
            </Stack>
          </Box>

          {/* TIÊU ĐỀ */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 1,          
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{
                color: "#1976d2",
                mt: 1,
                textAlign: "center",
              }}
            >
              KẾT QUẢ KIỂM TRA
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 3,
            justifyContent: "center",
            flexWrap: "nowrap",
            overflowX: "auto",
            paddingTop: 1, 
            "&::-webkit-scrollbar": {
              display: "none",
            },
            scrollbarWidth: "none",
          }}
        >
          <TextField
            select
            label="Lớp"
            value={selectedLop}
            onChange={(e) => setSelectedLop(e.target.value)}
            size="small"
            sx={{ width: 80, flexShrink: 0 }}
          >
            {classesList.map((lop) => (
              <MenuItem key={lop} value={lop}>
                {lop}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Môn"
            value={selectedMon}
            onChange={(e) => setSelectedMon(e.target.value)}
            size="small"
            sx={{ width: 130, flexShrink: 0 }}
          >
            {["Tin học", "Công nghệ"].map((mon) => (
              <MenuItem key={mon} value={mon}>
                {mon}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Loại"
            value={ExamType}
            onChange={(e) => setExamType(e.target.value)}
            size="small"
            sx={{ width: 120, flexShrink: 0 }}
          >
            <MenuItem value="ktdk">KTĐK</MenuItem>
            <MenuItem value="ontap">Ôn tập</MenuItem>
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
                    {ExamType === "ontap" && ( // ⭐ thêm điều kiện
                      <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 80 }}>
                        Số lần
                      </TableCell>
                    )}
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 70 }}>Thời gian</TableCell>
                    <TableCell sx={{ bgcolor: "#1976d2", color: "#fff", textAlign: "center", width: 100 }}>Ngày</TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "#1976d2",
                        color: "#fff",
                        textAlign: "center",
                        width: 40,
                      }}
                    >
                      Xóa
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const filtered = results.filter(
                      r => r.diem !== "" && r.diem !== null && r.diem !== undefined
                    );

                    const displayData =
                      filtered.length > 0
                        ? filtered.map((item, idx) => ({
                            ...item,
                            stt: idx + 1, // ✅ đánh lại STT sau khi lọc
                          }))
                        : Array.from({ length: 5 }, (_, i) => ({
                            stt: i + 1,
                            hoVaTen: "",
                            diem: "",
                            soLanLam: "",
                            thoiGianLamBai: "",
                            ngayHienThi: "",
                          }));

                    return displayData.map((r) => {
                      const hasData =
                        r.diem !== "" &&
                        r.diem !== null &&
                        r.diem !== undefined;

                      return (
                        <TableRow
                          key={r.docId}
                          onMouseEnter={() => hasData && setHoverRow(r.docId)}
                          onMouseLeave={() => setHoverRow(null)}
                          sx={{
                            cursor: hasData ? "pointer" : "default",
                            transition: "background-color 0.2s",
                            backgroundColor:
                              hasData && hoverRow === r.docId
                                ? "rgba(0,0,0,0.04)"
                                : "transparent",
                          }}
                        >
                          <TableCell
                            sx={{
                              px: 1,
                              textAlign: "center",
                              border: "1px solid rgba(0,0,0,0.12)",
                            }}
                          >
                            {r.stt}
                          </TableCell>

                          <TableCell
                            sx={{
                              px: 1,
                              textAlign: "left",
                              border: "1px solid rgba(0,0,0,0.12)",
                            }}
                          >
                            {r.hoVaTen?.toUpperCase()}
                          </TableCell>

                          <TableCell
                            sx={{
                              px: 1,
                              textAlign: "center",
                              border: "1px solid rgba(0,0,0,0.12)",
                              fontWeight: "bold",
                            }}
                          >
                            {r.diem}
                          </TableCell>

                          {ExamType === "ontap" && (
                            <TableCell
                              sx={{
                                px: 1,
                                textAlign: "center",
                                border: "1px solid rgba(151, 127, 127, 0.12)",
                              }}
                            >
                              {r.soLanLam}
                            </TableCell>
                          )}

                          <TableCell
                            sx={{
                              px: 1,
                              textAlign: "center",
                              border: "1px solid rgba(0,0,0,0.12)",
                            }}
                          >
                            {r.thoiGianLamBai}
                          </TableCell>

                          <TableCell
                            sx={{
                              px: 1,
                              textAlign: "center",
                              border: "1px solid rgba(0,0,0,0.12)",
                            }}
                          >
                            {r.ngayHienThi}
                          </TableCell>

                          {/* CỘT XÓA */}
                          <TableCell
                            sx={{
                              width: 40,
                              textAlign: "center",
                              border: "1px solid rgba(0,0,0,0.12)",
                            }}
                          >
                            {hasData && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setDeleteItem({
                                    docId: r.docId,
                                    hoVaTen: r.hoVaTen,
                                  });
                                  setOpenDeleteRow(true);
                                }}
                                sx={{
                                  opacity: hoverRow === r.docId ? 1 : 0,
                                  transition: "0.2s",
                                  color: "error.main",
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
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

        <ConfirmExportExcelDialog
          open={openExportDialog}
          title="Xuất Excel"
          content={`Bạn có muốn xuất kết quả lớp ${selectedLop} ra file Excel không?`}
          onClose={() => setOpenExportDialog(false)}
          onConfirm={handleConfirmExport}
        />
      
        <DeleteDataClassesDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          classesList={classesList}
          selectedLop={selectedLop}
          hocKi={config?.hocKy}
          setHocKi={() => {}}
          examType={ExamType}
          onConfirmDelete={async (selectedClasses) => {
            setDeleteDialogOpen(false);

            if (!selectedClasses || selectedClasses.length === 0) return;

            // 👉 gọi hàm xóa mới
            await handleResetMultipleClasses(selectedClasses);
          }}
        />

        <DeleteStudentConfirmDialog
          open={openDeleteRow}
          student={deleteItem}
          onClose={() => {
            setOpenDeleteRow(false);
            setDeleteItem(null);
          }}
          onConfirm={handleResetStudent}
        />

      </Paper>
    </Box>
  );
}


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
        const snapshot = await getDocs(collection(db, `DANHSACH_${namHocKey}`));
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
    "Cuối năm": "CN",
  };

  const loadResults = async () => {
    if (!selectedLop || !selectedMon || !config?.hocKy) return;
    setLoading(true);

    try {
      const subjectKey = selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";
      const hocKyCode = hocKyMap[config.hocKy];

      // ================== ÔN TẬP ==================
      if (ExamType === "ontap") {
        const subjectKey =
          selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";
        
        const classKey = selectedLop.replace(".", "_"); // ⭐ FIX 4.1 → 4_1

        const colRef = collection(
          db,
          `DATA_ONTAP_${namHocKey}`,
          classKey,
          "HOCSINH"
        );

        const snapshot = await getDocs(colRef);

        if (snapshot.empty) {
          setResults([]);
          setSnackbarSeverity("warning");
          setSnackbarMessage(`Không có dữ liệu ôn tập lớp ${selectedLop}`);
          setSnackbarOpen(true);
          setLoading(false);
          return;
        }

        const data = snapshot.docs.map(docSnap => {
          const d = docSnap.data();

          // ✅ HỖ TRỢ CẢ DATA MỚI + CŨ
          const subjectData = d?.subjects?.[subjectKey] || {};
          return {
            docId: docSnap.id,
            hoVaTen: d.hoVaTen || "",
            diem: subjectData.lyThuyet ?? "",
            soLanLam: subjectData.soLanLam ?? "",
            ngayHienThi: subjectData.ngayLam ?? "",
            thoiGianLamBai: subjectData.thoiGianLamBai ?? "",
          };
        });

        // sort tên chuẩn VN
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

        const numberedData = data.map((item, idx) => ({
          stt: idx + 1,
          ...item,
        }));

        setResults(numberedData);
        setLoading(false);
        return;
      }

      // ================== KTĐK ==================
      const classKey = selectedLop.replace(".", "_");
      const colRef = collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH");
      const snapshot = await getDocs(colRef);

      if (snapshot.empty) {
        setResults([]);
        setSnackbarSeverity("warning");
        setSnackbarMessage(`Không tìm thấy học sinh trong lớp ${selectedLop}`);
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      const data = snapshot.docs.map(docSnap => {
        const studentData = docSnap.data();
        const studentId = docSnap.id;

        const ktdkData = studentData?.[subjectKey]?.ktdk?.[hocKyCode] || {};

        return {
          docId: studentId,
          hoVaTen: studentData.hoVaTen || "",
          diem: ktdkData.lyThuyet ?? "",
          ngayHienThi: ktdkData.ngayKiemTra ?? "",
          thoiGianLamBai: ktdkData.thoiGianLamBai ?? "",
        };
      });

      // sort tên
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

      const numberedData = data.map((item, idx) => ({
        stt: idx + 1,
        ...item,
      }));

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
  }, [selectedLop, selectedMon, config?.hocKy, ExamType]);

  //Xóa nhiều lớp
  const handleDeleteMultipleClasses = async (selectedClasses) => {
    try {
      const CHUNK_SIZE = 450;

      setResults([]);

      const subjectKey =
        selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";

      const hocKyCode = hocKyMap[config.hocKy];

      if (!hocKyCode) {
        return;
      }

      // ================== ÔN TẬP ==================
      if (ExamType === "ontap") {
        const subjectKey =
          selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";

        const colRef = collection(
          db,
          `DATA_ONTAP_${namHocKey}`,
          selectedLop,
          "HOCSINH"
        );

        const snapshot = await getDocs(colRef);

        if (snapshot.empty) {
          setResults([]);
          setSnackbarSeverity("warning");
          setSnackbarMessage(`Không có dữ liệu ôn tập lớp ${selectedLop}`);
          setSnackbarOpen(true);
          setLoading(false);
          return;
        }

        const data = snapshot.docs.map(docSnap => {
          const d = docSnap.data();
          const subjectData = d?.subjects?.[subjectKey] || {};

          return {
            docId: docSnap.id,
            hoVaTen: d.hoVaTen || "",
            diem: subjectData.lyThuyet ?? "",
            soLanLam: subjectData.soLanLam ?? "",
            ngayHienThi: subjectData.ngayLam ?? "",
            thoiGianLamBai: subjectData.thoiGianLamBai ?? "",
          };
        });

        setResults(data);
        setLoading(false);
        return;
      }

      // =====================
      // KTĐK
      // =====================
      await Promise.all(
        selectedClasses.map(async (lop) => {
          const classKey = lop.replace(".", "_");

          const hsRef = collection(
            db,
            `DATA_${namHocKey}`,
            classKey,
            "HOCSINH"
          );

          const snapshot = await getDocs(hsRef);

          if (snapshot.empty) {
            return;
          }

          const updatesList = snapshot.docs
            .map((docSnap) => {
              const studentId = docSnap.id;
              const studentData = docSnap.data();

              const ktdkPath =
                studentData?.[subjectKey]?.ktdk?.[hocKyCode];

              if (!ktdkPath) {
                return null;
              }

              const updates = {
                [`${subjectKey}.ktdk.${hocKyCode}.lyThuyet`]: null,
                [`${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`]: null,
                [`${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`]: null,
                [`${subjectKey}.ktdk.${hocKyCode}.thucHanh`]: null,
                [`${subjectKey}.ktdk.${hocKyCode}.tongCong`]: null,
              };

              return {
                docRef: doc(
                  db,
                  `DATA_${namHocKey}`,
                  classKey,
                  "HOCSINH",
                  studentId
                ),
                updates,
              };
            })
            .filter(Boolean);

          if (updatesList.length === 0) {
            return;
          }

          for (let i = 0; i < updatesList.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);

            const chunk = updatesList.slice(i, i + CHUNK_SIZE);

            chunk.forEach(item => {
              batch.update(item.docRef, item.updates);
            });

            await batch.commit();
          }
        })
      );
      setSnackbarSeverity("success");
      setSnackbarMessage("Xóa dữ liệu thành công");
      setSnackbarOpen(true);
    } catch (err) {
    }
  };
  // Xóa toàn bộ lớp
  const handleDeleteClass = () => {
    openConfirmDialog(
      "Xóa kết quả lớp",
      `⚠️ Bạn có chắc muốn xóa toàn bộ kết quả lớp ${selectedLop}?\nHành động này không thể hoàn tác!`,
      () => {
        if (!selectedLop) {
          setSnackbarSeverity("warning");
          setSnackbarMessage("Vui lòng chọn lớp để xóa!");
          setSnackbarOpen(true);
          return;
        }

        // Xóa UI ngay
        setResults([]);

        // Đóng dialog ngay
        closeConfirmDialog?.();

        // Báo thành công ngay
        //setSnackbarSeverity("success");
        //setSnackbarMessage(`Đã xóa kết quả lớp ${selectedLop}`);
        //setSnackbarOpen(true);

        // Firestore chạy nền
        (async () => {
          try {
            const CHUNK_SIZE = 450;

            if (ExamType === "ontap") {
              const ontapRef = collection(
                db,
                `DATA_ONTAP_${namHocKey}`,
                config.hocKy,
                selectedLop
              );

              const ontapSnap = await getDocs(ontapRef);

              for (let i = 0; i < ontapSnap.docs.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);

                ontapSnap.docs
                  .slice(i, i + CHUNK_SIZE)
                  .forEach(docSnap => batch.delete(docSnap.ref));

                await batch.commit();
              }

              return;
            }

            const classKey = selectedLop.replace(".", "_");

            const hsRef = collection(
              db,
              `DATA_${namHocKey}`,
              classKey,
              "HOCSINH"
            );

            const snapshot = await getDocs(hsRef);

            if (snapshot.empty) return;

            const subjectKey =
              selectedMon === "Công nghệ"
                ? "CongNghe"
                : "TinHoc";

            const hocKyList = ["GKI", "CKI", "GKII", "CN"];

            const updatesList = snapshot.docs
              .map(docSnap => {
                const studentData = docSnap.data();
                const updates = {};

                hocKyList.forEach(hocKyCode => {
                  if (
                    studentData?.[subjectKey]?.ktdk?.[hocKyCode]
                  ) {
                    updates[`${subjectKey}.ktdk.${hocKyCode}.lyThuyet`] = null;
                    updates[`${subjectKey}.ktdk.${hocKyCode}.lyThuyetPhanTram`] = null;
                    updates[`${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`] = null;
                    updates[`${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`] = null;
                    updates[`${subjectKey}.ktdk.${hocKyCode}.thucHanh`] = null;
                    updates[`${subjectKey}.ktdk.${hocKyCode}.tongCong`] = null;
                  }
                });

                return Object.keys(updates).length
                  ? {
                      docRef: doc(
                        db,
                        `DATA_${namHocKey}`,
                        classKey,
                        "HOCSINH",
                        docSnap.id
                      ),
                      updates,
                    }
                  : null;
              })
              .filter(Boolean);

            for (let i = 0; i < updatesList.length; i += CHUNK_SIZE) {
              const batch = writeBatch(db);

              updatesList
                .slice(i, i + CHUNK_SIZE)
                .forEach(item =>
                  batch.update(item.docRef, item.updates)
                );

              await batch.commit();
            }
          } catch (err) {
            console.error(err);

            setSnackbarSeverity("error");
            setSnackbarMessage("Xóa dữ liệu thất bại");
            setSnackbarOpen(true);
          }
        })();
      }
    );
  };

  /*const handleDeleteSchool = () => {
    if (!classesList || classesList.length === 0) {
      setSnackbarSeverity("warning");
      setSnackbarMessage("Không có lớp nào để xóa!");
      setSnackbarOpen(true);
      return;
    }

    openConfirmDialog(
      "Xóa toàn trường",
      `⚠️ Bạn có chắc muốn xóa kết quả ${
        ExamType === "ktdk" ? "KIỂM TRA ĐỊNH KỲ" : "ÔN TẬP"
      } của toàn trường?\nHành động này không thể hoàn tác!`,
      async () => {
        try {
          const hocKyList = ["GKI", "CKI", "GKII", "CN"];
          let totalUpdated = 0;
          const CHUNK_SIZE = 450;

          // ===== ÔN TẬP =====
          if (ExamType === "ontap") {
            await Promise.all(
              classesList.map(async (lop) => {
                const ontapRef = collection(
                  db,
                  `DATA_ONTAP_${namHocKey}`,
                  config.hocKy,
                  lop
                );

                const snapshot = await getDocs(ontapRef);

                if (snapshot.empty) return;

                for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
                  const batch = writeBatch(db);

                  snapshot.docs
                    .slice(i, i + CHUNK_SIZE)
                    .forEach(docSnap => batch.delete(docSnap.ref));

                  await batch.commit();
                  totalUpdated += snapshot.docs.slice(i, i + CHUNK_SIZE).length;
                }
              })
            );

            if (totalUpdated > 0) {
              setResults([]);
              setSnackbarSeverity("success");
              setSnackbarMessage(
                `✅ Đã xóa toàn trường (${totalUpdated} học sinh)`
              );
            } else {
              setSnackbarSeverity("warning");
              setSnackbarMessage("Không có dữ liệu để xóa!");
            }

            setSnackbarOpen(true);
            return;
          }

          // ===== KTĐK (giữ nguyên code cũ) =====
          await Promise.all(
            classesList.map(async (lop) => {
              const classKey = lop.replace(".", "_");
              const hsRef = collection(
                db,
                `DATA_${namHocKey}`,
                classKey,
                "HOCSINH"
              );

              const snapshot = await getDocs(hsRef);

              if (snapshot.empty) return;

              const subjectKey =
                selectedMon === "Công nghệ" ? "CongNghe" : "TinHoc";

              const updatesList = snapshot.docs
                .map(docSnap => {
                  const studentId = docSnap.id;
                  const studentData = docSnap.data();
                  const updates = {};

                  if (ExamType === "ktdk") {
                    const ktdkData = studentData?.[subjectKey]?.ktdk || {};

                    hocKyList.forEach(hocKyCode => {
                      if (ktdkData[hocKyCode]) {
                        updates[
                          `${subjectKey}.ktdk.${hocKyCode}.lyThuyet`
                        ] = null;
                        updates[
                          `${subjectKey}.ktdk.${hocKyCode}.lyThuyetPhanTram`
                        ] = null;
                        updates[
                          `${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`
                        ] = null;
                        updates[
                          `${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`
                        ] = null;
                        updates[
                          `${subjectKey}.ktdk.${hocKyCode}.thucHanh`
                        ] = null;
                        updates[
                          `${subjectKey}.ktdk.${hocKyCode}.tongCong`
                        ] = null;
                      }
                    });
                  }

                  if (Object.keys(updates).length > 0) {
                    return {
                      docRef: doc(
                        db,
                        `DATA_${namHocKey}`,
                        classKey,
                        "HOCSINH",
                        studentId
                      ),
                      updates,
                    };
                  }

                  return null;
                })
                .filter(Boolean);

              for (let i = 0; i < updatesList.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);

                updatesList
                  .slice(i, i + CHUNK_SIZE)
                  .forEach(item =>
                    batch.update(item.docRef, item.updates)
                  );

                await batch.commit();
                totalUpdated +=
                  updatesList.slice(i, i + CHUNK_SIZE).length;
              }
            })
          );

          if (totalUpdated > 0) {
            setResults([]);
            setSnackbarSeverity("success");
            setSnackbarMessage(
              `✅ Đã xóa toàn trường (${totalUpdated} học sinh)`
            );
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
  };*/

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

  const handleDeleteRow = async (student) => {
    if (!student) return;

    try {
      const classKey = selectedLop.replace(".", "_");

      const batchDeletes = [];

      // ======================
      // 1. KTĐK
      // ======================
      if (ExamType === "ktdk") {
        const docRef = doc(
          db,
          `DATA_${namHocKey}`,
          classKey,
          "HOCSINH",
          student.docId
        );

        batchDeletes.push(deleteDoc(docRef));
      }

      // ======================
      // 2. ÔN TẬP
      // ======================
      if (ExamType === "ontap") {
        const docRef = doc(
          db,
          `DATA_ONTAP_${namHocKey}`,
          classKey,
          "HOCSINH",
          student.docId
        );

        batchDeletes.push(deleteDoc(docRef));
      }

      await Promise.all(batchDeletes);

      // update UI
      setResults(prev =>
        prev
          .filter(r => r.docId !== student.docId)
          .map((r, i) => ({ ...r, stt: i + 1 }))
      );

      setOpenDeleteRow(false);
      setDeleteItem(null);

      setSnackbarSeverity("success");
      setSnackbarMessage("🗑️ Đã xóa học sinh!");
      setSnackbarOpen(true);

    } catch (err) {
      console.error(err);

      setSnackbarSeverity("error");
      setSnackbarMessage("❌ Xóa thất bại!");
      setSnackbarOpen(true);
    }
  };

  const syncOntapAllClasses = async () => {
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

              <Tooltip title="Đồng bộ ONTAP → DATA_...">
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
              </Tooltip>
            </Stack>
          </Box>

          {/* TIÊU ĐỀ */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 3,          
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
            await handleDeleteMultipleClasses(selectedClasses);
          }}
        />

        <DeleteStudentConfirmDialog
          open={openDeleteRow}
          student={deleteItem}
          onClose={() => {
            setOpenDeleteRow(false);
            setDeleteItem(null);
          }}
          onConfirm={handleDeleteRow}
        />

      </Paper>
    </Box>
  );
}


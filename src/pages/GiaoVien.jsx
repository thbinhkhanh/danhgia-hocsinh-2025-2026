import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Box,
  Typography,
  MenuItem,
  Select,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Stack,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteField, onSnapshot, FieldPath } from "firebase/firestore";

import Draggable from "react-draggable";
import { useTheme, useMediaQuery } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DanhGiaGVDialog from "../dialog/DanhGiaGVDialog";
import StatusResultDialogGV from "../dialog/StatusResultDialogGV";
import ConfirmDeleteCoreDialog from "../dialog/ConfirmDeleteCoreDialog";
import GroupIcon from "@mui/icons-material/Group";
import HistoryIcon from "@mui/icons-material/History";
import GroupsIcon from "@mui/icons-material/Groups";

export default function GiaoVien() {
  const navigate = useNavigate();
  const { studentData, setStudentData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);
  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

  // Local state
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentStatus, setStudentStatus] = useState({});
  const [studentScores, setStudentScores] = useState({}); // 👈 thêm dòng này
  
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [selectedForDanhGia, setSelectedForDanhGia] = useState(null); 

  const [studentForDanhGia, setStudentForDanhGia] = useState(null);
  const [studentForTracNghiem, setStudentForTracNghiem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  // ref cho dialog draggable
  const dialogNodeRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [recentStudents, setRecentStudents] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const selectedClass = config?.lop;

  const [doneStudent, setDoneStudent] = useState(null);
  const [openDoneDialog, setOpenDoneDialog] = useState(false);

  function PaperComponent(props) {
    if (isMobile) return <Paper {...props} />;
    return (
      <Draggable
        nodeRef={dialogNodeRef}
        handle="#draggable-dialog-title"
        cancel={'[class*="MuiDialogContent-root"]'}
      >
        <Paper ref={dialogNodeRef} {...props} />
      </Draggable>
    );
  }

  // Hàm gộp cập nhật config + Firestore
  const updateConfig = async (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig); // cập nhật React context
    try {
      await setDoc(doc(db, "CONFIG", "config"), { [field]: value }, { merge: true });
    } catch (err) {
      console.error(`❌ Lỗi cập nhật ${field}:`, err);
    }
  };

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // document DANHSACH_LOP/{2025_2026}
        const lopRef = doc(db, "DANHSACH_LOP", namHocKey);
        const lopSnap = await getDoc(lopRef);

        let classList = [];

        if (lopSnap.exists()) {
          classList = (lopSnap.data().list || []).sort((a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: "base",
            })
          );
        }

        setClasses(classList);
        setClassData(classList);

        // nếu chưa có lớp đang chọn hoặc lớp hiện tại không còn tồn tại
        if (
          classList.length > 0 &&
          (!config.lop || !classList.includes(config.lop))
        ) {
          updateConfig("lop", classList[0]);
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
      }
    };

    fetchClasses();
  }, [namHocKey]);

  useEffect(() => {
    if (!config.lop) return;

    const key = `recentGV_${config.lop}`;
    const stored = JSON.parse(localStorage.getItem(key) || "[]");

    setRecentStudents(stored);
  }, [config.lop]);

  const saveRecentStudent = (student) => {
    if (!config.lop) return;

    const key = `recentGV_${config.lop}`;

    setRecentStudents(prev => {
      const updated = [
        student,
        ...prev.filter(s => s.maDinhDanh !== student.maDinhDanh),
      ].slice(0, 10);

      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  // Lấy danh sách học sinh khi đổi lớp
  useEffect(() => {
    const selectedClass = config.lop;
    if (!selectedClass) return;

    const cached = studentData[selectedClass];
    if (cached?.length > 0) {
      setStudents(cached);
      return;
    }

    const fetchStudents = async () => {
      try {
        const classKey = selectedClass.replace(/\./g, "_");

        // DATA_2025_2026 / 4_1 / HOCSINH
        const snapshot = await getDocs(
          collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH")
        );

        const list = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();

            return {
              maDinhDanh: docSnap.id,
              hoVaTen: data.hoVaTen || "",
            };
          })
          .sort((a, b) =>
            a.hoVaTen
              .split(" ")
              .slice(-1)[0]
              .localeCompare(
                b.hoVaTen.split(" ").slice(-1)[0],
                "vi"
              )
          )
          .map((s, i) => ({
            ...s,
            stt: i + 1,
          }));

        setStudents(list);
        setStudentData((prev) => ({
          ...prev,
          [selectedClass]: list,
        }));

        console.log(
          `✅ Lấy ${list.length} học sinh từ DATA_${namHocKey}/${classKey}/HOCSINH`
        );
      } catch (err) {
        console.error("❌ Lỗi lấy học sinh:", err);
        setStudents([]);
      }
    };

    fetchStudents();
  }, [config.lop]);

  const convertPercentToScore = (percent) => {
    if (percent === undefined || percent === null) return "?";

    const raw = percent / 10;
    const decimal = raw % 1;

    let rounded;
    if (decimal < 0.25) rounded = Math.floor(raw);
    else if (decimal < 0.75) rounded = Math.floor(raw) + 0.5;
    else rounded = Math.ceil(raw);

    return rounded;
  };

  // Lắng nghe realtime trạng thái đánh giá
  useEffect(() => {
    const { lop, tuan, mon, kiemTraDinhKi, hocKy, baiTapTuan } = config;
    if (!lop || (!tuan && !kiemTraDinhKi) || !mon) return;

    const classKey = lop.replace(".", "_");
    const subjectKey = mon === "Công nghệ" ? "CongNghe" : "TinHoc";
    const classRef = collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH");

    const unsubscribe = onSnapshot(classRef, snapshot => {
      const updatedStatus = {};
      const scores = {};

      snapshot.forEach(docSnap => {
        const studentId = docSnap.id;
        const studentInfo = docSnap.data();

        let status = "";

        if (baiTapTuan) {
          const TN_diem =
            studentInfo?.[subjectKey]?.dgtx?.[`tuan_${tuan}`]?.TN_diem ?? null;
          const TN_status =
            studentInfo?.[subjectKey]?.dgtx?.[`tuan_${tuan}`]?.TN_status || "";

          scores[studentId] = { TN_diem, TN_status };
        }

        // ✅ SỬA Ở ĐÂY
        else if (kiemTraDinhKi) {
          const hocKyMap = {
            "Giữa kỳ I": "GKI",
            "Cuối kỳ I": "CKI",
            "Giữa kỳ II": "GKII",
            "Cuối năm": "CN",
          };

          const hocKyCode = hocKyMap[hocKy];

          const ktdk =
            studentInfo?.[subjectKey]?.ktdk?.[hocKyCode] || {};

          scores[studentId] = {
            lyThuyet: ktdk.lyThuyet ?? null,
            lyThuyetPhanTram: ktdk.lyThuyetPhanTram ?? null,
            nhanXet: ktdk.nhanXet || "",
          };
        }

        else {
          status =
            studentInfo?.[subjectKey]?.dgtx?.[`tuan_${tuan}`]?.status || "";
        }

        updatedStatus[studentId] = status;
      });

      setStudentStatus(updatedStatus);
      setStudentScores(scores);
    });

    return () => unsubscribe();
  }, [config.lop, config.tuan, config.mon, config.kiemTraDinhKi, config.hocKy, config.baiTapTuan]);

  // hàm lưu status
  const saveStudentStatus = async (studentId, status) => {
    const { lop, tuan, mon } = config; // lấy từ context
    if (!lop || !tuan) return; // đảm bảo có lớp và tuần

    try {
      const classKey = lop.replace(".", "_");
      const subjectKey = mon === "Công nghệ" ? "CongNghe" : "TinHoc";

      // Document học sinh trong DATA
      const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", studentId);

      // Path tới tuần cần lưu trạng thái
      const tuanField = `${subjectKey}.dgtx.tuan_${tuan}.status`;

      // Cập nhật status
      await updateDoc(hsRef, { [tuanField]: status }).catch(async (err) => {
        if (err.code === "not-found") {
          // Nếu chưa có document học sinh, tạo mới với status
          await setDoc(
            hsRef,
            {
              [subjectKey]: {
                dgtx: {
                  [`tuan_${tuan}`]: { status },
                },
              },
            },
            { merge: true }
          );
        } else {
          throw err;
        }
      });
    } catch (err) {
      console.error("❌ Lỗi khi lưu trạng thái học sinh vào DATA:", err);
    }
  };

// 🔹 Hàm thay đổi trạng thái khi click nút trong UI
const handleStatusChange = (maDinhDanh, status) => {
  if (!config.lop || !config.tuan) return; // đảm bảo có lớp và tuần

  setStudentStatus((prev) => {
    const updated = { ...prev };
    // Nếu click lại cùng trạng thái thì hủy
    const newStatus = prev[maDinhDanh] === status ? "" : status;
    updated[maDinhDanh] = newStatus;

    // Lưu status vào Firestore
    saveStudentStatus(maDinhDanh, newStatus);

    return updated;
  });
};

  // Handler đổi lớp / tuần / môn
  const handleClassChange = e => updateConfig("lop", e.target.value);
  const handleWeekChange = e => updateConfig("tuan", Number(e.target.value));
  const handleMonChange = e => updateConfig("mon", e.target.value === "congnghe" ? "Công nghệ" : "Tin học");

  // Chia cột
  const getColumns = () => {
    const cols = [[], [], [], [], []];
    students.forEach((s, i) => cols[Math.floor(i / 7) % 5].push(s));
    return cols;
  };
  const columns = getColumns();

  // Bảng màu
  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff" },
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff" },
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff" },
    "": { bg: "#ffffff", text: "#000000" },
  };

  const deleteStudentScore = async (studentId, hoVaTen) => {
    const { lop, tuan, mon, baiTapTuan, kiemTraDinhKi, hocKy } = config;
    if (!lop || !mon) return;

    const classKey = lop.replace(".", "_");
    const subjectKey = mon === "Công nghệ" ? "CongNghe" : "TinHoc";
    const studentRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", studentId);

    try {
      if (baiTapTuan && tuan) {
        // Xóa điểm tuần trong DATA
        await updateDoc(studentRef, {
          [`${subjectKey}.dgtx.tuan_${tuan}.TN_diem`]: null,
          [`${subjectKey}.dgtx.tuan_${tuan}.TN_status`]: "",
        });
      }

      if (kiemTraDinhKi && hocKy) {
        const hocKyMap = {
          "Giữa kỳ I": "GKI",
          "Cuối kỳ I": "CKI",
          "Giữa kỳ II": "GKII",
          "Cuối năm": "CN",
        };
        const hocKyCode = hocKyMap[hocKy];

        // Chỉ đặt các điểm về null, giữ nguyên nhận xét
        await updateDoc(studentRef, {
          [`${subjectKey}.ktdk.${hocKyCode}.lyThuyet`]: null,
          [`${subjectKey}.ktdk.${hocKyCode}.lyThuyetPhanTram`]: null,
          [`${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`]: null,
          [`${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`]: null,
        });

      }
    } catch (err) {
      console.error("❌ Lỗi xóa dữ liệu trong DATA:", err);
    }
  };

  // Hàm dùng chung
  const getMode = (config) => {
    if (config.kiemTraDinhKi) return "ktdk";
    if (config.baiTapTuan) return "btt";
    if (config.danhGiaTuan) return "dgt";
    if (config.examType === "ontap") return "ontap";

    return "normal";
  };

  const deleteClassScores = async (config) => {
    const { lop, tuan, mon, hocKy } = config;
    const mode = getMode(config);
    if (!lop || !mon) return;

    const confirmMessages = {
      dgt:  `Bạn có chắc muốn xóa đánh giá tuần của lớp ${lop}?`,
      btt:  `Bạn có chắc muốn xóa bài tập tuần ${tuan} của lớp ${lop}?`,
      ktdk:`Bạn có chắc muốn xóa điểm kiểm tra định kỳ của lớp ${lop}?`,
    };

    const classKey = lop.replace(".", "_");
    const subjectKey = mon === "Công nghệ" ? "CongNghe" : "TinHoc";

    // Lấy toàn bộ học sinh
    const hsRef = collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH");
    const snapshot = await getDocs(hsRef);

    snapshot.forEach(docSnap => {
      const studentId = docSnap.id;
      const studentData = docSnap.data();
      const dgtxData = studentData?.[subjectKey]?.dgtx || {};
      const updates = {};

      if (mode === "dgt") {
        // xóa status tuần
        if (dgtxData[`tuan_${tuan}`]) {
          updates[`${subjectKey}.dgtx.tuan_${tuan}.status`] = "";
        }
      } 
      else if (mode === "btt") {
        // xóa điểm tuần, dùng TN_diem và TN_status
        if (dgtxData[`tuan_${tuan}`]) {
          updates[`${subjectKey}.dgtx.tuan_${tuan}.TN_diem`] = null;
          updates[`${subjectKey}.dgtx.tuan_${tuan}.TN_status`] = "";
        }
      } 
      else if (mode === "ktdk" && hocKy) {
        const hocKyMap = {
          "Giữa kỳ I": "GKI",
          "Cuối kỳ I": "CKI",
          "Giữa kỳ II": "GKII",
          "Cuối năm": "CN",
        };
        const hocKyCode = hocKyMap[hocKy];

        const ktdkData = studentData?.[subjectKey]?.ktdk?.[hocKyCode];
        if (ktdkData) {
          updates[`${subjectKey}.ktdk.${hocKyCode}.lyThuyet`] = null;
          updates[`${subjectKey}.ktdk.${hocKyCode}.lyThuyetPhanTram`] = null;
          updates[`${subjectKey}.ktdk.${hocKyCode}.ngayKiemTra`] = null;
          updates[`${subjectKey}.ktdk.${hocKyCode}.thoiGianLamBai`] = null;
        }
      }

      if (Object.keys(updates).length > 0) {
        updateDoc(
          doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", studentId),
          updates
        ).catch(() => {});
      }
    });
  };

  // reset dialog và trạng thái khi chuyển chế độ kiểm tra/bài tập tuần
  useEffect(() => {
    // đóng các dialog hiện tại
    setStudentForDanhGia(null);
    setStudentForTracNghiem(null);

    // reset trạng thái học sinh để tránh giữ dữ liệu cũ
    setStudentStatus({});
    setStudentScores({});
  }, [config.kiemTraDinhKi, config.baiTapTuan]);
;

  const openDeleteStudentDialog = (studentId, hoVaTen) => {
    setConfirmData({
      type: "student",
      studentId,
      hoVaTen,
    });
    setConfirmOpen(true);
  };

  const openDeleteClassDialog = (config, mode) => {
    setConfirmData({
      type: "class",
      config,
      mode,
    });
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmData) return;

    setConfirmOpen(false);

    if (confirmData.type === "student") {
      await deleteStudentScore(
        confirmData.studentId,
        confirmData.hoVaTen
      );
    }

    if (confirmData.type === "class") {
      await deleteClassScores(
        confirmData.config,
        confirmData.mode
      );
    }

    setConfirmData(null);
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setConfirmData(null);
  };

  useEffect(() => {
    const sync = () => {
      const key = `recentGV_${config.lop}`;
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      setRecentStudents(stored);
    };

    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [config.lop]);

  const mode = getMode(config);

  return (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
      pt: 3,
      px: 3,
    }}
  >
    <Paper
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        width: "100%",
        maxWidth: 1420,
        bgcolor: "white",
        position: "relative", // cần để đặt icon tuyệt đối
      }}
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
          zIndex: 10,
        }}
      >
        <CloseIcon />
      </IconButton>
      {/* Icon Xóa ở góc trên/trái */}
      <IconButton
        size="small"
        color="error"
        onClick={() => openDeleteClassDialog(config, getMode(config))}
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          bgcolor: "rgba(255,255,255,0.8)",
          "&:hover": { bgcolor: "rgba(255,0,0,0.1)" },
        }}
      >
        <DeleteIcon />
      </IconButton>

      <Box sx={{ textAlign: "center", mb: 1 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ color: "#1976d2", pb: 1 }}
        >
          {
            config?.loaiKiemTra === "baitap"
              ? `BÀI TẬP - TUẦN ${config?.tuan || ""}`
              : config?.loaiKiemTra === "danhgia"
              ? `TỰ ĐÁNH GIÁ - TUẦN ${config?.tuan || ""}`
              : config?.loaiKiemTra === "ontap"
              ? `ÔN TẬP - ${config?.hocKy?.toUpperCase() || ""}`
              : `KẾT QUẢ KTĐK - ${(config?.hocKy || "").toUpperCase()}`
            }
        </Typography>
      </Box>

      {/* Bộ chọn Lớp / Môn / Tuần */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 4 }}>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel>Lớp</InputLabel>
          <Select value={config.lop || ""} onChange={handleClassChange} label="Lớp">
            {classes.map(cls => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120, bgcolor: "white" }}>
          <InputLabel id="mon-label">Môn</InputLabel>
          <Select
            labelId="mon-label"
            value={config.mon === "Công nghệ" ? "congnghe" : "tinhoc"}
            onChange={handleMonChange}
            label="Môn"
          >
            <MenuItem value="tinhoc">Tin học</MenuItem>
            <MenuItem value="congnghe">Công nghệ</MenuItem>
          </Select>
        </FormControl>

        {mode !== "ktdk" && mode !== "ontap" && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tuần</InputLabel>
            <Select
              value={config.tuan || 1}
              onChange={handleWeekChange}
              label="Tuần"
            >
              {[...Array(35)].map((_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  Tuần {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* 🔹 Học sinh gần đây */}
      {config.hienThiTenGanDay && recentStudents.length > 0 && !showAll && (
        <Box
          sx={{
            width: "100%",
            maxWidth: 1200,
            mx: "auto",
            mb: 4,
          }}
        >
          {/* HEADER */}
          <Typography sx={{ fontSize: 24, fontWeight: 600, color: "#0f172a" }}>
            Học sinh gần đây
          </Typography>

          <Typography sx={{ fontSize: 14, color: "#64748b", mt: 0.5, mb: 3 }}>
            Truy cập nhanh học sinh vừa thao tác
          </Typography>

          {/* LIST */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2.5,
              overflowX: { xs: "visible", sm: "auto" },
              overflowY: "visible",
              pb: 1,
              scrollSnapType: { sm: "x mandatory" },

              "&::-webkit-scrollbar": {
                height: 8,
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#cbd5e1",
                borderRadius: 999,
              },
            }}
          >
            {recentStudents.slice(0, 4).map((student, index) => (
              <Paper
                key={student.maDinhDanh}
                onClick={async () => {
                  if (config?.khoaHeThong) {
                    setOpenSystemLocked(true);
                    return;
                  }

                  if (!selectedClass || !student.maDinhDanh) return;

                  const subjectKey =
                    config.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

                  const classKey = selectedClass.replace(".", "_");

                  try {
                    const hsRef = doc(
                      db,
                      "DATA",
                      classKey,
                      "HOCSINH",
                      student.maDinhDanh
                    );

                    const hsSnap = await getDoc(hsRef);
                    const data = hsSnap.exists() ? hsSnap.data() : {};
                    const dgtxData = data?.[subjectKey]?.dgtx || {};
                    const ktdkData = data?.[subjectKey]?.ktdk || {};

                    const mode = getMode(config);

                    const saveRecent = () => {
                      const key = `recent_${selectedClass}`;
                      const updated = [
                        student,
                        ...recentStudents.filter(
                          (s) => s.maDinhDanh !== student.maDinhDanh
                        ),
                      ].slice(0, 10);

                      localStorage.setItem(key, JSON.stringify(updated));
                      setRecentStudents(updated);
                    };

                    // ================= BTT =================
                    if (mode === "btt") {
                      if (!selectedWeek) {
                        setDoneStudent({
                          maDinhDanh: student.maDinhDanh,
                          hoVaTen: student.hoVaTen,
                        });
                        return;
                      }

                      const weekData = dgtxData[`tuan_${selectedWeek}`] || {};

                      if (weekData.TN_diem != null) {
                        setDoneStudent({
                          maDinhDanh: student.maDinhDanh,
                          hoVaTen: student.hoVaTen,
                        });
                        saveRecent();
                        return;
                      }

                      navigate("/tracnghiem", {
                        state: {
                          studentId: student.maDinhDanh,
                          fullname: student.hoVaTen,
                          lop: selectedClass,
                          selectedWeek,
                          mon: config.mon,
                        },
                      });

                      saveRecent();
                      return;
                    }

                    // ================= KTDK =================
                    if (mode === "ktdk") {
                      const hocKyMap = {
                        "Giữa kỳ I": "GKI",
                        "Cuối kỳ I": "CKI",
                        "Giữa kỳ II": "GKII",
                        "Cuối năm": "CN",
                      };

                      const hocKyCode = hocKyMap[config.hocKy];
                      const hocKyData = ktdkData?.[hocKyCode] || {};

                      if (hocKyData?.lyThuyet != null) {
                        setDoneStudent({
                          maDinhDanh: student.maDinhDanh,
                          hoVaTen: student.hoVaTen,
                        });
                        saveRecent();
                        return;
                      }

                      navigate("/tracnghiem", {
                        state: {
                          studentId: student.maDinhDanh,
                          fullname: student.hoVaTen,
                          lop: selectedClass,
                          selectedWeek,
                          mon: config.mon,
                        },
                      });

                      saveRecent();
                      return;
                    }

                    // ================= ÔN TẬP =================
                    if (mode === "ontap") {
                      navigate("/tracnghiem-ontap", {
                        state: {
                          fullname: student.hoVaTen,
                          lop: selectedClass,
                        },
                      });

                      saveRecent();
                      return;
                    }

                    // ================= DGT =================
                    if (mode === "dgt") {
                      const weekData = dgtxData[`tuan_${selectedWeek}`] || {};

                      setExpandedStudent({
                        ...student,
                        status: weekData.status || "",
                      });

                      saveRecent();
                      return;
                    }

                    // ================= DEFAULT =================
                    setStudentForDanhGia(student);
                    saveRecent();
                  } catch (err) {
                    console.error(err);
                    setDoneStudent({
                      maDinhDanh: student.maDinhDanh,
                      hoVaTen: student.hoVaTen,
                    });
                  }
                }}
                elevation={0}
                sx={{
                  flexShrink: 0,
                  width: { xs: "100%", sm: 260 },
                  minWidth: { xs: "100%", sm: 260 },
                  borderRadius: "30px",
                  cursor: "pointer",
                  overflow: "hidden",
                  position: "relative",
                  border: "1px solid rgba(226,232,240,.9)",
                  background: "linear-gradient(180deg,#ffffff,#f8fbff)",
                  boxShadow: "0 8px 28px rgba(15,23,42,.06)",
                  transition: ".25s ease",

                  "&:hover": {
                    boxShadow: "0 18px 40px rgba(37,99,235,.16)",
                    borderColor: "#93c5fd",
                  },

                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 6,
                    background:
                      index % 2 === 0
                        ? "linear-gradient(90deg,#2563eb,#60a5fa)"
                        : "linear-gradient(90deg,#7c3aed,#a78bfa)",
                  },
                }}
              >
                <Box sx={{ p: 2.5, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: "24px",
                      mx: "auto",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        index % 2 === 0
                          ? "linear-gradient(135deg,#2563eb,#60a5fa)"
                          : "linear-gradient(135deg,#7c3aed,#a78bfa)",
                    }}
                  >
                    <GroupIcon sx={{ color: "#fff", fontSize: 34 }} />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#0f172a",
                      textTransform: "uppercase",
                      minHeight: 48,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {student.hoVaTen}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: 13,
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    Học sinh lớp {selectedClass}
                  </Typography>

                  {/*<Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      px: 1.2,
                      py: 0.35,
                      borderRadius: "14px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      fontWeight: 700,
                      fontSize: 14,
                      border: "1px solid #dbeafe",
                      mt: 0.8,
                    }}
                  >
                    STT: {student.stt ?? index + 1}
                  </Box>*/}

                  <Box
                    sx={{
                      mt: 2.5,
                      py: 1.2,
                      borderRadius: "16px",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#2563eb",
                      background: "#eff6ff",
                      transition: ".2s",
                    }}
                  >
                    Xem kết quả
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>

          {/* BUTTON */}
          <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 3 }}>
            <Box
              onClick={() => {
                if (!selectedClass) return;
                setShowAll(true);
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 3,
                py: 1.6,
                borderRadius: "18px",
                cursor: "pointer",
                background: "linear-gradient(135deg,#eff6ff,#f8fbff)",
                border: "1px solid #dbeafe",
              }}
            >
              <GroupsIcon sx={{ color: "#2563eb", fontSize: 28 }} />
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#2563eb" }}>
                Xem toàn bộ lớp
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ================= DIALOG KẾT QUẢ ================= */}
      <StatusResultDialogGV
        studentForTracNghiem={
          doneStudent
            ? {
                maDinhDanh: doneStudent.maDinhDanh,
                hoVaTen: doneStudent.hoVaTen,
              }
            : null
        }
        setStudentForTracNghiem={setDoneStudent}
        studentScores={studentScores}
        config={config}
        convertPercentToScore={convertPercentToScore}
        deleteStudentScore={deleteStudentScore}
      />


      {/* Danh sách học sinh */}
      {(
        (!config?.hienThiTenGanDay || recentStudents.length === 0) || showAll
      ) && (
        <>
          <Grid container spacing={2} justifyContent="center">
            {columns.map((col, colIdx) => (
              <Grid item key={colIdx}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {col.map((student) => {
                    return (
                      <Paper
                        key={student.maDinhDanh}
                        elevation={3}
                        onClick={() => {
                          const mode = getMode(config);

                          saveRecentStudent(student); // 👈 THÊM DÒNG NÀY

                          if (mode === "ktdk" || mode === "btt") {
                            setStudentForTracNghiem(student);
                          } else {
                            setStudentForDanhGia(student);
                          }
                        }}
                        sx={{
                          minWidth: 120,
                          width: { xs: "75vw", sm: "auto" },
                          p: 2,
                          borderRadius: 2,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          bgcolor: "#ffffff",
                          transition: "0.2s",
                          boxShadow: 1,
                          "&:hover": {
                            transform: "scale(1.03)",
                            boxShadow: 4,
                            bgcolor: "#f5f5f5",
                          },
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="medium" noWrap>
                          {student.stt}. {student.hoVaTen}
                        </Typography>

                        {(() => {
                          const mode = getMode(config);
                          let chipProps = null;

                          if (mode === "ktdk") {
                            const { lyThuyet, lyThuyetPhanTram } =
                              studentScores[student.maDinhDanh] || {};

                            if (lyThuyet != null && lyThuyetPhanTram != null) {
                              let color = "warning";
                              if (lyThuyetPhanTram >= 85) color = "primary";
                              else if (lyThuyetPhanTram >= 50) color = "secondary";

                              chipProps = { label: String(lyThuyet), color };
                            }
                          } else if (mode === "btt") {
                            const m =
                              (studentScores[student.maDinhDanh]?.TN_status || "").trim();

                            chipProps =
                              {
                                "Hoàn thành tốt": { label: "T", color: "primary" },
                                "Hoàn thành": { label: "H", color: "secondary" },
                                "Chưa hoàn thành": { label: "C", color: "warning" },
                              }[m] || null;
                          } else if (mode === "dgt") {
                            const s =
                              String(studentStatus[student.maDinhDanh] || "").trim();

                            chipProps =
                              {
                                "Hoàn thành tốt": { label: "T", color: "primary" },
                                "Hoàn thành": { label: "H", color: "secondary" },
                                "Chưa hoàn thành": { label: "C", color: "warning" },
                              }[s] || null;
                          }

                          return (
                            chipProps && (
                              <Chip
                                key={`chip-${student.maDinhDanh}-${mode}`}
                                label={chipProps.label}
                                color={chipProps.color}
                                size="small"
                                sx={{
                                  fontWeight: "bold",
                                  borderRadius: "50%",
                                  width: 28,
                                  height: 28,
                                  minWidth: 0,
                                }}
                              />
                            )
                          );
                        })()}
                      </Paper>
                    );
                  })}
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* NÚT QUAY LẠI */}
          {recentStudents.length > 0 && (
            <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 3 }}>
              <Box
                onClick={() => setShowAll(false)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 3,
                  py: 1.6,
                  borderRadius: "18px",
                  cursor: "pointer",
                  background: "linear-gradient(135deg,#eff6ff,#f8fbff)",
                  border: "1px solid #dbeafe",
                  boxShadow: "0 8px 22px rgba(37,99,235,.12)",
                }}
              >
                <HistoryIcon sx={{ color: "#2563eb" }} />

                <Typography sx={{ fontWeight: 700, color: "#2563eb" }}>
                  Chế độ xem: Gần đây
                </Typography>
              </Box>
            </Box>
          )}
        </>
      )}

    </Paper>

    {/* Dialog đánh giá */}
    <DanhGiaGVDialog
      studentForDanhGia={studentForDanhGia}
      setStudentForDanhGia={setStudentForDanhGia}
      studentStatus={studentStatus}
      handleStatusChange={handleStatusChange}
      PaperComponent={PaperComponent}
    />

    {/* Dialog điểm trắc nghiệm */}
    <StatusResultDialogGV
      studentForTracNghiem={studentForTracNghiem}
      setStudentForTracNghiem={setStudentForTracNghiem}
      studentScores={studentScores}
      config={config}
      convertPercentToScore={convertPercentToScore}
      deleteStudentScore={deleteStudentScore}
    />

    <ConfirmDeleteCoreDialog
      open={confirmOpen}
      onClose={handleCloseConfirm}
      onConfirm={handleConfirmDelete}
      message={
        confirmData?.type === "student"
          ? `Xóa học sinh ${confirmData?.hoVaTen || ""}?`
          : `Xóa dữ liệu lớp ${confirmData?.config?.lop || ""}?`
      }
    />

  </Box>
);
}

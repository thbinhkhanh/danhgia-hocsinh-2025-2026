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
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { useSelectedClass } from "../context/SelectedClassContext";

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

export default function GiaoVien_Kahoot() {
  const navigate = useNavigate();


  const { studentData, setStudentData } = useContext(StudentContext);

  const { config, setConfig } = useContext(ConfigContext);

  // 🔹 Dùng chung danh sách lớp từ SelectedClassContext
  const { classes } = useSelectedClass();

  const namHocKey =
    (config?.namHoc || "2025-2026").replace(/-/g, "_");

  // Local state
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
  const [showRanking, setShowRanking] = useState(true);
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

          const thoiGianLamBai =
            studentInfo?.[subjectKey]?.dgtx?.[`tuan_${tuan}`]?.thoiGianLamBai ?? null;

          scores[studentId] = {
            TN_diem,
            TN_status,
            thoiGianLamBai,
          };
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

  // ================= XẾP HẠNG KAHOOT =================
const rankingStudents = [...students]
  .map((student) => ({
    ...student,
    score:
      studentScores[student.maDinhDanh]?.TN_diem ??
      null,
  }))
  .filter((student) => student.score !== null)
  .sort((a, b) => {
    const scoreA = Number(a.score);
    const scoreB = Number(b.score);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    return a.hoVaTen.localeCompare(
      b.hoVaTen,
      "vi"
    );
  });

const rankedStudents = [...students]
  .map((student) => ({
    ...student,
    score:
      studentScores[student.maDinhDanh]?.TN_diem ?? null,
    thoiGianLamBai:
      studentScores[student.maDinhDanh]?.thoiGianLamBai ?? null,
  }))
  .filter(
    (student) =>
      student.score !== null &&
      student.thoiGianLamBai !== null
  )
  .sort((a, b) => {
    const scoreA = Number(a.score);
    const scoreB = Number(b.score);

    // Điểm cao hơn xếp trước
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Chuyển thời gian về giây để so sánh
    const parseTime = (value) => {
      const str = String(value);

      // dạng mm:ss
      if (str.includes(":")) {
        const [minutes, seconds] = str.split(":").map(Number);
        return minutes * 60 + seconds;
      }

      // dạng số giây, ví dụ "18.5"
      return Number(str);
    };

    const timeA = parseTime(a.thoiGianLamBai);
    const timeB = parseTime(b.thoiGianLamBai);

    // Bằng điểm → thời gian ít hơn xếp trước
    return timeA - timeB;
  })
  .map((student, index) => ({
    ...student,
    rank: index + 1,
}));

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
          [`${subjectKey}.dgtx.tuan_${tuan}.thoiGianLamBai`]: null,
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
        minHeight: 650,
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

        <FormControlLabel
          sx={{
            ml: 0,
            mr: 0,
            whiteSpace: "nowrap",
          }}
          control={
            <Switch
              checked={showRanking}
              onChange={(e) => setShowRanking(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 700,
                color: "#2563eb",
              }}
            >
              {/*{showRanking ? "Xếp hạng" : "Toàn bộ lớp"}*/}
            </Typography>
          }
        />
      </Box>

      {/* ================= TOÀN BỘ DANH SÁCH HỌC SINH ================= */}
      {!showRanking && (
        <>
          <Grid container spacing={2} justifyContent="center">
            {Array.from({ length: 5 }).map((_, colIdx) => {
              const rows = Math.ceil(students.length / 5);

              const col = students.slice(
                colIdx * rows,
                (colIdx + 1) * rows
              );

              return (
                <Grid item key={colIdx}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {col.map((student) => {
                      return (
                        <Paper
                          key={student.maDinhDanh}
                          elevation={3}
                          onClick={() => {
                            const mode = getMode(config);

                            saveRecentStudent(student);

                            if (
                              mode === "ktdk" ||
                              mode === "btt"
                            ) {
                              setStudentForTracNghiem(student);
                            } else {
                              setStudentForDanhGia(student);
                            }
                          }}
                          sx={{
                            minWidth: 120,
                            width: {
                              xs: "75vw",
                              sm: "auto",
                            },
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
                          {/* TÊN HỌC SINH */}
                          <Typography
                            variant="subtitle2"
                            fontWeight="medium"
                            noWrap
                          >
                            {student.stt}. {student.hoVaTen}
                          </Typography>

                          {/* TRẠNG THÁI */}
                          {(() => {
                            const mode = getMode(config);
                            let chipProps = null;

                            if (mode === "ktdk") {
                              const {
                                lyThuyet,
                                lyThuyetPhanTram,
                              } =
                                studentScores[
                                  student.maDinhDanh
                                ] || {};

                              if (
                                lyThuyet != null &&
                                lyThuyetPhanTram != null
                              ) {
                                let color = "warning";

                                if (
                                  lyThuyetPhanTram >= 85
                                ) {
                                  color = "primary";
                                } else if (
                                  lyThuyetPhanTram >= 50
                                ) {
                                  color = "secondary";
                                }

                                chipProps = {
                                  label: String(lyThuyet),
                                  color,
                                };
                              }
                            } else if (mode === "btt") {
                              const m =
                                (
                                  studentScores[
                                    student.maDinhDanh
                                  ]?.TN_status || ""
                                ).trim();

                              chipProps =
                                {
                                  "Hoàn thành tốt": {
                                    label: "T",
                                    color: "primary",
                                  },
                                  "Hoàn thành": {
                                    label: "H",
                                    color: "secondary",
                                  },
                                  "Chưa hoàn thành": {
                                    label: "C",
                                    color: "warning",
                                  },
                                }[m] || null;
                            } else if (mode === "dgt") {
                              const s =
                                String(
                                  studentStatus[
                                    student.maDinhDanh
                                  ] || ""
                                ).trim();

                              chipProps =
                                {
                                  "Hoàn thành tốt": {
                                    label: "T",
                                    color: "primary",
                                  },
                                  "Hoàn thành": {
                                    label: "H",
                                    color: "secondary",
                                  },
                                  "Chưa hoàn thành": {
                                    label: "C",
                                    color: "warning",
                                  },
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
              );
            })}
          </Grid>
        </>
      )}

      {/* ================= BẢNG XẾP HẠNG ================= */}
      {showRanking && (
        <>
          {/* PHẦN BẢNG XẾP HẠNG HIỆN TẠI CỦA BẠN */}
          <Box sx={{ width: "100%" }}>
            {/* Đặt code bảng xếp hạng hiện tại ở đây */}
          </Box>
        </>
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

      {/* ================= XẾP HẠNG KAHOOT ================= */}
      {showRanking && (
        <Box
          sx={{
            width: "100%",
            mt: 4,
            mb: 2,

            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1fr) 700px minmax(260px, 360px)",
            },

            columnGap: {
              xs: 2,
              md: 3,
            },

            alignItems: "start",
          }}
        >

          {/* ================= VÙNG CÂN BẰNG TRÁI ================= */}
          <Box
            sx={{
              display: {
                xs: "none",
                md: "block",
              },
            }}
          />

          {/* ================= BẢNG XẾP HẠNG ================= */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 700,
              mx: "auto",
            }}
          >
            {/* ================= BẢNG XẾP HẠNG ================= */}
            <Box
              sx={{
                width: "100%",
                maxWidth: 700,
                mx: "auto",
                mb: 2,
              }}
            >
              {/* TIÊU ĐỀ */}
              <Box
                sx={{
                  textAlign: "center",
                  mb: 2.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: {
                      xs: "1.5rem",
                      sm: "1.9rem",
                    },
                    fontWeight: 900,
                    color: "#0f172a",
                    letterSpacing: 0.3,
                  }}
                >
                  🏆 BẢNG XẾP HẠNG
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,
                    fontSize: 13,
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  {/*Danh sách kết quả của toàn bộ học sinh*/}
                </Typography>
              </Box>

              {rankedStudents.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: "center",
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    background:
                      "linear-gradient(135deg,#f8fafc,#ffffff)",
                    color: "#64748b",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    Chưa có học sinh hoàn thành bài.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={1.4}>
                  {rankedStudents.map((student) => {
                    const isTop1 = student.rank === 1;
                    const isTop2 = student.rank === 2;
                    const isTop3 = student.rank === 3;
                    const isTop = student.rank <= 3;

                    return (
                      <Paper
                        key={student.maDinhDanh}
                        elevation={0}
                        onClick={() => {
                          saveRecentStudent(student);
                          setStudentForTracNghiem(student);
                        }}
                        sx={{
                          position: "relative",
                          display: "grid",

                          // Hạng | Tên | Điểm + Thời gian
                          gridTemplateColumns: {
                            xs: "52px minmax(0,1fr) auto",
                            sm: "72px minmax(0,1fr) 175px",
                          },

                          alignItems: "center",

                          minHeight: {
                            xs: isTop1 ? 76 : 68,
                            sm: isTop1 ? 86 : 70,
                          },

                          px: {
                            xs: 1.2,
                            sm: 2,
                          },

                          borderRadius: {
                            xs: 2.5,
                            sm: 3,
                          },

                          cursor: "pointer",
                          overflow: "hidden",

                          background:
                            isTop1
                              ? "linear-gradient(135deg,#fffdf0,#fff8d8)"
                              : isTop2
                              ? "linear-gradient(135deg,#ffffff,#f5f7fa)"
                              : isTop3
                              ? "linear-gradient(135deg,#fffaf5,#fff1e6)"
                              : "#ffffff",

                          border:
                            isTop1
                              ? "2px solid #f5c542"
                              : isTop2
                              ? "1px solid #cbd5e1"
                              : isTop3
                              ? "1px solid #e5b58c"
                              : "1px solid #e2e8f0",

                          boxShadow:
                            isTop1
                              ? "0 8px 25px rgba(234,179,8,.18)"
                              : isTop
                              ? "0 5px 18px rgba(15,23,42,.07)"
                              : "0 3px 12px rgba(15,23,42,.04)",

                          transition:
                            "transform .2s ease, box-shadow .2s ease",

                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow:
                              "0 10px 25px rgba(37,99,235,.14)",
                          },

                          "&::before": {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: isTop1 ? 6 : 4,
                            background:
                              isTop1
                                ? "linear-gradient(180deg,#facc15,#f59e0b)"
                                : isTop2
                                ? "#94a3b8"
                                : isTop3
                                ? "#d97706"
                                : "#dbeafe",
                          },
                        }}
                      >
                        {/* ================= HẠNG ================= */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          {isTop ? (
                            <Box
                              sx={{
                                width: {
                                  xs: 40,
                                  sm: isTop1 ? 52 : 46,
                                },
                                height: {
                                  xs: 40,
                                  sm: isTop1 ? 52 : 46,
                                },
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",

                                background:
                                  isTop1
                                    ? "linear-gradient(135deg,#facc15,#f59e0b)"
                                    : isTop2
                                    ? "linear-gradient(135deg,#e2e8f0,#94a3b8)"
                                    : "linear-gradient(135deg,#fdba74,#d97706)",

                                boxShadow:
                                  isTop1
                                    ? "0 5px 15px rgba(245,158,11,.3)"
                                    : "0 3px 10px rgba(100,116,139,.2)",

                                fontSize: {
                                  xs: "1.3rem",
                                  sm: isTop1 ? "1.6rem" : "1.4rem",
                                },
                              }}
                            >
                              {isTop1
                                ? "🥇"
                                : isTop2
                                ? "🥈"
                                : "🥉"}
                            </Box>
                          ) : (
                            <Typography
                              sx={{
                                fontSize: {
                                  xs: "1rem",
                                  sm: "1.15rem",
                                },
                                fontWeight: 900,
                                color: "#64748b",
                              }}
                            >
                              #{student.rank}
                            </Typography>
                          )}
                        </Box>

                        {/* ================= TÊN ================= */}
                        <Box
                          sx={{
                            minWidth: 0,
                            pl: {
                              xs: 0.5,
                              sm: 1,
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: {
                                xs: isTop1 ? "1rem" : "0.95rem",
                                sm: isTop1 ? "1.2rem" : "1.05rem",
                              },
                              fontWeight: isTop1 ? 900 : 750,
                              color: "#0f172a",

                              // Cho phép tên dài tự xuống dòng
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              lineHeight: 1.35,
                            }}
                          >
                            {student.hoVaTen}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.3,
                              fontSize: {
                                xs: 11,
                                sm: 12,
                              },
                              color: "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            Hạng {student.rank}
                          </Typography>
                        </Box>

                        {/* ================= ĐIỂM + THỜI GIAN ================= */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: {
                              xs: 0.8,
                              sm: 1.2,
                            },
                            pr: {
                              xs: 0.3,
                              sm: 0.5,
                            },
                          }}
                        >
                          {/* ĐIỂM */}
                          <Box
                            sx={{
                              minWidth: {
                                xs: 48,
                                sm: 65,
                              },
                              textAlign: "center",
                              px: {
                                xs: 0.6,
                                sm: 1,
                              },
                              py: {
                                xs: 0.5,
                                sm: 0.7,
                              },
                              borderRadius: 2,
                              background:
                                isTop1
                                  ? "#fff3b0"
                                  : "#eff6ff",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: {
                                  xs: "1.05rem",
                                  sm: "1.25rem",
                                },
                                lineHeight: 1,
                                fontWeight: 900,
                                color: "#1976d2",
                              }}
                            >
                              {student.score}
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.3,
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#64748b",
                                textTransform: "uppercase",
                              }}
                            >
                              điểm
                            </Typography>
                          </Box>

                          {/* THỜI GIAN */}
                          <Box
                            sx={{
                              minWidth: {
                                xs: 50,
                                sm: 70,
                              },
                              textAlign: "center",
                              px: {
                                xs: 0.5,
                                sm: 0.8,
                              },
                              py: {
                                xs: 0.5,
                                sm: 0.7,
                              },
                              borderRadius: 2,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: {
                                  xs: "0.85rem",
                                  sm: "1rem",
                                },
                                lineHeight: 1,
                                fontWeight: 800,
                                color: "#475569",
                              }}
                            >
                              {student.thoiGianLamBai != null
                                ? `${student.thoiGianLamBai}s`
                                : "-"}
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.3,
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#94a3b8",
                                textTransform: "uppercase",
                              }}
                            >
                              thời gian
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Box>

          {/* ================= CỘT PHẢI - THỐNG KÊ ================= */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 360,
              mx: "auto",
              pr: 0,
            }}
          >
            {/* ================= THỐNG KÊ KẾT QUẢ ================= */}
            {(() => {
              const studentsWithScore = students
                .map((student) => ({
                  ...student,
                  score:
                    studentScores[student.maDinhDanh]?.TN_diem ??
                    null,
                }))
                .filter(
                  (student) =>
                    student.score !== null &&
                    student.score !== undefined &&
                    !Number.isNaN(Number(student.score))
                );

              const total = studentsWithScore.length;

              const totCount = studentsWithScore.filter(
                (s) =>
                  Number(s.score) >= 80 &&
                  Number(s.score) <= 100
              ).length;

              const datCount = studentsWithScore.filter(
                (s) =>
                  Number(s.score) >= 50 &&
                  Number(s.score) < 80
              ).length;

              const chuaDatCount = studentsWithScore.filter(
                (s) => Number(s.score) < 50
              ).length;

              const getPercent = (count) =>
                total > 0
                  ? Math.round((count / total) * 100)
                  : 0;

              const statistics = [
                {
                  label: "Tốt",
                  range: "8 – 10",
                  count: totCount,
                  percent: getPercent(totCount),
                  background:
                    "linear-gradient(90deg,#16a34a,#4ade80)",
                  light: "#f0fdf4",
                  text: "#15803d",
                },
                {
                  label: "Đạt",
                  range: "5 – <8",
                  count: datCount,
                  percent: getPercent(datCount),
                  background:
                    "linear-gradient(90deg,#2563eb,#60a5fa)",
                  light: "#eff6ff",
                  text: "#1d4ed8",
                },
                {
                  label: "Chưa đạt",
                  range: "<5",
                  count: chuaDatCount,
                  percent: getPercent(chuaDatCount),
                  background:
                    "linear-gradient(90deg,#dc2626,#f87171)",
                  light: "#fef2f2",
                  text: "#b91c1c",
                },
              ];

              if (total === 0) return null;

              return (
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 1000,
                    mx: "auto",
                    mt: 0,
                    mb: 2,
                  }}
                >
                  {/* TIÊU ĐỀ */}
                  <Box
                    sx={{
                      textAlign: "center",
                      mb: 3,
                      mt:8,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "1.35rem",
                          sm: "1.4rem",
                        },
                        fontWeight: 900,
                        color: "#0f172a",
                      }}
                    >
                      📊 THỐNG KÊ KẾT QUẢ
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 13,
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      {/*Tổng số học sinh có điểm: {total}*/}
                    </Typography>
                  </Box>

                  {/* CÁC Ô THỐNG KÊ */}
                  <Grid
                    container
                    spacing={2}
                    justifyContent="center"
                    sx={{ mb: 3 }}
                  >
                    {statistics.map((item) => (
                      <Grid
                        item
                        xs={12}
                        sm={4}
                        key={item.label}
                        sx={{
                          width: 100,
                          flex: "0 0 100px",
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            background: item.light,
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: 17,
                                  fontWeight: 900,
                                  color: item.text,
                                }}
                              >
                                {item.label}
                              </Typography>

                              <Typography
                                sx={{
                                  fontSize: 12,
                                  color: "#64748b",
                                  fontWeight: 600,
                                }}
                              />
                            </Box>

                            <Box sx={{ textAlign: "right" }}>
                              <Typography
                                sx={{
                                  fontSize: 24,
                                  lineHeight: 1,
                                  fontWeight: 900,
                                  color: item.text,
                                }}
                              >
                                {item.count}
                              </Typography>

                              <Typography
                                sx={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  fontWeight: 700,
                                }}
                              >
                                học sinh
                              </Typography>
                            </Box>
                          </Box>

                          {/* PHẦN TRĂM */}
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: item.text,
                              mb: 0.7,
                            }}
                          >
                            {item.percent}%
                          </Typography>

                          {/* THANH PHẦN TRĂM */}
                          <Box
                            sx={{
                              width: "100%",
                              height: 10,
                              borderRadius: 10,
                              background: "#e2e8f0",
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                width: `${item.percent}%`,
                                height: "100%",
                                borderRadius: 10,
                                background: item.background,
                                transition: "width .5s ease",
                              }}
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  {/* BIỂU ĐỒ */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: {
                        xs: 2,
                        sm: 3,
                      },
                      width: "100%",
                      maxWidth: 290,
                      mx: "auto",
                      borderRadius: 3,
                      border: "1px solid #e2e8f0",
                      background:
                        "linear-gradient(135deg,#f8fafc,#ffffff)",
                    }}
                  >
                    <Typography
                      sx={{
                        textAlign: "center",
                        fontSize: 15,
                        fontWeight: 800,
                        color: "#334155",
                        mb: 0,
                      }}
                    >
                      BIỂU ĐỒ
                    </Typography>

                    <Box
                      sx={{
                        height: 180,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        gap: {
                          xs: 2,
                          sm: 3,
                        },
                        borderBottom: "2px solid #cbd5e1",
                        px: 2,
                      }}
                    >
                      {statistics.map((item) => (
                        <Box
                          key={item.label}
                          sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            minWidth: {
                              xs: 65,
                              sm: 100,
                            },
                          }}
                        >
                          {/* SỐ LƯỢNG */}
                          <Typography
                            sx={{
                              fontSize: 16,
                              fontWeight: 900,
                              color: item.text,
                              mb: 0.8,
                            }}
                          >
                            {item.count}
                          </Typography>

                          {/* CỘT */}
                          <Box
                            sx={{
                              width: {
                                xs: 30,
                                sm: 40,
                              },

                              height: `${Math.max(
                                item.percent * 1.7,
                                item.count > 0 ? 12 : 0
                              )}px`,

                              maxHeight: 170,

                              minHeight:
                                item.count > 0 ? 12 : 0,

                              borderRadius:
                                "10px 10px 0 0",

                              background:
                                item.background,

                              transition:
                                "height .5s ease",

                              boxShadow:
                                "0 5px 15px rgba(15,23,42,.12)",
                            }}
                          />

                          {/* NHÃN */}
                          <Typography
                            sx={{
                              mt: 1,
                              mb: 1,
                              fontSize: 13,
                              fontWeight: 800,
                              color: item.text,
                            }}
                          >
                            {item.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Box>
              );
            })()}
          </Box>
        </Box>
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

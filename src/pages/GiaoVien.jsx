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

export default function GiaoVien() {
  const { studentData, setStudentData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

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

  // ref cho dialog draggable
  const dialogNodeRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
      const snapshot = await getDocs(collection(db, "DANHSACH"));
      const classList = snapshot.docs.map(d => d.id);
      setClasses(classList);
      setClassData(classList);
      if (!config.lop && classList.length > 0) {
        updateConfig("lop", classList[0]);
      }
    };
    fetchClasses();
  }, []);

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
      const ref = doc(db, "DANHSACH", selectedClass);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const list = Object.entries(data)
          .map(([id, info]) => ({ maDinhDanh: id, hoVaTen: info.hoVaTen }))
          .sort((a, b) =>
            a.hoVaTen.split(" ").slice(-1)[0].localeCompare(b.hoVaTen.split(" ").slice(-1)[0])
          )
          .map((s, i) => ({ ...s, stt: i + 1 }));
        setStudents(list);
        setStudentData(prev => ({ ...prev, [selectedClass]: list }));
      } else setStudents([]);
    };
    fetchStudents();
  }, [config.lop, studentData]);

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
    const classRef = collection(db, "DATA", classKey, "HOCSINH");

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
      const hsRef = doc(db, "DATA", classKey, "HOCSINH", studentId);

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
    const confirmDelete = window.confirm(`Bạn có chắc muốn xóa kết quả của ${hoVaTen}?`);
    if (!confirmDelete) return;

    const { lop, tuan, mon, baiTapTuan, kiemTraDinhKi, hocKy } = config;
    if (!lop || !mon) return;

    const classKey = lop.replace(".", "_");
    const subjectKey = mon === "Công nghệ" ? "CongNghe" : "TinHoc";
    const studentRef = doc(db, "DATA", classKey, "HOCSINH", studentId);

    try {
      if (baiTapTuan && tuan) {
        // Xóa điểm tuần trong DATA
        await updateDoc(studentRef, {
          [`${subjectKey}.dgtx.tuan_${tuan}.TN_diem`]: null,
          [`${subjectKey}.dgtx.tuan_${tuan}.TN_status`]: "",
        });
        //console.log(`✅ Đã xóa bài tập tuần ${tuan} của HS ${hoVaTen}`);
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

        //console.log(`✅ Đã reset điểm KTDK ${hocKy} của HS ${hoVaTen} (giữ nhận xét)`);
      }
    } catch (err) {
      console.error("❌ Lỗi xóa dữ liệu trong DATA:", err);
    }
  };



  // Hàm dùng chung
  const getMode = (config) => {
    if (config.kiemTraDinhKi) return "ktdk";
    if (config.baiTapTuan)    return "btt";
    if (config.danhGiaTuan)   return "dgt";
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

    const confirmed = window.confirm(confirmMessages[mode] || "Bạn có chắc muốn xoá?");
    if (!confirmed) return;

    const classKey = lop.replace(".", "_");
    const subjectKey = mon === "Công nghệ" ? "CongNghe" : "TinHoc";

    // Lấy toàn bộ học sinh
    const hsRef = collection(db, "DATA", classKey, "HOCSINH");
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
        updateDoc(doc(db, "DATA", classKey, "HOCSINH", studentId), updates)
          .then(() => console.log(`✅ Đã xóa dữ liệu ${mode} của HS ${studentId}`))
          .catch(err => console.error(`❌ Lỗi xóa dữ liệu HS ${studentId}:`, err));
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
      {/* Icon Xóa ở góc trên/trái */}
      <IconButton
        size="small"
        color="error"
        onClick={() => deleteClassScores(config)} // gọi hàm xóa cả lớp
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
          {config?.baiTapTuan
            //? `BÀI TẬP - TUẦN ${config.tuan}`
            //: config?.danhGiaTuan
            //? `ĐÁNH GIÁ - TUẦN ${config.tuan}`
            //: "KIỂM TRA ĐỊNH KỲ"}

            ? `BÀI TẬP TRẮC NGHIỆM`
            : config?.danhGiaTuan
            ? `TỰ ĐÁNH GIÁ`
            : "KIỂM TRA ĐỊNH KỲ"}
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

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Tuần</InputLabel>
          <Select value={config.tuan || 1} onChange={handleWeekChange} label="Tuần">
            {[...Array(35)].map((_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                Tuần {i + 1}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Danh sách học sinh */}
      <Grid container spacing={2} justifyContent="center">
        {columns.map((col, colIdx) => (
          <Grid item key={colIdx}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {col.map(student => {
                return (
                  <Paper
                    key={student.maDinhDanh}
                    elevation={3}
                    onClick={() => {
                      const mode = getMode(config);   // ← dùng hàm dùng chung

                      if (mode === "ktdk" || mode === "btt") {
                        // mở dialog trắc nghiệm (phần 2)
                        setStudentForTracNghiem(student);

                      } else if (mode === "dgt") {
                        // mở dialog đánh giá tuần (phần 1)
                        setStudentForDanhGia(student);

                      } else {
                        // fallback
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

                    {/* CHIP BTT hoặc KTDK cùng màu */}
                      {(() => {
                        const mode = getMode(config);   // ← dùng chung

                        let chipProps = null;

                        // --- KTDK ---
                        if (mode === "ktdk") {
                          const { lyThuyet, lyThuyetPhanTram } = studentScores[student.maDinhDanh] || {};
                          if (lyThuyet != null && lyThuyetPhanTram != null) {
                            let color = "warning";
                            if (lyThuyetPhanTram >= 85) color = "primary";
                            else if (lyThuyetPhanTram >= 50) color = "secondary";

                            chipProps = { label: String(lyThuyet), color };
                          }
                        }

                        // --- BÀI TẬP TUẦN (BTT) ---
                        else if (mode === "btt") {
                          const m = (studentScores[student.maDinhDanh]?.TN_status || "").trim();

                          chipProps =
                            {
                              "Hoàn thành tốt": { label: "T", color: "primary" },
                              "Hoàn thành": { label: "H", color: "secondary" },
                              "Chưa hoàn thành": { label: "C", color: "warning" },
                            }[m] || null;
                        }

                        // --- ĐÁNH GIÁ TUẦN (DGTX) ---
                        else if (mode === "dgt") {
                          const s = String(studentStatus[student.maDinhDanh] || "").trim();

                          chipProps =
                            {
                              "Hoàn thành tốt": { label: "T", color: "primary" },
                              "Hoàn thành": { label: "H", color: "secondary" },
                              "Chưa hoàn thành": { label: "C", color: "warning" },
                            }[s] || null;
                        }

                        // --- fallback ---
                        else {
                          chipProps = null;
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
  </Box>
);
}

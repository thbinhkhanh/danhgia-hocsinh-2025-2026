//import React, { useState, useEffect, useContext } from "react";
import React, { useState, useEffect, useContext, useRef } from "react";
import { 
  Box, Typography, MenuItem, Select, Grid, Paper, Button, Stack, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  TextField,
  FormControl, 
  InputLabel,
  Tooltip
} from "@mui/material";

import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { useSelectedClass } from "../context/SelectedClassContext";
import { doc, getDoc, getDocs, collection, updateDoc, setDoc } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import CloseIcon from "@mui/icons-material/Close";
import Draggable from "react-draggable";
import { useTheme, useMediaQuery } from "@mui/material"; 
import { useNavigate } from "react-router-dom";

import DoneDialog from "../dialog/DoneDialog";
import StudentStatusDialog from "../dialog/StudentStatusDialog";

import GroupIcon from '@mui/icons-material/Group';
import AccessTimeIcon from '@mui/icons-material/AccessTime';


export default function HocSinh() {
  // 🔹 Lấy context
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const navigate = useNavigate();

  // 🔹 Local state
  const [classes, setClasses] = useState([]);
  //const [selectedClass, setSelectedClass] = useState("");
  const { selectedClass, setSelectedClass } = useSelectedClass();

  const [students, setStudents] = useState([]);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentStatus, setStudentStatus] = useState({});

  const { config, setConfig } = useContext(ConfigContext);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [systemLocked, setSystemLocked] = useState(false);
  const [saving, setSaving] = useState(false); // 🔒 trạng thái đang lưu

  const [openDoneDialog, setOpenDoneDialog] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [doneStudent, setDoneStudent] = useState(null);
  const [weekData, setWeekData] = useState({});

  const choXemDiem = config?.choXemDiem; // lấy từ config
  const [recentStudents, setRecentStudents] = useState([]); // học sinh gần đây trên máy
  const [showAll, setShowAll] = useState(false); // nút mở rộng
  

  // Khi tải trang
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return;

        const data = docSnap.data();
        const tuan = data.tuan || 1;
        const mon = data.mon || "Tin học";
        const lopFromFirestore = data.lop || "";
        const deTracNghiem = data.deTracNghiem || "";
        const onTap = data.onTap || false;

        // Cập nhật config (không ghi lớp)
        setConfig(prev => ({
          ...prev,
          tuan,
          mon,
          deTracNghiem,
          onTap
        }));

        // Nếu context lớp chưa có, dùng lớp từ Firestore
        setSelectedClass(prev => prev || lopFromFirestore);

        // Cập nhật tuần
        setSelectedWeek(tuan);

      } catch (err) {
        console.error("❌ Lỗi khi lấy CONFIG/config:", err);
      }
    };

    fetchConfig();
  }, [setConfig, setSelectedClass]);

  // Khi thay đổi lớp
  const handleClassChange = (e) => {
    const newClass = e.target.value;
    console.log("🎯 Chọn lớp:", newClass);

    // Chỉ cập nhật context lớp và state local
    setSelectedClass(newClass);
  };

  useEffect(() => {
    if (!selectedClass) return;

    const key = `recent_${selectedClass}`;
    const stored = JSON.parse(localStorage.getItem(key) || "[]");

    setRecentStudents(stored);
  }, [selectedClass, students]);

  // 🔹 Lấy danh sách lớp (ưu tiên cache từ context)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snapshot = await getDocs(collection(db, "DANHSACH"));
        const classList = snapshot.docs.map((doc) => doc.id);

        setClassData(classList);
        setClasses(classList);

        // ✅ Chọn lớp từ config trước, nếu không có mới dùng lớp đầu tiên
        if (classList.length > 0) {
          setSelectedClass((prev) => prev || config.lop || classList[0]);
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
      }
    };

    fetchClasses();
  }, [config.lop]); // ✅ phụ thuộc config.lop để set lớp đúng

    // 🔹 Lấy học sinh (ưu tiên dữ liệu từ context)
  useEffect(() => {
    if (!selectedClass) return;

    const cached = studentData[selectedClass];
    if (cached && cached.length > 0) {
      // 🟢 Dùng cache nếu có
      setStudents(cached);
      return;
    }

    // 🔵 Nếu chưa có trong context thì tải từ Firestore
    const fetchStudents = async () => {
      try {
        //console.log(`🌐 Đang tải học sinh lớp "${selectedClass}" từ Firestore...`);
        const classDocRef = doc(db, "DANHSACH", selectedClass);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
          const data = classSnap.data();
          let studentList = Object.entries(data).map(([maDinhDanh, info]) => ({
            maDinhDanh,
            hoVaTen: info.hoVaTen,
          }));

          // Sắp xếp theo tên
          studentList.sort((a, b) => {
            const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
            const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
            return nameA.localeCompare(nameB);
          });

          studentList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

          //console.log(`✅ Đã tải học sinh lớp "${selectedClass}" từ Firestore:`, studentList);

          // ⬇️ Lưu vào context và state
          setStudentData((prev) => ({ ...prev, [selectedClass]: studentList }));
          setStudents(studentList);
        } else {
          console.warn(`⚠️ Không tìm thấy dữ liệu lớp "${selectedClass}" trong Firestore.`);
          setStudents([]);
          setStudentData((prev) => ({ ...prev, [selectedClass]: [] }));
        }
      } catch (err) {
        console.error(`❌ Lỗi khi lấy học sinh lớp "${selectedClass}":`, err);
        setStudents([]);
      }
    };

    fetchStudents();
  }, [selectedClass, studentData, setStudentData]);

  //tải dữ liệu tuần
  useEffect(() => {
    if (!selectedClass || !selectedWeek || students.length === 0) return;

    const fetchWeekStatus = async () => {
      try {
        const classKey = selectedClass.replace(".", "_");
        const subjectKey = config?.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

        const statusMap = {};

        for (const student of students) {
          const hsRef = doc(db, "DATA", classKey, "HOCSINH", student.maDinhDanh);
          const hsSnap = await getDoc(hsRef);

          if (hsSnap.exists()) {
            const data = hsSnap.data();
            const dgtxData = data?.[subjectKey]?.dgtx || {};
            const weekData = dgtxData?.[`tuan_${selectedWeek}`] || {};

            // Chỉ lấy status
            statusMap[student.maDinhDanh] = weekData.status || "";
          } else {
            statusMap[student.maDinhDanh] = "";
          }
        }

        console.log("[INIT] studentStatus từ DATA:", statusMap);
        setStudentStatus(statusMap);
      } catch (err) {
        console.error("❌ Lỗi khi lấy status từ DATA:", err);
        setStudentStatus({});
      }
    };

    fetchWeekStatus();
  }, [selectedClass, selectedWeek, config?.mon, students]);

  // 🔹 Cột hiển thị
  const getColumns = () => {
    const cols = [[], [], [], [], []];
    students.forEach((student, idx) => {
      const colIndex = Math.floor(idx / 7) % 5;
      cols[colIndex].push(student);
    });
    return cols;
  };

  const columns = getColumns();

  const toggleExpand = (maDinhDanh) => {
    setExpandedStudent(expandedStudent === maDinhDanh ? null : maDinhDanh);
  };

  const saveStudentStatus = async (studentId, hoVaTen, status) => {
    if (!selectedWeek || !selectedClass) return;

    try {
      setSaving(true); // 🔒 Bắt đầu lưu

      // Chuẩn hóa tên class
      const classKey = selectedClass.replace(".", "_");
      const subjectKey = config?.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

      // Document học sinh trong DATA
      const hsRef = doc(
        db,
        "DATA",
        classKey,
        "HOCSINH",
        studentId
      );

      // Cập nhật status tuần trong dgtx
      const tuanField = `${subjectKey}.dgtx.tuan_${selectedWeek}.status`;

      await updateDoc(hsRef, {
        [tuanField]: status,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          // Nếu chưa có document học sinh thì tạo mới
          await setDoc(
            hsRef,
            {
              [subjectKey]: {
                dgtx: {
                  [`tuan_${selectedWeek}`]: {
                    status,
                  },
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
    } finally {
      setSaving(false); // ✅ Ghi xong, mở lại UI
    }
  };


  const handleStatusChange = (maDinhDanh, hoVaTen, status) => {
    setStudentStatus((prev) => {
      const currentStatus = prev[maDinhDanh] || "";
      const newStatus = currentStatus === status ? "" : status;

      // 🧠 Nếu không thay đổi trạng thái → bỏ qua, không ghi Firestore, không re-render
      if (currentStatus === newStatus) return prev;

      const updated = { ...prev, [maDinhDanh]: newStatus };

      // 🔹 Ghi Firestore bất đồng bộ sau khi setState
      saveStudentStatus(maDinhDanh, hoVaTen, newStatus);

      return updated;
    });
  };

  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff", label: "T", color: "primary" },
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff", label: "H", color: "secondary" },
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff", label: "C", color: "warning" },
    "": { bg: "#ffffff", text: "#000000" },
  };

  // ref cho node (an toàn cho React StrictMode)
  const dialogNodeRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  function PaperComponent(props) {
    // 🔹 KHẮC PHỤC LỖI TRÊN MOBILE:
    // Trên điện thoại, không bọc trong <Draggable> để tránh chặn sự kiện chạm (tap)
    if (isMobile) {
      return <Paper {...props} />;
    }

    // 🔹 Chỉ desktop mới dùng draggable
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

  const convertPercentToScore = (percent) => {
    if (percent === undefined || percent === null) return "?";

    const raw = percent / 10; // % → thang 10
    const decimal = raw % 1;

    let rounded;
    if (decimal < 0.25) rounded = Math.floor(raw);
    else if (decimal < 0.75) rounded = Math.floor(raw) + 0.5;
    else rounded = Math.ceil(raw);

    return rounded;
  };

  const getMode = (config) => {
  if (config.kiemTraDinhKi) return "ktdk";
  if (config.baiTapTuan) return "btt";
  if (config.danhGiaTuan) return "dgt";
  if (config.onTap) return "ontap";  // 🔹 Nhánh mới
  return "normal";
};

// 🔹 Hàm cập nhật config + Firestore (giống GiaoVien)
const updateConfig = async (field, value) => {
  const newConfig = { ...config, [field]: value };
  setConfig(newConfig);

  try {
    await setDoc(
      doc(db, "CONFIG", "config"),
      { [field]: value },
      { merge: true }
    );
  } catch (err) {
    console.error(`❌ Lỗi cập nhật ${field}:`, err);
  }
};


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
          minHeight: 650, // 🔹 Chiều cao cố định
        }}
      >
        {/* 🔹 Tiêu đề */}
        <Box sx={{ textAlign: "center", mb: -1 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              color: "#1976d2",
              display: "inline-block",
              pb: 1,
            }}
          >
            DANH SÁCH HỌC SINH
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            mt: 2,
            mb: 4,
          }}
        >
          {/* 🔹 Ô CHỌN LỚP */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Lớp</InputLabel>
            <Select
              value={selectedClass || ""}
              onChange={handleClassChange}
              label="Lớp"
            >
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>          
          
          {/*}
          <TextField
            label="Môn"
            value={config.mon || "Tin học"}
            InputProps={{ readOnly: true }}
            size="small"
            sx={{ width: 120 }}
          />
          
          <TextField
            label="Tuần"
            value={`Tuần ${config.tuan || 1}`}
            InputProps={{ readOnly: true }}
            size="small"
            sx={{ width: 120 }}
          />*/}
          
        </Box>


        {/* 🔹 Học sinh gần đây */}
        {config.hienThiTenGanDay && recentStudents.length > 0 && !showAll && (
          <Box
            sx={{
              mb: 3,
              ml: { xs: 0, sm: 15 },
              textAlign: "left",
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Học sinh gần đây:
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                mb: 1,
                ml: { xs: 0, sm: 1 },
              }}
            >
              {recentStudents.slice(0, 5).map((student) => (
                <Paper
                  key={student.maDinhDanh}
                  elevation={3}
                  sx={{
                    width: { xs: "90%", sm: 250 },
                    minHeight: 40,
                    p: 2,
                    borderRadius: 2,
                    cursor: "pointer",
                    textAlign: "left",
                    bgcolor: "#fff",
                    display: "flex",
                    alignItems: "center",
                    transition: "0.2s",
                    "&:hover": {
                      transform: "scale(1.03)",
                      boxShadow: 4,
                      bgcolor: "#f5f5f5",
                    },
                  }}
                  onClick={async () => {
                    if (!selectedClass || !student.maDinhDanh) return;

                    const subjectKey = config.mon === "Công nghệ" ? "CongNghe" : "TinHoc";
                    const classKey = selectedClass.replace(".", "_");

                    try {
                      // 🔹 Lấy dữ liệu học sinh trực tiếp từ Firestore
                      const hsRef = doc(db, "DATA", classKey, "HOCSINH", student.maDinhDanh);
                      const hsSnap = await getDoc(hsRef);
                      const data = hsSnap.exists() ? hsSnap.data() : {};
                      const dgtxData = data?.[subjectKey]?.dgtx || {};
                      const ktdkData = data?.[subjectKey]?.ktdk || {};

                      const mode = getMode(config);

                      // =======================
                      // 🔹 BÀI TẬP TUẦN
                      // =======================
                      if (mode === "btt") {
                        if (!selectedWeek) {
                          setDoneMessage("⚠️ Chưa chọn tuần.");
                          setOpenDoneDialog(true);
                          return;
                        }
                        const weekData = dgtxData[`tuan_${selectedWeek}`] || {};
                        if (weekData.TN_diem != null) {
                          setDoneStudent({
                            hoVaTen: student.hoVaTen,
                            diemTN: weekData.TN_diem,
                            status: weekData.status || ""
                          });
                          setOpenDoneDialog(true);
                          return;
                        } else {
                          navigate("/tracnghiem", {
                            state: {
                              studentId: student.maDinhDanh,
                              fullname: student.hoVaTen,
                              lop: selectedClass,
                              selectedWeek,
                              mon: config.mon,
                            },
                          });
                          return;
                        }
                      }

                      // =======================
                      // 🔹 KIỂM TRA ĐỊNH KỲ
                      // =======================
                      if (mode === "ktdk") {
                        const hocKyMap = { "Giữa kỳ I": "GKI", "Cuối kỳ I": "CKI", "Giữa kỳ II": "GKII", "Cả năm": "CN" };
                        const hocKyCode = hocKyMap[config.hocKy];
                        if (!hocKyCode) {
                          setDoneMessage("⚠️ Cấu hình học kỳ không hợp lệ.");
                          setOpenDoneDialog(true);
                          return;
                        }
                        const hocKyData = ktdkData?.[hocKyCode] || {};
                        const lyThuyet = hocKyData?.lyThuyet ?? null;

                        if (lyThuyet != null) {
                          setDoneStudent({
                            hoVaTen: hocKyData?.hoVaTen ?? student.hoVaTen,
                            diemTN: lyThuyet,
                            nhanXet: hocKyData?.nhanXet || ""
                          });
                          setOpenDoneDialog(true);
                          return;
                        } else {
                          navigate("/tracnghiem", {
                            state: {
                              studentId: student.maDinhDanh,
                              fullname: student.hoVaTen,
                              lop: selectedClass,
                              selectedWeek,
                              mon: config.mon,
                            },
                          });
                          return;
                        }
                      }

                      // =======================
                      // 🔹 ÔN TẬP
                      // =======================
                      if (mode === "ontap") {
                        navigate("/tracnghiem", {
                          state: {
                            studentId: student.maDinhDanh,
                            fullname: student.hoVaTen,
                            lop: selectedClass,
                            selectedWeek,
                            mon: config.mon,
                            collectionName: "TRACNGHIEM_ONTAP",
                            docId: `${selectedClass}_ONTAP_${config.mon}_${config.hocKy}`,
                          },
                        });
                        return;
                      }

                      // =======================
                      // 🔹 ĐÁNH GIÁ TUẦN
                      // =======================
                      if (mode === "dgt") {
                        const weekData = dgtxData[`tuan_${selectedWeek}`] || {};
                        setExpandedStudent({
                          ...student,
                          status: weekData.status || "",
                        });
                        return;
                      }

                      // =======================
                      // 🔹 FALLBACK
                      // =======================
                      navigate("/tracnghiem", {
                        state: {
                          studentId: student.maDinhDanh,
                          fullname: student.hoVaTen,
                          lop: selectedClass,
                          selectedWeek,
                          mon: config.mon,
                        },
                      });

                    } catch (err) {
                      console.error("❌ Lỗi khi click học sinh:", err);
                      setDoneMessage("⚠️ Có lỗi khi kiểm tra trạng thái bài.");
                      setOpenDoneDialog(true);
                    }

                    // =======================
                    // 🔹 LƯU HỌC SINH GẦN ĐÂY
                    // =======================
                    if (config.hienThiTenGanDay) {
                      const key = `recent_${selectedClass}`;
                      const updated = [
                        student,
                        ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                      ];
                      if (updated.length > 10) updated.pop();
                      localStorage.setItem(key, JSON.stringify(updated));
                      setRecentStudents(updated);
                    }
                  }}



                >
                  <Typography variant="subtitle2" fontWeight="medium">
                    {student.stt}. {student.hoVaTen}
                  </Typography>
                </Paper>
              ))}
            </Box>

            <Box sx={{ mt: 6, ml: { xs: 0, sm: 1 } }}>
              <Tooltip title="Chế độ xem: Cả lớp">
                <IconButton
                  onClick={() => setShowAll(true)}
                  sx={{
                    fontSize: '1.2rem',
                    padding: '6px 16px',
                    minHeight: '36px',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    borderRadius: '4px',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    },
                  }}
                >
                  <GroupIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        {/* 🔹 Danh sách học sinh */}
        {(!config.hienThiTenGanDay || recentStudents.length === 0 || showAll) && (
          <Grid container spacing={2} justifyContent="center">
            {columns.map((col, colIdx) => (
              <Grid item key={colIdx}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {col.map((student) => {
                    const status = studentStatus[student.maDinhDanh];
                    return (
                      <Paper
                        key={student.maDinhDanh}
                        elevation={3}
                        sx={{
                          minWidth: 120,
                          width: { xs: "75vw", sm: "auto" },
                          p: 2,
                          borderRadius: 2,
                          cursor: "pointer",
                          textAlign: "left",
                          bgcolor: "#ffffff",
                          transition: "0.2s",
                          "&:hover": { transform: "scale(1.03)", boxShadow: 4, bgcolor: "#f5f5f5" },
                        }}
                        onClick={async () => {
                        try {
                            const mode = getMode(config);
                            console.log("[List] Click:", {
                            mode,
                            id: student.maDinhDanh,
                            name: student.hoVaTen,
                            });

                            const classKey = selectedClass.replace(".", "_");
                            const subjectKey = config.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

                            // =======================
                            // 🔹 BÀI TẬP TUẦN (DATA/HOCSINH)
                            // =======================
                            if (mode === "btt") {
                            const hsRef = doc(db, "DATA", classKey, "HOCSINH", student.maDinhDanh);
                            const hsSnap = await getDoc(hsRef);
                            const data = hsSnap.exists() ? hsSnap.data() : {};
                            const dgtxData = data?.[subjectKey]?.dgtx || {};
                            const weekInfo = dgtxData[`tuan_${selectedWeek}`] || {};

                            const daLamBai = weekInfo?.TN_diem !== undefined && weekInfo?.TN_diem !== null;

                            if (daLamBai) {
                                setDoneStudent({
                                hoVaTen: student.hoVaTen,
                                diemTN: weekInfo?.TN_diem ?? weekInfo?.TN_status,
                                });
                                setOpenDoneDialog(true);
                            } else {
                                navigate("/tracnghiem", {
                                state: {
                                    studentId: student.maDinhDanh,
                                    fullname: student.hoVaTen,
                                    lop: selectedClass,
                                    selectedWeek,
                                    mon: config.mon,
                                },
                                });
                            }

                            // 🔹 Lưu gần đây kèm dữ liệu
                            if (config.hienThiTenGanDay) {
                                const key = `recent_${selectedClass}`;
                                const updated = [
                                { ...student, fullData: data },
                                ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                ];
                                if (updated.length > 10) updated.pop();
                                localStorage.setItem(key, JSON.stringify(updated));
                                setRecentStudents(updated);
                            }

                            // =======================
                            // 🔹 KIỂM TRA ĐỊNH KỲ
                            // =======================
                            } else if (mode === "ktdk") {
                            const hocKyMap = { "Giữa kỳ I": "GKI", "Cuối kỳ I": "CKI", "Giữa kỳ II": "GKII", "Cả năm": "CN" };
                            const hocKyCode = hocKyMap[config.hocKy];
                            if (!hocKyCode) {
                                setDoneMessage("⚠️ Cấu hình học kỳ không hợp lệ.");
                                setOpenDoneDialog(true);
                                return;
                            }

                            const hsRef = doc(db, "DATA", classKey, "HOCSINH", student.maDinhDanh);
                            const hsSnap = await getDoc(hsRef);
                            const data = hsSnap.exists() ? hsSnap.data() : {};
                            const ktdkData = data?.[subjectKey]?.ktdk?.[hocKyCode] || {};
                            const lyThuyet = ktdkData?.lyThuyet ?? ktdkData?.LyThuyet ?? null;

                            if (lyThuyet != null) {
                                setDoneStudent({
                                hoVaTen: ktdkData?.hoVaTen ?? student.hoVaTen,
                                diemTN: lyThuyet,
                                });
                                setOpenDoneDialog(true);
                            } else {
                                navigate("/tracnghiem", {
                                state: {
                                    studentId: student.maDinhDanh,
                                    fullname: student.hoVaTen,
                                    lop: selectedClass,
                                    selectedWeek,
                                    mon: config.mon,
                                },
                                });
                            }

                            // 🔹 Lưu gần đây kèm dữ liệu
                            if (config.hienThiTenGanDay) {
                                const key = `recent_${selectedClass}`;
                                const updated = [
                                { ...student, fullData: data },
                                ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                ];
                                if (updated.length > 10) updated.pop();
                                localStorage.setItem(key, JSON.stringify(updated));
                                setRecentStudents(updated);
                            }

                            // =======================
                            // 🔹 ÔN TẬP
                            // =======================
                            } else if (mode === "ontap") {
                            // ... giữ nguyên logic ôn tập ...
                            // Sau navigate, cũng lưu gần đây nếu cần
                            if (config.hienThiTenGanDay) {
                                const key = `recent_${selectedClass}`;
                                const updated = [
                                student,
                                ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                ];
                                if (updated.length > 10) updated.pop();
                                localStorage.setItem(key, JSON.stringify(updated));
                                setRecentStudents(updated);
                            }

                            // =======================
                            // 🔹 ĐÁNH GIÁ TUẦN
                            // =======================
                            } else if (mode === "dgt") {
                            const hsRef = doc(db, "DATA", classKey, "HOCSINH", student.maDinhDanh);
                            const hsSnap = await getDoc(hsRef);
                            const data = hsSnap.exists() ? hsSnap.data() : {};
                            const dgtxData = data?.[subjectKey]?.dgtx || {};
                            const weekInfo = dgtxData[`tuan_${selectedWeek}`] || {};
                            const currentStatus = weekInfo?.status || "";

                            setExpandedStudent({
                                ...student,
                                status: currentStatus,
                            });

                            // 🔹 Lưu gần đây kèm dữ liệu
                            if (config.hienThiTenGanDay) {
                                const key = `recent_${selectedClass}`;
                                const updated = [
                                { ...student, fullData: data },
                                ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                ];
                                if (updated.length > 10) updated.pop();
                                localStorage.setItem(key, JSON.stringify(updated));
                                setRecentStudents(updated);
                            }

                            // =======================
                            // 🔹 FALLBACK
                            // =======================
                            } else {
                            setExpandedStudent({
                                ...student,
                                status: studentStatus?.[student.maDinhDanh] || "",
                            });

                            if (config.hienThiTenGanDay) {
                                const key = `recent_${selectedClass}`;
                                const updated = [
                                student,
                                ...recentStudents.filter((s) => s.maDinhDanh !== student.maDinhDanh),
                                ];
                                if (updated.length > 10) updated.pop();
                                localStorage.setItem(key, JSON.stringify(updated));
                                setRecentStudents(updated);
                            }
                            }

                        } catch (err) {
                            console.error("❌ Lỗi khi click học sinh:", err);
                            setDoneMessage("⚠️ Có lỗi khi kiểm tra trạng thái bài.");
                            setOpenDoneDialog(true);
                        }
                        }}

                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {student.stt}. {student.hoVaTen}
                          </Typography>                          
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 🔹 Nút quay lại danh sách gần đây nếu đang xem toàn lớp */}
        {showAll && config.hienThiTenGanDay && recentStudents.length > 0 && (
          <Grid container spacing={2} justifyContent="left" sx={{ mt: 6, mb: 3 }}>
            
            {/* Đặt icon vào đúng vị trí của CỘT ĐẦU TIÊN */}
            <Grid item>
              <Box sx={{ ml: { xs: 0, sm: 1 } }}>
                <Tooltip title="Chế độ xem: Gần đây">
                  <IconButton
                    onClick={() => setShowAll(false)}
                    sx={{
                      fontSize: '1.2rem',
                      padding: '6px 16px',
                      minHeight: '36px',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      borderRadius: '4px',
                      color: 'primary.main',
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
                    }}
                  >
                    <AccessTimeIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        )}


      </Paper>

      {/* 🔹 Dialog hiển thị đánh giá học sinh */}
      <StudentStatusDialog
        expandedStudent={expandedStudent}
        setExpandedStudent={setExpandedStudent}
        studentStatus={studentStatus}
        handleStatusChange={handleStatusChange}
        saving={saving}
        PaperComponent={PaperComponent}
      />

      {/* Dialog thông báo học sinh đã làm bài */}
      <DoneDialog
        open={openDoneDialog}
        onClose={() => setOpenDoneDialog(false)}
        doneStudent={doneStudent}
        config={config}
        choXemDiem={choXemDiem}
        convertPercentToScore={convertPercentToScore}
      />
    </Box>
  );
}

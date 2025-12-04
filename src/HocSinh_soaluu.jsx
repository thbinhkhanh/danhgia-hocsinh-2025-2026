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
  InputLabel
} from "@mui/material";

import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, updateDoc, setDoc } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import CloseIcon from "@mui/icons-material/Close";
import Draggable from "react-draggable";
import { useTheme, useMediaQuery } from "@mui/material"; 
import { useNavigate } from "react-router-dom";

import DoneDialog from "../dialog/DoneDialog";
import StudentStatusDialog from "../dialog/StudentStatusDialog";


export default function HocSinh() {
  // 🔹 Lấy context
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const navigate = useNavigate();

  // 🔹 Local state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
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


  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};

        const tuan = data.tuan || 1;
        const mon = data.mon || "Tin học";
        const lop = data.lop || "";
        const deTracNghiem = data.deTracNghiem || ""; // 🔹 Thêm dòng này

        // 🔹 Cập nhật ConfigContext đầy đủ
        setConfig({ tuan, mon, lop, deTracNghiem });

        // 🔹 Cập nhật local state
        setSelectedWeek(tuan);
        setSelectedClass(lop);
      },
      (err) => {
        console.error("❌ Lỗi khi lắng nghe CONFIG/config:", err);
      }
    );

    return () => unsubscribe();
  }, []);

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
    if (!selectedClass || !selectedWeek) return;

    const fetchWeekData = async () => {
      try {
        const classKey = config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;
        const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);
        const tuanSnap = await getDoc(tuanRef);

        if (tuanSnap.exists()) {
          setWeekData(tuanSnap.data());
        } else {
          setWeekData({});
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải dữ liệu tuần:", err);
        setWeekData({});
      }
    };

    fetchWeekData();
  }, [selectedClass, selectedWeek, config?.mon]);

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

      const classKey =
        config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;

      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: hoVaTen,
        [`${studentId}.status`]: status,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          await setDoc(tuanRef, {
            [studentId]: { hoVaTen, status },
          });
        } else {
          throw err;
        }
      });
    } catch (err) {
      console.error("❌ Lỗi khi lưu trạng thái học sinh:", err);
    } finally {
      setSaving(false); // ✅ Ghi xong, mở lại nút X
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


  useEffect(() => {
  if (!expandedStudent?.maDinhDanh || !selectedClass) return;

  // Nếu là kiểm tra định kỳ → ưu tiên loại này
  if (config?.kiemTraDinhKi === true) {
    const hocKy = config?.hocKy || "GKI";

    const classKey =
      config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;

    const ktdkRef = doc(
      db,
      `KTDK/${hocKy}/${classKey}/${expandedStudent.maDinhDanh}`
    );

    const unsubscribe = onSnapshot(ktdkRef, (docSnap) => {
      if (!docSnap.exists()) {
        setStudentStatus((prev) => ({
          ...prev,
          [expandedStudent.maDinhDanh]: ""
        }));
        return;
      }

      const data = docSnap.data();
      const lyThuyet = data?.lyThuyet ?? null;

      const status = lyThuyet !== null ? "ĐÃ LÀM KIỂM TRA" : "";

      setStudentStatus((prev) => ({
        ...prev,
        [expandedStudent.maDinhDanh]: status
      }));
    });

    return () => unsubscribe();
  }

  // ========================
  // 🟢 BÀI TẬP TUẦN – DGTX
  // ========================
  if (config?.baiTapTuan === true) {
    if (!selectedWeek) return;

    const classKey =
      config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;

    const tuanRef = doc(
      db,
      `DGTX/${classKey}/tuan/tuan_${selectedWeek}`
    );

    const unsubscribe = onSnapshot(
      tuanRef,
      (docSnap) => {
        if (!docSnap.exists()) return;

        const record = docSnap.data()?.[expandedStudent.maDinhDanh];
        const currentStatus = record?.status || "";

        setStudentStatus((prev) => {
          if (prev[expandedStudent.maDinhDanh] === currentStatus) return prev;
          return {
            ...prev,
            [expandedStudent.maDinhDanh]: currentStatus,
          };
        });
      },
      (error) => {
        console.error("❌ Lỗi khi lắng nghe đánh giá realtime:", error);
      }
    );

    return () => unsubscribe();
  }
}, [
  expandedStudent?.maDinhDanh,
  selectedClass,
  selectedWeek,
  config?.mon,
  config?.baiTapTuan,
  config?.kiemTraDinhKi,
  config?.hocKy,
]);


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
      }}
    >
      {/* 🔹 Tiêu đề */}
      <Box sx={{ textAlign: "center", mb: -1 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            color: "#1976d2",
            //borderBottom: "3px solid #1976d2",
            display: "inline-block",
            pb: 1,
          }}
        >
          {selectedClass
            ? `DANH SÁCH LỚP ${selectedClass}`
            : "DANH SÁCH HỌC SINH"}
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
        {/* 🔹 Môn (chỉ hiển thị, không cho thay đổi) */}
        <TextField
          label="Môn"
          value={config.mon || "Tin học"}
          InputProps={{ readOnly: true }}
          size="small"
          sx={{
            width: 120,
            //bgcolor: "#f5f5f5",
            "& .MuiInputBase-input.Mui-disabled": { color: "#000" },
            fontWeight: "bold",
          }}
        />

        {/* 🔹 Tuần (chỉ hiển thị, không cho thay đổi) */}
        <TextField
          label="Tuần"
          value={`Tuần ${config.tuan || 1}`}
          InputProps={{ readOnly: true }}
          size="small"
          sx={{
            width: 120,
            //bgcolor: "#f5f5f5",
            "& .MuiInputBase-input.Mui-disabled": { color: "#000" },
            fontWeight: "bold",
          }}
        />
      </Box>

      {/* 🔹 Danh sách học sinh */}
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
                      "&:hover": {
                        transform: "scale(1.03)",
                        boxShadow: 4,
                        bgcolor: "#f5f5f5",
                      },
                    }}
                    onClick={async () => {
                      const isBaiTapTuan = Boolean(config?.baiTapTuan);
                      const isKiemTraDinhKi = Boolean(config?.kiemTraDinhKi);

                      try {
                        if (isBaiTapTuan) {
                          // 🔹 Bài tập tuần
                          const hsData = weekData?.[student.maDinhDanh];
                          const daLamBai = hsData?.diemTracNghiem !== undefined && hsData?.diemTracNghiem !== null;

                          if (daLamBai) {
                            setDoneStudent({
                              hoVaTen: student.hoVaTen,
                              diemTN: hsData?.diemTN ?? hsData?.diemTracNghiem,
                            });
                            setOpenDoneDialog(true);
                            return;
                          }

                          // Chưa làm → mở trang Trắc nghiệm
                          navigate("/tracnghiem", {
                            state: {
                              studentId: student.maDinhDanh,
                              fullname: student.hoVaTen,
                              lop: selectedClass,
                              selectedWeek,
                              mon: config.mon,
                            },
                          });

                        } else if (isKiemTraDinhKi) {
                          // 🔹 Kiểm tra định kỳ
                          const hocKyMap = {
                            "Giữa kỳ I": "GKI",
                            "Cuối kỳ I": "CKI",
                            "Giữa kỳ II": "GKII",
                            "Cả năm": "CN",
                          };
                          const hocKyFirestore = hocKyMap[config.hocKy];

                          if (!hocKyFirestore) {
                            setDoneMessage("⚠️ Cấu hình học kỳ không hợp lệ.");
                            setOpenDoneDialog(true);
                            return;
                          }

                          // Truy cập document cấp cao nhất (ví dụ: CKI)
                          const docRef = doc(db, "KTDK", hocKyFirestore);
                          const docSnap = await getDoc(docRef);
                          const fullData = docSnap.exists() ? docSnap.data() : null;

                          console.log("📦 Firestore fullData:", fullData);

                          // Truy cập map lớp → map học sinh
                          const hsData = fullData?.[selectedClass]?.[student.maDinhDanh];

                          console.log("🎯 hsData:", hsData);

                          const lyThuyet = hsData?.lyThuyet ?? hsData?.LyThuyet ?? null;

                          if (lyThuyet != null) {
                            setDoneStudent({
                              hoVaTen: hsData?.hoVaTen ?? student.hoVaTen,
                              diemTN: lyThuyet,
                            });
                            setOpenDoneDialog(true);
                            return;
                          }

                          // Chưa làm → mở trang Trắc nghiệm
                          navigate("/tracnghiem", {
                            state: {
                              studentId: student.maDinhDanh,
                              fullname: student.hoVaTen,
                              lop: selectedClass,
                              selectedWeek,
                              mon: config.mon,
                            },
                          });

                        } else {
                          // 🔹 Mặc định → đánh giá định kỳ
                          setExpandedStudent(student);
                        }
                      } catch (err) {
                        console.error("❌ Lỗi khi kiểm tra trạng thái học sinh:", err);
                        setDoneMessage("⚠️ Có lỗi khi kiểm tra trạng thái bài. Vui lòng thử lại!");
                        setOpenDoneDialog(true);
                      }
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {student.stt}. {student.hoVaTen}
                      </Typography>
                      {status && (
                        <Chip
                          label={statusColors[status].label}
                          color={statusColors[status].color}
                          size="small"
                          sx={{ ml: 1, fontWeight: "bold" }}
                        />
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Grid>
        ))}
      </Grid>
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

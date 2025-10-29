import React, { useState, useEffect, useContext } from "react";
import { 
  Box, Typography, MenuItem, Select, Grid, Paper, Button, Stack, 
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
//import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, updateDoc, setDoc } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import { deleteField } from "firebase/firestore";
import CloseIcon from "@mui/icons-material/Close";


export default function Home() {
  // 🔹 Lấy context
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  

  // 🔹 Local state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentStatus, setStudentStatus] = useState({});

  const { config, setConfig } = useContext(ConfigContext);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [systemLocked, setSystemLocked] = useState(false);

  // 🔹 useEffect chỉ quản lý config chung (tuan, hethong, congnghe, giaovien)
useEffect(() => {
  const docRef = doc(db, "CONFIG", "config");

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();

      const tuan = data.tuan || 1;
      const hethong = data.hethong ?? false;
      const congnghe = data.congnghe === true;
      //const giaovien = data.giaovien === true;

      // 🔹 Cập nhật local state các phần config khác
      setSelectedWeek(tuan);
      setSystemLocked(!hethong);

      // 🔹 Cập nhật ConfigContext (không bao gồm lop)
      setConfig((prev) => ({
        ...prev,
        tuan,
        hethong,
        congnghe,
        //giaovien,
      }));
    } else {
      console.warn("⚠️ Không tìm thấy CONFIG/config trong Firestore, dùng mặc định");
      setSelectedWeek(1);
      setSystemLocked(false);
      setConfig({
        tuan: 1,
        hethong: false,
        lop: "",
        congnghe: false,
        //giaovien: false,
      });
    }
  }, (err) => {
    console.error("❌ Lỗi khi lắng nghe CONFIG/config:", err);
  });

  return () => unsubscribe();
}, []);

// 🔹 useEffect riêng chỉ fetch lop từ Firestore
useEffect(() => {
  const docRef = doc(db, "CONFIG", "config");

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const lopConfig = data.lop || "";

      // 🔹 Cập nhật lớp realtime
      setSelectedClass(lopConfig);

      // 🔹 Cập nhật ConfigContext với lop
      setConfig((prev) => ({
        ...prev,
        lop: lopConfig,
      }));
    } else {
      setSelectedClass("");
      setConfig((prev) => ({ ...prev, lop: "" }));
    }
  }, (err) => {
    console.error("❌ Lỗi khi lắng nghe CONFIG/config (lop):", err);
  });

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
    //console.log(`📦 Dữ liệu học sinh lớp "${selectedClass}" lấy từ context:`, cached);
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
      // 🔹 Nếu là lớp công nghệ, thêm hậu tố "_CN"
      const classKey = config?.congnghe ? `${selectedClass}_CN` : selectedClass;

      // 🔹 Đường dẫn tài liệu Firestore cho tuần hiện tại
      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      // 🔹 Ghi trực tiếp vào field con của học sinh
      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: hoVaTen,
        [`${studentId}.status`]: status,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          // 🔹 Nếu document chưa tồn tại → tạo mới
          await setDoc(tuanRef, {
            [studentId]: { hoVaTen, status },
          });
        } else {
          throw err;
        }
      });

      console.log(`✅ ${studentId}: ${hoVaTen} (${status}) đã lưu thành công`);
    } catch (err) {
      console.error("❌ Lỗi khi lưu trạng thái học sinh:", err);
    }
  };

  {/*const saveStudentStatusOK = async (studentId, hoVaTen, status) => {
    if (!selectedWeek || !selectedClass) return;

    try {
      // ✅ Nếu config.congnghe === true → thêm hậu tố "_CN"
      const classKey = config?.congnghe === true ? `${selectedClass}_CN` : selectedClass;

      // 🔹 Tham chiếu tới DGTX / [lop] / tuan / [tuan_x]
      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      // 🔹 Lấy dữ liệu hiện có (nếu cần)
      const docSnap = await getDoc(tuanRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      // 🔹 Cập nhật dữ liệu học sinh
      const updatedData = {
        ...existingData,
        [studentId]: { hoVaTen, status },
      };

      // 🔹 Lưu vào Firestore
      await setDoc(tuanRef, updatedData, { merge: true });

      console.log(
        `✅ Đã lưu học sinh ${studentId}: ${hoVaTen} (${status}) tuần ${selectedWeek} lớp ${classKey}`
      );
    } catch (err) {
      console.error("❌ Lỗi lưu trạng thái học sinh vào DGTX:", err);
    }
  };*/}


  const saveStudentStatus1 = async (studentId, hoVaTen, status) => {
    if (!selectedWeek || !selectedClass) return;

    // ✅ Kiểm tra config.congnghe
    //console.log("🔍 saveStudentStatus() gọi với:");
    //console.log("   - selectedClass:", selectedClass);
    //console.log("   - config.congnghe:", config?.congnghe);
    //console.log("   - selectedWeek:", selectedWeek);

    // ✅ Nếu config.congnghe === true → thêm hậu tố "_CN"
    const classKey = config?.congnghe === true ? `${selectedClass}_CN` : selectedClass;
    //console.log("👉 classKey được sử dụng:", classKey);

    const docRef = doc(db, "DANHGIA", `tuan_${selectedWeek}`);

    try {
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() : {};

      // ⚠️ dùng classKey ở đây thay vì selectedClass
      const classData = data[classKey] || {};

      // Ghi hoVaTen + status
      classData[studentId] = { hoVaTen, status };

      //await setDoc(docRef, { ...data, [classKey]: classData });
      await setDoc(
        docRef,
        { [`${classKey}.${studentId}`]: { hoVaTen, status } },
        { merge: true }
      );

      //console.log(
      //  `✅ Đã lưu học sinh ${studentId}: ${hoVaTen} (${status}) tuần ${selectedWeek} lớp ${classKey}`
      //);
    } catch (err) {
      console.error("❌ Lỗi lưu trạng thái học sinh:", err);
    }
  };

  const handleStatusChange = (maDinhDanh, hoVaTen, status) => {
    setStudentStatus((prev) => {
      const updated = { ...prev };

      // Nếu chọn lại trạng thái đã chọn, hủy đánh giá
      const newStatus = prev[maDinhDanh] === status ? "" : status;
      updated[maDinhDanh] = newStatus;

      // 🔹 Lưu vào Firestore ngay
      saveStudentStatus(maDinhDanh, hoVaTen, newStatus);

      return updated;
    });
  };

  useEffect(() => {
    // 🔹 Nếu chưa có thông tin cần thiết → thoát
    if (!expandedStudent || !selectedClass || !selectedWeek) return;

    const classKey = config?.congnghe ? `${selectedClass}_CN` : selectedClass;
    const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

    // 🔹 Đăng ký lắng nghe realtime
    const unsubscribe = onSnapshot(
      tuanRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const record = data[expandedStudent.maDinhDanh];

          if (record && record.status) {
            // 🟢 Có dữ liệu đánh giá → cập nhật UI
            setStudentStatus((prev) => ({
              ...prev,
              [expandedStudent.maDinhDanh]: record.status,
            }));
          } else {
            // 🔵 Không có đánh giá → xóa trạng thái cũ nếu có
            setStudentStatus((prev) => {
              const updated = { ...prev };
              delete updated[expandedStudent.maDinhDanh];
              return updated;
            });
          }
        } else {
          // Document chưa tồn tại → không có đánh giá nào
          setStudentStatus((prev) => {
            const updated = { ...prev };
            delete updated[expandedStudent.maDinhDanh];
            return updated;
          });
        }
      },
      (error) => {
        console.error("❌ Lỗi khi lắng nghe đánh giá realtime:", error);
      }
    );

    // 🔹 Khi đóng dialog → hủy lắng nghe
    return () => unsubscribe();
  }, [expandedStudent, selectedClass, selectedWeek, config?.congnghe]);


  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff" },
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff" },       // tím, chữ trắng
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff" }, // cam, chữ trắng
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
        maxWidth: 1300,
        bgcolor: "white",
      }}
    >
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            color: "#1976d2",
            borderBottom: "3px solid #1976d2",
            display: "inline-block",
            pb: 1,
          }}
        >
          {selectedClass ? `DANH SÁCH LỚP ${selectedClass}` : "DANH SÁCH HỌC SINH"}
        </Typography>
      </Box>

      {/* Danh sách học sinh */}
      <Grid container spacing={2} justifyContent="center">
        {columns.map((col, colIdx) => (
          <Grid item key={colIdx}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {col.map((student) => {
                const status = studentStatus[student.maDinhDanh];
                const colors = status
                  ? statusColors[status]
                  : { bg: "white", text: "inherit" };

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
                      bgcolor: "#ffffff", // luôn nền trắng
                      color: "inherit", // giữ màu chữ mặc định
                      transition: "0.2s",
                      boxShadow: 1,
                      "&:hover": {
                        transform: "scale(1.03)", // phóng to nhẹ khi hover
                        boxShadow: 4,
                        bgcolor: "#f5f5f5", // đổi nhẹ màu nền khi hover
                      },
                    }}
                    onClick={() => {
                      setExpandedStudent(student); // dùng để hiển thị modal
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="medium">
                      {student.stt}. {student.hoVaTen}
                    </Typography>
                  </Paper>
                );

              })}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>

    {/* 🔹 Dialog hiển thị khi chọn học sinh */}
    <Dialog
      open={Boolean(expandedStudent)}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          setExpandedStudent(null);
        }
      }}
      maxWidth="xs"
      fullWidth
    >

      {expandedStudent && (
        <>
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#64b5f6", // 🔹 màu nền đậm hơn
              flexWrap: "wrap",
              py: 1.5,
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{ color: "#ffffff", fontSize: "1.05rem" }} // đổi chữ trắng để tương phản
              >
                {expandedStudent.hoVaTen.toUpperCase()}
              </Typography>

              {/*<Typography
                variant="body2"
                sx={{
                  fontWeight: "bold",
                  color: "rgba(255,255,255,0.85)", // chữ nhạt hơn để tương phản
                }}
              >
                Mã định danh: {expandedStudent.maDinhDanh}
              </Typography>*/}
            </Box>

            <IconButton
              onClick={() => setExpandedStudent(null)}
              sx={{
                color: "#f44336",
                "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>


          <DialogContent sx={{ mt: 2 }}>
            <Stack spacing={1}>
              {["Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"].map((s) => {
                const isSelected = studentStatus[expandedStudent.maDinhDanh] === s;
                return (
                  <Button
                    key={s}
                    variant={isSelected ? "contained" : "outlined"}
                    color={
                      s === "Hoàn thành tốt"
                        ? "primary"
                        : s === "Hoàn thành"
                        ? "secondary"
                        : "warning"
                    }
                    onClick={() =>
                      handleStatusChange(
                        expandedStudent.maDinhDanh,
                        expandedStudent.hoVaTen,
                        s
                      )
                    }
                  >
                    {isSelected ? `✓ ${s}` : s}
                  </Button>
                );
              })}

              {/* 🔹 Nút hủy đánh giá */}
              {studentStatus[expandedStudent.maDinhDanh] && (
                <Box sx={{ mt: 5, textAlign: "center" }}>
                  <Button
                    onClick={() =>
                      handleStatusChange(
                        expandedStudent.maDinhDanh,
                        expandedStudent.hoVaTen,
                        ""
                      )
                    }
                    sx={{
                      width: 160,
                      px: 2,
                      bgcolor: "#4caf50",
                      color: "#ffffff",
                      borderRadius: 1,
                      textTransform: "none",
                      fontWeight: "bold",
                      "&:hover": {
                        bgcolor: "#388e3c",
                      },
                      mt: 1,
                    }}
                  >
                    HỦY ĐÁNH GIÁ
                  </Button>
                </Box>
              )}
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  </Box>
);
}

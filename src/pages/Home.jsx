import React, { useState, useEffect, useContext } from "react";
import { 
  Box, Typography, MenuItem, Select, Grid, Paper, Button, Stack 
} from "@mui/material";
//import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, updateDoc, setDoc } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";


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
      const giaovien = data.giaovien === true;

      // 🔹 Cập nhật local state các phần config khác
      setSelectedWeek(tuan);
      setSystemLocked(!hethong);

      // 🔹 Cập nhật ConfigContext (không bao gồm lop)
      setConfig((prev) => ({
        ...prev,
        tuan,
        hethong,
        congnghe,
        giaovien,
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
        giaovien: false,
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
    await setDoc(docRef, { [classKey]: { [studentId]: { hoVaTen, status } } }, { merge: true });

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

  const statusColors = {
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff" }, // cam, chữ trắng
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff" },       // tím, chữ trắng
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff" },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",      // căn giữa ngang
        background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
        pt: 3,                     // khoảng cách từ trên
        px: 3,
      }}
    >
      {/* Card lớn chứa toàn bộ */}
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
        {/* Tiêu đề phía trên dropdown */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              color: "#1976d2",
              borderBottom: "3px solid #1976d2", // đường gạch ngang màu xanh
              display: "inline-block",           // đường gạch ngang bằng width nội dung
              pb: 1,                             // khoảng cách giữa chữ và gạch
            }}
          >
            {selectedClass
              ? `DANH SÁCH HỌC SINH - LỚP ${selectedClass}`
              : "DANH SÁCH HỌC SINH"}
          </Typography>
        </Box>

        {/* Nhãn và dropdown */}
        {/*<Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",  // căn giữa ngang
            gap: 2,
            mb: 4,
          }}
        >
          <Typography
            variant="body1"
            fontWeight={500}
            color="text.primary"
            sx={{ whiteSpace: "nowrap" }}
          >
            Lớp:
          </Typography>

          <Select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            size="small"
            sx={{
              width: 80,
              height: 40,
              borderRadius: 2,
              bgcolor: "transparent",     // bỏ nền xám
              "& .MuiSelect-select": {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 1,
              },
              "&:hover": { bgcolor: "#e0e0e0" }, // chỉ nền hover
            }}
          >
            {classes.map((cls) => (
              <MenuItem
                key={cls}
                value={cls}
                sx={{
                  fontSize: 14,
                  minHeight: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cls}
              </MenuItem>
            ))}
          </Select>
        </Box>*/}

        {/* Grid học sinh */}
        <Grid container spacing={2} justifyContent="center">
          {columns.map((col, colIdx) => (
            <Grid item key={colIdx}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {col.map((student) => {
                  const isExpanded = expandedStudent === student.maDinhDanh;
                  const status = studentStatus[student.maDinhDanh];
                  const colors = status ? statusColors[status] : { bg: "white", text: "inherit" };

                  return (
                    <Box key={student.maDinhDanh} sx={{ position: "relative" }}>
                      {/* Thẻ học sinh */}
                      <Paper
                        elevation={3}
                        sx={{
                          minWidth: 120,
                          width: { xs: "75vw", sm: "auto" }, // 📱 chỉ trên điện thoại: rộng 75% màn hình
                          p: 2,
                          borderRadius: 2,
                          cursor: "pointer",
                          transition: "all 0.3s",
                          textAlign: "left",
                          bgcolor: !isExpanded ? (status ? colors.bg : "white") : "white",
                          color: status ? colors.text : "black",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: 4,
                            bgcolor: !status ? "#e3f2fd" : undefined,
                          },
                        }}

                        onClick={() => toggleExpand(student.maDinhDanh)}
                        onMouseEnter={() => setExpandedStudent(null)} // <-- ẩn overlay khi hover vào học sinh khác
                      >
                        <Typography variant="subtitle2" fontWeight="medium">
                          {student.stt}. {student.hoVaTen}
                        </Typography>
                      </Paper>
                      {/* Overlay đánh giá */}
                      {isExpanded && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "#e0e0e0", // nền xám toàn vùng mở rộng
                            color: "black",
                            zIndex: 10,
                          }}
                        >
                          <Box
                            sx={{
                              //bgcolor: "white", // nền trắng bao quanh các mức đánh giá
                              bgcolor: "#e3f2fd",
                              borderRadius: 2,
                              boxShadow: 3,
                              p: 2,
                              border: "2px solid #2196f3", // viền xanh xung quanh vùng trắng
                            }}
                          >
                            <Stack spacing={1}>
                              {["Chưa hoàn thành", "Hoàn thành", "Hoàn thành tốt"].map((s) => (
                                <Button
                                  key={s}
                                  size="small"
                                  sx={{
                                    bgcolor: status === s ? "#e0e0e0" : "#f9f9f9",
                                    color: "black",
                                    borderRadius: 1,
                                    textTransform: "none",
                                    justifyContent: "flex-start",
                                    fontSize: 15,
                                    border: "1px solid",
                                    borderColor: status === s ? "#bdbdbd" : "#ccc",
                                    width: "100%",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(student.maDinhDanh, student.hoVaTen, s);
                                    setExpandedStudent(null);
                                  }}
                                >
                                  {status === s ? "✅ " : ""}
                                  {s}
                                </Button>
                              ))}
                            </Stack>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}

              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}

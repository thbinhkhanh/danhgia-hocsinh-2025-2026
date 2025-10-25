import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Card,
  Typography,
  Divider,
  Stack,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  useMediaQuery,
  InputLabel,
} from "@mui/material";

import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { StudentDataContext } from "../context/StudentDataContext";
import { exportKTDK } from "../utils/exportKTDK";
import { printKTDK } from "../utils/printKTDK";

import { doc, getDoc, getDocs, collection, setDoc, writeBatch, deleteField } from "firebase/firestore";

import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PrintIcon from "@mui/icons-material/Print";

import { exportEvaluationToExcelFromTable } from "../utils/exportExcelFromTable";
import { Snackbar, Alert } from "@mui/material";


export default function KiemTraDinhKi() {
  const { classData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const { studentData, setStudentData } = useContext(StudentContext);

  const [isCongNghe, setIsCongNghe] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("HK1"); // mặc định HỌC KÌ I
  const { getStudentsForClass, setStudentsForClass } = useContext(StudentDataContext);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isTeacherChecked, setIsTeacherChecked] = useState(false);


  useEffect(() => {
    if (config?.lop) setSelectedClass(config.lop);
  }, [config?.lop]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        if (classData && classData.length > 0) {
          setClasses(classData);
          setSelectedClass((prev) => prev || classData[0]);
          return;
        }

        const snapshot = await getDocs(collection(db, "DANHSACH"));
        const classList = snapshot.docs.map((doc) => doc.id);
        setClassData(classList);
        setClasses(classList);
        if (classList.length > 0) setSelectedClass(classList[0]);
      } catch (err) {
        console.error("Lỗi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
      }
    };

    fetchClasses();
  }, [classData, setClassData]);

  const fetchStudentsAndStatus = async (cls) => {
    const currentClass = cls || selectedClass; // dùng lớp được truyền nếu có
    if (!currentClass) return;

    const classKey = `${currentClass}${isCongNghe ? "_CN" : ""}_${selectedTerm}`;

    // 1️⃣ Kiểm tra context trước
    const cached = getStudentsForClass(classKey);
    if (cached) {
      //console.log(`🟢 Lấy dữ liệu học sinh từ Context cho lớp ${classKey}`);
      setStudents(cached);
      return;
    }

    try {
      //console.log(`🟡 Chưa có trong Context, fetch từ Firestore cho lớp ${classKey}`);

      // 2️⃣ Lấy danh sách học sinh từ DANHSACH
      const classDocRef = doc(db, "DANHSACH", currentClass);
      const classSnap = await getDoc(classDocRef);
      if (!classSnap.exists()) {
        //console.log(`⚪ Không có dữ liệu trong Firestore cho lớp ${currentClass}`);
        setStudents([]);
        return;
      }

      const studentsData = classSnap.data();
      let studentList = Object.entries(studentsData).map(([maDinhDanh, info]) => ({
        maDinhDanh,
        hoVaTen: info.hoVaTen || "",
        tracNghiem: "",
        thucHanh: "",
        tongCong: "",
        xepLoai: "",
        nhanXet: "",
        dgtx: "",
        statusByWeek: {},
      }));

      // 🔹 2.5️⃣ Lấy dữ liệu ĐGTX riêng
      try {
        const dgtxDocRef = doc(db, "DGTX", classKey);
        const dgtxSnap = await getDoc(dgtxDocRef);
        if (dgtxSnap.exists()) {
          const dgtxData = dgtxSnap.data();
          studentList = studentList.map((s) => ({
            ...s,
            dgtx: dgtxData[s.maDinhDanh]?.dgtx ?? s.dgtx ?? "",
          }));
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy ĐGTX:", err);
      }

      // 3️⃣ Lấy điểm từ BANGDIEM nếu có
      const termDoc = selectedTerm === "HK1" ? "HK1" : "CN";
      const scoreDocRef = doc(db, "BANGDIEM", termDoc);
      const scoreSnap = await getDoc(scoreDocRef);
      if (scoreSnap.exists()) {
        const scoreData = scoreSnap.data();
        const classScores = scoreData[classKey] || {};
        studentList = studentList.map((s) => ({
          ...s,
          tracNghiem: classScores[s.maDinhDanh]?.tracNghiem || "",
          thucHanh: classScores[s.maDinhDanh]?.thucHanh || "",
          tongCong: classScores[s.maDinhDanh]?.tongCong || "",
          xepLoai: classScores[s.maDinhDanh]?.xepLoai || "",
          nhanXet: classScores[s.maDinhDanh]?.nhanXet || "",
          dgtx: classScores[s.maDinhDanh]?.dgtx || s.dgtx || "",
        }));
      }

      // 4️⃣ Sắp xếp theo tên
      studentList.sort((a, b) => {
        const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        return nameA.localeCompare(nameB);
      });
      studentList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

      // 5️⃣ Cập nhật state và context
      setStudents(studentList);
      setStudentsForClass(classKey, studentList);
      //console.log(`🟢 Đã lưu dữ liệu học sinh vào Context cho lớp ${classKey}`);
    } catch (err) {
      console.error("❌ Lỗi khi lấy dữ liệu:", err);
      setStudents([]);
    }
  };

  useEffect(() => {
    fetchStudentsAndStatus();
    }, [selectedClass, selectedTerm, isCongNghe]);


    // Hàm nhận xét ngẫu nhiên dựa trên xếp loại
// Hàm lấy nhận xét tự động theo xếp loại
const getNhanXetTuDong = (xepLoai) => {
  if (!xepLoai) return "";

  let loaiNhanXet;
  if (xepLoai === "T") loaiNhanXet = "tot";
  else if (xepLoai === "H") loaiNhanXet = "kha";
  else if (xepLoai === "C") loaiNhanXet = "trungbinh";
  else loaiNhanXet = "yeu"; // cho các trường hợp khác

  const arrNhanXet = nhanXetTheoMuc[loaiNhanXet];
  return arrNhanXet[Math.floor(Math.random() * arrNhanXet.length)];
};

// Hàm xử lý thay đổi ô bảng
const handleCellChange = (maDinhDanh, field, value) => {
  // ✅ Kiểm tra dữ liệu nhập vào Trắc nghiệm / Thực hành
  if ((field === "tracNghiem" || field === "thucHanh") && value !== "") {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 5) return; // Chỉ chấp nhận số từ 0–5
  }

  setStudents(prev =>
    prev.map(s => {
      if (s.maDinhDanh === maDinhDanh) {
        const updated = { ...s, [field]: value };

        // ✅ Nếu chỉnh Trắc nghiệm hoặc Thực hành
        if (field === "tracNghiem" || field === "thucHanh") {
          const tn = parseFloat(updated.tracNghiem) || 0;
          const th = parseFloat(updated.thucHanh) || 0;

          if (updated.tracNghiem !== "" && updated.thucHanh !== "") {
            const tong = tn + th;
            updated.tongCong = Math.round(tong); // Làm tròn trước khi dùng

            // ✅ Dựa hoàn toàn vào giá trị đã làm tròn
            if (updated.tongCong === 8 && s.dgtx === "T") {
              updated.xepLoai = "T";
            } else if (updated.tongCong >= 9) {
              updated.xepLoai = "T";
            } else if (updated.tongCong >= 5) {
              updated.xepLoai = "H";
            } else {
              updated.xepLoai = "C";
            }

            // ✅ Cập nhật nhận xét tự động
            updated.nhanXet = getNhanXetTuDong(updated.xepLoai);
          } else {
            updated.tongCong = "";
            updated.xepLoai = "";
            updated.nhanXet = "";
          }
        }

        // ✅ Nếu chỉnh trực tiếp Xếp loại
        if (field === "xepLoai") {
          updated.nhanXet = getNhanXetTuDong(updated.xepLoai);
        }

        return updated;
      }
      return s;
    })
  );
};

const [snackbar, setSnackbar] = useState({
  open: false,
  message: "",
  severity: "success", // "success" | "error" | "info" | "warning"
});


const handleSaveAll = async () => {
  if (!students || students.length === 0) return;

  // ✅ Thêm học kì vào classKey
  const classKey = `${selectedClass}${isCongNghe ? "_CN" : ""}_${selectedTerm}`;
  const termDoc = selectedTerm === "HK1" ? "HK1" : "CN";
  const docRef = doc(db, "BANGDIEM", termDoc);

  const batch = writeBatch(db);

  const studentsMap = {};
  students.forEach(s => {
    studentsMap[s.maDinhDanh] = {
        hoVaTen: s.hoVaTen,
        tracNghiem: s.tracNghiem !== "" ? Number(s.tracNghiem) : null,
        thucHanh: s.thucHanh !== "" ? Number(s.thucHanh) : null,
        tongCong: s.tongCong !== "" ? Number(s.tongCong) : null,
        xepLoai: s.xepLoai,
        nhanXet: s.nhanXet
    };
  });


  batch.set(docRef, { [classKey]: studentsMap }, { merge: true });

  try {
    await batch.commit();

    setStudentData(prev => ({
        ...prev,
        [classKey]: students
    }));

    setStudentsForClass(classKey, students);

    setSnackbar({
        open: true,
        //message: `✅ Đã lưu tất cả học sinh lớp ${classKey} vào ${termDoc}`,
        message: `✅ Lưu thành công!`,
        severity: "success",
    });
    } catch (err) {
    console.error("❌ Lỗi lưu dữ liệu học sinh:", err);
    setSnackbar({
        open: true,
        message: "❌ Lỗi khi lưu dữ liệu học sinh!",
        severity: "error",
    });
    }

};


 const handleDownload = async () => {
    try {
      await exportKTDK(students, selectedClass, selectedTerm);
    } catch (error) {
      console.error("❌ Lỗi khi xuất Excel:", error);
    }
  };


  const columns = ["tracNghiem", "thucHanh", "xepLoai", "nhanXet"];

const handleKeyNavigation = (e, rowIndex, col) => {
  const navigKeys = ["Enter", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Tab"];
  if (!navigKeys.includes(e.key)) return; // cho phép nhập bình thường

  e.preventDefault();

  let nextRow = rowIndex;
  let nextCol = columns.indexOf(col);

  if (e.key === "Enter" || e.key === "ArrowDown") {
    nextRow = Math.min(students.length - 1, rowIndex + 1);
  } else if (e.key === "ArrowUp") {
    nextRow = Math.max(0, rowIndex - 1);
  } else if (e.key === "ArrowRight" || e.key === "Tab") {
    if (col === "tracNghiem") {
      nextCol = columns.indexOf("thucHanh");
    } else if (col === "thucHanh") {
      nextCol = columns.indexOf("tracNghiem");
      nextRow = Math.min(students.length - 1, rowIndex + 1);
    } else {
      // các cột khác: đi theo cột bình thường
      nextCol = Math.min(columns.length - 1, nextCol + 1);
    }
  } else if (e.key === "ArrowLeft") {
    if (col === "thucHanh") nextCol = columns.indexOf("tracNghiem");
    else nextCol = Math.max(0, nextCol - 1);
  }

  const nextInput = document.getElementById(`${columns[nextCol]}-${nextRow}`);
  nextInput?.focus();
};

const nhanXetTheoMuc = {
    tot: [
      "Em có ý thức học tập tốt, thao tác thành thạo và tích cực trong các hoạt động thực hành Tin học.",
      "Em chủ động, tự tin, biết vận dụng CNTT vào học tập và đời sống.",
      "Em học tập nghiêm túc, thao tác nhanh, nắm vững kiến thức Tin học cơ bản.",
      "Em thể hiện kỹ năng sử dụng máy tính thành thạo, làm việc khoa học và hiệu quả.",
      "Em yêu thích môn Tin học, chủ động khám phá và hỗ trợ bạn bè trong học tập.",
      "Em có khả năng vận dụng kiến thức vào giải quyết tình huống thực tế liên quan đến CNTT.",
      "Em thao tác nhanh, chính xác, sử dụng phần mềm đúng quy trình và sáng tạo.",
      "Em có tư duy logic tốt, biết trình bày và lưu trữ sản phẩm học tập khoa học.",
      "Em tiếp thu nhanh, thực hành thuần thục, hoàn thành tốt các nhiệm vụ học tập.",
      "Em thể hiện tinh thần hợp tác, chia sẻ và giúp đỡ bạn trong hoạt động nhóm."
    ],

    kha: [
      "Em có ý thức học tập tốt, biết sử dụng thiết bị và phần mềm cơ bản.",
      "Em tiếp thu bài khá, cần chủ động hơn trong việc thực hành và vận dụng kiến thức.",
      "Em làm bài cẩn thận, có tinh thần học hỏi nhưng cần rèn luyện thêm thao tác thực hành.",
      "Em nắm được kiến thức trọng tâm, thực hiện thao tác tương đối chính xác.",
      "Em có khả năng sử dụng máy tính ở mức khá, cần luyện tập thêm để tăng tốc độ thao tác.",
      "Em có tinh thần học tập tích cực nhưng đôi khi còn thiếu tự tin khi thực hành.",
      "Em đã biết áp dụng kiến thức để tạo sản phẩm học tập, cần sáng tạo hơn trong trình bày.",
      "Em có tiến bộ rõ, cần phát huy thêm tính chủ động trong học tập Tin học.",
      "Em biết hợp tác trong nhóm, hoàn thành nhiệm vụ được giao tương đối tốt.",
      "Em thực hành đúng hướng dẫn, cần nâng cao hơn khả năng vận dụng vào tình huống mới."
    ],

    trungbinh: [
      "Em hoàn thành các yêu cầu cơ bản, cần cố gắng hơn khi thực hành.",
      "Em còn lúng túng trong thao tác, cần sự hỗ trợ thêm từ giáo viên.",
      "Em có tiến bộ nhưng cần rèn luyện thêm kỹ năng sử dụng phần mềm.",
      "Em hiểu bài nhưng thao tác chậm, cần rèn luyện thêm để nâng cao hiệu quả.",
      "Em đôi khi còn quên thao tác cơ bản, cần ôn tập thường xuyên hơn.",
      "Em hoàn thành nhiệm vụ học tập ở mức trung bình, cần chủ động hơn trong giờ thực hành.",
      "Em có thái độ học tập đúng đắn nhưng cần tập trung hơn khi làm việc với máy tính.",
      "Em nắm được một phần kiến thức, cần hỗ trợ thêm để vận dụng chính xác.",
      "Em có cố gắng, tuy nhiên còn gặp khó khăn khi làm bài thực hành.",
      "Em cần tăng cường luyện tập để cải thiện kỹ năng và độ chính xác khi thao tác."
    ],

    yeu: [
      "Em chưa nắm chắc kiến thức, thao tác còn chậm, cần được hướng dẫn nhiều hơn.",
      "Em cần cố gắng hơn trong học tập, đặc biệt là phần thực hành Tin học.",
      //"Em cần tăng cường luyện tập để nắm vững kiến thức và thao tác máy tính.",
      "Em còn gặp nhiều khó khăn khi sử dụng phần mềm, cần được hỗ trợ thường xuyên.",
      "Em chưa chủ động trong học tập, cần khuyến khích và theo dõi thêm.",
      "Em thao tác thiếu chính xác, cần rèn luyện thêm kỹ năng cơ bản.",
      "Em tiếp thu chậm, cần sự kèm cặp sát sao để tiến bộ hơn.",
      "Em cần dành nhiều thời gian hơn cho việc luyện tập trên máy tính.",
      "Em chưa hoàn thành được yêu cầu bài học, cần hỗ trợ từ giáo viên và bạn bè.",
      "Em cần được củng cố lại kiến thức nền tảng và hướng dẫn thực hành cụ thể hơn."
    ]
  };

  const handlePrint = async () => {
    if (!selectedClass) {
      alert("Vui lòng chọn lớp trước khi in!");
      return;
    }
    try {
      // gọi hàm in, truyền class và học kỳ hiện tại
      await inKTDK(selectedClass, selectedTerm);
    } catch (err) {
      console.error("❌ Lỗi khi in:", err);
      alert("Lỗi khi in danh sách. Vui lòng thử lại!");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 1300,
          mx: "auto",
          position: "relative"
        }}
      >
        {/* 🟩 Nút Lưu, Tải Excel, Làm mới và Đánh giá */}
        <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1 }}>
          {/* Nút Lưu */}
          <Tooltip title="Lưu dữ liệu" arrow>
            <IconButton
              onClick={handleSaveAll}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" }
              }}
            >
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Nút Tải xuống Excel */}
          <Tooltip title="Tải xuống Excel" arrow>
            <IconButton
              onClick={handleDownload}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" }
              }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="In danh sách KTĐK" arrow>
            <IconButton
              onClick={() => printKTDK(students, selectedClass, selectedTerm)}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" },
              }}
            >
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>

        </Box>

        {/* 🟦 Ô chọn học kỳ (desktop: góc trên phải, mobile: dưới tiêu đề) */}
{!isMobile && (
  <Box
    sx={{
      position: "absolute",
      top: 12,
      right: 12
    }}
  >
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={selectedTerm}
        onChange={(e) => setSelectedTerm(e.target.value)}
        size="small"
      >
        <MenuItem value="HK1">Học kì I</MenuItem>
        <MenuItem value="ALL">Cả năm</MenuItem>
      </Select>
    </FormControl>
  </Box>
)}

{/* 🟨 Tiêu đề */}
<Typography
  variant="h5"
  fontWeight="bold"
  color="primary"
  gutterBottom
  sx={{ textAlign: "center", mb: 2 }}
>
  NHẬP ĐIỂM KTĐK
</Typography>

{/* Chỉ hiển thị chọn học kỳ dưới tiêu đề nếu trên mobile */}
{isMobile && (
  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={selectedTerm}
        onChange={(e) => setSelectedTerm(e.target.value)}
        size="small"
      >
        <MenuItem value="HK1">Học kì I</MenuItem>
        <MenuItem value="ALL">Cả năm</MenuItem>
      </Select>
    </FormControl>
  </Box>
)}

{/* 🟩 Stack lớp – môn – checkbox */}
<Stack
  direction="row"
  spacing={2}
  justifyContent="center"
  alignItems="center"
  flexWrap="wrap"
  mb={3}
>
  {/* Lớp */}
  <FormControl size="small" sx={{ minWidth: 80 }}>
    <InputLabel id="lop-label">Lớp</InputLabel>
    <Select
      labelId="lop-label"
      value={selectedClass}
      label="Lớp"
      onChange={async (e) => {
        const newClass = e.target.value;

        // 1️⃣ Cập nhật state ngay (Dropdown sẽ tự đóng)
        setSelectedClass(newClass);
        setConfig(prev => ({ ...prev, lop: newClass }));

        // 2️⃣ Reset danh sách cũ
        setStudents([]);

        // 3️⃣ Hiển thị loading ngắn (tuỳ chọn)
        setLoadingMessage("Đang tải dữ liệu lớp mới...");
        setLoadingProgress(0);

        // 4️⃣ Fetch dữ liệu mới ngay sau khi state được set
        await fetchStudentsAndStatus(newClass); // truyền class mới
      }}
    >
      {classes.map(cls => (
        <MenuItem key={cls} value={cls}>
          {cls}
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  {/* Môn học */}
  <FormControl size="small" sx={{ minWidth: 120 }}>
    <InputLabel id="monhoc-label">Môn học</InputLabel>
    <Select
      labelId="monhoc-label"
      value={isCongNghe ? "congnghe" : "tinhoc"}
      label="Môn học"
      onChange={async (e) => {
        const value = e.target.value;
        const isCN = value === "congnghe";
        try {
          const docRef = doc(db, "CONFIG", "config");
          await setDoc(docRef, { congnghe: isCN }, { merge: true });
          setConfig((prev) => ({ ...prev, congnghe: isCN }));
          setIsCongNghe(isCN);
        } catch (err) {
          console.error("❌ Lỗi cập nhật môn học:", err);
        }
      }}
    >
      <MenuItem value="tinhoc">Tin học</MenuItem>
      <MenuItem value="congnghe">Công nghệ</MenuItem>
    </Select>
  </FormControl>

  {/* Checkbox Giáo viên */}
  <FormControlLabel
    control={
      <Checkbox
        checked={isTeacherChecked || false}
        onChange={(e) => setIsTeacherChecked(e.target.checked)}
      />
    }
    label="Giáo viên"
  />
</Stack>


        {/* 🧾 Bảng học sinh */}
        <TableContainer component={Paper} sx={{ maxHeight: "70vh", overflow: "auto" }}>
          <Table
            stickyHeader
            size="small"
            sx={{
              tableLayout: "fixed",
              minWidth: 800,
              borderCollapse: "collapse",
              "& td, & th": {
                borderRight: "1px solid #e0e0e0", // ✅ Đường kẻ dọc nhạt
                borderBottom: "1px solid #e0e0e0" // Giữ kẻ ngang
              },
              "& th:last-child, & td:last-child": {
                borderRight: "none" // ❌ Bỏ đường ở cột cuối
              }
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 50, px: 1, whiteSpace: "nowrap" }}>STT</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 220, px: 1, whiteSpace: "nowrap" }}>Họ và tên</TableCell>
                {/*<TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>LỚP</TableCell>*/}
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>ĐGTX</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Lí thuyết</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Thực hành</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Tổng cộng</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Mức đạt</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 350, px: 1, whiteSpace: "nowrap" }}>Nhận xét</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((student, idx) => (
                <TableRow key={student.maDinhDanh} hover>
                  <TableCell align="center" sx={{ px: 1 }}>{student.stt}</TableCell>
                  <TableCell align="left" sx={{ px: 1 }}>{student.hoVaTen}</TableCell>
                  {/*<TableCell align="center" sx={{ px: 1 }}>{selectedClass}</TableCell>*/}

                  {/* ĐGTX hiển thị */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <Typography variant="body2" sx={{ textAlign: "center" }}>
                      {student.dgtx || ""}
                    </Typography>
                  </TableCell>

                  {/* Trắc nghiệm */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <TextField
                      variant="standard"
                      value={student.tracNghiem}
                      onChange={(e) =>
                        handleCellChange(student.maDinhDanh, "tracNghiem", e.target.value)
                      }
                      inputProps={{ style: { textAlign: "center", paddingLeft: 2, paddingRight: 2 } }}
                      id={`tracNghiem-${idx}`}
                      onKeyDown={(e) => handleKeyNavigation(e, idx, "tracNghiem")}
                      InputProps={{
                        disableUnderline: true
                      }}
                    />
                  </TableCell>

                  {/* Thực hành */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <TextField
                      variant="standard"
                      value={student.thucHanh}
                      onChange={(e) =>
                        handleCellChange(student.maDinhDanh, "thucHanh", e.target.value)
                      }
                      inputProps={{ style: { textAlign: "center", paddingLeft: 2, paddingRight: 2 } }}
                      id={`thucHanh-${idx}`}
                      onKeyDown={(e) => handleKeyNavigation(e, idx, "thucHanh")}
                      InputProps={{
                        disableUnderline: true
                      }}
                    />
                  </TableCell>

                  {/* Tổng cộng */}
                  <TableCell
                      align="center"
                      sx={{
                          px: 1,
                          fontWeight: "bold", // ✅ In đậm
                      }}
                      >
                      {student.tongCong || ""}
                      </TableCell>


                  {/* Mức đạt được */}
                  <TableCell align="center" sx={{ px: 1 }}>
                      <FormControl
                          variant="standard"
                          fullWidth
                          size="small"
                          sx={{
                          "& .MuiSelect-icon": {
                              opacity: 0,
                              transition: "opacity 0.2s ease",
                          },
                          "&:hover .MuiSelect-icon": {
                              opacity: 1,
                          },
                          }}
                      >
                          <Select
                          value={student.xepLoai}
                          onChange={(e) =>
                              handleCellChange(student.maDinhDanh, "xepLoai", e.target.value)
                          }
                          disableUnderline
                          sx={{
                              textAlign: "center",
                              px: 1,
                              "& .MuiSelect-select": {
                              py: 0.5,
                              //fontWeight: "bold",
                              color: student.xepLoai === "C" ? "#d32f2f" : "inherit", // 🔴 Chỉ đỏ khi là "C"
                              },
                          }}
                          >
                          <MenuItem value="T">T</MenuItem>
                          <MenuItem value="H">H</MenuItem>
                          <MenuItem value="C">C</MenuItem>
                          </Select>
                      </FormControl>
                      </TableCell>


                  {/* Nhận xét */}
                  <TableCell align="left" sx={{ px: 1 }}>
                      <TextField
                          variant="standard"
                          multiline
                          maxRows={4}
                          fullWidth
                          value={student.nhanXet}
                          onChange={(e) =>
                          handleCellChange(student.maDinhDanh, "nhanXet", e.target.value)
                          }
                          id={`nhanXet-${idx}`}
                          onKeyDown={(e) => handleKeyNavigation(e, idx, "nhanXet")}
                          InputProps={{
                          sx: {
                              paddingLeft: 1,
                              paddingRight: 1,
                              fontSize: "14px", // ✅ Giảm cỡ chữ ở đây
                              lineHeight: 1.3,  // (tùy chọn) làm cho dòng chữ gọn hơn
                          },
                          disableUnderline: true,
                          }}
                      />
                      </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      
      <Snackbar
          open={snackbar.open}
          autoHideDuration={3000} // 3 giây tự tắt
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // 👈 Xuất hiện góc dưới bên phải
          >
          <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              sx={{
              width: "100%",
              boxShadow: 3,
              borderRadius: 2,
              fontSize: "0.9rem",
              }}
          >
              {snackbar.message}
          </Alert>
          </Snackbar>
    </Box>
  );

}

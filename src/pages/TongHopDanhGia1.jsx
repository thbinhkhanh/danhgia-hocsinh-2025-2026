import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Card,
  Typography,
  Divider,
  Stack,
  FormControl,
  InputLabel,
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
  LinearProgress,
  useMediaQuery,
} from "@mui/material";

import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, setDoc, collection, writeBatch } from "firebase/firestore";

import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { exportEvaluationToExcelFromTable } from "../utils/exportExcelFromTable";
import { Snackbar, Alert } from "@mui/material";

export default function TongHopDanhGia() {
  // --- Context ---
  const { setStudentData, classData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

  // --- State ---
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);

  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(9);

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isCongNghe, setIsCongNghe] = useState(false);
  const [isTeacherChecked, setIsTeacherChecked] = useState(false);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");

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

  // Chọn ngẫu nhiên một phần tử trong mảng
  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Tính điểm trung bình từ tuần đến tuần, bỏ qua ô trống
  // -> Trả thêm tỉ lệ số T (để xét ưu tiên xếp loại tốt)
  function tinhDiemTrungBinhTheoKhoang(statusByWeek, from, to) {
    const diemMap = { T: 3, H: 2, C: 1 };
    let tong = 0, dem = 0, demT = 0;

    for (let i = from; i <= to; i++) {
      const weekId = `tuan_${i}`;
      const status = statusByWeek?.[weekId] || "";
      const short =
        status === "Hoàn thành tốt"
          ? "T"
          : status === "Hoàn thành"
          ? "H"
          : status === "Chưa hoàn thành"
          ? "C"
          : "";

      if (short && diemMap[short]) {
        tong += diemMap[short];
        dem++;
        if (short === "T") demT++;
      }
    }

    const diemTB = dem > 0 ? tong / dem : null;
    const tyLeT = dem > 0 ? demT / dem : 0;

    return { diemTB, tyLeT };
  }

  // Đánh giá học sinh & sinh nhận xét
  function danhGiaHocSinh(student, from, to) {
    const { diemTB, tyLeT } = tinhDiemTrungBinhTheoKhoang(student.statusByWeek, from, to);

    if (diemTB === null)
      return { xepLoai: "", nhanXet: "" }; // Không hiển thị nếu chưa có dữ liệu

    let xepLoaiDayDu, nhanXet;

    // Ưu tiên: ≥50% T -> Tốt
    if (tyLeT >= 0.5 || diemTB >= 2.8) {
      xepLoaiDayDu = "Tốt";
      nhanXet = randomItem(nhanXetTheoMuc.tot);
    } else if (diemTB >= 2.0) {
      xepLoaiDayDu = "Khá";
      nhanXet = randomItem(nhanXetTheoMuc.kha);
    } else if (diemTB >= 1.5) {
      xepLoaiDayDu = "Trung bình";
      nhanXet = randomItem(nhanXetTheoMuc.trungbinh);
    } else {
      xepLoaiDayDu = "Yếu";
      nhanXet = randomItem(nhanXetTheoMuc.yeu);
    }

    // 🔹 Rút gọn loại hiển thị:
    // Tốt → T | Khá, Trung bình → H | Yếu → C
    let xepLoaiRutGon =
      xepLoaiDayDu === "Tốt"
        ? "T"
        : ["Khá", "Trung bình"].includes(xepLoaiDayDu)
        ? "H"
        : "C";

    return { xepLoai: xepLoaiRutGon, nhanXet };
  }

const [snackbar, setSnackbar] = useState({
  open: false,
  message: "",
  severity: "success", // success | error | warning | info
});


const handleSaveAll = async () => {
  if (!students || students.length === 0) return;

  const selectedTerm = weekTo <= 18 ? "HK1" : "CN";
  const classKey = `${selectedClass}${isCongNghe ? "_CN" : ""}_${selectedTerm}`;
  const termDoc = selectedTerm === "HK1" ? "HK1" : "CN";
  const docRef = doc(db, "BANGDIEM", termDoc);

  const batch = writeBatch(db);

  const studentsMap = {};
  students.forEach((s) => {
    studentsMap[s.maDinhDanh] = {
      hoVaTen: s.hoVaTen || "",
      tracNghiem: s.tracNghiem !== "" && s.tracNghiem !== undefined ? Number(s.tracNghiem) : null,
      thucHanh: s.thucHanh !== "" && s.thucHanh !== undefined ? Number(s.thucHanh) : null,
      tongCong: s.tongCong !== "" && s.tongCong !== undefined ? Number(s.tongCong) : null,
      xepLoai: s.xepLoai || "",
      nhanXet: s.nhanXet || "",
      dgtx: s.xepLoai || "",
    };
  });

  Object.keys(studentsMap).forEach((maHS) => {
    batch.set(
      docRef,
      {
        [classKey]: {
          [maHS]: { dgtx: studentsMap[maHS].dgtx },
        },
      },
      { merge: true }
    );
  });

  try {
    await batch.commit();

    setStudentData((prev) => ({
      ...prev,
      [classKey]: students,
    }));

    // ✅ Hiển thị Snackbar thành công
    setSnackbar({
      open: true,
      message: `✅ Lưu thành công!`,
      severity: "success",
    });
  } catch (err) {
    console.error("❌ Lỗi lưu dữ liệu học sinh:", err);

    // ❌ Hiển thị Snackbar lỗi
    setSnackbar({
      open: true,
      message: "❌ Lỗi khi lưu dữ liệu học sinh!",
      severity: "error",
    });
  }
};

 // Khi context có lớp (VD từ trang khác), cập nhật selectedClass và fetch lại
  useEffect(() => {
    if (config?.lop) {
      setSelectedClass(config.lop);
    }
  }, [config?.lop]);


  // Lấy config tuần & công nghệ (chỉ hiển thị)
  

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setSelectedWeek(data.tuan || 1);
          setIsCongNghe(data.congnghe || false);
          setConfig(data);

          // ✅ Dùng Number() để đảm bảo kiểu số
          setWeekFrom(Number(data.th_tuan_from) || 1);
          setWeekTo(Number(data.th_tuan_to) || 9);
        } else {
          console.warn("⚠️ Chưa có document CONFIG/config, dùng giá trị mặc định.");
          setWeekFrom(1);
          setWeekTo(9);
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải cấu hình:", err);
        setWeekFrom(1);
        setWeekTo(9);
      } finally {
        // ✅ Luôn đánh dấu đã tải xong (thành công hoặc thất bại)
        setIsConfigLoaded(true);
      }
    };

    fetchConfig();
  }, [setConfig]);

  // Lấy danh sách lớp
  useEffect(() => {
  // Nếu context đã có dữ liệu lớp thì dùng luôn
    if (classData && classData.length > 0) {
        setClasses(classData);
        setSelectedClass(prev => prev || classData[0]);
        return;
    }

    // Nếu chưa có dữ liệu lớp => fetch từ Firestore
    const fetchClasses = async () => {
        try {
        const snapshot = await getDocs(collection(db, "DANHSACH")); // sửa cú pháp
        const classList = snapshot.docs.map(doc => doc.id);

        setClassData(classList);
        setClasses(classList);

        if (classList.length > 0) setSelectedClass(classList[0]);
        } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
        }
    };

    fetchClasses();
  }, [setClassData]); // chỉ dependency là setClassData

  // 🧩 Định nghĩa ngoài useEffect
  const fetchStudentsAndStatus = async () => {
    if (!selectedClass) return;

    try {
      setLoadingProgress(0);
      setLoadingMessage(`Đang tổng hợp dữ liệu...`);

      // 1️⃣ Lấy danh sách học sinh
      const classDocRef = doc(db, "DANHSACH", selectedClass);
      const classSnap = await getDoc(classDocRef);
      if (!classSnap.exists()) {
        setStudents([]);
        setStudentData((prev) => ({ ...prev, [selectedClass]: [] }));
        setLoadingMessage("");
        return;
      }

      const studentsData = classSnap.data();
      let studentList = Object.entries(studentsData).map(([maDinhDanh, info]) => ({
        maDinhDanh,
        hoVaTen: info.hoVaTen || "",
        statusByWeek: {},
      }));

      // ✅ Xác định collection
      const collectionName = isTeacherChecked ? "DANHGIA_GV" : "DANHGIA";
      const totalWeeks = weekTo - weekFrom + 1;
      const weekIds = Array.from({ length: totalWeeks }, (_, i) => `tuan_${weekFrom + i}`);

      // 2️⃣ Lấy dữ liệu tất cả tuần song song (chạy mượt hơn)
      const weekResults = await Promise.allSettled(
        weekIds.map((weekId) => getDoc(doc(db, collectionName, weekId)))
      );

      // 3️⃣ Gộp dữ liệu từng tuần
      let completed = 0;
      for (let i = 0; i < weekResults.length; i++) {
        completed++;
        const percent = Math.round((completed / totalWeeks) * 100);
        setLoadingProgress(percent);
        setLoadingMessage(`Đang tổng hợp dữ liệu... ${percent}%`);

        const result = weekResults[i];
        const weekId = weekIds[i];

        if (result.status !== "fulfilled") {
          console.warn(`⚠️ Không thể tải dữ liệu tuần ${weekId}`);
          continue;
        }

        const snap = result.value;
        if (!snap.exists()) continue;
        const weekData = snap.data();

        for (const [key, value] of Object.entries(weekData)) {
          const isCN = key.includes("_CN.");
          if (isCongNghe && !isCN) continue;
          if (!isCongNghe && isCN) continue;

          const classPrefix = isCongNghe ? `${selectedClass}_CN` : selectedClass;
          if (!key.startsWith(classPrefix)) continue;

          const maHS = key.split(".").pop();
          const student = studentList.find((s) => s.maDinhDanh === maHS);
          if (student) {
            student.statusByWeek[weekId] = value.status || "-";
          }
        }
      }

      // 4️⃣ Sắp xếp danh sách theo tên
      studentList.sort((a, b) => {
        const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        return nameA.localeCompare(nameB);
      });
      studentList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

      // 5️⃣ Đánh giá & nhận xét
      const evaluatedList = studentList.map((s) => {
        const { xepLoai, nhanXet } = danhGiaHocSinh(s, weekFrom, weekTo);
        return { ...s, xepLoai, nhanXet };
      });

      // 6️⃣ Hoàn tất
      setStudentData((prev) => ({ ...prev, [selectedClass]: evaluatedList }));
      setStudents(evaluatedList);

      setLoadingProgress(100);
      //setLoadingMessage("✅ Đã tổng hợp xong dữ liệu!");
      setTimeout(() => setLoadingMessage(""), 1500);
    } catch (err) {
      console.error(`❌ Lỗi khi lấy dữ liệu lớp "${selectedClass}":`, err);
      setStudents([]);
      setLoadingProgress(0);
      setLoadingMessage("❌ Đã xảy ra lỗi khi tải dữ liệu!");
    }
  };


useEffect(() => {
  fetchStudentsAndStatus();
}, [selectedClass, weekFrom, weekTo, setStudentData, isTeacherChecked, isCongNghe]);

const handleDownload = async () => {
  try {
    await exportEvaluationToExcelFromTable(students, selectedClass, weekFrom, weekTo);
  } catch (error) {
    console.error("❌ Lỗi khi xuất Excel:", error);
  }
};

// --- Hàm thống kê tổng hợp ---
const getStatistics = () => {
  let totalT = 0;
  let totalH = 0;
  let totalC = 0;

  const weekId = `tuan_${selectedWeek}`;

  students.forEach((student) => {
    const status = student.statusByWeek?.[weekId] || "";
    const short =
      status === "Hoàn thành tốt"
        ? "T"
        : status === "Hoàn thành"
        ? "H"
        : status === "Chưa hoàn thành"
        ? "C"
        : "";

    if (short === "T") totalT++;
    else if (short === "H") totalH++;
    else if (short === "C") totalC++;
  });

  const totalCells = students.length; // mỗi học sinh có 1 ô cho tuần này
  const totalBlank = Math.max(0, totalCells - (totalT + totalH + totalC));

  return { totalT, totalH, totalC, totalBlank };
};

const { totalT, totalH, totalC, totalBlank } = getStatistics();

const handleCongNgheChange = (e) => setIsCongNghe(e.target.checked);
const borderStyle = "1px solid #e0e0e0"; // màu nhạt như đường mặc định

return (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
    <Card
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        maxWidth: 1300,
        mx: "auto",
        position: "relative",
      }}
    >
      {/* 🔹 Nút tải Excel */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          gap: 1,
        }}
      >
        <Tooltip title="Lưu Xếp loại" arrow>
        <IconButton
          onClick={handleSaveAll}
          sx={{
            color: "primary.main",
            bgcolor: "white",
            boxShadow: 2,
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <SaveIcon fontSize="small" />
        </IconButton>
      </Tooltip>

        <Tooltip title="Tải xuống Excel" arrow>
          <IconButton
            onClick={handleDownload}
            sx={{
              color: "primary.main",
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": { bgcolor: "primary.light", color: "white" },
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Làm mới thống kê" arrow>
          <IconButton
            onClick={fetchStudentsAndStatus}
            sx={{
              color: "primary.main",
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": { bgcolor: "primary.light", color: "white" },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Đánh giá tự động" arrow>
        
        <IconButton
          onClick={() => {
            const updated = students.map((s) => {
              const { diemTB, xepLoai, nhanXet } = danhGiaHocSinh(s, weekFrom, weekTo);
              return { ...s, diemTB, xepLoai, nhanXet };
            });
            setStudents(updated);
          }}
          sx={{
            color: "primary.main",
            bgcolor: "white",
            boxShadow: 2,
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <AssessmentIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      </Box>

      {/* ===== Header ===== */}
      <Typography
        variant="h5"
        fontWeight="bold"
        color="primary"
        gutterBottom
        sx={{ textAlign: "center", width: "100%", display: "block", mb: 2 }}
      >
        TỔNG HỢP ĐÁNH GIÁ
      </Typography>

      {/* --- Bảng thống kê góc phải --- */}
      {/*<Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          backgroundColor: "#f1f8e9",
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          p: 2,
          minWidth: 260,
          boxShadow: 2,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Typography variant="subtitle1" fontWeight="bold" color="primary">
            Thống kê:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Tuần</InputLabel>
            <Select
              value={selectedWeek}
              label="Tuần"
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
            >
              {[...Array(35)].map((_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  Tuần {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Hoàn thành tốt (T):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalT}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Hoàn thành (H):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalH}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Chưa hoàn thành (C):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalC}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Chưa đánh giá:</Typography>
          <Typography variant="body2" fontWeight="bold">{totalBlank}</Typography>
        </Stack>
      </Box>*/}

      {/* ===== Row tuần ===== */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="center"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
      >
        {!isConfigLoaded ? (
          <Typography color="text.secondary">Đang tải cấu hình...</Typography>
        ) : (
          <>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Tuần từ</InputLabel>
              <Select
                value={weekFrom}
                label="Tuần từ"
                onChange={async (e) => {
                  const newFrom = Number(e.target.value);
                  setWeekFrom(newFrom);
                  try {
                    const docRef = doc(db, "CONFIG", "config");
                    await setDoc(docRef, { th_tuan_from: newFrom }, { merge: true });
                  } catch (err) {
                    console.error("❌ Lỗi cập nhật th_tuan_from:", err);
                  }
                }}
              >
                {[...Array(35)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    Tuần {i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Đến tuần</InputLabel>
              <Select
                value={weekTo}
                label="Đến tuần"
                onChange={async (e) => {
                  const newTo = Number(e.target.value);
                  setWeekTo(newTo);
                  try {
                    const docRef = doc(db, "CONFIG", "config");
                    await setDoc(docRef, { th_tuan_to: newTo }, { merge: true });
                  } catch (err) {
                    console.error("❌ Lỗi cập nhật th_tuan_to:", err);
                  }
                }}
              >
                {[...Array(35)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    Tuần {i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}
      </Stack>


      <Divider sx={{ mb: 3 }} />

      {/* 🔹 Hàng chọn lớp và bộ lọc */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="center"
        alignItems="center"
        mb={3}
      >
        {/* Lớp */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1" fontWeight="medium">
            Lớp:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={selectedClass}
              onChange={(e) => {
                const newClass = e.target.value;

                // 🔹 Cập nhật lớp trong state & context
                setSelectedClass(newClass);
                setConfig((prev) => ({ ...prev, lop: newClass }));

                // 🔹 Xóa dữ liệu trong bảng nhưng giữ nguyên hàng
                setStudents((prev) =>
                  prev.map((s) => ({
                    ...s,
                    statusByWeek: {}, // reset dữ liệu tuần
                    xepLoai: "",      // xóa xếp loại
                    nhanXet: "",      // xóa nhận xét
                  }))
                );

                // 🔹 Hiển thị thông báo đang tải
                setLoadingMessage("Đang tải dữ liệu lớp mới...");
                setLoadingProgress(0);
              }}
              size="small"
              sx={{
                width: 80,
                height: 40,
                borderRadius: 2,
                "& .MuiSelect-select": {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              }}
            >
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Checkbox Công nghệ */}
        <FormControlLabel
          control={<Checkbox checked={!!isCongNghe} onChange={handleCongNgheChange} />}
          label="Công nghệ"
        />

        {/* Checkbox Giáo viên */}
        <FormControlLabel
          control={
            <Checkbox
              checked={!!isTeacherChecked}
              onChange={(e) => setIsTeacherChecked(e.target.checked)}
            />
          }
          label="Giáo viên"
        />
        
      </Stack>

      {/*{loadingMessage && (
        <Box
          sx={{
            mt: 2,
            mb: 2, // 🔹 thêm khoảng cách phía dưới toàn cụm
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // căn giữa
          }}
        >
          <LinearProgress
            variant="determinate"
            value={loadingProgress}
            sx={{
              width: "25%",   // 🔹 giảm chiều rộng
              height: 3,
              borderRadius: 2,
              mb: 0.8,        // 🔹 khoảng cách giữa thanh và nhãn
            }}
            color="primary"
          />

          <Typography
            variant="body2"
            color="primary"
            sx={{ fontWeight: 500, textAlign: "center" }}
          >
            {loadingMessage}
          </Typography>
        </Box>
      )}*/}



      {/* --- Bảng dữ liệu --- */}
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "70vh", overflowY: "auto", overflowX: "auto" }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: "fixed",
            minWidth: 800,
            borderCollapse: "collapse",
            "& td, & th": {
              borderRight: "1px solid #e0e0e0", // ✅ Đường kẻ dọc nhạt giữa các cột
              borderBottom: "1px solid #e0e0e0", // ✅ Đường kẻ ngang
            },
            "& th:last-child, & td:last-child": {
              borderRight: "none", // ❌ Bỏ đường kẻ ở cột cuối
            },
          }}
        >

          <TableHead>
            <TableRow>
              <TableCell
                align="center"
                sx={{ backgroundColor: "#1976d2", color: "white", width: 50 }}
              >
                STT
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  backgroundColor: "#1976d2",
                  color: "white",
                  width: 220,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Họ và tên
              </TableCell>
              {/*<TableCell
                align="center"
                sx={{ backgroundColor: "#1976d2", color: "white", width: 60 }}
              >
                LỚP
              </TableCell>*/}

              {Array.from({ length: weekTo - weekFrom + 1 }, (_, i) => {
                const weekNum = weekFrom + i;
                return (
                  <TableCell
                    key={weekNum}
                    align="center"
                    sx={{ backgroundColor: "#1976d2", color: "white", width: 50 }}
                  >
                    Tuần {weekNum}
                  </TableCell>
                );
              })}
              {/*<TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 80 }}>
                Điểm TB
              </TableCell>*/}
              <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 50 }}>
                Xếp loại
              </TableCell>
              <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 350 }}>
                Nhận xét
              </TableCell>

            </TableRow>
          </TableHead>

          <TableBody>
            {students.map((student) => (
              <TableRow key={student.maDinhDanh} hover>
                <TableCell align="center">{student.stt}</TableCell>
                <TableCell align="left">{student.hoVaTen}</TableCell>
                {/*<TableCell align="center">{selectedClass}</TableCell>*/}

                {/* Các cột tuần */}
                {Array.from({ length: weekTo - weekFrom + 1 }, (_, i) => {
                  const weekNum = weekFrom + i;
                  const weekId = `tuan_${weekNum}`;
                  const status = student.statusByWeek?.[weekId] || "";
                  const statusShort =
                    status === "Chưa hoàn thành"
                      ? "C"
                      : status === "Hoàn thành"
                      ? "H"
                      : status === "Hoàn thành tốt"
                      ? "T"
                      : "";
                  return (
                    <TableCell key={weekNum} align="center">
                      {statusShort}
                    </TableCell>
                  );
                })}

                {/* ✅ Thêm 3 cột mới ở cuối mỗi hàng */}
                {/*<TableCell align="center">
                  {student.diemTB ? student.diemTB.toFixed(2) : ""}
                </TableCell>*/}
                <TableCell
                  align="center"
                  sx={{
                    //fontWeight: "bold",
                    color:
                      student.xepLoai === "C"
                        ? "#dc2626" // đỏ
                        : (theme) => theme.palette.primary.main, // màu xanh dương chuẩn của theme
                  }}
                >
                  {student.xepLoai || ""}
                </TableCell>
                <TableCell align="left">{student.nhanXet || ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>

        </Table>
      </TableContainer>
      {/* --- Bảng thống kê --- */}
      <Box
        sx={{
          mt: isMobile ? 3 : 0,
          position: isMobile ? "relative" : "absolute",
          top: isMobile ? "auto" : 16,
          right: isMobile ? "auto" : 16,
          backgroundColor: "#f1f8e9",
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          p: 2,
          minWidth: 260,
          boxShadow: 2,
          width: isMobile ? "90%" : "auto",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Typography variant="subtitle1" fontWeight="bold" color="primary">
            Thống kê:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Tuần</InputLabel>
            <Select
              value={selectedWeek}
              label="Tuần"
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
            >
              {[...Array(35)].map((_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  Tuần {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Hoàn thành tốt (T):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalT}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Hoàn thành (H):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalH}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Chưa hoàn thành (C):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalC}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Chưa đánh giá:</Typography>
          <Typography variant="body2" fontWeight="bold">{totalBlank}</Typography>
        </Stack>
      </Box>
    </Card>

    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // 👈 Góc dưới bên phải
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

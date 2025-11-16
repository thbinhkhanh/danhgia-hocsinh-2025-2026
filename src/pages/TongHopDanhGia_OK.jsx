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
  TextField,
  Snackbar, 
  Alert,
} from "@mui/material";

import { db } from "../firebase";
import { StudentDataContext } from "../context/StudentDataContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, setDoc, collection, writeBatch } from "firebase/firestore";

import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { exportEvaluationToExcelFromTable } from "../utils/exportExcelFromTable";
import { nhanXetTinHoc, nhanXetCongNghe } from '../utils/nhanXet.js';

export default function TongHopDanhGia() {
  // --- Context ---
  //const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentDataContext);

  const { config, setConfig } = useContext(ConfigContext);
  const selectedSemester = config.hocKy || "Giữa kỳ I";

  // --- State ---
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(9);

  //const [selectedWeek, setSelectedWeek] = useState(1);
  const [isTeacherChecked, setIsTeacherChecked] = useState(false);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showWeeks, setShowWeeks] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(""); // không mặc định

  // Chọn ngẫu nhiên một phần tử trong mảng
  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Tính điểm trung bình từ tuần đến tuần, bỏ qua ô trống
  // -> Trả thêm tỉ lệ số T (để xét ưu tiên xếp loại tốt)
  function tinhDiemTrungBinhTheoKhoang(statusByWeek, from, to) {
    const diemMap = { T: 3, H: 2, C: 1 };
    let tong = 0, dem = 0;

    for (let i = from; i <= to; i++) {
      const weekId = `tuan_${i}`;
      const raw = statusByWeek?.[weekId];

      // Lấy cả HS và GV
      let hs = "";
      let gv = "";

      if (raw) {
        if (typeof raw === "object") {
          hs = raw.hs || "";
          gv = raw.gv || "";
        } else {
          hs = raw;
        }
      }

      const toShort = (statusStr) =>
        statusStr === "Hoàn thành tốt" ? "T" :
        statusStr === "Hoàn thành" ? "H" :
        statusStr === "Chưa hoàn thành" ? "C" : "";

      const hsShort = toShort(hs);
      const gvShort = toShort(gv);

      // Nếu cả HS và GV đều rỗng → bỏ qua
      if (!hsShort && !gvShort) continue;

      // Nếu chỉ 1 trong 2 có → dùng giá trị đó
      if (hsShort && !gvShort) {
        tong += diemMap[hsShort];
        dem++;
      } else if (!hsShort && gvShort) {
        tong += diemMap[gvShort];
        dem++;
      } else {
        // Cả HS + GV đều có → lấy trung bình
        tong += (diemMap[hsShort] + diemMap[gvShort]) / 2;
        dem++;
      }
    }

    const diemTB = dem > 0 ? tong / dem : null;

    return { diemTB };
  }



  // Đánh giá học sinh & sinh nhận xét
  function danhGiaHocSinh(student, from, to) {
    const { diemTB } = tinhDiemTrungBinhTheoKhoang(student.statusByWeek, from, to);

    if (diemTB === null)
      return { xepLoai: "", nhanXet: "" }; // Không hiển thị nếu chưa có dữ liệu

    const nhanXetMuc = getNhanXetMuc(selectedSubject);
    let xepLoaiDayDu, nhanXet;

    // Xếp loại dựa vào điểm trung bình
    if (diemTB >= 2.8) {
      xepLoaiDayDu = "Tốt";
      nhanXet = randomItem(nhanXetMuc.tot);
    } else if (diemTB >= 2.0) {
      xepLoaiDayDu = "Khá";
      nhanXet = randomItem(nhanXetMuc.kha);
    } else if (diemTB >= 1.5) {
      xepLoaiDayDu = "Trung bình";
      nhanXet = randomItem(nhanXetMuc.trungbinh);
    } else {
      xepLoaiDayDu = "Yếu";
      nhanXet = randomItem(nhanXetMuc.yeu);
    }

    // Rút gọn loại hiển thị: Tốt → T | Khá/Trung bình → H | Yếu → C
    let xepLoaiRutGon =
      xepLoaiDayDu === "Tốt"
        ? "T"
        : ["Khá", "Trung bình"].includes(xepLoaiDayDu)
        ? "H"
        : "C";

    return { xepLoai: xepLoaiRutGon, nhanXet };
  }


  function getNhanXetMuc(subject) {
    return subject === "Công nghệ" ? nhanXetCongNghe : nhanXetTinHoc;
  }

  // 🔹 Sinh nhận xét tự động dựa vào xếp loại rút gọn
  function getNhanXetTuDong(xepLoai) {
  if (!xepLoai) return "";

  const nhanXetMuc = getNhanXetMuc(selectedSubject); // truyền selectedSubject vào
  let nhanXet = "";

  if (xepLoai === "T") nhanXet = randomItem(nhanXetMuc.tot);
  else if (xepLoai === "H") nhanXet = randomItem(nhanXetMuc.kha);
  else if (xepLoai === "C") nhanXet = randomItem(nhanXetMuc.yeu);

  return nhanXet;
}

const [snackbar, setSnackbar] = useState({
  open: false,
  message: "",
  severity: "success", // success | error | warning | info
});

const handleSaveAll = async () => {
  if (!students || students.length === 0) return;

  // ✅ Xác định học kỳ được chọn
  let termDoc = "GKI"; // mặc định
  if (selectedSemester === "Giữa kỳ I") termDoc = "GKI";
  else if (selectedSemester === "Cuối kỳ I") termDoc = "CKI";
  else if (selectedSemester === "Giữa kỳ II") termDoc = "GKII";
  else termDoc = "CN";

  // ✅ Tên lớp chỉ giữ "_CN" nếu là Công nghệ
  const classKey = `${selectedClass}${selectedSubject === "Công nghệ" ? "_CN" : ""}`;

  // ✅ Tham chiếu tài liệu Firestore
  const docRef = doc(db, "KTDK", termDoc);
  const batch = writeBatch(db);

  students.forEach((s) => {
    const studentData = {
      hoVaTen: s.hoVaTen || "",
      lyThuyet: null,
      thucHanh: null,
      tongCong: null,
      mucDat: s.mucDat || "",    // ✅ Giữ nguyên
      nhanXet: s.nhanXet || "",
      dgtx: s.dgtx || "",         // ✅ Mức đạt chung (HS + GV)
      dgtx_gv: s.dgtx_gv || "",
    };

    batch.set(
      docRef,
      {
        [classKey]: {
          [s.maDinhDanh]: studentData,
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

    setSnackbar({
      open: true,
      //message: `✅ Lưu thành công (${termDoc})!`,
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

 // Khi context có lớp (VD từ trang khác), cập nhật selectedClass và fetch lại
  useEffect(() => {
    if (config?.lop) {
      setSelectedClass(config.lop);
    }
  }, [config?.lop]);

  const [selectedWeek, setSelectedWeek] = useState(null); // ban đầu null

  // --- Khi load config ---
useEffect(() => {
  const fetchConfig = async () => {
    try {
      const docRef = doc(db, "CONFIG", "config");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Cập nhật context
        setConfig(data);

        // Cập nhật state tuần
        setWeekFrom(Number(data.th_tuan_from) || 1);
        setWeekTo(Number(data.th_tuan_to) || 9);
        setSelectedWeek(data.tuan || 1);

        // Cập nhật lớp/môn
        setSelectedClass(prev => prev || data.lop || "");
        setSelectedSubject(prev => prev || data.mon || "Tin học"); // 🔹 đồng bộ môn
      } else {
        setWeekFrom(1);
        setWeekTo(9);
        setSelectedWeek(1);
        setSelectedClass("");
        setSelectedSubject("Tin học");
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải cấu hình:", err);
      setWeekFrom(1);
      setWeekTo(9);
      setSelectedWeek(1);
      setSelectedClass("");
      setSelectedSubject("Tin học");
    } finally {
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

const hocKyMap = {
  "Giữa kỳ I": { from: 1, to: 9 },
  "Cuối kỳ I": { from: 10, to: 18 },
  "Giữa kỳ II": { from: 19, to: 27 },
  "Cả năm": { from: 28, to: 35 },
};

const fetchStudentsAndStatus = async () => {
  if (!selectedClass) return;

  try {
    setLoadingProgress(0);
    setLoadingMessage("Đang tải dữ liệu học sinh...");

    const mapTerm = {
      "Giữa kỳ I": "GKI",
      "Cuối kỳ I": "CKI",
      "Giữa kỳ II": "GKII",
      "Cả năm": "CN",
    };
    const selectedSemester = config.hocKy || "Giữa kỳ I";
    const termDoc = mapTerm[selectedSemester] || "CN";

    const listKey = selectedClass; 
    const classKey = selectedSubject === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;
    const cacheKey = `${selectedClass}_${selectedSubject}`;

    const cachedData = studentData[cacheKey];
    if (cachedData && cachedData.length > 0) {
      setStudents(cachedData);
      setLoadingMessage("✅ Đã tải dữ liệu từ bộ nhớ cache!");
      setTimeout(() => setLoadingMessage(""), 1500);
      return;
    }

    // Bước 1: Lấy danh sách học sinh
    const danhSachSnap = await getDoc(doc(db, "DANHSACH", listKey));
    let studentList = [];
    if (danhSachSnap.exists()) {
      const data = danhSachSnap.data();
      studentList = Object.entries(data).map(([id, info]) => ({
        maDinhDanh: id,
        hoVaTen: info.hoVaTen || "",
        statusByWeek: {},
        status: "",
        dgtx_gv: "",
        nhanXet: "",
      }));
    }

    // Bước 2: Lấy dữ liệu tuần và KTDK
    const [tuanSnap, bangDiemSnap] = await Promise.all([
      getDocs(collection(db, `DGTX/${classKey}/tuan`)),
      getDoc(doc(db, "KTDK", termDoc)),
    ]);

    // Gom dữ liệu tuần
    const { from: weekFrom, to: weekTo } = hocKyMap[selectedSemester] || { from: 1, to: 35 };
    const weekMap = {};
    if (!tuanSnap.empty) {
      tuanSnap.forEach(docSnap => {
        if (docSnap.exists()) {
          const weekNum = parseInt(docSnap.id.replace(/\D/g, "")) || 0;
          if (weekNum >= weekFrom && weekNum <= weekTo) {
            weekMap[docSnap.id] = docSnap.data();
          }
        }
      });
    }

    const sortedWeekIds = Object.keys(weekMap).sort((a, b) => {
      const nA = parseInt(a.replace(/\D/g, "")) || 0;
      const nB = parseInt(b.replace(/\D/g, "")) || 0;
      return nA - nB;
    });

    // Map học sinh theo maDinhDanh
    const studentMap = {};
    studentList.forEach(s => studentMap[s.maDinhDanh] = { ...s });

    // Merge dữ liệu tuần
    Object.entries(weekMap).forEach(([weekId, weekData]) => {
      Object.entries(weekData).forEach(([id, info]) => {
        if (!studentMap[id]) {
          studentMap[id] = {
            maDinhDanh: id,
            hoVaTen: info.hoVaTen || "",
            statusByWeek: {},
            status: "",
            dgtx_gv: "",
            nhanXet: "",
          };
        }
        const hsVal = info.status ?? info.mucdat ?? "";
        const gvVal = info.diemTracNghiem ?? info.GV ?? "";

        studentMap[id].statusByWeek[weekId] = {
          hs: hsVal === "-" ? "" : hsVal,
          gv: gvVal === "-" ? "" : gvVal,
        };
      });
    });

    // Merge dữ liệu KTDK
    if (bangDiemSnap.exists()) {
      const classData = bangDiemSnap.data()[classKey] || {};
      Object.keys(studentMap).forEach(id => {
        const s = studentMap[id];
        s.dgtx_gv = classData[id]?.dgtx_gv || "";
        s.nhanXet = classData[id]?.nhanXet || "";
        s.status = classData[id]?.status || "";
      });
    }

    // Bước 3: Tính mức đạt, nhận xét tự động
    const evaluatedList = Object.values(studentMap).map(s => {
      const { xepLoai: dgtx } = danhGiaHocSinh(s, weekFrom, weekTo);
      const nhanXet = s.nhanXet?.trim() || getNhanXetTuDong(dgtx);

      const weekCols = sortedWeekIds.reduce((acc, weekId) => {
        const weekNum = parseInt(weekId.replace(/\D/g, "")) || weekId;
        const raw = s.statusByWeek?.[weekId];
        const hsVal = raw && typeof raw === "object" ? (raw.hs || "") : (raw || "");
        const gvVal = raw && typeof raw === "object" ? (raw.gv || "") : "";
        acc[`Tuan_${weekNum}_HS`] = hsVal || "-";
        acc[`Tuan_${weekNum}_GV`] = gvVal || "-";
        return acc;
      }, {});

      return { ...s, ...weekCols, xepLoai: dgtx, dgtx_gv: s.dgtx_gv, dgtx, nhanXet };
    });

    // Sắp xếp theo tên cuối
    function getLastName(fullName) {
      const parts = fullName.trim().split(" ");
      return parts.length > 1 ? parts[parts.length - 1] : fullName;
    }

    evaluatedList.sort((a, b) => {
      const lastA = getLastName(a.hoVaTen);
      const lastB = getLastName(b.hoVaTen);
      const cmpLast = lastA.localeCompare(lastB, "vi", { sensitivity: "base" });
      if (cmpLast !== 0) return cmpLast;
      return a.hoVaTen.localeCompare(b.hoVaTen, "vi", { sensitivity: "base" });
    });

    const finalList = evaluatedList.map((s, idx) => ({ ...s, stt: idx + 1 }));

    setStudentData(prev => ({ ...prev, [cacheKey]: finalList }));
    setStudents(finalList);
    setLoadingProgress(100);
    setTimeout(() => setLoadingMessage(""), 1500);

  } catch (err) {
    console.error(`❌ Lỗi khi lấy dữ liệu lớp "${selectedClass}":`, err);
    setStudents([]);
    setLoadingProgress(0);
    setLoadingMessage("❌ Đã xảy ra lỗi khi tải dữ liệu!");
  }
};


const fetchStudentsDGTX = async () => {
  if (!selectedClass) return;

  try {
    setLoadingProgress(0);
    setLoadingMessage("Đang tải dữ liệu học sinh...");

    const mapTerm = {
      "Giữa kỳ I": "GKI",
      "Cuối kỳ I": "CKI",
      "Giữa kỳ II": "GKII",
      "Cả năm": "CN",
    };
    const selectedSemester = config.hocKy || "Giữa kỳ I";
    const termDoc = mapTerm[selectedSemester] || "CN";

    const listKey = selectedClass; 
    const classKey = selectedSubject === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;
    const cacheKey = `${selectedClass}_${selectedSubject}`; 

    // Bước 1: Lấy danh sách học sinh từ DANHSACH
    const danhSachSnap = await getDoc(doc(db, "DANHSACH", listKey));
    let studentList = [];
    if (danhSachSnap.exists()) {
      const data = danhSachSnap.data();
      studentList = Object.entries(data).map(([id, info]) => ({
        maDinhDanh: id,
        hoVaTen: info.hoVaTen || "",
        statusByWeek: {},
        dgtx_gv: "",
        nhanXet: "",
      }));
    }

    // Bước 2: Lấy dữ liệu tuần + KTDK
    const [tuanSnap, bangDiemSnap] = await Promise.all([
      getDocs(collection(db, `DGTX/${classKey}/tuan`)),
      getDoc(doc(db, "KTDK", termDoc)),
    ]);

    const weekMap = {};
    if (!tuanSnap.empty) {
      const { from: weekFrom, to: weekTo } = hocKyMap[selectedSemester] || { from: 1, to: 35 };
      tuanSnap.forEach(docSnap => {
        if (docSnap.exists()) {
          const weekNum = parseInt(docSnap.id.replace(/\D/g, "")) || 0;
          if (weekNum >= weekFrom && weekNum <= weekTo) {
            weekMap[docSnap.id] = docSnap.data();
          }
        }
      });
    }

    const sortedWeekIds = Object.keys(weekMap).sort((a, b) => {
      const nA = parseInt(a.replace(/\D/g, "")) || 0;
      const nB = parseInt(b.replace(/\D/g, "")) || 0;
      return nA - nB;
    });

    // Map học sinh
    const studentMap = {};
    studentList.forEach(s => studentMap[s.maDinhDanh] = { ...s });

    // Merge dữ liệu tuần vào studentMap
    Object.entries(weekMap).forEach(([weekId, weekData]) => {
      Object.entries(weekData).forEach(([id, info]) => {
        if (!studentMap[id]) {
          studentMap[id] = {
            maDinhDanh: id,
            hoVaTen: info.hoVaTen || "",
            statusByWeek: {},
            dgtx_gv: "",
            nhanXet: "",
          };
        }
        studentMap[id].statusByWeek[weekId] = {
          hs: info.status ?? info.mucdat ?? "",
          gv: info.diemTracNghiem ?? "",
        };
      });
    });

    // Merge dữ liệu KTDK
    if (bangDiemSnap.exists()) {
      const classData = bangDiemSnap.data()[classKey] || {};
      Object.keys(studentMap).forEach(id => {
        const s = studentMap[id];
        s.dgtx_gv = classData[id]?.dgtx_gv || "";
        s.nhanXet = classData[id]?.nhanXet || "";
      });
    }

    // Bước 3: Tính trung bình HS + GV tuần, đánh giá tự động
    const evaluatedList = Object.values(studentMap).map(s => {
      const { diemTB } = tinhDiemTrungBinhTheoKhoang(s.statusByWeek, sortedWeekIds[0].replace(/\D/g, ""), sortedWeekIds[sortedWeekIds.length-1].replace(/\D/g, ""));
      let dgtx = "";

      if (diemTB !== null) {
        if (diemTB >= 2.8) dgtx = "T";
        else if (diemTB >= 2.0) dgtx = "H";
        else dgtx = "C";
      }

      // Chuẩn hóa cột HS/GV tuần
      const weekCols = sortedWeekIds.reduce((acc, weekId) => {
        const weekNum = parseInt(weekId.replace(/\D/g, "")) || weekId;
        const raw = s.statusByWeek?.[weekId];
        const hsVal = raw && typeof raw === "object" ? (raw.hs || "") : (raw || "");
        const gvVal = raw && typeof raw === "object" ? (raw.gv || "") : "";
        acc[`Tuan_${weekNum}_HS`] = hsVal || "-";
        acc[`Tuan_${weekNum}_GV`] = gvVal || "-";
        return acc;
      }, {});

      const nhanXet = s.nhanXet?.trim() || getNhanXetTuDong(dgtx);

      return { ...s, ...weekCols, dgtx, nhanXet };
    });

    // Sắp xếp theo tên cuối và đánh số thứ tự
    function getLastName(fullName) {
      const parts = fullName.trim().split(" ");
      return parts.length > 1 ? parts[parts.length - 1] : fullName;
    }

    evaluatedList.sort((a, b) => {
      const lastA = getLastName(a.hoVaTen);
      const lastB = getLastName(b.hoVaTen);
      const cmpLast = lastA.localeCompare(lastB, "vi", { sensitivity: "base" });
      if (cmpLast !== 0) return cmpLast;
      return a.hoVaTen.localeCompare(b.hoVaTen, "vi", { sensitivity: "base" });
    });

    const finalList = evaluatedList.map((s, idx) => ({ ...s, stt: idx + 1 }));

    // Cập nhật UI và cache
    setStudentData(prev => ({ ...prev, [cacheKey]: finalList }));
    setStudents(finalList);

    setLoadingProgress(100);
    setTimeout(() => setLoadingMessage(""), 1500);

  } catch (err) {
    console.error(`❌ Lỗi khi lấy dữ liệu lớp "${selectedClass}":`, err);
    setStudents([]);
    setLoadingProgress(0);
    setLoadingMessage("❌ Đã xảy ra lỗi khi tải dữ liệu!");
  }
};




useEffect(() => {
  if (!selectedClass || !selectedSubject) return;

  const fetchData = async () => {
    await fetchStudentsAndStatus();
  };

  fetchData();
}, [selectedClass, selectedSubject, weekFrom, weekTo]);

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
    const raw = student.statusByWeek?.[weekId];
    const status = raw && typeof raw === "object" ? (raw.hs || "") : (raw || "");
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

const borderStyle = "1px solid #e0e0e0"; // màu nhạt như đường mặc định

const handleCellChange = (maDinhDanh, field, value) => {
  setStudents((prev) =>
    prev.map((s) =>
      s.maDinhDanh === maDinhDanh ? { ...s, [field]: value } : s
    )
  );
};

// Lấy tuần bắt đầu và kết thúc dựa trên học kỳ đã chọn
const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };

return (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
    <Card
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        maxWidth: 1500,
        mx: "auto",
        position: "relative",
      }}
    >
      {/* 🔹 Nút tải Excel */}
      <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1 }}>
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

        <Tooltip title="Làm mới dữ liệu" arrow>
          <IconButton
            onClick={fetchStudentsDGTX}
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
      </Box>

      {/* ===== Header ===== */}
      <Typography
        variant="h5"
        fontWeight="bold"
        color="primary"
        gutterBottom
        sx={{ textAlign: "center", width: "100%", display: "block", mb: 2, textTransform: "uppercase" }}
      >
        NHẬN XÉT {selectedSemester ? `${selectedSemester}` : ""}
      </Typography>

      {/* 🔹 Hàng chọn lớp và bộ lọc */}
      <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" mb={3}>
        {/* Lớp */}
        <FormControl size="small" sx={{ minWidth: 60 }}>
          <InputLabel id="lop-label">Lớp</InputLabel>
          <Select
            labelId="lop-label"
            value={selectedClass}
            label="Lớp"
            onChange={(e) => {
              const newClass = e.target.value;
              setSelectedClass(newClass);
              setStudents((prev) =>
                prev.map((s) => ({
                  ...s,
                  statusByWeek: {},
                  xepLoai: "",
                  nhanXet: "",
                  dgtx_gv: "",
                  dgtx: "",
                }))
              );
              setLoadingMessage("Đang tải dữ liệu lớp mới...");
              fetchStudentsAndStatus();
            }}
          >
            {classes.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Dropdown chọn môn học */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="monhoc-label">Môn</InputLabel>
          <Select
            labelId="monhoc-label"
            label="Môn"
            value={selectedSubject}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedSubject(value);
              fetchStudentsAndStatus();
            }}
          >
            <MenuItem value="Tin học">Tin học</MenuItem>
            <MenuItem value="Công nghệ">Công nghệ</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Checkbox checked={showWeeks} onChange={(e) => setShowWeeks(e.target.checked)} />}
          label={showWeeks ? "Ẩn tuần" : "Hiện tuần"}
        />
      </Stack>

      {/* --- Bảng dữ liệu --- */}
      <TableContainer component={Paper} sx={{ maxHeight: "70vh", overflowY: "auto", overflowX: "auto" }}>
        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: "fixed",
            minWidth: 800,
            borderCollapse: "collapse",
            "& td, & th": { borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0" },
            "& th:last-child, & td:last-child": { borderRight: "none" },
          }}
        >
          <TableHead>
            {/* HÀNG HEADER 1 — merge tuần */}
            <TableRow>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>STT</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 200 }}>Họ và tên</TableCell>

              {showWeeks &&
                (() => {
                  const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };
                  return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => {
                    const weekNum = startWeek + i;
                    return (
                      <TableCell
                        key={weekNum}
                        align="center"
                        colSpan={2}
                        sx={{ backgroundColor: "#1976d2", color: "white", width: 60 }}
                      >
                        Tuần {weekNum}
                      </TableCell>
                    );
                  });
                })()}

              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>Học sinh</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>Giáo viên</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>Mức đạt</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 300 }}>Nhận xét</TableCell>
            </TableRow>

            {/* HÀNG HEADER 2 — HS, GV */}
            <TableRow>
              {showWeeks &&
                (() => {
                  const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };
                  return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => (
                    <React.Fragment key={`sub-${i}`}>
                      <TableCell align="center" sx={{ backgroundColor: "#42a5f5", color: "white", width: 30 }}>HS</TableCell>
                      <TableCell align="center" sx={{ backgroundColor: "#42a5f5", color: "white", width: 30 }}>GV</TableCell>
                    </React.Fragment>
                  ));
                })()}
            </TableRow>
          </TableHead>

          <TableBody>
            {students.map((student, idx) => {
              const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };
              const allWeeksEmpty = Array.from({ length: endWeek - startWeek + 1 }, (_, i) => {
                const weekNum = startWeek + i;
                const weekId = `tuan_${weekNum}`;
                return student.statusByWeek?.[weekId];
              }).every(status => !status);

              return (
                <TableRow key={student.maDinhDanh} hover>
                  <TableCell align="center">{student.stt}</TableCell>
                  <TableCell align="left">{student.hoVaTen}</TableCell>

                  {showWeeks &&
                    Array.from({ length: endWeek - startWeek + 1 }, (_, i) => {
                      const weekNum = startWeek + i;
                      const weekId = `tuan_${weekNum}`;
                      const raw = student.statusByWeek?.[weekId];
                      const hs = raw && typeof raw === "object" ? (raw.hs || "") : (raw || "");
                      const gv = raw && typeof raw === "object" ? (raw.gv || "") : "";

                      const toShort = (statusStr) =>
                        statusStr === "Hoàn thành tốt" ? "T" :
                        statusStr === "Hoàn thành" ? "H" :
                        statusStr === "Chưa hoàn thành" ? "C" : "";

                      const hsShort = toShort(hs);
                      const gvShort = toShort(gv);

                      return (
                        <React.Fragment key={weekNum}>
                          <TableCell align="center" sx={{ width: 30 }}>{hsShort}</TableCell>
                          <TableCell align="center" sx={{ width: 30 }}>{gvShort}</TableCell>
                        </React.Fragment>
                      );
                    })}

                  <TableCell align="center" sx={{ color: student.xepLoai === "C" ? "#dc2626" : (theme) => theme.palette.primary.main }}>{allWeeksEmpty ? "" : student.xepLoai || ""}</TableCell>

                  <TableCell align="center" sx={{ px: 1, color: student.dgtx_gv === "C" ? "#dc2626" : (theme) => theme.palette.primary.main }}>
                    {allWeeksEmpty ? null : (
                      <FormControl variant="standard" fullWidth sx={{
                        "& .MuiSelect-icon": { opacity: 0, transition: "opacity 0.2s ease" },
                        "&:hover .MuiSelect-icon": { opacity: 1 },
                      }}>
                        <Select
                          value={student.dgtx_gv || ""}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            setStudents((prev) =>
                              prev.map((s) => {
                                if (s.maDinhDanh !== student.maDinhDanh) return s;
                                const updated = { ...s, dgtx_gv: newVal };
                                const hs = updated.xepLoai;
                                const gv = newVal;
                                let chung = "";
                                if (!gv) chung = hs;
                                else {
                                  if (hs === "T" && gv === "T") chung = "T";
                                  else if (hs === "H" && gv === "T") chung = "T";
                                  else if (hs === "C" && gv === "T") chung = "H";
                                  else if (hs === "T" && gv === "H") chung = "H";
                                  else if (hs === "H" && gv === "H") chung = "H";
                                  else if (hs === "C" && gv === "H") chung = "H";
                                  else if (hs === "T" && gv === "C") chung = "H";
                                  else if (hs === "H" && gv === "C") chung = "C";
                                  else if (hs === "C" && gv === "C") chung = "C";
                                  else chung = hs;
                                }
                                updated.dgtx = !gv ? hs : chung;
                                updated.nhanXet = updated.dgtx ? getNhanXetTuDong(updated.dgtx) : "";
                                return updated;
                              })
                            );
                          }}
                          disableUnderline
                          id={`teacher-dgtx-${idx}`}
                          sx={{
                            textAlign: "center",
                            px: 1,
                            "& .MuiSelect-select": {
                              py: 0.5,
                              fontSize: "14px",
                              color: student.dgtx_gv === "C" ? "#dc2626" : (theme) => theme.palette.primary.main,
                            },
                          }}
                        >
                          <MenuItem value=""><em>-</em></MenuItem>
                          <MenuItem value="T">T</MenuItem>
                          <MenuItem value="H">H</MenuItem>
                          <MenuItem value="C">C</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>

                  <TableCell align="center" sx={{ color: student.dgtx === "C" ? "#dc2626" : (theme) => theme.palette.primary.main }}>{allWeeksEmpty ? "" : student.dgtx || ""}</TableCell>

                  <TableCell align="left" sx={{ px: 1 }}>
                    {allWeeksEmpty ? null : (
                      <TextField
                        variant="standard"
                        multiline
                        maxRows={4}
                        fullWidth
                        value={student.nhanXet || ""}
                        onChange={(e) => handleCellChange(student.maDinhDanh, "nhanXet", e.target.value)}
                        id={`nhanXet-${idx}`}
                        onKeyDown={(e) => handleKeyNavigation(e, idx, "nhanXet")}
                        InputProps={{
                          sx: { paddingLeft: 1, paddingRight: 1, fontSize: "14px", lineHeight: 1.3 },
                          disableUnderline: true,
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- Bảng thống kê xuống cuối Card --- */}
      <Box
        sx={{
          mt: 3,
          backgroundColor: "#f1f8e9",
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          p: 2,
          width: 300,
          maxWidth: "90%",
          mx: "auto",
          boxShadow: 2,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
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
              {Array.from(
                { length: endWeek - startWeek + 1 },
                (_, i) => startWeek + i
              ).map((weekNum) => (
                <MenuItem key={weekNum} value={weekNum}>
                  Tuần {weekNum}
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

    {/* Snackbar */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        severity={snackbar.severity}
        sx={{ width: "100%", boxShadow: 3, borderRadius: 2, fontSize: "0.9rem" }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  </Box>
);



}

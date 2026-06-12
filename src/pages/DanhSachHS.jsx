import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack
} from "@mui/material";

import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, setDoc, onSnapshot } from "firebase/firestore";
import { updateDoc, deleteField, deleteDoc } from "firebase/firestore";
import { exportDanhsach } from "../utils/exportDanhSach";
import { printDanhSach } from "../utils/printDanhSach";
import { uploadStudents, uploadPPCT } from "../utils/uploadExcel";
import updateDATAForStudent from "../utils/updateDATAForStudent";
import EditStudentDialog from "../dialog/EditStudentDialog";
import CreateDataConfirmDialog from "../dialog/CreateDataConfirmDialog";

//import UploadIcon from "@mui/icons-material/Upload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StorageIcon from "@mui/icons-material/Storage"; 

import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import CloseIcon from "@mui/icons-material/Close";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon2 from "@mui/icons-material/Delete";

import { useNavigate } from "react-router-dom";

import { Tabs, Tab } from "@mui/material";
import { Switch, FormControlLabel } from "@mui/material";
import { LinearProgress } from "@mui/material";
//import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

export default function DanhSachHS() {
  const navigate = useNavigate();

  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);
  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [ppct, setPpct] = useState([]);
  const [viewMode, setViewMode] = useState("ppct"); 
  const [selectedKhoi, setSelectedKhoi] = useState("khoi4");
  const [showChuDe, setShowChuDe] = useState(false); // ✅ mặc định OFF
  const fileInputRef = React.useRef(null);
  const folderInputRef = React.useRef(null);

  const [ppctReloadKey, setPpctReloadKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedNamHoc, setSelectedNamHoc] = useState(config?.namHoc || "");
  
  const [hoveredHS, setHoveredHS] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newMaDinhDanh, setNewMaDinhDanh] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDataDialogOpen, setCreateDataDialogOpen] = useState(false);

  const [addingClass, setAddingClass] = useState(false);
  const [newClass, setNewClass] = useState("");

  // 🔹 Lấy config realtime (nguồn sự thật duy nhất)
  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) return;

      const data = docSnap.data();

      const namHoc = data.namHoc || "2025-2026";
      const lop = data.lop || "";

      // ✅ MERGE config – KHÔNG overwrite
      setConfig((prev) => ({
        ...prev,
        namHoc,
        lop,
      }));

      // ✅ sync local state cho UI
      setSelectedNamHoc(namHoc);
      setSelectedClass(lop);
    });

    return () => unsubscribe();
  }, [setConfig]);

  const normalizeClassKey = (cls) => String(cls || "").replaceAll(".", "_");

  // 🔹 Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const docRef = doc(db, "DANHSACH_LOP", namHocKey);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const classList = (snap.data().list || []).sort();

          setClassData(classList);
          setClasses(classList);

          setSelectedClass((prev) => {
            if (prev) return prev;

            // ưu tiên lớp lưu trong CONFIG
            if (config?.lop && classList.includes(config.lop)) {
              return config.lop;
            }

            return classList[0] || "";
          });
        } else {
          setClasses([]);
          setClassData([]);
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
      }
    };

    fetchClasses();
  }, [namHocKey, config?.lop, setClassData]);
  
  // 🔹 Lấy danh sách học sinh
  useEffect(() => {
    if (!selectedClass) return;

    const classKey = normalizeClassKey(selectedClass);

    // Hàm so sánh từng chữ từ phải sang trái
    const compareFullNamesRightToLeft = (a, b) => {
      const partsA = a.hoVaTen.replace(/\//g, " ").trim().split(/\s+/);
      const partsB = b.hoVaTen.replace(/\//g, " ").trim().split(/\s+/);
      const len = Math.max(partsA.length, partsB.length);

      for (let i = 1; i <= len; i++) {
        const wordA = partsA[partsA.length - i] || "";
        const wordB = partsB[partsB.length - i] || "";
        const cmp = wordA.localeCompare(wordB, "vi", { sensitivity: "base" });
        if (cmp !== 0) return cmp;
      }

      return 0;
    };

    // Lấy dữ liệu từ cache (UI vẫn dùng 4.1)
    const cached = studentData[selectedClass];
    if (cached && cached.length > 0) {
      const sorted = [...cached]
        .sort(compareFullNamesRightToLeft)
        .map((stu, idx) => ({
          ...stu,
          stt: idx + 1,
        }));

      setStudents(sorted);
      return;
    }

    // Fetch Firestore (ĐÚNG: 4_1)
    const fetchStudents = async () => {
      try {
        const classRef = collection(
          db,
          `DATA_${namHocKey}`,
          classKey,
          "HOCSINH"
        );

        const snapshot = await getDocs(classRef);

        const studentList = snapshot.docs.map((docSnap, idx) => {
          const data = docSnap.data();

          return {
            maDinhDanh: docSnap.id,
            hoVaTen: data.hoVaTen || "",
            stt: idx + 1,
            ghiChu: "",
          };
        });

        studentList.sort(compareFullNamesRightToLeft);

        setStudents(studentList);

        setStudentData((prev) => ({
          ...prev,
          [selectedClass]: studentList, // cache giữ UI key 4.1
        }));

      } catch (err) {
        console.error("❌ Lỗi load students:", err);
        setStudents([]);
      }
    };

    fetchStudents();
  }, [selectedClass, studentData, setStudentData]);

  useEffect(() => {
    if (viewMode !== "ppct" || !selectedKhoi || !config?.namHoc) return;

    const fetchPPCT = async () => {
      try {
        const khoiNamHoc = `${selectedKhoi}_${config.namHoc}`;
        const docRef = doc(db, "PPCT", khoiNamHoc);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          setPpct([]);
          return;
        }

        const data = snap.data();

        // Xử lý dữ liệu như trước...
        const list = Object.entries(data)
          .map(([key, value]) => {
            const weekText = key.replace("tuan_", "").replace(/_/g, " + ");
            const firstWeek = parseInt(weekText.split("+")[0].trim(), 10);
            return {
              tuan: weekText,
              chuDe: value.chuDe || "",
              tenBaiHoc: value.tenBaiHoc || "",
              lt: value.lt || "",
              th: value.th || "",
              _sortWeek: firstWeek,
            };
          })
          .sort((a, b) => a._sortWeek - b._sortWeek)
          .map(({ _sortWeek, ...rest }) => rest);

        // Merge chủ đề rowSpan
        const processed = [];
        let i = 0;
        while (i < list.length) {
          const currentChuDe = list[i].chuDe;
          let rowSpan = 1;
          for (let j = i + 1; j < list.length; j++) {
            if (list[j].chuDe === currentChuDe) rowSpan++;
            else break;
          }

          processed.push({ ...list[i], _showChuDe: true, _rowSpan: rowSpan });
          for (let k = 1; k < rowSpan; k++) {
            processed.push({ ...list[i + k], _showChuDe: false, _rowSpan: 0 });
          }
          i += rowSpan;
        }

        setPpct(processed);
      } catch (err) {
        console.error("❌ Lỗi lấy PPCT:", err);
        setPpct([]);
      }
    };

    fetchPPCT();
  }, [viewMode, selectedKhoi, config?.namHoc, ppctReloadKey]);

  
  const handleClassChange = (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass); // chỉ cập nhật state local
    };

  const tongLT = ppct.reduce((sum, r) => sum + (Number(r.lt) || 0), 0);
  const tongTH = ppct.reduce((sum, r) => {
    const ten = r.tenBaiHoc?.toLowerCase() || "";

    // bỏ 4 tiết ôn tập + kiểm tra
    if (ten.includes("ôn tập") || ten.includes("kiểm tra")) {
      return sum;
    }

    return sum + (Number(r.th) || 0);
  }, 0);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);

    try {

      if (viewMode === "students") {

        if (!selectedClass) return;

        for (let i = 0; i < files.length; i++) {

          const file = files[i];

          await uploadStudents({
            file,
            db,
            selectedClass,
            namHocKey,
            onProgress: (p) => {
              const global = Math.round(
                ((i + p / 100) / files.length) * 100
              );

              setUploadProgress(global);
            },
          });

        }

        // reload danh sách học sinh
        const classDocRef = doc(
          db,
          `DANHSACH_${namHocKey}`,
          selectedClass
        );

        const classSnap = await getDoc(classDocRef);

        if (classSnap.exists()) {

          const data = classSnap.data();

          const studentList = Object.entries(data).map(
            ([maDinhDanh, info], idx) => ({
              maDinhDanh,
              hoVaTen: info.hoVaTen,
              stt: idx + 1,
              ghiChu: "",
            })
          );

          setStudentData(prev => ({
            ...prev,
            [selectedClass]: studentList,
          }));

          setStudents(studentList);

        } else {

          setStudentData(prev => ({
            ...prev,
            [selectedClass]: [],
          }));

          setStudents([]);
        }

      } else {

        // PPCT
        for (let i = 0; i < files.length; i++) {

          const file = files[i];

          await uploadPPCT({
            file,
            db,
            namHoc: config?.namHoc,
            onProgress: (p) => {
              const global = Math.round(
                ((i + p / 100) / files.length) * 100
              );

              setUploadProgress(global);
            },
          });
        }

        setPpctReloadKey(k => k + 1);
      }

      setUploadProgress(100);

    } catch (err) {
      console.error(err);
    } finally {

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);

      e.target.value = null;
    }
  };

  const handleNamHocChange = async (e) => {
    const newNamHoc = e.target.value;
    try {
      await setDoc(
        doc(db, "CONFIG", "config"),
        { namHoc: newNamHoc },
        { merge: true }
      );
    } catch (err) {
      console.error("❌ Lỗi cập nhật năm học:", err);
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setNewName(student.hoVaTen);
  };

  const handleOpenAddStudent = () => {
    setIsAdding(true);
    setEditingStudent(null);
    setNewMaDinhDanh("");
    setNewName("");
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setConfirmDialogOpen(true);
  };

  // ===== Thêm học sinh =====
  const handleAddStudent = async () => {
    if (!newMaDinhDanh.trim() || !newName.trim()) return;

    const ma = newMaDinhDanh.trim();
    const ten = newName.trim().toUpperCase();
    const classKey = selectedClass.replace(".", "_");

    const sttMoi = students.length + 1;
    const lop = selectedClass;

    setIsAdding(false);
    setEditingStudent(null);

    // ===== 1. OPTIMISTIC UI UPDATE =====
    const newStudent = {
      maDinhDanh: ma,
      hoVaTen: ten,
      lop,
      stt: sttMoi,
      TinHoc: {},
      CongNghe: {},
    };

    const updatedStudents = [...students, newStudent];

    setStudents(updatedStudents);

    setStudentData((prev) => ({
      ...prev,
      [selectedClass]: updatedStudents,
    }));

    try {
      // ===== 2. FIRESTORE (GIỐNG uploadStudents) =====
      await setDoc(
        doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", ma),
        {
          hoVaTen: ten.toUpperCase(), // giống uploadStudents
          lop,
          stt: sttMoi,

          TinHoc: {
            dgtx: {},
            ktdk: {
              CN: {},
              CKI: {},
              GKI: {},
              GKII: {},
            },
            ontap: {
              CN: {},
              CKI: {},
              GKI: {},
              GKII: {},
            },
          },

          CongNghe: {
            dgtx: {},
            ktdk: {
              CN: {},
              CKI: {},
              GKI: {},
              GKII: {},
            },
            ontap: {
              CN: {},
              CKI: {},
              GKI: {},
              GKII: {},
            },
          },
        },
        { merge: true }
      );

    } catch (err) {
      console.error("❌ Lỗi khi thêm học sinh:", err);

      // ===== rollback nếu lỗi =====
      setStudents(students);
      setStudentData((prev) => ({
        ...prev,
        [selectedClass]: students,
      }));
    }

    // ===== reset input =====
    setNewMaDinhDanh("");
    setNewName("");
  };

  // ===== Chỉnh sửa học sinh =====
  const handleSaveStudent = async () => {
    if (!editingStudent || !newName.trim()) return;

    const ma = editingStudent.maDinhDanh;
    const ten = newName.trim();
    const classKey = selectedClass.replace(".", "_");

    // lưu lại snapshot để rollback nếu cần
    const oldStudents = students;

    setIsAdding(false);
    setEditingStudent(null);

    // ===== 1. UPDATE UI NGAY LẬP TỨC (OPTIMISTIC) =====
    const updatedList = students.map(s =>
      s.maDinhDanh === ma
        ? { ...s, hoVaTen: ten }
        : s
    );

    setStudents(updatedList);

    setStudentData(prev => ({
      ...prev,
      [selectedClass]: updatedList,
    }));

    try {
      // ===== 2. FIRESTORE CHẠY NỀN =====
      await updateDoc(
        doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", ma),
        { hoVaTen: ten }
      );

    } catch (err) {
      console.error("❌ Lỗi update Firestore:", err);

      // ===== 3. (OPTIONAL) ROLLBACK =====
      setStudents(oldStudents);
      setStudentData(prev => ({
        ...prev,
        [selectedClass]: oldStudents,
      }));
    }
  };

  // ===== Xóa học sinh =====
  const handleDeleteStudent = async (student) => {
    if (!student) return;

    const ma = student.maDinhDanh;
    const classKey = selectedClass.replace(".", "_");

    setIsAdding(false);
    setEditingStudent(null);

    const oldStudents = students;

    // ===== 1. UPDATE UI NGAY =====
    const updatedStudents = students
      .filter((s) => s.maDinhDanh !== ma)
      .map((s, i) => ({
        ...s,
        stt: i + 1,
      }));

    setStudents(updatedStudents);

    setStudentData((prev) => ({
      ...prev,
      [selectedClass]: updatedStudents,
    }));

    try {
      // ===== 2. FIRESTORE CHỈ CÒN DATA =====
      await deleteDoc(
        doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", ma)
      );

    } catch (err) {
      console.error("❌ Lỗi khi xóa học sinh:", err);

      // rollback
      setStudents(oldStudents);
      setStudentData((prev) => ({
        ...prev,
        [selectedClass]: oldStudents,
      }));
    }

    setHoveredHS(null);
  };

  // ===== THÊM LỚP =====
  const handleAddClass = async () => {
    if (!newClass.trim()) return;

    const input = newClass.toUpperCase().replace(/\s+/g, "");
    let generatedClasses = [];

    const parts = input.split(",");

    for (let part of parts) {

      // 3A->3K
      let matchLetter = part.match(/^(\d+)([A-Z])->(\d+)?([A-Z])$/);
      if (matchLetter) {
        const grade = matchLetter[1];
        const start = matchLetter[2].charCodeAt(0);
        const end = matchLetter[4].charCodeAt(0);

        if (start > end) continue;

        for (let c = start; c <= end; c++) {
          generatedClasses.push(`${grade}${String.fromCharCode(c)}`);
        }

        continue;
      }

      // 4.1->4.6
      let matchNumber = part.match(/^(\d+)\.(\d+)->(\d+)\.(\d+)$/);

      if (matchNumber) {
        const grade = matchNumber[1];
        const start = Number(matchNumber[2]);
        const end = Number(matchNumber[4]);

        if (start > end) continue;

        for (let i = start; i <= end; i++) {
          generatedClasses.push(`${grade}.${i}`);
        }

        continue;
      }

      // 1 lớp đơn
      if (/^\d+(\.\d+|[A-Z])$/.test(part)) {
        generatedClasses.push(part);
      }
    }

    if (generatedClasses.length === 0) {
      alert("❌ Định dạng không hợp lệ!");
      return;
    }

    // loại lớp đã tồn tại
    const uniqueNew = generatedClasses.filter(
      cls => !classes.includes(cls)
    );

    if (uniqueNew.length === 0) {
      alert("⚠️ Các lớp đã tồn tại!");
      return;
    }

    const updated = [...classes, ...uniqueNew].sort();

    // update state
    setClasses(updated);
    setClassData(updated);

    setSelectedClass(uniqueNew[0]);

    // lưu Firestore
    await setDoc(
      doc(db, "DANHSACH_LOP", namHocKey),
      {
        list: updated,
      },
      { merge: true }
    );

    // lưu lớp đang chọn
    await setDoc(
      doc(db, "CONFIG", "config"),
      {
        lop: uniqueNew[0],
      },
      { merge: true }
    );

    setAddingClass(false);
    setNewClass("");
  };

  const handleDeleteClass = async () => {

    if (!selectedClass) return;

    if (!window.confirm(`Xóa lớp ${selectedClass}?`)) return;

    const updated = classes
      .filter(c => c !== selectedClass)
      .sort();

    setClasses(updated);
    setClassData(updated);

    const nextClass = updated[0] || "";

    setSelectedClass(nextClass);

    await setDoc(
      doc(db, "DANHSACH_LOP", namHocKey),
      {
        list: updated,
      },
      { merge: true }
    );

    await setDoc(
      doc(db, "CONFIG", "config"),
      {
        lop: nextClass,
      },
      { merge: true }
    );
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
          maxWidth:
            viewMode === "students"
              ? 700
              : showChuDe
              ? 1100
              : 700,
          bgcolor: "white",
          position: "relative",
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
          }}
        >
          <CloseIcon />
        </IconButton>
        {/* ICON */}
        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 1,
            zIndex: 1000, // ⭐ QUAN TRỌNG
          }}
        >

          <Tooltip
            title={
              viewMode === "students"
                ? "Tải danh sách học sinh từ Excel"
                : "Tải phân phối chương trình từ Excel"
            }
          >
            <IconButton
              onClick={handleUploadClick}
              sx={{
                color: "#1976d2",
                bgcolor: "rgba(25,118,210,0.1)",
                "&:hover": {
                  bgcolor: "rgba(25,118,210,0.2)",
                },
              }}
            >
              <FileUploadIcon />
            </IconButton>
          </Tooltip>

          {viewMode === "students" && (
            <Tooltip title="Tải thư mục danh sách học sinh từ C1">
              <IconButton
                onClick={() => folderInputRef.current?.click()}
                sx={{
                  color: "#2e7d32",
                  bgcolor: "rgba(46,125,50,0.1)",
                  "&:hover": {
                    bgcolor: "rgba(46,125,50,0.2)",
                  },
                }}
              >
                <FolderOpenIcon />
              </IconButton>
            </Tooltip>
          )}

          {/*{viewMode === "students" && (
            <Tooltip title="Khởi tạo DATA năm mới">
              <IconButton
                onClick={() => setCreateDataDialogOpen(true)}
                sx={{
                  color: "#d32f2f",
                  bgcolor: "rgba(211,47,47,0.1)",
                  "&:hover": { bgcolor: "rgba(211,47,47,0.2)" },
                }}
              >
                <StorageIcon />
              </IconButton>
            </Tooltip>
          )}*/}

          {/*{viewMode === "students" && (
            <>
              <Tooltip title="Xuất Excel">
                <IconButton
                  onClick={() => exportDanhsach(selectedClass)}
                  sx={{ color: "#1976d2", bgcolor: "rgba(25,118,210,0.1)" }}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="In danh sách">
                <IconButton
                  onClick={() => printDanhSach(selectedClass)}
                  sx={{ color: "#2e7d32", bgcolor: "rgba(46,125,50,0.1)" }}
                >
                  <PrintIcon />
                </IconButton>
              </Tooltip>
            </>
          )}*/}
        </Box>

        {/* TIÊU ĐỀ */}
        <Box sx={{ textAlign: "center", mt: { xs: 4, sm: 0 }, mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#1976d2" }}>
            {viewMode === "students"
              ? "DANH SÁCH HỌC SINH"
              : `PHÂN PHỐI CHƯƠNG TRÌNH`}
          </Typography>
        </Box>

        {/* DROPDOWN */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 2,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {viewMode === "students" ? (
            <>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                {/* Hàng trên */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#1e293b",
                    }}
                  >
                    Lớp:
                  </Typography>

                  <Select
                    value={selectedClass}
                    onChange={handleClassChange}
                    size="small"
                    sx={{ width: 80 }}
                  >
                    {classes.map((cls) => (
                      <MenuItem key={cls} value={cls}>
                        {cls}
                      </MenuItem>
                    ))}
                  </Select>

                  {/* Icon thêm lớp */}
                  <Tooltip title="Thêm lớp">
                    <IconButton
                      onClick={() => setAddingClass(true)}
                      sx={{
                        color: "#fff",
                        bgcolor: "#22c55e",
                        width: 38,
                        height: 38,
                        "&:hover": {
                          bgcolor: "#16a34a",
                        },
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>

                  {/* Icon xóa lớp */}
                  <Tooltip title="Xóa lớp">
                    <IconButton
                      onClick={handleDeleteClass}
                      sx={{
                        color: "#fff",
                        bgcolor: "#ef4444",
                        width: 38,
                        height: 38,
                        "&:hover": {
                          bgcolor: "#dc2626",
                        },
                      }}
                    >
                      <DeleteIcon2 />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Hàng dưới */}
                {addingClass && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      ml: 5, // thụt vào dưới dòng trên
                      flexWrap: "wrap",
                    }}
                  >
                    <TextField
                      size="small"
                      label="Tên lớp"
                      placeholder="VD: 4.1->4.6"
                      value={newClass}
                      onChange={(e) => setNewClass(e.target.value)}
                      sx={{ width: 240 }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddClass();
                      }}
                    />

                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleAddClass}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: "8px",
                        px: 2,
                      }}
                    >
                      Lưu
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={() => {
                        setAddingClass(false);
                        setNewClass("");
                      }}
                      sx={{
                        textTransform: "none",
                        borderRadius: "8px",
                        px: 2,
                      }}
                    >
                      Hủy
                    </Button>
                  </Box>
                )}
              </Box>
            </>
          ) : (
            <>
              <FormControl size="small" sx={{ width: 80 }}>
                <InputLabel id="label-khoi">Khối</InputLabel>
                <Select
                  labelId="label-khoi"
                  value={selectedKhoi}
                  onChange={(e) => setSelectedKhoi(e.target.value)}
                  label="Khối"
                >
                  <MenuItem value="khoi4">4</MenuItem>
                  <MenuItem value="khoi5">5</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ width: 140 }}>
                <InputLabel id="label-namhoc">Năm học</InputLabel>
                <Select
                  labelId="label-namhoc"
                  value={selectedNamHoc}
                  onChange={handleNamHocChange}
                  label="Năm học"
                >

                  <MenuItem value="2025-2026">2025-2026</MenuItem>
                  <MenuItem value="2026-2027">2026-2027</MenuItem>
                  <MenuItem value="2027-2028">2027-2028</MenuItem>
                  <MenuItem value="2028-2029">2028-2029</MenuItem>
                  <MenuItem value="2029-2030">2029-2030</MenuItem>
                </Select>
              </FormControl>

              {/* 🔹 TOGGLE CHỦ ĐỀ */}
              <FormControlLabel
                sx={{ ml: 2 }}
                control={
                  <Switch
                    checked={showChuDe}
                    onChange={(e) => setShowChuDe(e.target.checked)}
                    color="primary"
                  />
                }
                label="Hiện Chủ đề"
              />
            </>
          )}
        </Box>
        
        {uploading && (
          <Box
            sx={{
              mt: 3,
              mb: 2,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: "25%",
                minWidth: 220, // chống quá nhỏ trên màn hình bé
              }}
            >
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  height: 3,
                  borderRadius: 5,
                  bgcolor: "rgba(25,118,210,0.15)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 5,
                  },
                  mb: 1,
                }}
              />
              <Typography fontSize={14} mb={0.5} textAlign="center">
                Đang tải dữ liệu: {uploadProgress}%
              </Typography>
            </Box>
          </Box>
        )}

        {/* TAB */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Tabs value={viewMode} onChange={(e, v) => setViewMode(v)}>
            <Tab value="ppct" label="Phân phối chương trình" />
            <Tab value="students" label="Danh sách học sinh" />          
          </Tabs>
        </Box>

        {/* ===== DANH SÁCH ===== */}
        {viewMode === "students" && (
          <TableContainer
            component={Paper}
            sx={{ boxShadow: "none", border: "1px solid rgba(0,0,0,0.12)", overflowX: "auto" }}
          >
            <Table size="small" sx={{ tableLayout: "fixed", minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    align="center"
                    sx={{ width: 40, bgcolor: "#1976d2", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}
                  >
                    STT
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ width: 120, bgcolor: "#1976d2", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}
                  >
                    MÃ ĐỊNH DANH
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ width: 220, bgcolor: "#1976d2", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}
                  >
                    HỌ VÀ TÊN
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: "#1976d2",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.4)",
                      whiteSpace: "nowrap",
                      width: 100,
                    }}
                  >
                    ĐIỀU CHỈNH
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {students.map((s) => (
                  <TableRow
                    key={s.maDinhDanh}
                    onMouseEnter={() => setHoveredHS(s.maDinhDanh)}
                    onMouseLeave={() => setHoveredHS(null)}
                    sx={{
                      "&:hover": {
                        backgroundColor: "rgba(25,118,210,0.05)",
                      },
                    }}
                  >

                    <TableCell
                      align="center"
                      sx={{ width: 40, border: "1px solid rgba(0,0,0,0.12)", whiteSpace: "nowrap" }}
                    >
                      {s.stt}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{ width: 120, border: "1px solid rgba(0,0,0,0.12)", whiteSpace: "nowrap" }}
                    >
                      {s.maDinhDanh}
                    </TableCell>

                    <TableCell
                      sx={{
                        width: 220,
                        border: "1px solid rgba(0,0,0,0.12)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.hoVaTen}
                    </TableCell>

                    {/* ĐIỀU CHỈNH */}
                    <TableCell
                      align="center"
                      sx={{
                        border: "1px solid rgba(0,0,0,0.12)",
                        height: 30,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 0.5,
                          visibility: hoveredHS === s.maDinhDanh ? "visible" : "hidden",
                        }}
                      >
                        {/* ➕ THÊM */}
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            setIsAdding(true);
                            setEditingStudent(null);
                            setNewName("");
                            setNewMaDinhDanh("");
                          }}
                        >
                          <PersonAddIcon fontSize="small" />
                        </IconButton>


                        {/* ✏️ SỬA */}
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditStudent(s)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>

                        {/* 🗑️ XOÁ */}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setStudentToDelete(s);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>


                  </TableRow>
                ))}
              </TableBody>

            </Table>
          </TableContainer>
        )}

        {/* ===== PPCT ===== */}
        {viewMode === "ppct" && (
          <TableContainer
            component={Paper}
            sx={{
              boxShadow: "none",
              border: "1px solid rgba(0,0,0,0.12)",
              overflowX: "auto",
            }}
          >
            <Table
              size="small"
              sx={{
                tableLayout: "fixed",
                minWidth: showChuDe ? 1020 : 700,
              }}
            >
              {/* ===== HEADER ===== */}
              <TableHead>
                <TableRow>
                  {/* TUẦN */}
                  <TableCell
                    align="center"
                    sx={{
                      width: 80,
                      bgcolor: "#1976d2",
                      color: "#fff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    TUẦN
                  </TableCell>

                  {/* CHỦ ĐỀ */}
                  {showChuDe && (
                    <TableCell
                      align="center"
                      sx={{
                        width: 320,
                        bgcolor: "#1976d2",
                        color: "#fff",
                        border: "1px solid rgba(0,0,0,0.12)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      CHỦ ĐỀ
                    </TableCell>
                  )}

                  {/* TÊN BÀI HỌC */}
                  <TableCell
                    align="center"
                    sx={{
                      width: 320,
                      bgcolor: "#1976d2",
                      color: "#fff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    TÊN BÀI HỌC
                  </TableCell>

                  {/* LT */}
                  <TableCell
                    align="center"
                    sx={{
                      width: 60,
                      bgcolor: "#1976d2",
                      color: "#fff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    L.THUYẾT
                  </TableCell>

                  {/* TH */}
                  <TableCell
                    align="center"
                    sx={{
                      width: 60,
                      bgcolor: "#1976d2",
                      color: "#fff",
                      border: "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    T.HÀNH
                  </TableCell>
                </TableRow>
              </TableHead>

              {/* ===== BODY ===== */}
              <TableBody>
                {ppct.map((row, idx) => {
                  const isOnTap = row.tenBaiHoc?.toLowerCase().includes("ôn tập");
                  const isKiemTra = row.tenBaiHoc?.toLowerCase().includes("kiểm tra");

                  const bgColor = isOnTap
                    ? "#fff8e1"
                    : isKiemTra
                    ? "#e3f2fd"
                    : "transparent";

                  return (
                    <TableRow key={idx} sx={{ bgcolor: bgColor }}>
                      {/* TUẦN */}
                      <TableCell
                        align="center"
                        sx={{
                          width: 80,
                          border: "1px solid rgba(0,0,0,0.12)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.tuan}
                      </TableCell>

                      {/* CHỦ ĐỀ (MERGE) */}
                      {showChuDe && row._showChuDe && (
                        <TableCell
                          rowSpan={row._rowSpan}
                          sx={{
                            width: 320,
                            maxWidth: 320,
                            border: "1px solid rgba(0,0,0,0.12)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            verticalAlign: "middle",
                            textTransform: "uppercase",
                          }}
                          title={row.chuDe}
                        >
                          {row.chuDe}
                        </TableCell>
                      )}

                      {/* TÊN BÀI HỌC */}
                      <TableCell
                        sx={{
                          width: 320,
                          maxWidth: 320,
                          border: "1px solid rgba(0,0,0,0.12)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: isKiemTra ? 600 : 400,
                        }}
                        title={row.tenBaiHoc}
                      >
                        {row.tenBaiHoc}
                      </TableCell>

                      {/* LT */}
                      <TableCell
                        align="center"
                        sx={{
                          width: 60,
                          border: "1px solid rgba(0,0,0,0.12)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.lt || ""}
                      </TableCell>

                      {/* TH */}
                      <TableCell
                        align="center"
                        sx={{
                          width: 60,
                          border: "1px solid rgba(0,0,0,0.12)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.th || ""}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* ===== DÒNG TỔNG ===== */}
                <TableRow sx={{ bgcolor: "#ffcc80" }}>
                  {/* TUẦN */}
                  <TableCell
                    align="center"
                    sx={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontWeight: 600,
                    }}
                  >
                    TỔNG
                  </TableCell>

                  {/* CHỦ ĐỀ (nếu có) */}
                  {showChuDe && (
                    <TableCell
                      sx={{
                        border: "1px solid rgba(0,0,0,0.12)",
                      }}
                    />
                  )}

                  {/* TÊN BÀI HỌC */}
                  <TableCell
                    sx={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontWeight: 600,
                    }}
                  >
                    {/*Tổng số tiết*/}
                  </TableCell>

                  {/* LT */}
                  <TableCell
                    align="center"
                    sx={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontWeight: 700,
                    }}
                  >
                    {tongLT}
                  </TableCell>

                  {/* TH */}
                  <TableCell
                    align="center"
                    sx={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontWeight: 700,
                    }}
                  >
                    {tongTH}
                  </TableCell>
                </TableRow>

              </TableBody>
            </Table>
          </TableContainer>
        )}

      </Paper>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".xlsx"
        multiple
        onChange={handleFileChange}
      />

      <input
        ref={folderInputRef}
        type="file"
        hidden
        multiple
        webkitdirectory=""
        onChange={handleFileChange}
      />

      <EditStudentDialog
        open={isAdding || !!editingStudent || deleteDialogOpen}
        onClose={() => {
          setIsAdding(false);
          setEditingStudent(null);
          setDeleteDialogOpen(false);
        }}
        student={editingStudent || studentToDelete}
        newName={newName}
        setNewName={setNewName}
        newMaDinhDanh={newMaDinhDanh}
        setNewMaDinhDanh={setNewMaDinhDanh}
        isAdding={isAdding}
        onSave={isAdding ? handleAddStudent : handleSaveStudent}
        isConfirm={deleteDialogOpen} // 🔹 bật chế độ xác nhận xóa
        onConfirm={async () => {
          if (studentToDelete) {
            await handleDeleteStudent(studentToDelete);
            setDeleteDialogOpen(false);
            setStudentToDelete(null);
          }
        }}
      />

    <CreateDataConfirmDialog
      open={createDataDialogOpen}
      onClose={() => setCreateDataDialogOpen(false)}
      configData={config}
    />

    </Box>    
  );
}

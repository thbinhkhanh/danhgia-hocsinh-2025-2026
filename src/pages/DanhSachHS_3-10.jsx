import React, { useState, useEffect, useContext } from "react";

import {
  Box,
  Typography,
  MenuItem,
  Select,
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Divider,
  Popover,
} from "@mui/material";

import { db } from "../firebase";

import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { useSelectedClass } from "../context/SelectedClassContext";
import { exportAbsentExcel } from "../utils/exportAbsentExcel";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { uploadStudents } from "../utils/uploadStudents";

import EditStudentDialog from "../dialog/EditStudentDialog";
import CreateDataConfirmDialog from "../dialog/CreateDataConfirmDialog";

import FileUploadIcon from "@mui/icons-material/FileUpload";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StorageIcon from "@mui/icons-material/Storage";
import CloseIcon from "@mui/icons-material/Close";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import { useNavigate } from "react-router-dom";
import { LinearProgress } from "@mui/material";

import dayjs from "dayjs";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";

export default function DanhSachHS() {
  const navigate = useNavigate();

  // =========================================================
  // STUDENT CONTEXT
  // Chỉ quản lý dữ liệu học sinh
  // =========================================================
  const {
    studentData,
    setStudentData,
  } = useContext(StudentContext);

  // =========================================================
  // CONFIG CONTEXT
  // =========================================================
  const {
    config,
    setConfig,
  } = useContext(ConfigContext);

  const namHocKey = (
    config?.namHoc || "2025-2026"
  ).replace(/-/g, "_");

  // =========================================================
  // SELECTED CLASS CONTEXT
  // Quản lý:
  // - classes
  // - selectedClass
  // - localStorage
  // - Firestore DANHSACH_LOP
  // =========================================================
  const {
    classes,
    selectedClass,
    setSelectedClass,
    updateClasses,
  } = useSelectedClass();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [showMonth, setShowMonth] = useState(false);
  const [monthlyAttendance, setMonthlyAttendance] = useState({});

  // Ngày điểm danh đang chọn: YYYY-MM-DD
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  const monthStart = dayjs(attendanceDate).startOf("month");

  const monthDays = Array.from(
    { length: monthStart.daysInMonth() },
    (_, index) =>
      monthStart
        .add(index, "day")
        .format("YYYY-MM-DD")
  );

  const fileInputRef = React.useRef(null);
  const folderInputRef = React.useRef(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [hoveredHS, setHoveredHS] = useState(null);

  const [editingStudent, setEditingStudent] =
    useState(null);

  const [newName, setNewName] = useState("");

  const [isAdding, setIsAdding] = useState(false);

  const [newMaDinhDanh, setNewMaDinhDanh] =
    useState("");

  const [studentToDelete, setStudentToDelete] =
    useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [createDataDialogOpen, setCreateDataDialogOpen] =
    useState(false);

  const [addingClass, setAddingClass] =
    useState(false);

  const [newClass, setNewClass] = useState("");

  const [newGhiChu, setNewGhiChu] = useState("");

  const [deleteClassDialogOpen, setDeleteClassDialogOpen] =
    useState(false);

  const [
    selectedClassesToDelete,
    setSelectedClassesToDelete,
  ] = useState([]);

  // =========================================================
  // LẤY CONFIG REALTIME
  // =========================================================
  useEffect(() => {
    const docRef = doc(
      db,
      "CONFIG",
      "config"
    );

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) return;

        const data = docSnap.data();

        const namHoc =
          data.namHoc || "2025-2026";

        const lop =
          data.lop || "";

        setConfig((prev) => ({
          ...prev,
          namHoc,
          lop,
        }));
      }
    );

    return () => unsubscribe();
  }, [setConfig]);

  // =========================================================
  // CHUẨN HÓA KEY LỚP
  // =========================================================
  const normalizeClassKey = (cls) =>
    String(cls || "").replaceAll(".", "_");

  // =========================================================
  // LẤY DANH SÁCH HỌC SINH
  // =========================================================
  useEffect(() => {
    if (!selectedClass) return;

    const classKey =
      normalizeClassKey(selectedClass);

    // =======================================================
    // SO SÁNH TÊN TỪ PHẢI SANG TRÁI
    // =======================================================
    const compareFullNamesRightToLeft = (a, b) => {
      const partsA = a.hoVaTen
        .replace(/\\/g, " ")
        .trim()
        .split(/\s+/);

      const partsB = b.hoVaTen
        .replace(/\\/g, " ")
        .trim()
        .split(/\s+/);

      const len = Math.max(
        partsA.length,
        partsB.length
      );

      for (let i = 1; i <= len; i++) {
        const wordA =
          partsA[partsA.length - i] || "";

        const wordB =
          partsB[partsB.length - i] || "";

        const cmp = wordA.localeCompare(
          wordB,
          "vi",
          {
            sensitivity: "base",
          }
        );

        if (cmp !== 0) return cmp;
      }

      return 0;
    };

    // =====================================================
    // LẤY TỪ CACHE
    // =====================================================
    const cached =
      studentData[selectedClass];

    if (
      cached &&
      cached.length > 0
    ) {
      const sorted = [...cached]
        .sort(compareFullNamesRightToLeft)
        .map((stu, idx) => ({
          ...stu,
          stt: idx + 1,
        }));

      setStudents(sorted);
      return;
    }

    // =====================================================
    // FETCH FIRESTORE
    // =====================================================
    const fetchStudents = async () => {
      try {
        const classRef = collection(
          db,
          `DATA_${namHocKey}`,
          classKey,
          "HOCSINH"
        );

        const snapshot =
          await getDocs(classRef);

        const studentList =
          snapshot.docs.map(
            (docSnap, idx) => {
              const data =
                docSnap.data();

              return {
                maDinhDanh:
                  docSnap.id,

                hoVaTen:
                  data.hoVaTen || "",

                stt: idx + 1,

                ghiChu: data.ghiChu || "",
              };
            }
          );

        studentList.sort(
          compareFullNamesRightToLeft
        );

        const sortedList =
          studentList.map(
            (student, idx) => ({
              ...student,
              stt: idx + 1,
            })
          );

        setStudents(sortedList);

        setStudentData((prev) => ({
          ...prev,
          [selectedClass]:
            sortedList,
        }));
      } catch (err) {
        console.error(
          "❌ Lỗi load students:",
          err
        );

        setStudents([]);
      }
    };

    fetchStudents();
  }, [
    selectedClass,
    namHocKey,
    studentData,
    setStudentData,
  ]);

  // =========================================================
  // LẤY TRẠNG THÁI ĐIỂM DANH CỦA NGÀY HIỆN TẠI
  // =========================================================
  useEffect(() => {
    if (!selectedClass || students.length === 0) return;

    const loadAttendance = async () => {
      try {
        const result = {};

        await Promise.all(
          students.map(async (student) => {
            const attendanceRef = doc(
              db,
              `DIEMDANH_${namHocKey}`,
              selectedClass,
              student.maDinhDanh,
              attendanceDate
            );

            const snap = await getDoc(attendanceRef);

            result[student.maDinhDanh] =
              snap.exists() && snap.data()?.vắng === true;
          })
        );

        setAttendance(result);
      } catch (err) {
        console.error("❌ Lỗi lấy dữ liệu điểm danh:", err);
      }
    };

    loadAttendance();
  }, [
    selectedClass,
    namHocKey,
    students,
    attendanceDate,
  ]);

  // =========================================================
  // ĐỔI LỚP
  // =========================================================
  const handleClassChange = (e) => {
    const newClass =
      e.target.value;

    setSelectedClass(newClass);
  };

  const handleAttendanceDateChange = (e) => {
    setAttendanceDate(e.target.value);
  };

  // =========================================================
  // MỞ FILE EXCEL
  // =========================================================
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // =========================================================
  // IMPORT DANH SÁCH HỌC SINH
  // =========================================================
  const handleFileChange = async (e) => {
    const files = Array.from(
      e.target.files || []
    );

    if (!files.length) return;

    if (!selectedClass) {
      e.target.value = null;
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (
        let i = 0;
        i < files.length;
        i++
      ) {
        const file = files[i];

        await uploadStudents({
          file,
          db,
          selectedClass,
          namHocKey,

          onProgress: (p) => {
            const global =
              Math.round(
                (
                  (i + p / 100) /
                  files.length
                ) * 100
              );

            setUploadProgress(
              global
            );
          },
        });
      }

      // ===================================================
      // RELOAD DANH SÁCH HỌC SINH
      // ===================================================
      const classDocRef = doc(
        db,
        `DANHSACH_${namHocKey}`,
        selectedClass
      );

      const classSnap =
        await getDoc(
          classDocRef
        );

      if (classSnap.exists()) {
        const data =
          classSnap.data();

        const studentList =
          Object.entries(data).map(
            (
              [maDinhDanh, info],
              idx
            ) => ({
              maDinhDanh,
              hoVaTen:
                info.hoVaTen || "",
              stt: idx + 1,
              ghiChu: "",
            })
          );

        setStudentData(
          (prev) => ({
            ...prev,
            [selectedClass]:
              studentList,
          })
        );

        setStudents(
          studentList
        );
      } else {
        setStudentData(
          (prev) => ({
            ...prev,
            [selectedClass]: [],
          })
        );

        setStudents([]);
      }

      setUploadProgress(100);
    } catch (err) {
      console.error(
        "❌ Lỗi import danh sách học sinh:",
        err
      );
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);

      e.target.value = null;
    }
  };

  // =========================================================
  // SỬA HỌC SINH
  // =========================================================
  const handleEditStudent = (student) => {
    setEditingStudent(student);

    setNewMaDinhDanh(
      student.maDinhDanh || ""
    );

    setNewName(
      student.hoVaTen || ""
    );

    setNewGhiChu(
      student.ghiChu || ""
    );
  };

  // =========================================================
  // MỞ THÊM HỌC SINH
  // =========================================================
  const handleOpenAddStudent = () => {
    setIsAdding(true);

    setEditingStudent(null);
    setNewMaDinhDanh("");
    setNewName("");
    setNewGhiChu("");
  };

  // =========================================================
  // THÊM HỌC SINH
  // =========================================================
  const handleAddStudent = async () => {
    // =====================================================
    // CHỐNG GỌI HÀM NGOÀI LUỒNG THÊM
    // =====================================================
    if (!isAdding) {
      console.warn(
        "⚠️ handleAddStudent bị gọi khi không ở chế độ Thêm. Đã chặn."
      );
      return;
    }

    // =====================================================
    // KIỂM TRA DỮ LIỆU
    // =====================================================
    const ma = newMaDinhDanh?.trim();
    const ten = newName?.trim().toUpperCase();

    if (!ma || !ten || !selectedClass) {
      return;
    }

    // =====================================================
    // CLASS KEY
    // =====================================================
    const classKey = String(selectedClass).replace(/\./g, "_");
    const lop = selectedClass;

    // =====================================================
    // KHÔNG TỰ GHI ĐÈ HỌC SINH ĐÃ CÓ TRONG LỚP
    // =====================================================
    const studentRef = doc(
      db,
      `DATA_${namHocKey}`,
      classKey,
      "HOCSINH",
      ma
    );

    try {
      const existingSnap = await getDoc(studentRef);

      if (existingSnap.exists()) {
        console.warn(
          `⚠️ Mã ${ma} đã tồn tại trong lớp ${lop}. Không ghi đè dữ liệu.`
        );
        alert(`Mã định danh ${ma} đã tồn tại trong lớp ${lop}.`);
        return;
      }

      // ===================================================
      // STT
      // ===================================================
      const sttMoi = students.length + 1;

      // ===================================================
      // DỮ LIỆU MỚI
      // ===================================================
      const studentDataNew = {
        hoVaTen: ten,
        ghiChu: newGhiChu.trim(),
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
      };

      // ===================================================
      // FIRESTORE
      // Dùng setDoc KHÔNG merge
      // ===================================================
      await setDoc(
        studentRef,
        studentDataNew
      );

      // ===================================================
      // CHỈ CẬP NHẬT UI SAU KHI FIRESTORE THÀNH CÔNG
      // ===================================================
      const newStudent = {
        maDinhDanh: ma,
        hoVaTen: ten,
        ghiChu: newGhiChu.trim(),
        lop,
        stt: sttMoi,
        TinHoc: studentDataNew.TinHoc,
        CongNghe: studentDataNew.CongNghe,
      };

      const updatedStudents = [
        ...students,
        newStudent,
      ];

      setStudents(updatedStudents);

      setStudentData((prev) => ({
        ...prev,
        [selectedClass]: updatedStudents,
      }));

      // ===================================================
      // ĐÓNG TRẠNG THÁI THÊM
      // ===================================================
      setIsAdding(false);
      setEditingStudent(null);
      setNewMaDinhDanh("");
      setNewName("");
      setNewGhiChu("");

    } catch (err) {
      console.error(
        "❌ Lỗi khi thêm học sinh:",
        err
      );
    }
  };

  // =========================================================
  // LƯU CHỈNH SỬA HỌC SINH
  // =========================================================
  const handleSaveStudent = async () => {
    if (
      !editingStudent ||
      !newName.trim() ||
      !newMaDinhDanh.trim()
    ) {
      return;
    }

    const maCu =
      editingStudent.maDinhDanh;

    const maMoi =
      newMaDinhDanh.trim();

    const ten =
      newName.trim();

    const classKey =
      selectedClass.replace(
        ".",
        "_"
      );

    // Snapshot rollback
    const oldStudents =
      students;

    // =====================================================
    // OPTIMISTIC UI
    // =====================================================
    const updatedList =
      students.map((s) =>
        s.maDinhDanh === maCu
          ? {
              ...s,
              maDinhDanh: maMoi,
              hoVaTen: ten,
              ghiChu: newGhiChu.trim(),
            }
          : s
      );

    setStudents(
      updatedList
    );

    setStudentData(
      (prev) => ({
        ...prev,
        [selectedClass]:
          updatedList,
      })
    );

    setIsAdding(false);
    setEditingStudent(null);

    try {
      // ===================================================
      // KHÔNG ĐỔI MÃ
      // ===================================================
      if (maCu === maMoi) {
        await updateDoc(
          doc(
            db,
            `DATA_${namHocKey}`,
            classKey,
            "HOCSINH",
            maCu
          ),
          {
            hoVaTen: ten,
            ghiChu: newGhiChu.trim(),
          }
        );

        return;
      }

      // ===================================================
      // ĐỔI MÃ ĐỊNH DANH
      // ===================================================
      const oldRef = doc(
        db,
        `DATA_${namHocKey}`,
        classKey,
        "HOCSINH",
        maCu
      );

      const newRef = doc(
        db,
        `DATA_${namHocKey}`,
        classKey,
        "HOCSINH",
        maMoi
      );

      // ===================================================
      // KIỂM TRA MÃ MỚI
      // ===================================================
      const newSnap =
        await getDoc(newRef);

      if (newSnap.exists()) {
        alert(
          `Mã định danh "${maMoi}" đã tồn tại.`
        );

        setStudents(
          oldStudents
        );

        setStudentData(
          (prev) => ({
            ...prev,
            [selectedClass]:
              oldStudents,
          })
        );

        return;
      }

      // ===================================================
      // LẤY DỮ LIỆU CŨ
      // ===================================================
      const oldSnap =
        await getDoc(oldRef);

      if (!oldSnap.exists()) {
        throw new Error(
          "Không tìm thấy học sinh với mã định danh cũ."
        );
      }

      const oldData =
        oldSnap.data();

      // ===================================================
      // TẠO DOCUMENT MỚI
      // ===================================================
      await setDoc(
        newRef,
        {
          ...oldData,
          maDinhDanh: maMoi,
          hoVaTen: ten,
          ghiChu: newGhiChu.trim(),
        }
      );

      // ===================================================
      // XÓA DOCUMENT CŨ
      // ===================================================
      await deleteDoc(oldRef);
    } catch (err) {
      console.error(
        "❌ Lỗi update Firestore:",
        err
      );

      // ===================================================
      // ROLLBACK
      // ===================================================
      setStudents(
        oldStudents
      );

      setStudentData(
        (prev) => ({
          ...prev,
          [selectedClass]:
            oldStudents,
        })
      );

      alert(
        "Không thể lưu thông tin học sinh."
      );
    }
  };

  // =========================================================
  // XÓA HỌC SINH
  // =========================================================
  const handleDeleteStudent = async (
    student
  ) => {
    if (!student) return;

    const ma =
      student.maDinhDanh;

    const classKey =
      selectedClass.replace(
        ".",
        "_"
      );

    setIsAdding(false);
    setEditingStudent(null);

    const oldStudents =
      students;

    // =====================================================
    // OPTIMISTIC UI
    // =====================================================
    const updatedStudents =
      students
        .filter(
          (s) =>
            s.maDinhDanh !== ma
        )
        .map((s, i) => ({
          ...s,
          stt: i + 1,
        }));

    setStudents(
      updatedStudents
    );

    setStudentData(
      (prev) => ({
        ...prev,
        [selectedClass]:
          updatedStudents,
      })
    );

    try {
      // ===================================================
      // FIRESTORE
      // ===================================================
      await deleteDoc(
        doc(
          db,
          `DATA_${namHocKey}`,
          classKey,
          "HOCSINH",
          ma
        )
      );
    } catch (err) {
      console.error(
        "❌ Lỗi khi xóa học sinh:",
        err
      );

      // ===================================================
      // ROLLBACK
      // ===================================================
      setStudents(
        oldStudents
      );

      setStudentData(
        (prev) => ({
          ...prev,
          [selectedClass]:
            oldStudents,
        })
      );
    }

    setHoveredHS(null);
  };

  // =========================================================
  // THÊM LỚP
  // SelectedClassContext:
  // Context + localStorage + Firestore
  // =========================================================
  const handleAddClass = async () => {
    if (!newClass.trim()) return;

    const input =
      newClass
        .toUpperCase()
        .replace(/\s+/g, "");

    let generatedClasses = [];

    const parts =
      input.split(",");

    for (let part of parts) {
      // -----------------------------------------------
      // 3A -> 3K
      // -----------------------------------------------
      const matchLetter =
        part.match(
          /^(\d+)([A-Z])->(\d+)?([A-Z])$/
        );

      if (matchLetter) {
        const grade =
          matchLetter[1];

        const start =
          matchLetter[2].charCodeAt(
            0
          );

        const end =
          matchLetter[4].charCodeAt(
            0
          );

        if (start > end)
          continue;

        for (
          let c = start;
          c <= end;
          c++
        ) {
          generatedClasses.push(
            `${grade}${String.fromCharCode(c)}`
          );
        }

        continue;
      }

      // -----------------------------------------------
      // 4.1 -> 4.6
      // -----------------------------------------------
      const matchNumber =
        part.match(
          /^(\d+)\.(\d+)->(\d+)\.(\d+)$/
        );

      if (matchNumber) {
        const grade =
          matchNumber[1];

        const start =
          Number(matchNumber[2]);

        const end =
          Number(matchNumber[4]);

        if (start > end)
          continue;

        for (
          let i = start;
          i <= end;
          i++
        ) {
          generatedClasses.push(
            `${grade}.${i}`
          );
        }

        continue;
      }

      // -----------------------------------------------
      // 1 lớp đơn
      // -----------------------------------------------
      if (
        /^\d+(\.\d+|[A-Z])$/.test(
          part
        )
      ) {
        generatedClasses.push(
          part
        );
      }
    }

    // =====================================================
    // KIỂM TRA ĐỊNH DẠNG
    // =====================================================
    if (
      generatedClasses.length === 0
    ) {
      alert(
        "❌ Định dạng không hợp lệ!"
      );
      return;
    }

    // =====================================================
    // LẤY DANH SÁCH HIỆN TẠI
    // TỪ SelectedClassContext
    // =====================================================
    const currentClasses =
      Array.isArray(classes)
        ? classes
        : [];

    // =====================================================
    // LOẠI LỚP ĐÃ TỒN TẠI
    // =====================================================
    const uniqueNew =
      generatedClasses.filter(
        (cls) =>
          !currentClasses.includes(
            cls
          )
      );

    if (
      uniqueNew.length === 0
    ) {
      alert(
        "⚠️ Các lớp đã tồn tại!"
      );
      return;
    }

    // =====================================================
    // TẠO DANH SÁCH MỚI
    // =====================================================
    const updated = [
      ...currentClasses,
      ...uniqueNew,
    ].sort();

    try {
      // ===================================================
      // CẬP NHẬT:
      // 1. SelectedClassContext
      // 2. localStorage
      // 3. Firestore DANHSACH_LOP
      // ===================================================
      await updateClasses(
        updated
      );

      // ===================================================
      // CHỌN LỚP MỚI
      // Context + localStorage + CONFIG
      // ===================================================
      await setSelectedClass(
        uniqueNew[0]
      );

      setAddingClass(false);
      setNewClass("");
    } catch (err) {
      console.error(
        "❌ Lỗi khi thêm lớp:",
        err
      );

      alert(
        "Không thể thêm lớp."
      );
    }
  };

  // =========================================================
  // MỞ GIAO DIỆN CHỌN LỚP ĐỂ XÓA
  // =========================================================
  const handleOpenDeleteClassDialog =
    () => {
      setSelectedClassesToDelete(
        []
      );

      setDeleteClassDialogOpen(
        true
      );
    };

  // =========================================================
  // CHỌN / BỎ CHỌN MỘT LỚP
  // =========================================================
  const handleToggleDeleteClass = (
    className
  ) => {
    setSelectedClassesToDelete(
      (prev) =>
        prev.includes(className)
          ? prev.filter(
              (cls) =>
                cls !== className
            )
          : [
              ...prev,
              className,
            ]
    );
  };

  // =========================================================
  // CHỌN / BỎ CHỌN TẤT CẢ
  // =========================================================
  const handleToggleAllDeleteClasses =
    () => {
      if (
        selectedClassesToDelete.length ===
        classes.length
      ) {
        setSelectedClassesToDelete(
          []
        );
      } else {
        setSelectedClassesToDelete(
          [...classes]
        );
      }
    };

  // =========================================================
  // XÓA CÁC LỚP ĐÃ CHỌN
  // SelectedClassContext:
  // Context + localStorage + Firestore
  // =========================================================
  const handleDeleteClass = async () => {
    if (
      selectedClassesToDelete.length ===
      0
    ) {
      alert(
        "⚠️ Vui lòng chọn ít nhất một lớp để xóa."
      );
      return;
    }

    // =====================================================
    // LẤY DANH SÁCH HIỆN TẠI
    // TỪ SelectedClassContext
    // =====================================================
    const currentClasses =
      Array.isArray(classes)
        ? classes
        : [];

    // =====================================================
    // TẠO DANH SÁCH SAU KHI XÓA
    // =====================================================
    const updated =
      currentClasses
        .filter(
          (cls) =>
            !selectedClassesToDelete.includes(
              cls
            )
        )
        .sort();

    // =====================================================
    // XÁC ĐỊNH LỚP TIẾP THEO
    // =====================================================
    let nextClass =
      selectedClass;

    if (
      selectedClassesToDelete.includes(
        selectedClass
      )
    ) {
      nextClass =
        updated[0] || "";
    }

    try {
      // ===================================================
      // CẬP NHẬT:
      // 1. SelectedClassContext
      // 2. localStorage
      // 3. Firestore DANHSACH_LOP
      // ===================================================
      await updateClasses(
        updated
      );

      // ===================================================
      // CẬP NHẬT LỚP ĐANG CHỌN
      // Context + localStorage + CONFIG
      // ===================================================
      await setSelectedClass(
        nextClass
      );

      // ===================================================
      // ĐÓNG GIAO DIỆN
      // ===================================================
      setSelectedClassesToDelete(
        []
      );

      setDeleteClassDialogOpen(
        false
      );
    } catch (err) {
      console.error(
        "❌ Lỗi khi xóa lớp:",
        err
      );

      alert(
        "Không thể xóa lớp."
      );
    }
  };

  // =========================================================
  // CHECK / UNCHECK ĐIỂM DANH
  // UI cập nhật NGAY → Firestore chạy phía sau
  // Chỉ lưu học sinh VẮNG
  // Có mặt = xóa document
  // =========================================================
  const handleAttendanceChange = async (
    maDinhDanh,
    checked
  ) => {
    const attendanceRef = doc(
      db,
      `DIEMDANH_${namHocKey}`,
      selectedClass,
      maDinhDanh,
      attendanceDate
    );

    // =======================================================
    // LƯU TRẠNG THÁI CŨ ĐỂ ROLLBACK NẾU FIRESTORE LỖI
    // =======================================================
    const oldValue =
      !!attendance[maDinhDanh];

    // =======================================================
    // 1. CẬP NHẬT UI NGAY LẬP TỨC
    // =======================================================
    setAttendance((prev) => {
      const next = { ...prev };

      if (checked) {
        next[maDinhDanh] = true;
      } else {
        delete next[maDinhDanh];
      }

      return next;
    });

    // =======================================================
    // 2. LƯU FIRESTORE
    // =======================================================
    try {
      if (checked) {
        // VẮNG → TẠO DOCUMENT
        await setDoc(
          attendanceRef,
          {
            vắng: true,
          },
          {
            merge: true,
          }
        );
      } else {
        // CÓ MẶT → XÓA DOCUMENT
        await deleteDoc(attendanceRef);
      }
    } catch (err) {
      console.error(
        "❌ Lỗi lưu điểm danh:",
        err
      );

      // =====================================================
      // 3. FIRESTORE LỖI → KHÔI PHỤC TRẠNG THÁI CŨ
      // =====================================================
      setAttendance((prev) => {
        const next = { ...prev };

        if (oldValue) {
          next[maDinhDanh] = true;
        } else {
          delete next[maDinhDanh];
        }

        return next;
      });
    }
  };

  // =========================================================
  // LẤY ĐIỂM DANH CẢ THÁNG
  // =========================================================
  useEffect(() => {
    if (
      !showMonth ||
      !selectedClass ||
      students.length === 0
    ) {
      return;
    }

    const loadMonthlyAttendance = async () => {
      try {
        const result = {};

        await Promise.all(
          students.map(async (student) => {
            const studentRef = collection(
              db,
              `DIEMDANH_${namHocKey}`,
              selectedClass,
              student.maDinhDanh
            );

            const snapshot =
              await getDocs(studentRef);

            result[student.maDinhDanh] = {};

            snapshot.forEach((docSnap) => {
              const date = docSnap.id;

              if (
                monthDays.includes(date) &&
                docSnap.data()?.vắng === true
              ) {
                result[student.maDinhDanh][date] = true;
              }
            });
          })
        );

        setMonthlyAttendance(result);
      } catch (err) {
        console.error(
          "❌ Lỗi lấy điểm danh tháng:",
          err
        );
      }
    };

    loadMonthlyAttendance();
  }, [
    showMonth,
    selectedClass,
    namHocKey,
    students,
    attendanceDate,
  ]);

  const handleMonthlyAttendanceChange = async (
    maDinhDanh,
    date,
    checked
  ) => {
    const attendanceRef = doc(
      db,
      `DIEMDANH_${namHocKey}`,
      selectedClass,
      maDinhDanh,
      date
    );

    try {
      if (checked) {
        await setDoc(
          attendanceRef,
          {
            vắng: true,
          },
          {
            merge: true,
          }
        );

        setMonthlyAttendance((prev) => ({
          ...prev,
          [maDinhDanh]: {
            ...(prev[maDinhDanh] || {}),
            [date]: true,
          },
        }));

        // Nếu ngày đang chọn chính là ngày vừa chấm
        if (date === attendanceDate) {
          setAttendance((prev) => ({
            ...prev,
            [maDinhDanh]: true,
          }));
        }
      } else {
        await deleteDoc(attendanceRef);

        setMonthlyAttendance((prev) => {
          const next = {
            ...prev,
            [maDinhDanh]: {
              ...(prev[maDinhDanh] || {}),
            },
          };

          delete next[maDinhDanh][date];

          return next;
        });

        if (date === attendanceDate) {
          setAttendance((prev) => {
            const next = { ...prev };
            delete next[maDinhDanh];
            return next;
          });
        }
      }
    } catch (err) {
      console.error(
        "❌ Lỗi lưu điểm danh tháng:",
        err
      );
    }
  };

  const handleExportAbsentExcel = async () => {
    await exportAbsentExcel({
      selectedClass,
      students,
      monthDays,
      monthlyAttendance,
      attendanceDate,
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background:
          "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
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
        maxWidth: showMonth ? "100%" : 750,
        bgcolor: "white",
        position: "relative",
        transition: "max-width 0.2s ease",
      }}
    >
        {/* =================================================
            NÚT ĐÓNG
        ================================================= */}

        <IconButton
          onClick={() =>
            navigate("/dashboard")
          }
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "#64748b",
            backgroundColor:
              "#f1f5f9",

            "&:hover": {
              backgroundColor:
                "#e2e8f0",
              color: "#ef4444",
            },

            boxShadow:
              "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* =================================================
            ICON CÔNG CỤ
        ================================================= */}

        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 1,
            zIndex: 1000,
          }}
        >
          {/* IMPORT EXCEL */}

          <Tooltip
            title="Tải danh sách học sinh từ Excel"
          >
            <IconButton
              onClick={
                handleUploadClick
              }
              sx={{
                color: "#1976d2",
                bgcolor:
                  "rgba(25,118,210,0.1)",

                "&:hover": {
                  bgcolor:
                    "rgba(25,118,210,0.2)",
                },
              }}
            >
              <FileUploadIcon />
            </IconButton>
          </Tooltip>

          {/* IMPORT THƯ MỤC */}

          <Tooltip
            title="Tải thư mục danh sách học sinh từ C1"
          >
            <IconButton
              onClick={() =>
                folderInputRef.current?.click()
              }
              sx={{
                color: "#2e7d32",
                bgcolor:
                  "rgba(46,125,50,0.1)",

                "&:hover": {
                  bgcolor:
                    "rgba(46,125,50,0.2)",
                },
              }}
            >
              <FolderOpenIcon />
            </IconButton>
          </Tooltip>

          {/* KHỞI TẠO DATA */}

          {/*
          <Tooltip title="Khởi tạo DATA năm mới">
            <IconButton
              onClick={() =>
                setCreateDataDialogOpen(true)
              }
              sx={{
                color: "#d32f2f",
                bgcolor:
                  "rgba(211,47,47,0.1)",
                "&:hover": {
                  bgcolor:
                    "rgba(211,47,47,0.2)",
                },
              }}
            >
              <StorageIcon />
            </IconButton>
          </Tooltip>
          */}
        </Box>

        {/* =================================================
            TIÊU ĐỀ
        ================================================= */}

        <Box
          sx={{
            textAlign: "center",
            mt: {
              xs: 4,
              sm: 0,
            },
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              color: "#1976d2",
            }}
          >
            DANH SÁCH HỌC SINH
          </Typography>
        </Box>

        {/* =================================================
            CHỌN LỚP
        ================================================= */}

        <Box
          sx={{
            display: "flex",
            justifyContent:
              "center",
            alignItems:
              "center",
            mb: 2,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection:
                "column",
              alignItems:
                "flex-start",
              gap: 1,
            }}
          >
            {/* HÀNG TRÊN */}

            <Box
              sx={{
                display: "flex",
                alignItems:
                  "center",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 500,
                  color:
                    "#1e293b",
                }}
              >
                Lớp:
              </Typography>

              <Select
                value={
                  selectedClass
                }
                onChange={
                  handleClassChange
                }
                size="small"
                sx={{
                  width: 80,
                }}
              >
                {classes.map(
                  (cls) => (
                    <MenuItem
                      key={cls}
                      value={cls}
                    >
                      {cls}
                    </MenuItem>
                  )
                )}
              </Select>

              {/* ===============================
                  LỊCH ĐIỂM DANH
              =============================== */}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Ngày"
                  value={dayjs(attendanceDate)}
                  onChange={(newValue) => {
                    if (!newValue) return;

                    setAttendanceDate(
                      newValue.format("YYYY-MM-DD")
                    );
                  }}
                  format="DD/MM/YYYY"
                  slotProps={{
                    textField: {
                      size: "small",
                      sx: {
                        width: 150,

                        "& .MuiInputBase-root": {
                          height: 42,
                          backgroundColor: "#fff",
                          borderRadius: 1.5,
                        },

                        "& .MuiInputBase-input": {
                          fontSize: 14,
                          fontWeight: 500,
                        },
                      },
                    },

                    popper: {
                      sx: {
                        // ===============================
                        // KHUNG LỊCH
                        // ===============================
                        "& .MuiPaper-root": {
                          width: 350,
                          borderRadius: 2,
                          boxShadow:
                            "0 8px 30px rgba(0,0,0,0.15)",
                          border:
                            "1px solid #e5e7eb",
                        },

                        // ===============================
                        // HEADER
                        // THÁNG/NĂM TRÁI - <> PHẢI
                        // ===============================
                        "& .MuiPickersCalendarHeader-root": {
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          alignItems: "center",
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "12px 10px 8px 18px",
                          margin: 0,
                        },

                        // THÁNG / NĂM
                        "& .MuiPickersCalendarHeader-labelContainer": {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          minWidth: 0,
                          margin: 0,
                          padding: 0,
                        },

                        "& .MuiPickersCalendarHeader-label": {
                          fontSize: 17,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        },

                        // ===============================
                        // NÚT < >
                        // ===============================
                        "& .MuiPickersArrowSwitcher-root": {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          margin: 0,
                          padding: 0,
                        },

                        "& .MuiPickersArrowSwitcher-button": {
                          width: 38,
                          height: 38,
                          padding: 0,
                          margin: 0,
                          borderRadius: 1,

                          "& .MuiSvgIcon-root": {
                            fontSize: 24,
                          },

                          "&:hover": {
                            backgroundColor: "#f1f5f9",
                          },
                        },

                        // ===============================
                        // HÀNG THỨ
                        // S M T W T F S
                        // ===============================
                        "& .MuiDayCalendar-header": {
                          marginTop: 3,
                          marginBottom: 2,
                        },

                        "& .MuiDayCalendar-weekDayLabel": {
                          fontSize: 14,
                          fontWeight: 600,

                          "&:nth-of-type(1)": {
                            fontSize: 0,
                            "&::after": {
                              content: '"Su"',
                              fontSize: 14,
                            },
                          },

                          "&:nth-of-type(2)": {
                            fontSize: 0,
                            "&::after": {
                              content: '"Mo"',
                              fontSize: 14,
                            },
                          },

                          "&:nth-of-type(3)": {
                            fontSize: 0,
                            "&::after": {
                              content: '"Tu"',
                              fontSize: 14,
                            },
                          },

                          "&:nth-of-type(4)": {
                            fontSize: 0,
                            "&::after": {
                              content: '"We"',
                              fontSize: 14,
                            },
                          },

                          "&:nth-of-type(5)": {
                            fontSize: 0,
                            "&::after": {
                              content: '"Th"',
                              fontSize: 14,
                            },
                          },

                          "&:nth-of-type(6)": {
                            fontSize: 0,
                            "&::after": {
                              content: '"Fr"',
                              fontSize: 14,
                            },
                          },

                          "&:nth-of-type(7)": {
                            fontSize: 0,
                            "&::after": {
                              content: '"Sa"',
                              fontSize: 14,
                            },
                          },
                        },

                        // ===============================
                        // NGÀY 1 → 31
                        // ===============================
                        "& .MuiPickersDay-root": {
                          width: 42,
                          height: 42,
                          margin: "2px",
                          fontSize: 24,
                          fontWeight: 500,
                        },

                        // ===============================
                        // NGÀY ĐƯỢC CHỌN
                        // ===============================
                        "& .MuiPickersDay-root.Mui-selected": {
                          fontSize: 24,
                          fontWeight: 600,
                        },
                      },
                    },
                  }}
                />
              </LocalizationProvider>

              <Tooltip
                title={
                  showMonth
                    ? "Thu gọn"
                    : "Xem điểm danh tháng"
                }
              >
                <IconButton
                  onClick={() =>
                    setShowMonth((prev) => !prev)
                  }
                  sx={{
                    color: "#1976d2",
                    bgcolor: "rgba(25,118,210,0.1)",
                    width: 42,
                    height: 42,

                    "&:hover": {
                      bgcolor: "rgba(25,118,210,0.2)",
                    },
                  }}
                >
                  {showMonth ? (
                    <CloseFullscreenIcon />
                  ) : (
                    <CalendarMonthIcon />
                  )}
                </IconButton>
              </Tooltip>

              {/* THÊM LỚP */}

              <Tooltip title="Thêm lớp">
                <IconButton
                  onClick={() =>
                    setAddingClass(
                      true
                    )
                  }
                  sx={{
                    color: "#fff",
                    bgcolor:
                      "#22c55e",
                    width: 30,
                    height: 30,

                    "&:hover": {
                      bgcolor:
                        "#16a34a",
                    },
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>

              {/* XÓA LỚP */}

              <Tooltip title="Xóa lớp">
                <IconButton
                  onClick={handleOpenDeleteClassDialog}
                  sx={{
                    color: "#fff",
                    bgcolor: "#ef4444",
                    width: 30,
                    height: 30,
                    "&:hover": {
                      bgcolor: "#dc2626",
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>

              {showMonth && (
                <Tooltip title="Xuất Excel danh sách học sinh vắng">
                  <IconButton
                    onClick={handleExportAbsentExcel}
                    disabled={students.length === 0}
                    sx={{
                      color: "#1976d2",
                      bgcolor: "rgba(25,118,210,0.1)",
                      width: 42,
                      height: 42,

                      "&:hover": {
                        bgcolor: "rgba(25,118,210,0.2)",
                      },
                    }}
                  >
                    <FileDownloadIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* HÀNG THÊM LỚP */}

            {addingClass && (
              <Box
                sx={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 1,
                  ml: 5,
                  flexWrap:
                    "wrap",
                }}
              >
                <TextField
                  size="small"
                  label="Tên lớp"
                  placeholder="VD: 4.1->4.6"
                  value={
                    newClass
                  }
                  onChange={(e) =>
                    setNewClass(
                      e.target.value
                    )
                  }
                  sx={{
                    width: 240,
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      handleAddClass();
                    }
                  }}
                />

                <Button
                  variant="contained"
                  color="success"
                  onClick={
                    handleAddClass
                  }
                  sx={{
                    textTransform:
                      "none",
                    fontWeight: 700,
                    borderRadius:
                      "8px",
                    px: 2,
                  }}
                >
                  Thêm
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => {
                    setAddingClass(
                      false
                    );
                    setNewClass("");
                  }}
                  sx={{
                    textTransform:
                      "none",
                    borderRadius:
                      "8px",
                    px: 2,
                  }}
                >
                  Hủy
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* =================================================
            TIẾN TRÌNH UPLOAD
        ================================================= */}

        {uploading && (
          <Box
            sx={{
              mt: 3,
              mb: 2,
              display: "flex",
              justifyContent:
                "center",
            }}
          >
            <Box
              sx={{
                width: "25%",
                minWidth: 220,
              }}
            >
              <LinearProgress
                variant="determinate"
                value={
                  uploadProgress
                }
                sx={{
                  height: 3,
                  borderRadius: 5,
                  bgcolor:
                    "rgba(25,118,210,0.15)",

                  "& .MuiLinearProgress-bar":
                    {
                      borderRadius: 5,
                    },

                  mb: 1,
                }}
              />

              <Typography
                fontSize={14}
                mb={0.5}
                textAlign="center"
              >
                Đang tải dữ liệu:{" "}
                {
                  uploadProgress
                }
                %
              </Typography>
            </Box>
          </Box>
        )}

        {/* =================================================
            DANH SÁCH HỌC SINH
        ================================================= */}
        <TableContainer
          component={Paper}
          sx={{
            boxShadow: "none",
            border: "1px solid rgba(0,0,0,0.12)",

            overflowX: "auto",

            // Chỉ cuộn dọc khi xem tháng
            overflowY: showMonth ? "auto" : "visible",

            // Chỉ giới hạn chiều cao khi xem tháng
            maxHeight: showMonth ? "70vh" : "none",

            position: "relative",
          }}
        >
          <Table
            size="small"
            sx={{
              tableLayout: "fixed",

              minWidth: showMonth
                ? 40 +
                  120 +
                  220 +
                  monthDays.length * 36 +
                  100
                : 600,

              // Tránh khoảng trắng / lỗi khi sticky
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <TableHead>
              <TableRow>

                {/* =========================
                    STT
                ========================= */}
                <TableCell
                  align="center"
                  sx={{
                    width: 40,
                    minWidth: 40,
                    maxWidth: 40,

                    bgcolor: "#1976d2",
                    color: "#fff",

                    border:
                      "1px solid rgba(255,255,255,0.4)",

                    whiteSpace: "nowrap",

                    // CỐ ĐỊNH NGANG + DỌC
                    position: "sticky",
                    left: 0,
                    top: 0,

                    zIndex: 12,
                  }}
                >
                  STT
                </TableCell>

                {/* =========================
                    MÃ ĐỊNH DANH
                ========================= */}
                <TableCell
                  align="center"
                  sx={{
                    width: 120,
                    minWidth: 120,
                    maxWidth: 120,

                    bgcolor: "#1976d2",
                    color: "#fff",

                    border:
                      "1px solid rgba(255,255,255,0.4)",

                    whiteSpace: "nowrap",

                    // CỐ ĐỊNH NGANG + DỌC
                    position: "sticky",
                    left: 40,
                    top: 0,

                    zIndex: 12,
                  }}
                >
                  MÃ ĐỊNH DANH
                </TableCell>

                {/* =========================
                    HỌ VÀ TÊN
                ========================= */}
                <TableCell
                  align="center"
                  sx={{
                    width: 220,
                    minWidth: 220,
                    maxWidth: 220,

                    bgcolor: "#1976d2",
                    color: "#fff",

                    border:
                      "1px solid rgba(255,255,255,0.4)",

                    whiteSpace: "nowrap",

                    // CỐ ĐỊNH NGANG + DỌC
                    position: "sticky",
                    left: 160,
                    top: 0,

                    zIndex: 11,
                  }}
                >
                  HỌ VÀ TÊN
                </TableCell>

                {/* =========================
                    NGÀY 01 → 31
                ========================= */}
                {showMonth ? (
                  monthDays.map((date) => (
                    <TableCell
                      key={date}
                      align="center"
                      sx={{
                        width: 36,
                        minWidth: 36,
                        maxWidth: 36,

                        bgcolor: "#1976d2",
                        color: "#fff",

                        border:
                          "1px solid rgba(255,255,255,0.4)",

                        whiteSpace: "nowrap",
                        p: 0.5,

                        // CỐ ĐỊNH HEADER KHI CUỘN DỌC
                        position: "sticky",
                        top: 0,

                        zIndex: 10,
                      }}
                    >
                      {dayjs(date).format("DD")}
                    </TableCell>
                  ))
                ) : (
                  <TableCell
                    align="center"
                    sx={{
                      width: 80,
                      minWidth: 80,
                      maxWidth: 80,

                      bgcolor: "#1976d2",
                      color: "#fff",

                      border:
                        "1px solid rgba(255,255,255,0.4)",

                      whiteSpace: "nowrap",

                      // CỐ ĐỊNH HEADER KHI CUỘN DỌC
                      position: "sticky",
                      top: 0,

                      zIndex: 10,
                    }}
                  >
                    VẮNG
                  </TableCell>
                )}

                {/* =========================
                    ĐIỀU CHỈNH
                ========================= */}
                <TableCell
                  align="center"
                  sx={{
                    width: 100,
                    minWidth: 100,
                    maxWidth: 100,

                    bgcolor: "#1976d2",
                    color: "#fff",

                    border:
                      "1px solid rgba(255,255,255,0.4)",

                    whiteSpace: "nowrap",

                    // CỐ ĐỊNH HEADER KHI CUỘN DỌC
                    position: "sticky",
                    top: 0,

                    zIndex: 10,
                  }}
                >
                  ĐIỀU CHỈNH
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((s) => {
                const isSpecialStudent = [
                  "khuyết tật",
                  "chuyển trường",
                  "bỏ học",
                ].includes(
                  String(s.ghiChu || "")
                    .trim()
                    .toLowerCase()
                );

                return (
                  <TableRow
                    key={s.maDinhDanh}
                    onMouseEnter={() =>
                      setHoveredHS(s.maDinhDanh)
                    }
                    onMouseLeave={() =>
                      setHoveredHS(null)
                    }
                    sx={{
                      backgroundColor:
                        isSpecialStudent
                          ? "#f3f3f3"
                          : "inherit",

                      color:
                        isSpecialStudent
                          ? "red"
                          : "inherit",

                      "& td": {
                        color:
                          isSpecialStudent
                            ? "red"
                            : "inherit",
                      },

                      "&:hover": {
                        backgroundColor:
                          isSpecialStudent
                            ? "#d6d6d6"
                            : "rgba(25,118,210,0.05)",
                      },
                    }}
                  >

                    {/* =========================
                        STT
                    ========================= */}
                    <TableCell
                      align="center"
                      sx={{
                        width: 40,
                        minWidth: 40,
                        maxWidth: 40,

                        border:
                          "1px solid rgba(0,0,0,0.12)",

                        whiteSpace: "nowrap",

                        // CỐ ĐỊNH NGANG
                        position: "sticky",
                        left: 0,

                        zIndex: 3,

                        // Có nền để che dữ liệu phía sau
                        bgcolor: isSpecialStudent
                          ? "#f3f3f3"
                          : "background.paper",
                      }}
                    >
                      {s.stt}
                    </TableCell>

                    {/* =========================
                        MÃ ĐỊNH DANH
                    ========================= */}
                    <TableCell
                      align="center"
                      sx={{
                        width: 120,
                        minWidth: 120,
                        maxWidth: 120,

                        border:
                          "1px solid rgba(0,0,0,0.12)",

                        whiteSpace: "nowrap",

                        // CỐ ĐỊNH NGANG
                        position: "sticky",
                        left: 40,

                        zIndex: 3,

                        // Có nền để che dữ liệu phía sau
                        bgcolor: isSpecialStudent
                          ? "#f3f3f3"
                          : "background.paper",
                      }}
                    >
                      {s.maDinhDanh}
                    </TableCell>

                    {/* =========================
                        HỌ VÀ TÊN
                    ========================= */}
                    <TableCell
                      sx={{
                        width: 220,
                        minWidth: 220,
                        maxWidth: 220,

                        border:
                          "1px solid rgba(0,0,0,0.12)",

                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",

                        // CỐ ĐỊNH NGANG
                        position: "sticky",
                        left: 160,

                        zIndex: 2,

                        // Có nền để che nội dung phía sau
                        bgcolor: isSpecialStudent
                          ? "#f3f3f3"
                          : "background.paper",
                      }}
                    >
                      {s.hoVaTen}
                    </TableCell>

                    {/* =========================
                        ĐIỂM DANH THÁNG
                    ========================= */}
                    {showMonth ? (
                      monthDays.map((date) => {
                        const isAbsent =
                          !!monthlyAttendance[
                            s.maDinhDanh
                          ]?.[date];

                        return (
                          <TableCell
                            key={date}
                            align="center"
                            sx={{
                              width: 36,
                              minWidth: 36,
                              maxWidth: 36,

                              border:
                                "1px solid rgba(0,0,0,0.12)",

                              height: 30,
                              p: 0,

                              cursor: "default",
                              userSelect: "none",

                              "&:hover": {
                                backgroundColor:
                                  "transparent",
                              },
                            }}
                          >
                            {isAbsent ? (
                              <Typography
                                sx={{
                                  fontWeight: 400,
                                  fontSize: 14,
                                  lineHeight: 1,
                                  color: "#d32f2f",
                                }}
                              >
                                X
                              </Typography>
                            ) : null}
                          </TableCell>
                        );
                      })
                    ) : (
                      /* =========================
                        ĐIỂM DANH NGÀY
                      ========================= */
                      <TableCell
                        align="center"
                        sx={{
                          width: 80,
                          minWidth: 80,
                          maxWidth: 80,

                          border:
                            "1px solid rgba(0,0,0,0.12)",

                          height: 30,
                          p: 0,
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={
                            !!attendance[
                              s.maDinhDanh
                            ]
                          }
                          onChange={(e) =>
                            handleAttendanceChange(
                              s.maDinhDanh,
                              e.target.checked
                            )
                          }
                        />
                      </TableCell>
                    )}

                    {/* =========================
                        ĐIỀU CHỈNH
                    ========================= */}
                    <TableCell
                      align="center"
                      sx={{
                        width: 100,
                        minWidth: 100,
                        maxWidth: 100,

                        border:
                          "1px solid rgba(0,0,0,0.12)",

                        height: 30,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 0.5,

                          visibility:
                            hoveredHS ===
                            s.maDinhDanh
                              ? "visible"
                              : "hidden",
                        }}
                      >

                        {/* THÊM */}
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            setIsAdding(true);
                            setEditingStudent(null);
                            setNewName("");
                            setNewMaDinhDanh("");
                            setNewGhiChu("");
                          }}
                        >
                          <PersonAddIcon fontSize="small" />
                        </IconButton>

                        {/* SỬA */}
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() =>
                            handleEditStudent(s)
                          }
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>

                        {/* XÓA */}
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
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

      </Paper>

      {/* ===================================================
          FILE EXCEL
      =================================================== */}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".xlsx"
        multiple
        onChange={
          handleFileChange
        }
      />

      {/* ===================================================
          THƯ MỤC HỌC SINH
      =================================================== */}

      <input
        ref={folderInputRef}
        type="file"
        hidden
        multiple
        webkitdirectory=""
        onChange={
          handleFileChange
        }
      />

      {/* ===================================================
          DIALOG THÊM / SỬA / XÓA
      =================================================== */}

      <EditStudentDialog
        open={
          isAdding ||
          !!editingStudent ||
          deleteDialogOpen
        }
        onClose={() => {
          setIsAdding(false);
          setEditingStudent(null);
          setDeleteDialogOpen(false);
          setStudentToDelete(null);
        }}
        student={
          editingStudent ||
          studentToDelete
        }
        newName={newName}
        setNewName={setNewName}
        newMaDinhDanh={
          newMaDinhDanh
        }
        setNewMaDinhDanh={
          setNewMaDinhDanh
        }
        newGhiChu={newGhiChu}
        setNewGhiChu={setNewGhiChu}
        isAdding={isAdding}
        onSave={
          isAdding
            ? handleAddStudent
            : handleSaveStudent
        }
        isConfirm={
          deleteDialogOpen
        }
        onConfirm={async () => {
          if (
            studentToDelete
          ) {
            await handleDeleteStudent(
              studentToDelete
            );

            setDeleteDialogOpen(
              false
            );

            setStudentToDelete(
              null
            );
          }
        }}
      />

      {/* ===================================================
          DIALOG KHỞI TẠO DATA
      =================================================== */}

      <CreateDataConfirmDialog
        open={
          createDataDialogOpen
        }
        onClose={() =>
          setCreateDataDialogOpen(
            false
          )
        }
        configData={config}
      />

      {/* ===================================================
      DIALOG CHỌN LỚP ĐỂ XÓA
      =================================================== */}
      <Dialog
        open={deleteClassDialogOpen}
        onClose={() => {
          setDeleteClassDialogOpen(false);
          setSelectedClassesToDelete([]);
        }}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "320px",
            maxWidth: "calc(100% - 32px)",
            borderRadius: 3,
          },
        }}
      >
        {/* TIÊU ĐỀ */}
        <DialogTitle
          sx={{
            fontWeight: "bold",
            color: "#1976d2",
            textAlign: "center",
            pb: 1,
          }}
        >
          XÓA LỚP
        </DialogTitle>

        <DialogContent>
          {/* CHỌN TẤT CẢ */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1,
              py: 0.5,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    classes.length > 0 &&
                    selectedClassesToDelete.length === classes.length
                  }
                  indeterminate={
                    selectedClassesToDelete.length > 0 &&
                    selectedClassesToDelete.length < classes.length
                  }
                  onChange={handleToggleAllDeleteClasses}
                  color="error"
                  disabled={classes.length === 0}
                />
              }
              label={
                <Typography fontWeight={600}>
                  Chọn tất cả
                </Typography>
              }
            />

            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              Đã chọn: {selectedClassesToDelete.length}/{classes.length}
            </Typography>
          </Box>

          <Divider />

          {/* DANH SÁCH LỚP THEO KHỐI */}
          <Box
            sx={{
              mt: 1.5,
              maxHeight: 380,
              overflowY: "auto",
            }}
          >
            {classes.length === 0 ? (
              <Typography
                sx={{
                  textAlign: "center",
                  py: 4,
                  color: "#64748b",
                }}
              >
                Chưa có lớp nào.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(120px, 1fr))",
                    sm: "repeat(3, minmax(130px, 1fr))",
                    md: "repeat(5, minmax(120px, 1fr))",
                  },
                  gap: 1,
                  alignItems: "start",
                }}
              >
                {Object.entries(
                  classes.reduce((groups, cls) => {
                    /*
                    * Ví dụ:
                    * 4.1 → khối 4
                    * 4.2 → khối 4
                    * 5.1 → khối 5
                    * 5.6 → khối 5
                    */
                    const grade = String(cls).split(".")[0];

                    if (!groups[grade]) {
                      groups[grade] = [];
                    }

                    groups[grade].push(cls);

                    return groups;
                  }, {})
                )
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([grade, gradeClasses]) => (
                    <Paper
                      key={grade}
                      elevation={0}
                      sx={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 2,
                        overflow: "hidden",
                        backgroundColor: "#fff",
                      }}
                    >
                      {/* TÊN KHỐI */}
                      <Box
                        sx={{
                          py: 0.8,
                          textAlign: "center",
                          backgroundColor: "#f1f5f9",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: "#1976d2",
                            fontSize: "0.9rem",
                          }}
                        >
                          KHỐI {grade}
                        </Typography>
                      </Box>

                      {/* CÁC LỚP TRONG KHỐI */}
                      <Box
                        sx={{
                          p: 0.5,
                        }}
                      >
                        {gradeClasses
                          .sort((a, b) => {
                            const na = Number(
                              String(a).split(".")[1]
                            );

                            const nb = Number(
                              String(b).split(".")[1]
                            );

                            return na - nb;
                          })
                          .map((cls) => {
                            const checked =
                              selectedClassesToDelete.includes(cls);

                            return (
                              <Box
                                key={cls}
                                sx={{
                                  width: "100%",
                                  borderRadius: 1,
                                  backgroundColor: checked
                                    ? "rgba(239, 68, 68, 0.08)"
                                    : "transparent",
                                  transition: "background-color 0.15s",
                                  "&:hover": {
                                    backgroundColor: checked
                                      ? "rgba(239, 68, 68, 0.12)"
                                      : "#f8fafc",
                                  },
                                }}
                              >
                                <FormControlLabel
                                  sx={{
                                    width: "100%",
                                    margin: 0,
                                    px: 0.5,
                                    py: 0.15,
                                  }}
                                  control={
                                    <Checkbox
                                      checked={checked}
                                      onChange={() =>
                                        handleToggleDeleteClass(cls)
                                      }
                                      color="error"
                                      size="small"
                                    />
                                  }
                                  label={
                                    <Typography
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: "0.9rem",
                                        color: checked
                                          ? "#dc2626"
                                          : "#1e293b",
                                      }}
                                    >
                                      {cls}
                                    </Typography>
                                  }
                                />
                              </Box>
                            );
                          })}
                      </Box>
                    </Paper>
                  ))}
              </Box>
            )}
          </Box>
        </DialogContent>

        {/* NÚT HỦY / XÓA */}
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 1,
            gap: 1,
            justifyContent: "center",
          }}
        >
          <Button
            variant="outlined"
            onClick={() => {
              setDeleteClassDialogOpen(false);
              setSelectedClassesToDelete([]);
            }}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              minWidth: 100,
            }}
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            color="error"
            disabled={selectedClassesToDelete.length === 0}
            onClick={handleDeleteClass}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              minWidth: 100,
              fontWeight: 700,
            }}
          >
            Xóa
            {selectedClassesToDelete.length > 0
              ? ` (${selectedClassesToDelete.length})`
              : ""}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  Card,
  Stack,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  FormControlLabel,
  InputLabel,
  Button,
  TextField,
  IconButton,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

import { ConfigContext } from "../context/ConfigContext";
import { LamVanBenConfigContext } from "../context/LamVanBenConfigContext";
import { StudentContext } from "../context/StudentContext";
import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function QuanTri_KTDK() {
  const account = localStorage.getItem("account") || "";
  const [addingClass, setAddingClass] = useState(false);
  const [newClass, setNewClass] = useState("");

  const configContext =
    account === "TH Lâm Văn Bền"
      ? useContext(LamVanBenConfigContext)
      : useContext(ConfigContext);

  const { config, setConfig } = configContext;
  const { classData, setClassData } = useContext(StudentContext);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(config.lop || "");
  const [subject, setSubject] = useState(config.mon || "Tin học");
  const [selectedSemester, setSelectedSemester] = useState(
    config.hocKy || "Giữa kỳ I"
  );

  // 🧩 Hàm sắp xếp lớp theo chuẩn 5A, 5B, 5C...
  const sortClasses = (list) => {
    return [...list].sort((a, b) => {
      const matchA = a.match(/(\d+)([A-Z]+)/);
      const matchB = b.match(/(\d+)([A-Z]+)/);

      if (!matchA || !matchB) return a.localeCompare(b);

      const [numA, charA] = [parseInt(matchA[1]), matchA[2]];
      const [numB, charB] = [parseInt(matchB[1]), matchB[2]];

      if (numA !== numB) return numA - numB;
      return charA.localeCompare(charB);
    });
  };

  // 🔹 Cập nhật config + Firestore
  const updateConfigField = async (field, value) => {
    try {
      setConfig((prev) => ({ ...prev, [field]: value }));
      const collectionName = account === "TH Lâm Văn Bền" ? "LAMVANBEN" : "CONFIG";
      const docRef = doc(db, collectionName, "config");
      await setDoc(docRef, { [field]: value }, { merge: true });
    } catch (err) {
      console.error("❌ Lỗi cập nhật config:", err);
    }
  };

  // 🔹 Fetch config + danh sách lớp
  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionName = account === "TH Lâm Văn Bền" ? "LAMVANBEN" : "CONFIG";
        const docRef = doc(db, collectionName, "config");
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          setConfig((prev) => ({
            ...prev,
            mon: data.mon ?? prev.mon ?? "Tin học",
            lop: data.lop ?? prev.lop ?? "",
            hocKy: data.hocKy ?? prev.hocKy ?? "Giữa kỳ I",
            choXemDiem: data.choXemDiem ?? prev.choXemDiem ?? false,
            xuatFileBaiLam: data.xuatFileBaiLam ?? prev.xuatFileBaiLam ?? false,
          }));
        }

        let classList = [];

        if (account === "TH Lâm Văn Bền") {
          const lopRef = doc(db, "LAMVANBEN", "lop");
          const lopSnap = await getDoc(lopRef);
          classList = lopSnap.exists() ? lopSnap.data().list ?? [] : [];
        } else {
          if (classData && classData.length > 0) {
            classList = classData;
          } else {
            const snapshot = await getDocs(collection(db, "DANHSACH"));
            classList = snapshot.docs.map((doc) => doc.id);
            setClassData(classList);
          }
        }

        classList = sortClasses(classList);

        setClasses(classList);
        setSelectedClass((prev) => prev || classList[0] || "");
      } catch (err) {
        console.error("❌ Lỗi fetch:", err);
      }
    };

    fetchData();
  }, [setConfig, classData, setClassData, account]);

  // Đồng bộ config → UI
  useEffect(() => {
    setSelectedClass(config.lop || "");
    setSubject(config.mon || "Tin học");
    setSelectedSemester(config.hocKy || "Giữa kỳ I");
  }, [config]);

  // 🔹 Select handlers
  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    updateConfigField("lop", e.target.value);
  };

  // 🔹 Thêm lớp
  const handleAddClass = async () => {
    const className = newClass.trim().toUpperCase();
    if (!className) return;

    if (classes.includes(className)) {
      alert("Lớp đã tồn tại!");
      return;
    }

    let updatedClasses = [...classes, className];
    updatedClasses = sortClasses(updatedClasses);

    setClasses(updatedClasses);
    setSelectedClass(className);
    updateConfigField("lop", className);

    try {
      if (account === "TH Lâm Văn Bền") {
        const docRef = doc(db, "LAMVANBEN", "lop");
        await setDoc(docRef, { list: updatedClasses }, { merge: true });
      }
      setNewClass("");
      setAddingClass(false);
    } catch (err) {
      console.error("❌ Lỗi thêm lớp:", err);
    }
  };

  // 🔹 Xóa lớp
  const handleDeleteClass = async () => {
    const index = classes.findIndex((c) => c === selectedClass);
    if (index < 0) return;

    let updatedClasses = classes.filter((_, i) => i !== index);
    updatedClasses = sortClasses(updatedClasses);

    setClasses(updatedClasses);
    const nextClass = updatedClasses[0] || "";
    setSelectedClass(nextClass);
    updateConfigField("lop", nextClass);

    if (account === "TH Lâm Văn Bền") {
      const docRef = doc(db, "LAMVANBEN", "lop");
      await setDoc(docRef, { list: updatedClasses }, { merge: true });
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
      <Card elevation={6} sx={{ p: 4, borderRadius: 3, maxWidth: 300, mx: "auto", mt: 3 }}>
        <Typography
            variant="h5"
            color="primary"
            fontWeight="bold"
            align="center"
            gutterBottom
            sx={{ mb: 3 }}
            >
            HỆ THỐNG
        </Typography>


        <Stack spacing={2}>
          {/* Học kỳ */}
          <FormControl fullWidth size="small">
            <InputLabel>Học kỳ</InputLabel>
            <Select value={selectedSemester} label="Học kỳ"
              onChange={(e) => updateConfigField("hocKy", e.target.value)}>
              <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
              <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
              <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
              <MenuItem value="Cả năm">Cả năm</MenuItem>
            </Select>
          </FormControl>

          {/* Môn */}
          <FormControl fullWidth size="small">
            <InputLabel>Môn</InputLabel>
            <Select value={subject} label="Môn"
              onChange={(e) => updateConfigField("mon", e.target.value)}>
              <MenuItem value="Tin học">Tin học</MenuItem>
              <MenuItem value="Công nghệ">Công nghệ</MenuItem>
            </Select>
          </FormControl>

          {/* Lớp + Thêm/Xóa */}
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Lớp</InputLabel>
              <Select value={selectedClass} label="Lớp" onChange={handleClassChange}>
                {classes.map((cls) => (
                  <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton sx={{ color: "green" }} onClick={() => setAddingClass(true)}>
              <Add />
            </IconButton>

            <IconButton sx={{ color: "red" }} onClick={handleDeleteClass}>
              <Delete />
            </IconButton>
          </Stack>

          {/* Form thêm lớp */}
          {addingClass && (
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Tên lớp"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                fullWidth
              />
              <Button variant="contained" size="small" sx={{ bgcolor: "green" }}
                onClick={handleAddClass}>
                Lưu
              </Button>
              <Button size="small" onClick={() => setAddingClass(false)}>Hủy</Button>
            </Stack>
          )}
        </Stack>

        {/* Checkbox config */}
        <Stack spacing={1} sx={{ mt: 2, width: "fit-content" }}>
            <FormControlLabel
                control={
                <Checkbox
                    checked={config.choXemDiem || false}
                    onChange={(e) => updateConfigField("choXemDiem", e.target.checked)}
                />
                }
                label="Cho xem điểm"
            />

            <FormControlLabel
                control={
                <Checkbox
                    checked={config.xuatFileBaiLam || false}
                    onChange={(e) => updateConfigField("xuatFileBaiLam", e.target.checked)}
                />
                }
                label="Xuất file bài làm"
            />
            </Stack>

      </Card>
    </Box>
  );
}

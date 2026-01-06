import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, MenuItem, Select, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, Tooltip } from "@mui/material";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, setDoc, onSnapshot } from "firebase/firestore";
import { exportDanhsach } from "../utils/exportDanhSach";
import { printDanhSach } from "../utils/printDanhSach";

import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import { Tabs, Tab } from "@mui/material";
import { Switch, FormControlLabel } from "@mui/material";

export default function DanhSachHS() {
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [ppct, setPpct] = useState([]);
  const [viewMode, setViewMode] = useState("ppct"); 
  const [selectedKhoi, setSelectedKhoi] = useState("khoi4");
  const [showChuDe, setShowChuDe] = useState(false); // ✅ mặc định OFF

  
  // 🔹 Lấy config realtime
  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lopConfig = data.lop || "";
        setSelectedClass(lopConfig);
        setConfig((prev) => ({ ...prev, lop: lopConfig }));
      }
    });
    return () => unsubscribe();
  }, [setConfig]);

  // 🔹 Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snapshot = await getDocs(collection(db, "DANHSACH"));
        const classList = snapshot.docs.map((doc) => doc.id);
        setClassData(classList);
        setClasses(classList);
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
  }, [config.lop, setClassData]);

  // 🔹 Lấy danh sách học sinh
  useEffect(() => {
  if (!selectedClass) return;

  // Hàm so sánh từng chữ từ phải sang trái
  const compareFullNamesRightToLeft = (a, b) => {
    const partsA = a.hoVaTen.replace(/\//g, " ").trim().split(/\s+/);
    const partsB = b.hoVaTen.replace(/\//g, " ").trim().split(/\s+/);
    const len = Math.max(partsA.length, partsB.length);

    for (let i = 1; i <= len; i++) { // bắt đầu từ cuối
      const wordA = partsA[partsA.length - i] || "";
      const wordB = partsB[partsB.length - i] || "";
      const cmp = wordA.localeCompare(wordB, "vi", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
    }

    return 0;
  };

  // Lấy dữ liệu từ cache nếu có
  const cached = studentData[selectedClass];
  if (cached && cached.length > 0) {
    const sorted = [...cached].sort(compareFullNamesRightToLeft).map((stu, idx) => ({
      ...stu,
      stt: idx + 1,
    }));
    setStudents(sorted);
    return;
  }

  // Nếu chưa có cache, fetch từ Firestore
  const fetchStudents = async () => {
    try {
      const classDocRef = doc(db, "DANHSACH", selectedClass);
      const classSnap = await getDoc(classDocRef);

      if (!classSnap.exists()) {
        setStudents([]);
        setStudentData((prev) => ({ ...prev, [selectedClass]: [] }));
        return;
      }

      const data = classSnap.data();
      let studentList = Object.entries(data).map(([maDinhDanh, info]) => ({
        maDinhDanh,
        hoVaTen: info.hoVaTen,
        ghiChu: "",
      }));

      // 🔹 Sắp xếp theo từng chữ từ phải sang trái
      studentList.sort(compareFullNamesRightToLeft);

      // Thêm STT
      studentList = studentList.map((stu, idx) => ({ ...stu, stt: idx + 1 }));

      // Cập nhật cache và state
      setStudentData((prev) => ({ ...prev, [selectedClass]: studentList }));
      setStudents(studentList);
    } catch (err) {
      console.error(`❌ Lỗi khi lấy học sinh lớp "${selectedClass}":`, err);
      setStudents([]);
    }
  };

  fetchStudents();
}, [selectedClass, studentData, setStudentData]);

useEffect(() => {
    if (viewMode !== "ppct" || !selectedKhoi) return;

    const fetchPPCT = async () => {
      try {
        const docRef = doc(db, "PPCT", selectedKhoi);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          setPpct([]);
          return;
        }

        const data = snap.data();

        // data dạng: tuan_1, tuan_2_3...
        const list = Object.entries(data)
          .map(([key, value]) => {
            const weekText = key.replace("tuan_", "").replace(/_/g, " + ");

            // Lấy tuần nhỏ nhất để sort
            const firstWeek = parseInt(weekText.split("+")[0].trim(), 10);

            return {
              tuan: weekText,
              chuDe: value.chuDe,
              tenBaiHoc: value.tenBaiHoc,
              thoiLuong: value.thoiLuong,
              _sortWeek: firstWeek, // dùng nội bộ để sort
            };
          })
          .sort((a, b) => a._sortWeek - b._sortWeek)
          .map(({ _sortWeek, ...rest }) => rest); // xoá field phụ


        setPpct(list);
      } catch (err) {
        console.error("❌ Lỗi lấy PPCT:", err);
        setPpct([]);
      }
    };

    fetchPPCT();
  }, [viewMode, selectedKhoi]);


  {/*const handleClassChange = async (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass);
    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { lop: newClass }, { merge: true });
      setConfig(prev => ({ ...prev, lop: newClass }));
    } catch (err) {
      console.error("❌ Lỗi cập nhật lớp:", err);
    }
  };*/}
  
  const handleClassChange = (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass); // chỉ cập nhật state local
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

      {/* ICON */}
      <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1 }}>
        {viewMode === "students" && (
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
        )}
      </Box>

      {/* TIÊU ĐỀ */}
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: "#1976d2" }}>
          {viewMode === "students" ? "DANH SÁCH HỌC SINH" : "PHÂN PHỐI CHƯƠNG TRÌNH"}
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
            <Typography fontWeight={500}>Lớp:</Typography>
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
          </>
        ) : (
          <>
            <Typography fontWeight={500}>Khối:</Typography>
            <Select
              value={selectedKhoi}
              onChange={(e) => setSelectedKhoi(e.target.value)}
              size="small"
              sx={{
                width: 80,
                textAlign: "center",

                // phần chữ khi Select đang đóng
                "& .MuiSelect-select": {
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    "& .MuiMenuItem-root": {
                      justifyContent: "center", // menu xổ xuống
                    },
                  },
                },
              }}
            >
              <MenuItem value="khoi4">4</MenuItem>
              <MenuItem value="khoi5">5</MenuItem>
            </Select>


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
                  sx={{ bgcolor: "#1976d2", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}
                >
                  GHI CHÚ
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((s) => (
                <TableRow key={s.maDinhDanh}>
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

                  <TableCell
                    sx={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.ghiChu}
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
              tableLayout: "fixed", // ✅ bắt buộc
              minWidth: showChuDe ? 900 : 580,
            }}
          >
            {/* ===== HEADER ===== */}
            <TableHead>
              <TableRow>
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

                <TableCell
                  align="center"
                  sx={{
                    width: 320, // ✅ CỐ ĐỊNH
                    bgcolor: "#1976d2",
                    color: "#fff",
                    border: "1px solid rgba(0,0,0,0.12)",
                    whiteSpace: "nowrap",
                  }}
                >
                  TÊN BÀI HỌC
                </TableCell>

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
                  THỜI LƯỢNG
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

                    {/* CHỦ ĐỀ */}
                    {showChuDe && (
                      <TableCell
                        sx={{
                          width: 320,
                          maxWidth: 320,
                          border: "1px solid rgba(0,0,0,0.12)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
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
                        maxWidth: 320, // ✅ KHÓA CỨNG
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

                    {/* THỜI LƯỢNG */}
                    <TableCell
                      align="center"
                      sx={{
                        width: 80,
                        border: "1px solid rgba(0,0,0,0.12)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.thoiLuong}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

    </Paper>
  </Box>
);


}

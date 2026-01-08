import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, MenuItem, FormControl, InputLabel, Select, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, Tooltip } from "@mui/material";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, setDoc, onSnapshot } from "firebase/firestore";
import { exportDanhsach } from "../utils/exportDanhSach";
import { printDanhSach } from "../utils/printDanhSach";
import { uploadStudents, uploadPPCT } from "../utils/uploadExcel";

//import UploadIcon from "@mui/icons-material/Upload";
import FileUploadIcon from "@mui/icons-material/FileUpload";

import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";

import { Tabs, Tab } from "@mui/material";
import { Switch, FormControlLabel } from "@mui/material";
import { LinearProgress } from "@mui/material";
//import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

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
  const fileInputRef = React.useRef(null);
  const [ppctReloadKey, setPpctReloadKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedNamHoc, setSelectedNamHoc] = useState(config?.namHoc || "");


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
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      if (viewMode === "students") {
        if (!selectedClass) return;

        // Upload file và cập nhật progress
        await uploadStudents({
          file,
          db,
          selectedClass,
          onProgress: (p) => setUploadProgress(p),
        });

        // 🔄 Reload danh sách HS từ Firestore để UI cập nhật ngay
        const classDocRef = doc(db, "DANHSACH", selectedClass);
        const classSnap = await getDoc(classDocRef);

        if (classSnap.exists()) {
          const data = classSnap.data();
          const studentList = Object.entries(data).map(([maDinhDanh, info], idx) => ({
            maDinhDanh,
            hoVaTen: info.hoVaTen,
            stt: idx + 1,
            ghiChu: "",
          }));

          setStudentData((prev) => ({
            ...prev,
            [selectedClass]: studentList,
          }));

          setStudents(studentList);
        } else {
          setStudentData((prev) => ({
            ...prev,
            [selectedClass]: [],
          }));
          setStudents([]);
        }

      } else {
        // ===== PPCT =====
        const updatedKhoiList = await uploadPPCT({
          file,
          db,
          namHoc: config?.namHoc,
          onProgress: (p) => setUploadProgress(p),
        });

        if (updatedKhoiList.includes(selectedKhoi)) {
          setPpctReloadKey((k) => k + 1);
        }
      }

      // Hoàn tất
      setUploadProgress(100);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 800);

      e.target.value = "";
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
        <Box sx={{ textAlign: "center", mb: 3 }}>
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
                    LT
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
                    TH
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
                    Tổng số tiết
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
        type="file"
        ref={fileInputRef}
        hidden
        accept=".xlsx"
        onChange={handleFileChange}
      />
    </Box>    
  );
}

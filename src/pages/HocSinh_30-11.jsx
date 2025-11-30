//import React, { useState, useEffect, useContext } from "react";
import React, { useState, useEffect, useContext, useRef } from "react";
import { 
  Box, Typography, MenuItem, Select, Grid, Paper, Button, Stack, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  TextField,
  FormControl, 
  InputLabel
} from "@mui/material";

import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, updateDoc, setDoc } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import CloseIcon from "@mui/icons-material/Close";
import Draggable from "react-draggable";
import { useTheme, useMediaQuery } from "@mui/material"; 
import { useNavigate } from "react-router-dom";

export default function HocSinh() {
  // 🔹 Lấy context
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const navigate = useNavigate();

  // 🔹 Local state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentStatus, setStudentStatus] = useState({});

  const { config, setConfig } = useContext(ConfigContext);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [systemLocked, setSystemLocked] = useState(false);
  const [saving, setSaving] = useState(false); // 🔒 trạng thái đang lưu

  const [openDoneDialog, setOpenDoneDialog] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [doneStudent, setDoneStudent] = useState(null);
  const [weekData, setWeekData] = useState({});

  const choXemDiem = config?.choXemDiem; // lấy từ config


  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};

        const tuan = data.tuan || 1;
        const mon = data.mon || "Tin học";
        const lop = data.lop || "";
        const deTracNghiem = data.deTracNghiem || ""; // 🔹 Thêm dòng này

        // 🔹 Cập nhật ConfigContext đầy đủ
        setConfig({ tuan, mon, lop, deTracNghiem });

        // 🔹 Cập nhật local state
        setSelectedWeek(tuan);
        setSelectedClass(lop);
      },
      (err) => {
        console.error("❌ Lỗi khi lắng nghe CONFIG/config:", err);
      }
    );

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

  //tải dữ liệu tuần
  useEffect(() => {
    if (!selectedClass || !selectedWeek) return;

    const fetchWeekData = async () => {
      try {
        const classKey = config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;
        const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);
        const tuanSnap = await getDoc(tuanRef);

        if (tuanSnap.exists()) {
          setWeekData(tuanSnap.data());
        } else {
          setWeekData({});
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải dữ liệu tuần:", err);
        setWeekData({});
      }
    };

    fetchWeekData();
  }, [selectedClass, selectedWeek, config?.mon]);

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
      setSaving(true); // 🔒 Bắt đầu lưu

      const classKey =
        config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;

      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: hoVaTen,
        [`${studentId}.status`]: status,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          await setDoc(tuanRef, {
            [studentId]: { hoVaTen, status },
          });
        } else {
          throw err;
        }
      });
    } catch (err) {
      console.error("❌ Lỗi khi lưu trạng thái học sinh:", err);
    } finally {
      setSaving(false); // ✅ Ghi xong, mở lại nút X
    }
  };

  const handleStatusChange = (maDinhDanh, hoVaTen, status) => {
    setStudentStatus((prev) => {
      const currentStatus = prev[maDinhDanh] || "";
      const newStatus = currentStatus === status ? "" : status;

      // 🧠 Nếu không thay đổi trạng thái → bỏ qua, không ghi Firestore, không re-render
      if (currentStatus === newStatus) return prev;

      const updated = { ...prev, [maDinhDanh]: newStatus };

      // 🔹 Ghi Firestore bất đồng bộ sau khi setState
      saveStudentStatus(maDinhDanh, hoVaTen, newStatus);

      return updated;
    });
  };


  useEffect(() => {
    // 🛑 Nếu chưa đủ thông tin, thoát
    if (!expandedStudent?.maDinhDanh || !selectedClass || !selectedWeek) return;

    const classKey =
      config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;
    const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

    // 🟢 Lắng nghe realtime CHỈ học sinh đang được mở
    const unsubscribe = onSnapshot(
      tuanRef,
      (docSnap) => {
        if (!docSnap.exists()) return;

        const record = docSnap.data()?.[expandedStudent.maDinhDanh];
        const currentStatus = record?.status || "";

        setStudentStatus((prev) => {
          // 🔸 Nếu trạng thái không đổi → không setState (tránh render lặp)
          if (prev[expandedStudent.maDinhDanh] === currentStatus) return prev;
          return {
            ...prev,
            [expandedStudent.maDinhDanh]: currentStatus,
          };
        });
      },
      (error) => {
        console.error("❌ Lỗi khi lắng nghe đánh giá realtime:", error);
      }
    );

    // 🧹 Khi đóng dialog → hủy lắng nghe
    return () => unsubscribe();
  }, [expandedStudent?.maDinhDanh, selectedClass, selectedWeek, config?.mon]);

  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff", label: "T", color: "primary" },
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff", label: "H", color: "secondary" },
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff", label: "C", color: "warning" },
    "": { bg: "#ffffff", text: "#000000" },
  };

  // ref cho node (an toàn cho React StrictMode)
  const dialogNodeRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  function PaperComponent(props) {
    // 🔹 KHẮC PHỤC LỖI TRÊN MOBILE:
    // Trên điện thoại, không bọc trong <Draggable> để tránh chặn sự kiện chạm (tap)
    if (isMobile) {
      return <Paper {...props} />;
    }

    // 🔹 Chỉ desktop mới dùng draggable
    return (
      <Draggable
        nodeRef={dialogNodeRef}
        handle="#draggable-dialog-title"
        cancel={'[class*="MuiDialogContent-root"]'}
      >
        <Paper ref={dialogNodeRef} {...props} />
      </Draggable>
    );
  }

  const convertPercentToScore = (percent) => {
    if (percent === undefined || percent === null) return "?";

    const raw = percent / 10; // % → thang 10
    const decimal = raw % 1;

    let rounded;
    if (decimal < 0.25) rounded = Math.floor(raw);
    else if (decimal < 0.75) rounded = Math.floor(raw) + 0.5;
    else rounded = Math.ceil(raw);

    return rounded;
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
        maxWidth: 1420,
        bgcolor: "white",
      }}
    >
      {/* 🔹 Tiêu đề */}
      <Box sx={{ textAlign: "center", mb: -1 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            color: "#1976d2",
            //borderBottom: "3px solid #1976d2",
            display: "inline-block",
            pb: 1,
          }}
        >
          {selectedClass
            ? `DANH SÁCH LỚP ${selectedClass}`
            : "DANH SÁCH HỌC SINH"}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          mt: 2,
          mb: 4,
        }}
      >
        {/* 🔹 Môn (chỉ hiển thị, không cho thay đổi) */}
        <TextField
          label="Môn"
          value={config.mon || "Tin học"}
          InputProps={{ readOnly: true }}
          size="small"
          sx={{
            width: 120,
            //bgcolor: "#f5f5f5",
            "& .MuiInputBase-input.Mui-disabled": { color: "#000" },
            fontWeight: "bold",
          }}
        />

        {/* 🔹 Tuần (chỉ hiển thị, không cho thay đổi) */}
        <TextField
          label="Tuần"
          value={`Tuần ${config.tuan || 1}`}
          InputProps={{ readOnly: true }}
          size="small"
          sx={{
            width: 120,
            //bgcolor: "#f5f5f5",
            "& .MuiInputBase-input.Mui-disabled": { color: "#000" },
            fontWeight: "bold",
          }}
        />
      </Box>

      {/* 🔹 Danh sách học sinh */}
      <Grid container spacing={2} justifyContent="center">
        {columns.map((col, colIdx) => (
          <Grid item key={colIdx}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {col.map((student) => {
                const status = studentStatus[student.maDinhDanh];
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
                      bgcolor: "#ffffff",
                      transition: "0.2s",
                      "&:hover": {
                        transform: "scale(1.03)",
                        boxShadow: 4,
                        bgcolor: "#f5f5f5",
                      },
                    }}
                    onClick={async () => {
                      const isBaiTapTuan = Boolean(config?.baiTapTuan);
                      const isKiemTraDinhKi = Boolean(config?.kiemTraDinhKi);

                      try {
                        if (isBaiTapTuan) {
                          // 🔹 Bài tập tuần
                          const hsData = weekData?.[student.maDinhDanh];
                          const daLamBai = hsData?.diemTracNghiem !== undefined && hsData?.diemTracNghiem !== null;

                          if (daLamBai) {
                            setDoneStudent({
                              hoVaTen: student.hoVaTen,
                              diemTN: hsData?.diemTN ?? hsData?.diemTracNghiem,
                            });
                            setOpenDoneDialog(true);
                            return;
                          }

                          // Chưa làm → mở trang Trắc nghiệm
                          navigate("/tracnghiem", {
                            state: {
                              studentId: student.maDinhDanh,
                              fullname: student.hoVaTen,
                              lop: selectedClass,
                              selectedWeek,
                              mon: config.mon,
                            },
                          });

                        } else if (isKiemTraDinhKi) {
                          // 🔹 Kiểm tra định kỳ
                          const hocKyMap = {
                            "Giữa kỳ I": "GKI",
                            "Cuối kỳ I": "CKI",
                            "Giữa kỳ II": "GKII",
                            "Cả năm": "CN",
                          };
                          const hocKyFirestore = hocKyMap[config.hocKy];

                          if (!hocKyFirestore) {
                            setDoneMessage("⚠️ Cấu hình học kỳ không hợp lệ.");
                            setOpenDoneDialog(true);
                            return;
                          }

                          // Truy cập document cấp cao nhất (ví dụ: CKI)
                          const docRef = doc(db, "KTDK", hocKyFirestore);
                          const docSnap = await getDoc(docRef);
                          const fullData = docSnap.exists() ? docSnap.data() : null;

                          console.log("📦 Firestore fullData:", fullData);

                          // Truy cập map lớp → map học sinh
                          const hsData = fullData?.[selectedClass]?.[student.maDinhDanh];

                          console.log("🎯 hsData:", hsData);

                          const lyThuyet = hsData?.lyThuyet ?? hsData?.LyThuyet ?? null;

                          if (lyThuyet != null) {
                            setDoneStudent({
                              hoVaTen: hsData?.hoVaTen ?? student.hoVaTen,
                              diemTN: lyThuyet,
                            });
                            setOpenDoneDialog(true);
                            return;
                          }

                          // Chưa làm → mở trang Trắc nghiệm
                          navigate("/tracnghiem", {
                            state: {
                              studentId: student.maDinhDanh,
                              fullname: student.hoVaTen,
                              lop: selectedClass,
                              selectedWeek,
                              mon: config.mon,
                            },
                          });

                        } else {
                          // 🔹 Mặc định → đánh giá định kỳ
                          setExpandedStudent(student);
                        }
                      } catch (err) {
                        console.error("❌ Lỗi khi kiểm tra trạng thái học sinh:", err);
                        setDoneMessage("⚠️ Có lỗi khi kiểm tra trạng thái bài. Vui lòng thử lại!");
                        setOpenDoneDialog(true);
                      }
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {student.stt}. {student.hoVaTen}
                      </Typography>
                      {status && (
                        <Chip
                          label={statusColors[status].label}
                          color={statusColors[status].color}
                          size="small"
                          sx={{ ml: 1, fontWeight: "bold" }}
                        />
                      )}
                    </Box>
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
      PaperComponent={PaperComponent}
    >

      {expandedStudent && (
        <>
          <DialogTitle
            id="draggable-dialog-title"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#64b5f6",
              flexWrap: "wrap",
              py: 1.5,
              cursor: "move", // 🟢 thêm để dễ thấy có thể kéo
            }}
          >

            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{ color: "#ffffff", fontSize: "1.05rem" }}
              >
                {expandedStudent.hoVaTen.toUpperCase()}
              </Typography>
            </Box>

            {/*<IconButton
              onClick={() => setExpandedStudent(null)}
              sx={{
                color: "#f44336",
                "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
              }}
            >
              <CloseIcon />
            </IconButton>*/}

            <IconButton
              onClick={() => setExpandedStudent(null)}
              disabled={saving} // 🔒 khóa khi đang lưu
              sx={{
                color: saving ? "#ccc" : "#f44336",
                "&:hover": saving ? {} : { bgcolor: "rgba(244,67,54,0.1)" },
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
                    onClick={() => {
                      handleStatusChange(
                        expandedStudent.maDinhDanh,
                        expandedStudent.hoVaTen,
                        ""
                      );
                      setExpandedStudent(null); // 🔹 Đóng dialog sau khi hủy
                    }}
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

    {/* Dialog thông báo học sinh đã làm bài */}
    <Dialog
      open={openDoneDialog}
      onClose={() => setOpenDoneDialog(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
          bgcolor: "#e3f2fd", // 🌤 cùng màu nền trang chính
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#42a5f5",
            color: "#fff",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1.5,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          ℹ️
        </Box>
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>
          Thông báo
        </DialogTitle>
      </Box>

      <DialogContent sx={{ textAlign: "center" }}>
        <Typography sx={{ fontSize: 18, fontWeight: "bold", color: "#0d47a1", mb: 1 }}>
          {doneStudent?.hoVaTen || "Học sinh"}
        </Typography>

        <Typography sx={{ fontSize: 16, color: "#1565c0", mt: 2, mb: 0.5 }}>
          Đã hoàn thành bài kiểm tra.
        </Typography>

        <Typography sx={{ fontSize: 16, color: "#0d47a1", fontWeight: 500, mt: 2 }}>
          {config?.baiTapTuan ? (
            <>
              Điểm của bạn:{" "}
              <span style={{ color: "red", fontWeight: "bold" }}>
                {convertPercentToScore(doneStudent?.diemTN)}
              </span>
            </>
          ) : config?.kiemTraDinhKi ? (
            choXemDiem ? (
              <>
                Điểm của bạn:{" "}
                <span style={{ color: "red", fontWeight: "bold" }}>
                  {doneStudent?.diemTN ?? "Chưa có điểm"}
                </span>
              </>
            ) : (
              ""
            )
          ) : (
            ""
          )}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="contained"
          onClick={() => setOpenDoneDialog(false)}
          sx={{
            borderRadius: 2,
            px: 4,
            bgcolor: "#64b5f6",
            color: "#fff",
            "&:hover": { bgcolor: "#42a5f5" },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  </Box>
);

}

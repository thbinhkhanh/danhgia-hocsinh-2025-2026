import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  Stack,
  IconButton,
  Button,
  Snackbar,
  Alert,
  MenuItem,   
  InputLabel,
  Checkbox,
  FormControl,
  Select,
} from "@mui/material";
import { ChevronRight, ChevronLeft } from "@mui/icons-material";
import { collection, getDoc, getDocs, deleteDoc, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";
import DeleteConfirmDialog from "../dialog/DeleteConfirmDialog";
import { exportWordFile } from "../utils/exportWordFile";

export default function DeThi() {
  const account = localStorage.getItem("account") || "";

  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState([]);

  //const [pendingExam, setPendingExam] = useState(null);
  const [pendingSelectedExam, setPendingSelectedExam] = useState(null);

  const [selectedExamToDelete, setSelectedExamToDelete] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedExamsToCombine, setSelectedExamsToCombine] = useState([]); // các đề được chọn để kết hợp
  //const [combinedExams, setCombinedExams] = useState([]); // **state cho đề kết hợp**

  //const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  //const [examToDelete, setExamToDelete] = useState(null);
  const [selectedExamIds, setSelectedExamIds] = useState([]);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const { config } = useContext(ConfigContext);
  const [selectedYear, setSelectedYear] = useState(
    config?.namHoc || "2025-2026"
  );

  const getYearKey = (namHoc) => {
    if (!namHoc) return "";
    const [start, end] = namHoc.split("-");
    return `${start.slice(-2)}-${end.slice(-2)}`;
  };


  useEffect(() => {
    const fetchExams = async () => {
      try {
        const snap = await getDocs(collection(db, "NGANHANG_DE"));

        const yearKey = getYearKey(selectedYear);

        const list = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((ex) => ex.id.includes(yearKey));

        setExamList(list);
      } catch (err) {
        console.error("Lỗi lấy danh sách đề:", err);
      }
    };

    fetchExams();
  }, [selectedYear]);

  // Lấy danh sách đề đã chọn
  useEffect(() => {
    const fetchSelected = async () => {
      try {
        const snap = await getDocs(collection(db, "DETHI"));
        const list = snap.docs.map((d) => ({
          id: d.id,
          tenDe: d.data().name || d.id,
        }));

        setSelectedExam(list);
      } catch (err) {
        console.error("Lỗi lấy đề đã chọn:", err);
      }
    };

    fetchSelected();
  }, []);

  useEffect(() => {
    const fetchCombinedExams = async () => {
      try {
        const snap = await getDocs(collection(db, "TRACNGHIEM_ONTAP"));

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setCombinedExams(list); // đổ vào state để hiển thị
      } catch (err) {
        console.error("Lỗi load đề kết hợp:", err);
      }
    };

    fetchCombinedExams();
  }, []);


  const addExamToFirestore = async (ex) => {
    try {
      await setDoc(doc(db, "DETHI", ex.id), { name: ex.tenDe || ex.id });
    } catch (err) {
      console.error("Lỗi lưu đề:", err);
    }
  };

  const removeExamFromFirestore = async (ex) => {
    try {
      await deleteDoc(doc(db, "DETHI", ex.id));
    } catch (err) {
      console.error("Lỗi xóa đề đã chọn:", err);
    }
  };

  const handleDeleteExam = () => {
    // Ưu tiên: đã chọn cụ thể -> đang hover -> danh sách kết hợp
    const target =
      selectedExamToDelete ||
      pendingSelectedExam ||
      selectedExamsToCombine[0];

    if (!target?.id) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn một đề để xóa!",
        severity: "warning",
      });
      return;
    }

    setSelectedExamToDelete(target);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteExam = async () => {
    try {
      await deleteDoc(doc(db, "NGANHANG_DE", selectedExamToDelete.id));

      setExamList((prev) => prev.filter((e) => e.id !== selectedExamToDelete.id));
      setSelectedExam((prev) => prev.filter((e) => e.id !== selectedExamToDelete.id));

      await removeExamFromFirestore(selectedExamToDelete);

      setSelectedExamToDelete(null);
      setOpenDeleteDialog(false);

      setSnackbar({ open: true, message: "🗑️ Đã xóa đề!", severity: "success" });
    } catch (err) {
      console.error("Lỗi xóa đề:", err);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi xóa đề: ${err.message}`,
        severity: "error",
      });
    }
  };

  // ⭐ HÀM XUẤT FILE WORD ⭐
  const handleExportWord = async () => {
    if (selectedExamIds.length === 0) {
      setSnackbar({
        open: true,
        message: "Vui lòng tick chọn ít nhất một đề để xuất!",
        severity: "warning",
      });
      return;
    }

    try {
      const folder = "NGANHANG_DE";

      for (let examId of selectedExamIds) {
        const snap = await getDoc(doc(db, folder, examId));
        if (!snap.exists()) continue;

        const data = snap.data();
        const questions = Array.isArray(data.questions) ? data.questions : [];
        if (questions.length === 0) continue;

        await exportWordFile({
          title: data.tenDe || examId,
          namHoc: selectedYear,
          questions,
        });

      }

      setSnackbar({
        open: true,
        message: `📄 Đã xuất ${selectedExamIds.length} đề ra file Word!`,
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi xuất đề:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi xuất đề!",
        severity: "error",
      });
    }
  };

  // Hàm format tên đề
  const formatExamTitle = (examName = "") => {
    if (!examName) return "";

    // 1. Loại bỏ prefix "quiz_" nếu có
    let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;

    // 2. Tách các phần theo dấu "_"
    const parts = name.split("_");

    // 3. Tìm lớp
    const classPart = parts.find(p => p.toLowerCase().includes("lớp")) || "";
    const classNumber = classPart.match(/\d+/)?.[0] || "";

    // 4. Tìm chỉ số lớp trong mảng để lấy môn
    const classIndex = parts.indexOf(classPart);

    // 5. Tìm môn: phần ngay sau lớp (hoặc phần đầu nếu lớp là đầu)
    let subjectPart = "";
    for (let i = classIndex + 1; i < parts.length; i++) {
      // bỏ qua CKI, CKII, CN, năm học cuối, chỉ lấy môn
      const p = parts[i];
      if (!p.toLowerCase().includes("cki") && !p.toLowerCase().includes("cn") && !/\d{2}-\d{2}/.test(p)) {
        subjectPart = p;
        break;
      }
    }

    // 6. Tìm phần mở rộng (CKI/CKII/CN) sau môn và lớp
    let extraPart = "";
    for (let i = classIndex + 1; i < parts.length; i++) {
      const p = parts[i];
      if (p.toLowerCase().includes("cki") || p.toLowerCase() === "cn") {
        extraPart = p.toUpperCase();
        break;
      }
    }

    // 7. Tìm ký hiệu đề (A, B, ...) trong ngoặc
    const match = examName.match(/\(([^)]+)\)/);
    const examLetter = match ? match[1] : "";

    // 8. Kết hợp lại
    return `${subjectPart} ${classNumber}${extraPart ? ` - ${extraPart}` : ""} ${examLetter ? `(${examLetter})` : ""}`.trim();
  };

  const yearKey = getYearKey(selectedYear);
  const filteredSelectedExam = selectedExam.filter(ex =>
    ex.id.includes(yearKey)
  );

  return (
  <Box
    sx={{
      minHeight: "100vh",
      backgroundColor: "#e3f2fd",
      pt: 3,
      px: 2,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <Card
      elevation={6}
      sx={{
        p: 3,
        borderRadius: 3,
        width: { xs: "95%", sm: "80%", md: "70%" },
        maxWidth: 600,
        height: "600px",
      }}
    >
      <Typography
        variant="h5"
        fontWeight="bold"
        color="primary"
        sx={{ textAlign: "center", mb: 3 }}
      >
        ĐỀ KIỂM TRA
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <FormControl sx={{ width: 150, height: 45 }}>
          <InputLabel>Năm học</InputLabel>
          <Select
            value={selectedYear}
            label="Năm học"
            sx={{ height: 45 }}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <MenuItem value="2025-2026">2025-2026</MenuItem>
            <MenuItem value="2026-2027">2026-2027</MenuItem>
            <MenuItem value="2027-2028">2027-2028</MenuItem>
            <MenuItem value="2028-2029">2028-2029</MenuItem>
            <MenuItem value="2029-2030">2029-2030</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {/* LEFT COLUMN */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Ngân hàng đề
          </Typography>

          <Box
            sx={{
              maxHeight: { xs: 220, sm: 420 },
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: 2,
            }}
          >
            {examList.length === 0 ? (
              <Typography sx={{ p: 2 }}>Chưa có đề</Typography>
            ) : (
              examList.map((ex) => {
                const checked = selectedExamIds.includes(ex.id);

                return (
                  <Stack
                    key={ex.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      px: 1,
                      py: 0.5,
                      cursor: "pointer",
                      backgroundColor: checked ? "#bbdefb" : "transparent",
                      "&:hover": { background: "#e3f2fd" },
                    }}
                    // Click vào vùng tên đề sẽ toggle
                    onClick={() => {
                      // toggle checkbox list
                      setSelectedExamIds(prev =>
                        prev.includes(ex.id) ? prev.filter(id => id !== ex.id) : [...prev, ex.id]
                      );
                      // toggle combine list
                      setSelectedExamsToCombine(prev => {
                        const has = prev.some(e => e.id === ex.id);
                        return has ? prev.filter(e => e.id !== ex.id) : [...prev, ex];
                      });
                    }}
                  >
                    {/* Checkbox + Tên đề */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                      <Checkbox
                        size="small"
                        checked={checked}
                        // chặn mọi sự kiện nổi lên container để tránh toggle 2 lần
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const willCheck = e.target.checked;

                          setSelectedExamIds(prev =>
                            willCheck ? [...prev, ex.id] : prev.filter(id => id !== ex.id)
                          );

                          setSelectedExamsToCombine(prev => {
                            const has = prev.some(item => item.id === ex.id);
                            if (willCheck) {
                              return has ? prev : [...prev, ex];
                            } else {
                              return prev.filter(item => item.id !== ex.id);
                            }
                          });
                        }}
                      />
                      <Typography>
                        {formatExamTitle(ex.tenDe || ex.id)}
                      </Typography>

                    </Stack>

                    <IconButton
                      size="small"
                      color="primary"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSelectedExam(prev => {
                          if (prev.some(e => e.id === ex.id)) return prev;
                          return [...prev, ex];
                        });
                        await addExamToFirestore(ex);
                      }}
                    >
                      <ChevronRight />
                    </IconButton>
                  </Stack>
                );
              })
            )}
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="error"
              sx={{ flex: 1 }}
              onClick={handleDeleteExam}
            >
              Xóa đề
            </Button>

            <Button
              variant="contained"
              color="info"
              sx={{ flex: 1 }}
              onClick={handleExportWord}
            >
              Xuất đề
            </Button>
          </Stack>
        </Box>

        {/* RIGHT COLUMN */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Đề thi học kì
          </Typography>
          
          <Box
            sx={{
              maxHeight: { xs: 220, sm: 420 },
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: 2,
            }}
          >
            {filteredSelectedExam.length > 0 ? (
              filteredSelectedExam.map((ex) => (
                <Stack
                  key={ex.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: 1,
                    py: 0.5,
                    cursor: "pointer",
                    backgroundColor:
                      pendingSelectedExam?.id === ex.id ? "#bbdefb" : "transparent",
                    "&:hover": { background: "#e3f2fd" },
                  }}
                  onMouseEnter={() => setPendingSelectedExam(ex)}
                  onMouseLeave={() => setPendingSelectedExam(null)}
                >
                  <Typography>
                    {formatExamTitle(ex.tenDe || ex.id)}
                  </Typography>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      setSelectedExam(prev => prev.filter(e => e.id !== ex.id));
                      await removeExamFromFirestore(ex);
                    }}
                  >
                    <ChevronLeft />
                  </IconButton>
                </Stack>
              ))
            ) : (
              <Typography sx={{ p: 2 }}>Chưa chọn đề</Typography>
            )}
          </Box>

        </Box>
      </Stack>
    </Card>

    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        severity={snackbar.severity}
        variant="filled"
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>

    <DeleteConfirmDialog
      open={openDeleteDialog}
      onClose={() => setOpenDeleteDialog(false)}
      onConfirm={confirmDeleteExam}
    />
  </Box>
);
}

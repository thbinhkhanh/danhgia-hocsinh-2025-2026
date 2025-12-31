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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControl,
  Select,
} from "@mui/material";
import { ChevronRight, ChevronLeft } from "@mui/icons-material";
import { collection, getDoc, getDocs, deleteDoc, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

import DeleteConfirmDialog from "../dialog/DeleteConfirmDialog";
import DeleteCombinedExamDialog from "../dialog/DeleteCombinedExamDialog";

import { exportWordFile } from "../utils/exportWordFile";
import { Delete } from "@mui/icons-material";


export default function DeThi() {
  const account = localStorage.getItem("account") || "";

  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState([]);

  const [pendingExam, setPendingExam] = useState(null);
  const [pendingSelectedExam, setPendingSelectedExam] = useState(null);

  const [selectedExamToDelete, setSelectedExamToDelete] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedExamsToCombine, setSelectedExamsToCombine] = useState([]); // các đề được chọn để kết hợp
  const [combinedExams, setCombinedExams] = useState([]); // **state cho đề kết hợp**

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [selectedExamIds, setSelectedExamIds] = useState([]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [school, setSchool] = useState("TH Bình Khánh");

  // Lấy danh sách đề theo trường
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const folder = school === "TH Bình Khánh" ? "TRACNGHIEM_BK" : "TRACNGHIEM_LVB";
        const snap = await getDocs(collection(db, folder));

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setExamList(list);
      } catch (err) {
        console.error("Lỗi lấy danh sách đề:", err);
      }
    };

    fetchExams();
  }, [school]);

  // Lấy danh sách đề đã chọn
  useEffect(() => {
    const fetchSelected = async () => {
      try {
        const snap = await getDocs(collection(db, "DETHI_BK"));
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

  // ⭐ Lấy danh sách ĐỀ KẾT HỢP từ TRACNGHIEM_ONTAP ⭐
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
      await setDoc(doc(db, "DETHI_BK", ex.id), { name: ex.tenDe || ex.id });
    } catch (err) {
      console.error("Lỗi lưu đề:", err);
    }
  };

  const removeExamFromFirestore = async (ex) => {
    try {
      await deleteDoc(doc(db, "DETHI_BK", ex.id));
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
      await deleteDoc(doc(db, "TRACNGHIEM_BK", selectedExamToDelete.id));

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

  async function fetchExamDetail(folder, examId) {
    const examRef = doc(db, folder, examId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) return null;

    return examSnap.data();
  }

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
      const folder = school === "TH Bình Khánh" ? "TRACNGHIEM_BK" : "TRACNGHIEM_LVB";

      for (let examId of selectedExamIds) {
        const snap = await getDoc(doc(db, folder, examId));
        if (!snap.exists()) continue;

        const data = snap.data();
        const questions = Array.isArray(data.questions) ? data.questions : [];
        if (questions.length === 0) continue;

        await exportWordFile({
          title: data.tenDe || examId,
          school,
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

  /*const handleCombineExams = async () => {
    if (selectedExamsToCombine.length === 0) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn ít nhất 1 đề để kết hợp!",
        severity: "warning",
      });
      return;
    }

    try {
      const folder =
        school === "TH Bình Khánh" ? "TRACNGHIEM_BK" : "TRACNGHIEM_LVB";
      const combinedQuestions = [];

      // Lấy tất cả câu hỏi từ các đề được chọn
      for (let ex of selectedExamsToCombine) {
        const snap = await getDoc(doc(db, folder, ex.id));
        if (snap.exists() && Array.isArray(snap.data().questions)) {
          combinedQuestions.push(...snap.data().questions);
        }
      }

      if (combinedQuestions.length === 0) {
        setSnackbar({
          open: true,
          message: "Các đề chọn không có câu hỏi để kết hợp!",
          severity: "error",
        });
        return;
      }

      // Lấy thông tin lớp, môn, kì từ đề đầu tiên
      const firstEx = selectedExamsToCombine[0];
      const firstExName = firstEx?.tenDe || firstEx?.id || "";

      if (!firstExName) {
        setSnackbar({
          open: true,
          message: "❌ Không xác định được tên đề đầu tiên!",
          severity: "error",
        });
        return;
      }

      // Phân tích tên đề đầu tiên
      const nameParts = firstExName.split("_");
      const className = nameParts[1] || "Lớp";
      const subject = nameParts[2] || "Môn học";
      const term = nameParts[3] || "CKI_XX";

      // Tạo tên đề gộp
      let combinedExamName;
      if (/\([A-Z]\)$/.test(firstExName)) {
        combinedExamName = firstExName.replace(/\([A-Z]\)$/, "OnTap");
      } else {
        combinedExamName = `${firstExName}_OnTap`;
      }

      // Lưu Firestore
      await setDoc(doc(db, "TRACNGHIEM_ONTAP", combinedExamName), {
        class: className,
        subject,
        term,
        examLetter: "OnTap",
        questions: combinedQuestions,
      });

      // ⭐ Cập nhật lên danh sách đề kết hợp UI ngay lập tức
      setCombinedExams((prev) => [
        ...prev,
        {
          id: combinedExamName,
          tenDe: combinedExamName,
          class: className,
          subject,
          term,
          questions: combinedQuestions,
        },
      ]);

      setSnackbar({
        open: true,
        //message: `✅ Đã tạo đề ôn tập thành công!: ${combinedExamName}`,
        message: `✅ Đã tạo đề ôn tập thành công!`,
        severity: "success",
      });
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi kết hợp đề",
        severity: "error",
      });
    }
  };*/

  const handleDeleteCombinedExam = async () => {
    if (!examToDelete) return;

    try {
      await deleteDoc(doc(db, "TRACNGHIEM_ONTAP", examToDelete.id));

      setCombinedExams(prev =>
        prev.filter(item => item.id !== examToDelete.id)
      );

      setSnackbar({
        open: true,
        message: `Đã xóa đề ôn tập: ${examToDelete.id}`,
        severity: "success"
      });
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi xóa đề",
        severity: "error",
      });
    }

    setDeleteDialogOpen(false);
    setExamToDelete(null);
  };


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
        maxWidth: 800,
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

      <FormControl sx={{ mb: 2, width: "49%", height: "45px" }}>
        <InputLabel>Chọn trường</InputLabel>
        <Select
          value={school}
          label="Chọn trường"
          onChange={(e) => setSchool(e.target.value)}
          sx={{ height: "45px" }}
        >
          <MenuItem value="TH Bình Khánh">TH Bình Khánh</MenuItem>
          {/*<MenuItem value="TH Lâm Văn Bền">TH Lâm Văn Bền</MenuItem>*/}
        </Select>
      </FormControl>

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
                      px: 2,
                      py: 1,
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
                      <Typography>{ex.tenDe || ex.id}</Typography>
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

            {/*<Button
              variant="contained"
              color="success"
              sx={{ flex: 1 }}
              onClick={handleCombineExams}
            >
              Kết hợp đề
            </Button>*/}
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
            {selectedExam.length > 0 ? (
              selectedExam.map((ex) => (
                <Stack
                  key={ex.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: 2,
                    py: 1,
                    cursor: "pointer",
                    backgroundColor:
                      pendingSelectedExam?.id === ex.id ? "#bbdefb" : "transparent",
                    "&:hover": { background: "#e3f2fd" },
                  }}
                  onMouseEnter={() => setPendingSelectedExam(ex)}
                  onMouseLeave={() => setPendingSelectedExam(null)}
                >
                  <Typography>{ex.tenDe || ex.id}</Typography>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      setSelectedExam((prev) => prev.filter((e) => e.id !== ex.id));
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

          {/* ===== Khung Đề kết hợp ===== */}
          {/*<Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4, mb: 1 }}>
            Đề ôn tập
          </Typography>*/}

          {/*<Box
            sx={{
              maxHeight: { xs: 120, sm: 200 },
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: 2,
            }}
          >
            {combinedExams.length > 0 ? (
              combinedExams.map((ex, idx) => (
                <Stack
                  key={idx}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: 2,
                    py: 1,
                    "&:hover": { background: "#f5f5f5" },
                  }}
                >
                  <Typography>{ex.tenDe || ex.id}</Typography>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setExamToDelete(ex);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Delete />
                  </IconButton>
                </Stack>
              ))
            ) : (
              <Typography sx={{ p: 2 }}>Chưa có đề kết hợp</Typography>
            )}
          </Box>*/}
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

    <DeleteCombinedExamDialog
      open={deleteDialogOpen}
      onClose={() => setDeleteDialogOpen(false)}
      onConfirm={handleDeleteCombinedExam}
      examName={examToDelete?.id || ""}
    />

    <DeleteConfirmDialog
      open={openDeleteDialog}
      onClose={() => setOpenDeleteDialog(false)}
      onConfirm={confirmDeleteExam}
    />
  </Box>
);
}

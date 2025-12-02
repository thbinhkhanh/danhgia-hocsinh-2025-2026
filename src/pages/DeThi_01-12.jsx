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
} from "@mui/material";
import { ChevronRight, ChevronLeft } from "@mui/icons-material";
import { collection, getDocs, deleteDoc, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function DeThi() {
  const account = localStorage.getItem("account") || "";

  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState([]);

  const [pendingExam, setPendingExam] = useState(null);
  const [pendingSelectedExam, setPendingSelectedExam] = useState(null);

  const [selectedExamToDelete, setSelectedExamToDelete] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ==================== Fetch danh sách đề ====================
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const folder = "TRACNGHIEM_BK";
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
  }, []);

  // ==================== Fetch đề đã chọn ====================
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

  // ==================== Thêm đề vào Firestore ====================
  const addExamToFirestore = async (ex) => {
    try {
      await setDoc(doc(db, "DETHI_BK", ex.id), { name: ex.tenDe || ex.id });
    } catch (err) {
      console.error("Lỗi lưu đề:", err);
    }
  };

  // ==================== Gỡ đề khỏi Firestore ====================
  const removeExamFromFirestore = async (ex) => {
    try {
      await deleteDoc(doc(db, "DETHI_BK", ex.id));
    } catch (err) {
      console.error("Lỗi xóa đề đã chọn:", err);
    }
  };

  // ==================== Xóa đề khỏi danh sách chính ====================
  const handleDeleteExam = async () => {
    if (!selectedExamToDelete) {
      alert("Vui lòng chọn một đề để xóa!");
      return;
    }

    const confirmDelete = window.confirm("Bạn chắc chắn muốn xóa đề này?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "TRACNGHIEM_BK", selectedExamToDelete.id));

      setExamList((prev) =>
        prev.filter((e) => e.id !== selectedExamToDelete.id)
      );

      // Nếu đề bị xóa cũng nằm trong đề đã chọn → xóa luôn
      setSelectedExam((prev) =>
        prev.filter((e) => e.id !== selectedExamToDelete.id)
      );
      await removeExamFromFirestore(selectedExamToDelete);

      setSelectedExamToDelete(null);

      setSnackbar({
        open: true,
        message: "🗑️ Đã xóa đề!",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi xóa đề:", err);
    }
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
            height: "600px",   // 🔥 Chiều cao đúng
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

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
        >
          {/* ======================== BẢNG 1 — Danh sách đề ======================== */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              Danh sách đề
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
                examList.map((ex) => (
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
                        selectedExamToDelete?.id === ex.id
                          ? "#ffebee"
                          : pendingExam?.id === ex.id
                          ? "#bbdefb"
                          : "transparent",
                      "&:hover": { background: "#e3f2fd" },
                    }}
                    onClick={() => setSelectedExamToDelete(ex)}
                    onMouseEnter={() => setPendingExam(ex)}
                    onMouseLeave={() => setPendingExam(null)}
                  >
                    <Typography>{ex.tenDe || ex.id}</Typography>

                    <IconButton
                      size="small"
                      color="primary"
                      onClick={async () => {
                        setSelectedExam((prev) => {
                          if (prev.some((e) => e.id === ex.id)) return prev;
                          return [...prev, ex];
                        });
                        await addExamToFirestore(ex);
                      }}
                    >
                      <ChevronRight />
                    </IconButton>
                  </Stack>
                ))
              )}
            </Box>

            <Button
              variant="contained"
              sx={{ mt: 2, width: "100%" }}
              onClick={handleDeleteExam}
            >
              Xóa đề đã chọn
            </Button>
          </Box>

          {/* ======================== BẢNG 2 — Đề đã chọn ======================== */}
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
                        pendingSelectedExam?.id === ex.id
                          ? "#bbdefb"
                          : "transparent",
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
                        setSelectedExam((prev) =>
                          prev.filter((e) => e.id !== ex.id)
                        );
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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

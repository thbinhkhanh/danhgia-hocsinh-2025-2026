import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Button,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const ImportFromFirestoreDialog = ({ open, onClose, onImport }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [selectedClass, setSelectedClass] = useState("Lớp 3");

  const [selectedYear, setSelectedYear] = useState("");
  const [yearOptions, setYearOptions] = useState([]);

  // ===== LOAD NĂM HỌC =====
  useEffect(() => {
    const loadNamHoc = async () => {
      try {
        const snap = await getDoc(doc(db, "CONFIG", "config"));
        if (snap.exists()) {
          const currentYear = snap.data().namHoc;

          // 👉 danh sách năm (có thể mở rộng sau)
          const years = ["2025-2026", "2026-2027"];

          setYearOptions(years);
          setSelectedYear(currentYear || years[0]);
        }
      } catch (err) {
        console.error("❌ Lỗi load năm học:", err);
      }
    };

    loadNamHoc();
  }, []);

  // ===== COLLECTION =====
  const getCollection = (lop) => {
    const num = lop.match(/\d+/)?.[0];
    if (!num || !selectedYear) return null;

    const isOldYear = selectedYear === "2025-2026";

    return isOldYear
      ? `TRACNGHIEM${num}`
      : `TRACNGHIEM${num}_New`;
  };

  // ===== LOAD DANH SÁCH =====
  useEffect(() => {
    if (!open) {
      setDocs([]);
      setSelectedDoc(null);
      return;
    }

    const fetchDocs = async () => {
      setLoading(true);
      try {
        const colName = getCollection(selectedClass);
        if (!colName) return;

        const snapshot = await getDocs(collection(db, colName));

        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setDocs(data);
        setSelectedDoc(null);
      } catch (err) {
        console.error("❌ Lỗi load danh sách:", err);
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [open, selectedClass, selectedYear]);

  // ===== IMPORT =====
  const handleImport = () => {
    if (!selectedDoc) {
      alert("⚠️ Vui lòng chọn đề trước!");
      return;
    }

    const selected = docs.find((d) => d.id === selectedDoc);
    if (!selected) return;

    onImport(selected.questions || []);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(to right, #1976d2, #42a5f5)",
          color: "#fff",
          px: 2,
          py: 1.2, // 👈 giảm chiều cao
        }}
      >
        <Typography
          variant="subtitle2" // 👈 nhỏ hơn
          sx={{ fontWeight: "bold", lineHeight: 1.2 }}
        >
          📥 Import từ đề có sẵn
        </Typography>

        <IconButton
          onClick={onClose}
          sx={{
            color: "#fff",
            p: 0.5, // 👈 giảm padding icon
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* FILTER */}
      <Box sx={{ px: 2, py: 2 }}>
        <Stack spacing={2}>
          {/* NĂM HỌC */}
          <FormControl size="small" fullWidth>
            <InputLabel>Năm học</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              label="Năm học"
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* LỚP */}
          <FormControl size="small" fullWidth>
            <InputLabel>Lớp</InputLabel>
            <Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              label="Lớp"
            >
              {[3, 4, 5].map((n) => (
                <MenuItem key={n} value={`Lớp ${n}`}>
                  Lớp {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* DANH SÁCH */}
      <DialogContent dividers sx={{ height: 320 }}>
        <Box
          sx={{
            height: "100%",
            overflowY: "auto",
            border: "1px solid #ccc",
            borderRadius: 2,
          }}
        >
          {loading ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : docs.length === 0 ? (
            <Typography align="center" sx={{ p: 2, color: "gray" }}>
              Không có đề nào.
            </Typography>
          ) : (
            docs.map((docItem) => (
              <Box
                key={docItem.id}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  borderRadius: 1,
                  backgroundColor:
                    selectedDoc === docItem.id
                      ? "#E3F2FD"
                      : "transparent",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
                onClick={() => setSelectedDoc(docItem.id)}
              >
                <Typography>{docItem.id}</Typography>
              </Box>
            ))
          )}
        </Box>
      </DialogContent>

      {/* ACTION */}
      <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          variant="contained"
          disabled={!selectedDoc}
          onClick={handleImport}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportFromFirestoreDialog;
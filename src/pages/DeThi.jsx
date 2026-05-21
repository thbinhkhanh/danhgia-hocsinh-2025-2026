import React, { useState, useEffect, useContext } from "react";

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

import {
  ChevronRight,
  ChevronLeft,
} from "@mui/icons-material";

import {
  collection,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase";
import { ConfigContext } from "../context/ConfigContext";
import DeleteExamDialog from "../dialog/DeleteExamDialog";
import OverwriteConfirmDialog from "../dialog/OverwriteConfirmDialog";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { createOnTapExam, normalizeOnTapId, checkDuplicateOnTap } from "../utils/createOnTapExam";

export default function DeThi() {
  // ================= IMPORT CONTEXT =================
  const { config } = useContext(ConfigContext);

  // ================= STATE: EXAM / DATA LIST =================
  const [examList, setExamList] = useState([]);
  const [onTapList, setOnTapList] = useState([]);

  // ================= STATE: SELECTION =================
  const [selectedExam, setSelectedExam] = useState([]);
  const [pendingSelectedExam, setPendingSelectedExam] = useState(null);
  const [selectedExamToDelete, setSelectedExamToDelete] = useState(null);
  const [selectedExamsToCombine, setSelectedExamsToCombine] = useState([]);
  const [selectedExamIds, setSelectedExamIds] = useState([]);

  // ================= STATE: DELETE =================
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [onTapToDelete, setOnTapToDelete] = useState(null);
  const [openOverwriteDialog, setOpenOverwriteDialog] = useState(false);
  const [pendingOnTapPayload, setPendingOnTapPayload] = useState(null);

  // ================= STATE: UI HOVER =================
  const [hoveredExamId, setHoveredExamId] = useState(null);
  const [hoveredSelectedId, setHoveredSelectedId] = useState(null);
  const [hoveredOnTapId, setHoveredOnTapId] = useState(null);

  // ================= STATE: SNACKBAR =================
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ================= STATE: CONFIG =================
  const [selectedYear, setSelectedYear] = useState(
    config?.namHoc || "2025-2026"
  );

  // ================= UTILS =================
  const getYearKey = (namHoc) => {
    if (!namHoc) return "";
    const [start, end] = namHoc.split("-");
    return `${start.slice(-2)}-${end.slice(-2)}`;
  };

  // =========================
  // LOAD NGÂN HÀNG ĐỀ
  // =========================
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const snap =
          await getDocs(
            collection(
              db,
              "NGANHANG_DE"
            )
          );
        const yearKey =
          getYearKey(selectedYear);

        const list = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((ex) =>
            ex.id.includes(yearKey)
          );
        setExamList(list);
      } catch (err) {
        console.error(
          "Lỗi lấy danh sách đề:",
          err
        );
      }
    };
    fetchExams();
  }, [selectedYear]);

  // =========================
  // LOAD DETHI
  // =========================

  useEffect(() => {

    const fetchSelected =
      async () => {
        try {
          const snap =
            await getDocs(
              collection(
                db,
                "DETHI"
              )
            );
          const list =
            snap.docs.map((d) => ({
              id: d.id,
              tenDe:
                d.data().name ||
                d.id,
            }));
          setSelectedExam(list);
        } catch (err) {

          console.error(
            "Lỗi lấy đề đã chọn:",
            err
          );
        }
      };
    fetchSelected();
  }, []);

  // =========================
  // LOAD DE_ONTAP
  // =========================

  useEffect(() => {
    const fetchOnTap = async () => {
      try {
        const snap = await getDocs(
          collection(db, "DE_ONTAP")
        );
        const yearKey = getYearKey(selectedYear);
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((ex) =>
            ex.id.includes(yearKey)
          );
        setOnTapList(list);
      } catch (err) {
        console.error("Lỗi lấy đề ôn tập:", err);
      }
    };
    fetchOnTap();
  }, [selectedYear]);

  // =========================
  // LƯU DETHI
  // =========================

  const addExamToFirestore = async (ex) => {
    try {
      await setDoc(doc(db, "DETHI", ex.id), {
        name: ex.tenDe || ex.id,
      });
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

  // =========================
  // XÓA ĐỀ
  // =========================

  const handleDeleteExam = () => {
    const target =
      selectedExamToDelete ||
      pendingSelectedExam ||
      selectedExamsToCombine[0];

    if (!target?.id) {
      setSnackbar({
        open: true,
        message:
          "Vui lòng chọn một đề để xóa!",
        severity: "warning",
      });
      return;
    }
    setSelectedExamToDelete(
      target
    );
    setOpenDeleteDialog(true);
  };

  const confirmDeleteExam = async () => {
    try {
      await deleteDoc(doc(db, "NGANHANG_DE", selectedExamToDelete.id));

      setExamList(prev =>
        prev.filter(e => e.id !== selectedExamToDelete.id)
      );

      setSelectedExam(prev =>
        prev.filter(e => e.id !== selectedExamToDelete.id)
      );

      await removeExamFromFirestore(selectedExamToDelete);

      setSelectedExamToDelete(null);
      setOpenDeleteDialog(false);

      setSnackbar({
        open: true,
        message: "🗑️ Đã xóa đề!",
        severity: "success",
      });

    } catch (err) {
      console.error("Lỗi xóa đề:", err);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi xóa đề: ${err.message}`,
        severity: "error",
      });
    }
  };

  const handleCreateOnTap = async () => {
    try {
      const { docId, docData } = await createOnTapExam({
        selectedExams: selectedExamsToCombine,
        db,
        selectedYear,
        formatExamTitle,
      });

      // 👉 DÙNG HÀM RIÊNG
      const isExist = await checkDuplicateOnTap(db, docId);

      if (isExist) {
        setPendingOnTapPayload({ docId, docData });
        setOpenOverwriteDialog(true);
        return;
      }

      await setDoc(doc(db, "DE_ONTAP", docId), docData);

      setOnTapList((prev) => [
        ...prev,
        { id: docId, ...docData },
      ]);

      setSnackbar({
        open: true,
        message: "✅ Đã tạo đề ôn tập!",
        severity: "success",
      });

    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "❌ Lỗi tạo đề ôn tập!",
        severity: "error",
      });
    }
  };

const handleOverwriteOnTap = async () => {
  try {
    if (!pendingOnTapPayload) return;

    await setDoc(
      doc(db, "DE_ONTAP", pendingOnTapPayload.docId),
      pendingOnTapPayload.docData
    );

    setOnTapList((prev) => [
      ...prev.filter((x) => x.id !== pendingOnTapPayload.docId),
      { id: pendingOnTapPayload.docId, ...pendingOnTapPayload.docData },
    ]);

    setSnackbar({
      open: true,
      message: "♻️ Đã ghi đè đề ôn tập!",
      severity: "success",
    });

    setOpenOverwriteDialog(false);
    setPendingOnTapPayload(null);

  } catch (err) {
    setSnackbar({
      open: true,
      message: "❌ Lỗi ghi đè đề ôn tập!",
      severity: "error",
    });
  }
};

const handleDeleteOnTap = (exam) => {
  setOnTapToDelete(exam);
  setOpenDeleteDialog(true);
};

const confirmDeleteOnTap = async () => {
  try {
    if (!onTapToDelete) return;

    await deleteDoc(doc(db, "DE_ONTAP", onTapToDelete.id));

    setOnTapList(prev =>
      prev.filter(e => e.id !== onTapToDelete.id)
    );

    setSnackbar({
      open: true,
      message: "🗑️ Đã xóa đề ôn tập!",
      severity: "success",
    });

    setOpenDeleteDialog(false);
    setOnTapToDelete(null);

  } catch (err) {
    console.error(err);
    setSnackbar({
      open: true,
      message: "❌ Lỗi xóa đề ôn tập!",
      severity: "error",
    });
  }
};
  
  // =========================
  // FORMAT TÊN ĐỀ
  // =========================

  const formatExamTitle = (examName = "") => {
    if (!examName) return "";

    const name = examName.startsWith("quiz_") ? examName.slice(5) : examName;
    const parts = name.split("_");

    const classPart = parts.find(p => p.toLowerCase().includes("lớp")) || "";
    const classNumber = classPart.match(/\d+/)?.[0] || "";
    const classIndex = parts.indexOf(classPart);

    let subjectPart = "", extraPart = "";

    for (let i = classIndex + 1; i < parts.length; i++) {
      const p = parts[i];

      if (!subjectPart &&
          !p.toLowerCase().includes("cki") &&
          !p.toLowerCase().includes("cn") &&
          !/\d{2}-\d{2}/.test(p)
      ) subjectPart = p;

      if (!extraPart &&
          (p.toLowerCase().includes("cki") || p.toLowerCase() === "cn")
      ) extraPart = p.toUpperCase();

      if (subjectPart && extraPart) break;
    }

    const examLetter = examName.match(/\(([^)]+)\)/)?.[1] || "";

    return `${subjectPart} ${classNumber}${extraPart ? ` - ${extraPart}` : ""} ${examLetter ? `(${examLetter})` : ""}`.trim();
  };
  
  const formatOnTapTitle = (id = "") => {
    if (!id) return "";

    let name = id.startsWith("quiz_") ? id.slice(5) : id;

    const parts = name.split("_");

    const classPart = parts.find(p => p.toLowerCase().includes("lớp")) || "";
    const classNumber = classPart.match(/\d+/)?.[0] || "";

    const subject = parts.find(
      (p) =>
        p !== classPart &&
        !p.match(/CKI|CKII|CN/i) &&
        !p.match(/\d{2}-\d{2}/)
    );

    const examType = parts.find((p) =>
      /CKI|CKII|CN/i.test(p)
    );

    const year = parts.find((p) => /\d{2}-\d{2}/.test(p));

    return `Ôn tập ${subject} ${classNumber}${
      examType ? ` - ${examType.toUpperCase()}` : ""
    } (${year})`.replace(/\s+/g, " ").trim();
  };

  const yearKey =
    getYearKey(selectedYear);

  const filteredSelectedExam =
    selectedExam.filter((ex) =>
      ex.id.includes(yearKey)
    );

  // =========================
  // SORT
  // =========================

  const sortExamList = (list) => {
    const regex = /(Công nghệ|Tin học) (\d+)(?: - (CKI|CKII|CN))? ?\(?([A-Z])?\)?/i;
    const subjectOrder = ["Công nghệ", "Tin học"];
    const extraOrder = ["CKI", "CKII", "CN"];

    return [...list].sort((a, b) => {
      const [subjectA, classA, extraA, letterA] =
        (formatExamTitle(a.tenDe || a.id).match(regex) || []).slice(1);

      const [subjectB, classB, extraB, letterB] =
        (formatExamTitle(b.tenDe || b.id).match(regex) || []).slice(1);

      if (!subjectA || !subjectB) return 0;

      const idxA = subjectOrder.indexOf(subjectA);
      const idxB = subjectOrder.indexOf(subjectB);
      if (idxA !== idxB) return idxA - idxB;

      const cA = parseInt(classA);
      const cB = parseInt(classB);
      if (cA !== cB) return cA - cB;

      const eA = extraOrder.indexOf(extraA || "") === -1 ? 99 : extraOrder.indexOf(extraA || "");
      const eB = extraOrder.indexOf(extraB || "") === -1 ? 99 : extraOrder.indexOf(extraB || "");
      if (eA !== eB) return eA - eB;

      return (letterA || "").localeCompare(letterB || "");
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f1f5f9",
        px: { xs: 1.5, sm: 3 },
        py: 3,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 900,
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
          background: "#fff",
        }}
      >

      {/* HEADER */}
      <Box sx={{ px: 3, py: 1, background: "#1976d2", color: "#fff" }}>
        <Typography sx={{ fontSize: 17, fontWeight: 700 }}>Quản lý đề kiểm tra</Typography>
      </Box>

      {/* FILTER */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid #e2e8f0" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>

          <FormControl size="small" sx={{ width: 180 }}>
            <InputLabel>Năm học</InputLabel>
            <Select
              value={selectedYear}
              label="Năm học"
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{
                bgcolor: "#fff", borderRadius: "5px",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dbe2ea" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1976d2", borderWidth: 2 },
              }}
            >
              {["2025-2026","2026-2027","2027-2028","2028-2029","2029-2030"].map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1.5}>
            <Box
              sx={{
                px: 2,
                py: 0.8,
                borderRadius: "999px",
                bgcolor: "#e3f2fd",
                color: "#1976d2",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {examList.length} đề trong ngân hàng đề
            </Box>

            <Box
              sx={{
                px: 2,
                py: 0.8,
                borderRadius: "999px",
                bgcolor: "#fef3c7",
                color: "#92400e",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {filteredSelectedExam.length} đề thi
            </Box>

            <Box
              sx={{
                px: 2,
                py: 0.8,
                borderRadius: "999px",
                bgcolor: "#dcfce7",
                color: "#166534",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {onTapList.length} đề ôn tập
            </Box>
          </Stack>

        </Stack>
      </Box>

      {/* CONTENT */}
      <Box sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>

          {/* LEFT */}
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1.5, color: "#1e293b" }}>
              Ngân hàng đề
            </Typography>

            <Box sx={{
              height: 620, overflowY: "auto", borderRadius: "5px",
              border: "1px solid #e2e8f0", bgcolor: "#f8fafc", p: 1.2,
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: 999 },
            }}>

              {examList.length === 0 ? (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  Chưa có đề
                </Box>
              ) : (
                <Stack spacing={1}>
                  {sortExamList(examList).map((ex) => {
                    const checked = selectedExamIds.includes(ex.id);

                    return (
                      <Box
                        key={ex.id}
                        onMouseEnter={() => setHoveredExamId(ex.id)}
                        onMouseLeave={() => setHoveredExamId(null)}
                        onClick={() => {
                          setSelectedExamIds(prev =>
                            prev.includes(ex.id) ? prev.filter(id => id !== ex.id) : [...prev, ex.id]
                          );
                          setSelectedExamsToCombine(prev => {
                            const has = prev.some(e => e.id === ex.id);
                            return has ? prev.filter(e => e.id !== ex.id) : [...prev, ex];
                          });
                        }}
                        sx={{
                          py: 0.7, px: 1.2, borderRadius: "5px", cursor: "pointer",
                          transition: ".18s",
                          border: checked ? "2px solid #1976d2" : "1px solid #e2e8f0",
                          bgcolor: checked ? "#f0f7ff" : "#fff",
                          "&:hover": { bgcolor: "#f8fbff", borderColor: "#90caf9" },
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>

                          <Checkbox
                            checked={checked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const willCheck = e.target.checked;

                              setSelectedExamIds(prev =>
                                willCheck ? [...prev, ex.id] : prev.filter(id => id !== ex.id)
                              );

                              setSelectedExamsToCombine(prev => {
                                const has = prev.some(item => item.id === ex.id);
                                if (willCheck) return has ? prev : [...prev, ex];
                                return prev.filter(item => item.id !== ex.id);
                              });
                            }}
                          />

                          <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 500, color: "#1e293b", lineHeight: 1.5 }}>
                            {formatExamTitle(ex.tenDe || ex.id)}
                          </Typography>

                          <Stack direction="row" spacing={1} alignItems="center"
                            sx={{ opacity: hoveredExamId === ex.id ? 1 : 0, transition: ".18s" }}
                          >
                            <IconButton size="small" color="error" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExamToDelete(ex);
                              setOpenDeleteDialog(true);
                            }} sx={{ bgcolor: "#fee2e2", "&:hover": { bgcolor: "#fecaca" } }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>

                            <IconButton size="small" color="primary" onClick={async (e) => {
                              e.stopPropagation();
                              setSelectedExam(prev => prev.some(i => i.id === ex.id) ? prev : [...prev, ex]);
                              await addExamToFirestore(ex);
                            }} sx={{ bgcolor: "#e3f2fd", "&:hover": { bgcolor: "#bbdefb" } }}>
                              <ChevronRight />
                            </IconButton>
                          </Stack>

                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}

            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color="success"
                onClick={handleCreateOnTap}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  py: 1.2,
                  textTransform: "none",
                  fontWeight: 700,
                  boxShadow: "none",
                }}
              >
                Tạo đề ôn tập
              </Button>
            </Stack>
          </Box>

          {/* RIGHT */}
          <Stack sx={{ flex: 1 }} spacing={3}>

            {/* ĐỀ THI */}
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 16,
                  mb: 1.5,
                  color: "#1e293b",
                }}
              >
                Đề thi học kì
              </Typography>

              <Box
                sx={{
                  maxHeight: 350,
                  minHeight: 70,
                  overflowY: "auto",
                  borderRadius: "5px",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#f8fafc",
                  p: 1.2,
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#cbd5e1",
                    borderRadius: 999,
                  },
                }}
              >
                {filteredSelectedExam.length === 0 ? (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    Chưa chọn đề
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {filteredSelectedExam.map((ex) => (
                      <Box
                        key={ex.id}
                        onMouseEnter={() => {
                          setPendingSelectedExam(ex);
                          setHoveredSelectedId(ex.id);
                        }}
                        onMouseLeave={() => {
                          setPendingSelectedExam(null);
                          setHoveredSelectedId(null);
                        }}
                        sx={{
                          p: 1.5,
                          borderRadius: "5px",
                          transition: ".18s",
                          border:
                            pendingSelectedExam?.id === ex.id
                              ? "2px solid #1976d2"
                              : "1px solid #e2e8f0",
                          bgcolor:
                            pendingSelectedExam?.id === ex.id
                              ? "#f0f7ff"
                              : "#fff",
                          "&:hover": {
                            bgcolor: "#f8fbff",
                            borderColor: "#90caf9",
                          },
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Typography
                            sx={{
                              flex: 1,
                              fontSize: 15,
                              fontWeight: 500,
                              color: "#1e293b",
                            }}
                          >
                            {formatExamTitle(ex.tenDe || ex.id)}
                          </Typography>

                          <Box
                            sx={{
                              opacity: hoveredSelectedId === ex.id ? 1 : 0,
                              transition: ".18s",
                            }}
                          >
                            <IconButton
                              size="small"
                              color="error"
                              onClick={async () => {
                                setSelectedExam((prev) =>
                                  prev.filter((e) => e.id !== ex.id)
                                );
                                await removeExamFromFirestore(ex);
                              }}
                              sx={{
                                bgcolor: "#fee2e2",
                                "&:hover": { bgcolor: "#fecaca" },
                              }}
                            >
                              <ChevronLeft />
                            </IconButton>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>

            {/* ÔN TẬP */}
            <Box>
              <Typography sx={{ fontSize: 16, mb: 1.5, color: "#1e293b", fontWeight: 700 }}>
                Đề ôn tập
              </Typography>

              <Box
                sx={{
                  maxHeight: 350,
                  minHeight: 70,
                  overflowY: "auto",
                  borderRadius: "5px",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#f8fafc",
                  p: 1.2,
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: 999 },
                }}
              >
                {onTapList.length === 0 ? (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Chưa có đề ôn tập
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {onTapList.map((ex) => (
                      <Box
                        key={ex.id}
                        onMouseEnter={() => setHoveredOnTapId(ex.id)}
                        onMouseLeave={() => setHoveredOnTapId(null)}
                        sx={{
                          p: 1.5,
                          borderRadius: "5px",
                          border: "1px solid #e2e8f0",
                          bgcolor: "#fff",
                          transition: ".18s",
                          "&:hover": { borderColor: "#90caf9", bgcolor: "#f8fbff" },
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 15, color: "#1e293b" }}>
                              {formatOnTapTitle(ex.id)}
                            </Typography>

                            <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.5 }}>
                              {ex.questions?.length || 0} câu hỏi
                            </Typography>
                          </Box>

                          <Box sx={{ opacity: hoveredOnTapId === ex.id ? 1 : 0, transition: ".18s" }}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteOnTap(ex)}
                              sx={{
                                bgcolor: "#fee2e2",
                                "&:hover": { bgcolor: "#fecaca" },
                              }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>

          </Stack>
        </Stack>
      </Box>

    </Card>

    {/* ===== SNACKBAR ===== */}

    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() =>
        setSnackbar((s) => ({
          ...s,
          open: false,
        }))
      }
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
    >
      <Alert
        severity={snackbar.severity}
        variant="filled"
        onClose={() =>
          setSnackbar((s) => ({
            ...s,
            open: false,
          }))
        }
        sx={{
          borderRadius: "12px",
          fontWeight: 600,
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>

    {/* ===== DELETE DIALOG ===== */}

    <DeleteExamDialog
      open={openDeleteDialog}
      onClose={() => {
        setOpenDeleteDialog(false);
        setSelectedExamToDelete(
          null
        );
        setOnTapToDelete(null);
      }}
      onConfirm={() => {
        if (onTapToDelete) {
          confirmDeleteOnTap();
        } else {
          confirmDeleteExam();
        }
      }}
    />

    <OverwriteConfirmDialog
      open={openOverwriteDialog}
      onClose={() => {
        setOpenOverwriteDialog(false);
        setPendingOnTapPayload(null);
      }}
      onConfirm={handleOverwriteOnTap}
    />
  </Box>
);
}
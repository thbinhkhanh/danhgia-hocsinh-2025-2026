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
import DeleteExamDialog from "../dialog/DeleteExamDialog";

export default function DeThi() {
  const account = localStorage.getItem("account") || "";

  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState([]);

  const [pendingSelectedExam, setPendingSelectedExam] = useState(null);

  const [selectedExamToDelete, setSelectedExamToDelete] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedExamsToCombine, setSelectedExamsToCombine] = useState([]); // các đề được chọn để kết hợp

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

  // Hàm sort đề thi sau khi format tên, theo regex
  const sortExamList = (list) => {
    return [...list].sort((a, b) => {
      const regex = /(Công nghệ|Tin học) (\d+)(?: - (CKI|CKII|CN))? ?\(?([A-Z])?\)?/i;

      const titleA = formatExamTitle(a.tenDe || a.id);
      const titleB = formatExamTitle(b.tenDe || b.id);

      const matchA = titleA.match(regex);
      const matchB = titleB.match(regex);

      if (!matchA || !matchB) return 0;

      const [_, subjectA, classA, extraA, letterA] = matchA;
      const [__, subjectB, classB, extraB, letterB] = matchB;

      // 1️⃣ Sắp môn: Công nghệ trước Tin học
      const subjectOrder = ["Công nghệ", "Tin học"];
      const indexA = subjectOrder.indexOf(subjectA);
      const indexB = subjectOrder.indexOf(subjectB);
      if (indexA !== indexB) return indexA - indexB;

      // 2️⃣ Sắp lớp
      if (parseInt(classA) !== parseInt(classB)) return parseInt(classA) - parseInt(classB);

      // 3️⃣ Sắp CKI < CKII < CN
      const extraOrder = ["CKI", "CKII", "CN"];
      const eA = extraOrder.indexOf(extraA || "") === -1 ? 99 : extraOrder.indexOf(extraA || "");
      const eB = extraOrder.indexOf(extraB || "") === -1 ? 99 : extraOrder.indexOf(extraB || "");
      if (eA !== eB) return eA - eB;

      // 4️⃣ Sắp chữ cái đề
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
        maxWidth: 850,
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
        background: "#fff",
      }}
    >
      {/* ===== HEADER ===== */}
      <Box
        sx={{
          px: 3,
          py: 1,
          background: "#1976d2",
          color: "#fff",
        }}
      >
        <Typography
          sx={{
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          Đề kiểm tra học kì
        </Typography>
      </Box>

      {/* ===== FILTER ===== */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <FormControl
            size="small"
            sx={{
              width: 180,
            }}
          >
            <InputLabel>Năm học</InputLabel>

            <Select
              value={selectedYear}
              label="Năm học"
              onChange={(e) =>
                setSelectedYear(
                  e.target.value
                )
              }
              sx={{
                bgcolor: "#fff",
                borderRadius: "5px",

                "& .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#dbe2ea",
                  },

                "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#1976d2",
                    borderWidth: 2,
                  },
              }}
            >
              {[
                "2025-2026",
                "2026-2027",
                "2027-2028",
                "2028-2029",
                "2029-2030",
              ].map((y) => (
                <MenuItem
                  key={y}
                  value={y}
                >
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack
            direction="row"
            spacing={1.5}
          >
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
              {examList.length} đề
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
              {filteredSelectedExam.length} đã chọn
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* ===== CONTENT ===== */}
      <Box
        sx={{
          p: 3,
        }}
      >
        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
          spacing={3}
        >
          {/* ===== LEFT ===== */}
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 16,
                mb: 1.5,
                color: "#1e293b",
              }}
            >
              Ngân hàng đề
            </Typography>

            <Box
              sx={{
                height: 520,
                overflowY: "auto",
                borderRadius: "5px",
                border:
                  "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
                p: 1.2,

                "&::-webkit-scrollbar":
                  {
                    width: 6,
                  },

                "&::-webkit-scrollbar-thumb":
                  {
                    background:
                      "#cbd5e1",
                    borderRadius: 999,
                  },
              }}
            >
              {examList.length === 0 ? (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    color: "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  Chưa có đề
                </Box>
              ) : (
                <Stack spacing={1}>
                  {sortExamList(
                    examList
                  ).map((ex) => {
                    const checked =
                      selectedExamIds.includes(
                        ex.id
                      );

                    return (
                      <Box
                        key={ex.id}
                        onClick={() => {
                          setSelectedExamIds(
                            (prev) =>
                              prev.includes(
                                ex.id
                              )
                                ? prev.filter(
                                    (
                                      id
                                    ) =>
                                      id !==
                                      ex.id
                                  )
                                : [
                                    ...prev,
                                    ex.id,
                                  ]
                          );

                          setSelectedExamsToCombine(
                            (
                              prev
                            ) => {
                              const has =
                                prev.some(
                                  (
                                    e
                                  ) =>
                                    e.id ===
                                    ex.id
                                );

                              return has
                                ? prev.filter(
                                    (
                                      e
                                    ) =>
                                      e.id !==
                                      ex.id
                                  )
                                : [
                                    ...prev,
                                    ex,
                                  ];
                            }
                          );
                        }}
                        sx={{
                          py: 0.7,
                          px: 1.2,
                          borderRadius:
                            "5px",

                          cursor:
                            "pointer",

                          transition:
                            ".18s",

                          border:
                            checked
                              ? "2px solid #1976d2"
                              : "1px solid #e2e8f0",

                          bgcolor:
                            checked
                              ? "#f0f7ff"
                              : "#fff",

                          "&:hover":
                            {
                              bgcolor:
                                "#f8fbff",

                              borderColor:
                                "#90caf9",
                            },
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.5}
                        >
                          <Checkbox
  checked={checked}
  onClick={(e) => e.stopPropagation()}
  onChange={(e) => {
    const willCheck = e.target.checked;

    setSelectedExamIds((prev) =>
      willCheck
        ? [...prev, ex.id]
        : prev.filter((id) => id !== ex.id)
    );

    setSelectedExamsToCombine((prev) => {
      const has = prev.some(
        (item) => item.id === ex.id
      );

      if (willCheck) {
        return has ? prev : [...prev, ex];
      }

      return prev.filter(
        (item) => item.id !== ex.id
      );
    });
  }}
/>

                          <Typography
                            sx={{
                              flex: 1,
                              fontSize: 15,
                              fontWeight: 500,
                              color:
                                "#1e293b",
                              lineHeight: 1.5,
                            }}
                          >
                            {formatExamTitle(
                              ex.tenDe ||
                                ex.id
                            )}
                          </Typography>

                          <IconButton
                            size="small"
                            color="primary"
                            onClick={async (
                              e
                            ) => {
                              e.stopPropagation();

                              setSelectedExam(
                                (
                                  prev
                                ) => {
                                  if (
                                    prev.some(
                                      (
                                        item
                                      ) =>
                                        item.id ===
                                        ex.id
                                    )
                                  )
                                    return prev;

                                  return [
                                    ...prev,
                                    ex,
                                  ];
                                }
                              );

                              await addExamToFirestore(
                                ex
                              );
                            }}
                            sx={{
                              bgcolor:
                                "#e3f2fd",

                              "&:hover":
                                {
                                  bgcolor:
                                    "#bbdefb",
                                },
                            }}
                          >
                            <ChevronRight />
                          </IconButton>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* ACTION */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ mt: 2 }}
            >
              <Button
                variant="contained"
                color="error"
                onClick={
                  handleDeleteExam
                }
                sx={{
                  borderRadius:
                    "12px",

                  px: 3,
                  py: 1.2,

                  textTransform:
                    "none",

                  fontWeight: 700,

                  boxShadow: "none",
                }}
              >
                Xóa đề
              </Button>
            </Stack>
          </Box>

          {/* ===== RIGHT ===== */}
          <Box sx={{ flex: 1 }}>
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
                height: 520,
                overflowY: "auto",
                borderRadius: "5px",
                border:
                  "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
                p: 1.2,

                "&::-webkit-scrollbar":
                  {
                    width: 6,
                  },

                "&::-webkit-scrollbar-thumb":
                  {
                    background:
                      "#cbd5e1",
                    borderRadius: 999,
                  },
              }}
            >
              {filteredSelectedExam.length ===
              0 ? (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    color: "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  Chưa chọn đề
                </Box>
              ) : (
                <Stack spacing={1}>
                  {filteredSelectedExam.map(
                    (ex) => (
                      <Box
                        key={ex.id}
                        onMouseEnter={() =>
                          setPendingSelectedExam(
                            ex
                          )
                        }
                        onMouseLeave={() =>
                          setPendingSelectedExam(
                            null
                          )
                        }
                        sx={{
                          p: 1.5,
                          borderRadius:
                            "5px",

                          transition:
                            ".18s",

                          border:
                            pendingSelectedExam?.id ===
                            ex.id
                              ? "2px solid #1976d2"
                              : "1px solid #e2e8f0",

                          bgcolor:
                            pendingSelectedExam?.id ===
                            ex.id
                              ? "#f0f7ff"
                              : "#fff",

                          "&:hover":
                            {
                              bgcolor:
                                "#f8fbff",

                              borderColor:
                                "#90caf9",
                            },
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.5}
                        >
                          <Typography
                            sx={{
                              flex: 1,
                              fontSize: 15,
                              fontWeight: 500,
                              color:
                                "#1e293b",
                              lineHeight: 1.5,
                            }}
                          >
                            {formatExamTitle(
                              ex.tenDe ||
                                ex.id
                            )}
                          </Typography>

                          <IconButton
                            size="small"
                            color="error"
                            onClick={async () => {
                              setSelectedExam(
                                (
                                  prev
                                ) =>
                                  prev.filter(
                                    (
                                      e
                                    ) =>
                                      e.id !==
                                      ex.id
                                  )
                              );

                              await removeExamFromFirestore(
                                ex
                              );
                            }}
                            sx={{
                              bgcolor:
                                "#fee2e2",

                              "&:hover":
                                {
                                  bgcolor:
                                    "#fecaca",
                                },
                            }}
                          >
                            <ChevronLeft />
                          </IconButton>
                        </Stack>
                      </Box>
                    )
                  )}
                </Stack>
              )}
            </Box>
          </Box>
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
      onClose={() =>
        setOpenDeleteDialog(false)
      }
      onConfirm={confirmDeleteExam}
    />
  </Box>
);
}

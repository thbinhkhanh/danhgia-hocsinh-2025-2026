import React, { useEffect, useState, useRef, useContext } from "react";

// ================= MUI CORE =================
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  TextField,
  MenuItem,
  Paper,
  Stack,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
} from "@mui/material";

import * as XLSX from "xlsx";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ================= MUI ICONS =================
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

// ================= CONTEXT =================
import { ConfigContext } from "../context/ConfigContext";

export default function QuanLyNhanXet({ open, onClose }) {
 // ================= TIME =================
const currentYear = new Date().getFullYear();

// ================= CONTEXT =================
const { config, setConfig } = useContext(ConfigContext);

// ================= CONFIG DERIVED =================
const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

// ================= STATE: FILTERS =================
const [namHoc, setNamHoc] = useState(
  `${currentYear}-${currentYear + 1}`
);

const [monHoc, setMonHoc] = useState("Tin học");
const [loaiKy, setLoaiKy] = useState("Giữa kỳ");

// ================= STATE: UI CONTROL =================
const [selectedLevel, setSelectedLevel] = useState("TỐT");
const [mode, setMode] = useState("lyThuyet");
const [tab, setTab] = useState(0); // 0 = Lý thuyết, 1 = Thực hành

  const [data, setData] = useState({
    TỐT: [],
    KHÁ: [],
    ĐẠT: [],
    "CHƯA ĐẠT": [],
  });

  const fileRef = useRef(null);

  const getDocId = () => {
    const mon = monHoc === "Tin học" ? "TinHoc" : "CongNghe";
    const ky = loaiKy === "Giữa kỳ" ? "GiuaKy" : "CuoiKy";
    return `${mon}_${ky}`;
  };

  const normalizeData = (raw) => {
    return {
      TỐT: raw?.tot?.thucHanh || [],
      KHÁ: raw?.kha?.thucHanh || [],
      ĐẠT: raw?.trungbinh?.thucHanh || [],
      "CHƯA ĐẠT": raw?.yeu?.thucHanh || [],
    };
  };

  const convertToFirestoreFormat = (data) => {
    const isTinHoc = monHoc === "Tin học";

    return isTinHoc
      ? {
          tinHoc: {
            giuaKy:
              loaiKy === "Giữa kỳ"
                ? {
                    tot: { thucHanh: data.TỐT || [] },
                    kha: { thucHanh: data.KHÁ || [] },
                    trungbinh: { thucHanh: data.ĐẠT || [] },
                    yeu: { thucHanh: data["CHƯA ĐẠT"] || [] },
                  }
                : {},
          },
        }
      : {
          congNghe: {
            giuaKy:
              loaiKy === "Giữa kỳ"
                ? {
                    tot: { thucHanh: data.TỐT || [] },
                    kha: { thucHanh: data.KHÁ || [] },
                    trungbinh: { thucHanh: data.ĐẠT || [] },
                    yeu: { thucHanh: data["CHƯA ĐẠT"] || [] },
                  }
                : {},
          },
        };
  };

  const loadData = async () => {
    try {
      const col = `NHAN_XET_${namHocKey}`;
      const docId = getDocId(); 
      // => TinHoc_GiuaKy hoặc CongNghe_GiuaKy

      const snap = await getDoc(doc(db, col, docId));

      if (!snap.exists()) {
        setData({
          TỐT: { lyThuyet: [], thucHanh: [] },
          KHÁ: { lyThuyet: [], thucHanh: [] },
          ĐẠT: { lyThuyet: [], thucHanh: [] },
          "CHƯA ĐẠT": { lyThuyet: [], thucHanh: [] },
        });
        return;
      }

      const raw = snap.data();

      const safe = (v) => Array.isArray(v) ? v : [];

      const normalized = {
        TỐT: {
          lyThuyet: safe(raw?.tot?.lyThuyet),
          thucHanh: safe(raw?.tot?.thucHanh),
        },
        KHÁ: {
          lyThuyet: safe(raw?.kha?.lyThuyet),
          thucHanh: safe(raw?.kha?.thucHanh),
        },
        ĐẠT: {
          lyThuyet: safe(raw?.trungbinh?.lyThuyet),
          thucHanh: safe(raw?.trungbinh?.thucHanh),
        },
        "CHƯA ĐẠT": {
          lyThuyet: safe(raw?.yeu?.lyThuyet),
          thucHanh: safe(raw?.yeu?.thucHanh),
        },
      };

      setData(normalized);

    } catch (err) {
      console.error("loadData error:", err);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open, namHoc, monHoc, loaiKy]);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = (level, field) => {
    setData((prev) => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: prev[level][field].map((i) =>
          i.id === editingId ? { ...i, text: editText } : i
        ),
      },
    }));

    setEditingId(null);  // 👈 chỉ thoát edit
    setEditText("");
  };

  const deleteItem = (level, field, id) => {
    setData((prev) => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: Array.isArray(prev?.[level]?.[field])
          ? prev[level][field].filter((i) => i.id !== id)
          : [],
      },
    }));
  };

  const addItem = (level) => {
    setData({
      ...data,
      [level]: [
        ...(data[level] || []),
        { id: Date.now(), text: "Nhận xét mới" },
      ],
    });
  };

  // =========================
  // ✅ FIX IMPORT EXCEL
  // =========================
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    const norm = (s) =>
      s?.toString().normalize("NFC").replace(/\s+/g, " ").trim();

    reader.onload = (ev) => {
      try {
        const workbook = XLSX.read(ev.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        const newData = {
          TỐT: { lyThuyet: [], thucHanh: [] },
          KHÁ: { lyThuyet: [], thucHanh: [] },
          ĐẠT: { lyThuyet: [], thucHanh: [] },
          "CHƯA ĐẠT": { lyThuyet: [], thucHanh: [] },
        };

        json.forEach((row) => {
          const mon = norm(row["Môn"]);
          const ky = norm(row["Học kỳ"]);
          const loai = norm(row["Loại"])?.toLowerCase();
          const level = norm(row["Mức độ"])?.toUpperCase();
          const text = norm(row["Nội dung"]);

          if (!mon || !ky || !loai || !level || !text) return;

          // chỉ lấy đúng view đang chọn
          if (mon !== monHoc || ky !== loaiKy) return;

          const item = {
            id: crypto.randomUUID(),
            text,
          };

          const isLyThuyet = loai.includes("lý");

          const target = isLyThuyet ? "lyThuyet" : "thucHanh";

          if (level === "TỐT") newData.TỐT[target].push(item);
          else if (level === "KHÁ") newData.KHÁ[target].push(item);
          else if (level === "ĐẠT") newData.ĐẠT[target].push(item);
          else newData["CHƯA ĐẠT"][target].push(item);
        });

        setData(newData);

        e.target.value = "";
      } catch (err) {
        console.error(err);
        alert("File Excel sai định dạng");
      }
    };

    reader.readAsBinaryString(file);
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const saveFirestore = async () => {
    const col = `NHAN_XET_${namHocKey}`;
    const docId = getDocId();

    const payload = {
      tot: {
        lyThuyet: data.TỐT?.lyThuyet || [],
        thucHanh: data.TỐT?.thucHanh || [],
      },
      kha: {
        lyThuyet: data.KHÁ?.lyThuyet || [],
        thucHanh: data.KHÁ?.thucHanh || [],
      },
      trungbinh: {
        lyThuyet: data.ĐẠT?.lyThuyet || [],
        thucHanh: data.ĐẠT?.thucHanh || [],
      },
      yeu: {
        lyThuyet: data["CHƯA ĐẠT"]?.lyThuyet || [],
        thucHanh: data["CHƯA ĐẠT"]?.thucHanh || [],
      },
    };

    // ⚡ BÁO THÀNH CÔNG NGAY KHI BẤM
    setSnackbar({
      open: true,
      message: "Lưu dữ liệu thành công!",
      severity: "success",
    });

    try {
      await setDoc(doc(db, col, docId), payload);
    } catch (err) {
      console.error("❌ saveFirestore error:", err);

      setSnackbar({
        open: true,
        message: "Lỗi khi lưu dữ liệu!",
        severity: "error",
      });
    }
  };

  const currentList = data[selectedLevel]?.[mode] || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={{ xs: true, sm: false }}
      sx={{
        "& .MuiDialog-container": {
          padding: 0,
        },
      }}
      PaperProps={{
        sx: {
          width: { xs: "100vw", sm: "700px" },
          maxWidth: "98%",
          height: { xs: "98vh", sm: "85vh" },
          margin: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: { xs: 0, sm: 3 },
        },
      }}
    >
    {/* HEADER */}
    <Box
      sx={{
        px: 3,
        pr: 1.5,
        py: 1.4,
        background: "#1976d2",
        color: "#fff",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
          QUẢN LÍ NHẬN XÉT
        </Typography>

        <IconButton
          onClick={onClose}
          sx={{
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.25)",
            "&:hover": {
              bgcolor: "#fff",
              color: "#ef4444",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Stack>
    </Box>

    {/* CONTENT */}
    <DialogContent sx={{ flex: 1, overflowY: "auto" }}>
      {/* FILTER */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">

          <Box sx={{ flex: 1 }}>
            <TextField
              select
              size="small"
              value={monHoc}
              onChange={(e) => setMonHoc(e.target.value)}
              fullWidth
            >
              <MenuItem value="Tin học">Tin học</MenuItem>
              <MenuItem value="Công nghệ">Công nghệ</MenuItem>
            </TextField>
          </Box>

          <Box sx={{ flex: 1 }}>
            <TextField
              select
              size="small"
              value={loaiKy}
              onChange={(e) => setLoaiKy(e.target.value)}
              fullWidth
            >
              <MenuItem value="Giữa kỳ">Giữa kỳ</MenuItem>
              <MenuItem value="Cuối kỳ">Cuối kỳ</MenuItem>
            </TextField>
          </Box>

          <Box sx={{ flex: 1 }}>
            <TextField
              select
              size="small"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              fullWidth
            >
              <MenuItem value="TỐT">Tốt</MenuItem>
              <MenuItem value="KHÁ">Khá</MenuItem>
              <MenuItem value="ĐẠT">Đạt</MenuItem>
              <MenuItem value="CHƯA ĐẠT">Chưa đạt</MenuItem>
            </TextField>
          </Box>

          {/* ✅ RESTORE UPLOAD EXCEL */}
          <input
            hidden
            ref={fileRef}
            type="file"
            accept=".xlsx"
            onChange={handleImport}
          />

          <Button
            startIcon={<CloudUploadIcon />}
            onClick={() => fileRef.current?.click()}
            sx={{
              whiteSpace: "nowrap",
              minWidth: { xs: 40, sm: "auto" },
            }}
          >
            <Box
              component="span"
              sx={{
                display: { xs: "none", sm: "inline" },
              }}
            >
              Upload Excel
            </Box>
          </Button>

        </Stack>
      </Paper>

      {/* TABLE */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            TabIndicatorProps={{
              style: {
                height: 3,
                borderRadius: 3,
                backgroundColor: "#1976d2",
              },
            }}
            sx={{
              minHeight: 40,
              "& .MuiTabs-flexContainer": {
                gap: 2,
              },
            }}
          >
            <Tab
              label="LÍ THUYẾT"
              disableRipple
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 14,
                minHeight: 40,
                borderRadius: "8px",
                px: 2,
                color: "#64748b",
                transition: "0.2s",

                // 👇 highlight nền khi active
                "&.Mui-selected": {
                  color: "#1976d2",
                  fontWeight: 700,
                  backgroundColor: "rgba(25, 118, 210, 0.08)",
                },

                // 👇 hover nhẹ
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.05)",
                  color: "#1976d2",
                },
              }}
            />

            <Tab
              label="THỰC HÀNH"
              disableRipple
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 14,
                minHeight: 40,
                borderRadius: "8px",
                px: 2,
                color: "#64748b",
                transition: "0.2s",

                "&.Mui-selected": {
                  color: "#1976d2",
                  fontWeight: 700,
                  backgroundColor: "rgba(25, 118, 210, 0.08)",
                },

                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.05)",
                  color: "#1976d2",
                },
              }}
            />
          </Tabs>
        </Box>

        <TableContainer>
          <Table
            size="medium"
            sx={{
              "& td": {
                borderColor: "#eee",
                fontSize: 16,
              },
            }}
          >
            <TableBody>
              {(() => {
                const current = data[selectedLevel] || {};
                const list =
                  tab === 0 ? current.lyThuyet || [] : current.thucHanh || [];

                return list.map((item) => {
                  const isEditing = editingId === item.id;

                  return (
                    <TableRow
                      key={item.id}
                      hover
                      onClick={() => {
                        setEditingId(item.id);
                        setEditText(item.text || "");
                      }}
                      sx={{
                        height: 44,
                        cursor: "pointer",
                        verticalAlign: "middle",
                      }}
                    >
                      {/* TEXT */}
                      <TableCell
                        sx={{
                          py: 0.4,

                          // 👇 GIẢM PADDING TRÁI / PHẢI
                          pl: { xs: 1, sm: 1.5 },
                          pr: 0.5, // 👈 quan trọng: giảm khoảng cách với icon

                          verticalAlign: "middle",
                        }}
                      >
                        {isEditing ? (
                          <input
                            value={editText}
                            autoFocus
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveEdit(
                                  selectedLevel,
                                  tab === 0 ? "lyThuyet" : "thucHanh"
                                );
                                setEditingId(null);
                              }

                              if (e.key === "Escape") {
                                setEditingId(null);
                              }
                            }}
                            onBlur={() => {
                              saveEdit(
                                selectedLevel,
                                tab === 0 ? "lyThuyet" : "thucHanh"
                              );
                              setEditingId(null);
                            }}
                            style={{
                              width: "100%",
                              fontSize: "16px",
                              lineHeight: "1.5",
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              padding: 0,
                              wordBreak: "break-word",
                            }}
                          />
                        ) : (
                          <Typography
                            sx={{
                              fontSize: 16,
                              lineHeight: 1.5,
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                            }}
                          >
                            {item.text}
                          </Typography>
                        )}
                      </TableCell>

                      {/* DELETE */}
                      <TableCell
                        align="right"
                        sx={{
                          py: 0.4,

                          // 👇 GIẢM PADDING ICON CELL
                          pl: 0,
                          pr: 0.5, // sát mép phải hơn

                          whiteSpace: "nowrap",
                          width: 40, // 👈 cố định để không bị giãn
                        }}
                      >
                        <IconButton
                          size="small"
                          sx={{
                            opacity: 0,
                            color: "#ef4444",
                            transition: "0.2s",

                            // hover row mới hiện
                            ".MuiTableRow-root:hover &": {
                              opacity: 1,
                            },

                            // 👇 GIẢM CLICK AREA + padding
                            padding: 0.3,

                            "&:hover": {
                              backgroundColor: "rgba(239, 68, 68, 0.08)",
                            },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(
                              selectedLevel,
                              tab === 0 ? "lyThuyet" : "thucHanh",
                              item.id
                            );
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ADD BUTTON */}
        <Box sx={{ p: 1 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              const newItem = {
                id: crypto.randomUUID(),
                text: "",
              };

              setData((prev) => {
                const arr =
                  prev[selectedLevel]?.[
                    tab === 0 ? "lyThuyet" : "thucHanh"
                  ] || [];

                return {
                  ...prev,
                  [selectedLevel]: {
                    ...prev[selectedLevel],
                    [tab === 0 ? "lyThuyet" : "thucHanh"]: [
                      ...arr,
                      newItem,
                    ],
                  },
                };
              });

              setTimeout(() => {
                setEditingId(newItem.id);
                setEditText("");
              }, 0);
            }}
          >
            Thêm nhận xét
          </Button>
        </Box>
      </Paper>
    </DialogContent>

    {/* FOOTER */}
    <Box
      sx={{
        px: 3,
        py: 2,
        borderTop: "1px solid #e2e8f0",
        bgcolor: "#fff",
      }}
    >
      <Stack direction="row" spacing={1.5} justifyContent="flex-end">

        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            minWidth: 110,
            height: 42,
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 600,
            borderColor: "#cbd5e1",
            color: "#475569",
            background: "#fff",
            "&:hover": {
              borderColor: "#94a3b8",
              background: "#f1f5f9",
            },
          }}
        >
          Đóng
        </Button>

        <Button
          onClick={saveFirestore}
          variant="contained"
          sx={{
            minWidth: 110,
            height: 42,
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 700,

            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            boxShadow: "0 10px 20px rgba(59,130,246,0.25)",

            "&:hover": {
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 12px 24px rgba(37,99,235,0.35)",
            },
          }}
        >
          Lưu
        </Button>

      </Stack>
    </Box>

    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() =>
        setSnackbar((prev) => ({ ...prev, open: false }))
      }
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={() =>
          setSnackbar((prev) => ({ ...prev, open: false }))
        }
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>

  </Dialog>
  
);
}
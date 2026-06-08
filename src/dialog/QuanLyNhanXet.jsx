import React, { useEffect, useState, useRef, useContext } from "react";
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
} from "@mui/material";


import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { ConfigContext } from "../context/ConfigContext";


import * as XLSX from "xlsx";

import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function QuanLyNhanXet({ open, onClose }) {
  const currentYear = new Date().getFullYear();

  const [namHoc, setNamHoc] = useState(
    `${currentYear}-${currentYear + 1}`
  );
  const [monHoc, setMonHoc] = useState("Tin học");
  const [loaiKy, setLoaiKy] = useState("Giữa kỳ");

  const [selectedLevel, setSelectedLevel] = useState("TỐT");
  const [mode, setMode] = useState("lyThuyet");

  const { config, setConfig } = useContext(ConfigContext);

  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");
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

      console.log("IMPORT DONE:", newData);

      setData(newData);

      e.target.value = "";
    } catch (err) {
      console.error(err);
      alert("File Excel sai định dạng");
    }
  };

  reader.readAsBinaryString(file);
};

  const saveFirestore = async () => {
  try {
    const col = `NHAN_XET_${namHocKey}`;
    const docId = getDocId();

    console.log("💾 [saveFirestore] collection:", col);
    console.log("💾 [saveFirestore] docId:", docId);
    console.log("💾 [saveFirestore] data:", data);

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

    await setDoc(doc(db, col, docId), payload);

    console.log("✅ Save success");
    alert("Đã lưu dữ liệu");
  } catch (err) {
    console.error("❌ saveFirestore error:", err);
  }
};

  const currentList = data[selectedLevel]?.[mode] || [];

  return (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="md"
    PaperProps={{
      sx: {
        width: "700px",
        height: "85vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
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
          <Table size="small" sx={{ "& td": { borderColor: "#eee" } }}>
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
                        height: 36,
                        cursor: "pointer",
                        verticalAlign: "middle",
                      }}
                    >
                      {/* TEXT */}
                      <TableCell sx={{ py: 0.3 }}>
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
                              fontSize: "14px",
                              border: "none",
                              outline: "none",
                              background: "transparent",
                            }}
                          />
                        ) : (
                          <Typography fontSize={14} lineHeight={1.3}>
                            {item.text}
                          </Typography>
                        )}
                      </TableCell>

                      {/* DELETE */}
                      <TableCell
                        align="right"
                        sx={{ py: 0.3, whiteSpace: "nowrap" }}
                      >
                        <IconButton
                          size="small"
                          sx={{
                            opacity: 0,
                            color: "#ef4444",
                            transition: "0.2s",
                            ".MuiTableRow-root:hover &": {
                              opacity: 1,
                            },
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
          sx={{
            textTransform: "none",
          }}
        >
          Đóng
        </Button>

        <Button
          variant="contained"
          onClick={saveFirestore}
          sx={{
            textTransform: "none",
            borderRadius: "12px",
            fontWeight: 700,
            boxShadow: "none",
            px: 2.5,
            py: 1,
            "&:hover": {
              boxShadow: "none",
            },
          }}
        >
          Lưu
        </Button>

      </Stack>
    </Box>
  </Dialog>
);
}
import React, { useEffect, useState, useRef } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Tabs,
  Tab,
  Button,
  IconButton,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import {
  Plus,
  Save,
  Trash2,
  X,
  RefreshCw
} from "lucide-react";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

const COLLECTION_NAME = "INDANHGIA_2026-2027";
const CACHE_KEY = "indanhgia_2026_2027_cache_v1";
const CACHE_VERSION = 1;

const CONFIG = {
  PhanCongVGBM: {
    label: "Phân công GVBM",
    fields: [
      { key: "lop", label: "Lớp" },
      { key: "monHoc", label: "Môn học" },
      { key: "giaoVienBoMon", label: "Giáo viên bộ môn" }
    ]
  },
  GVBM: {
    label: "Danh sách GVBM",
    fields: [
      { key: "giaoVien", label: "Giáo viên" },
      { key: "monHoc", label: "Môn học" }
    ]
  },
  GVCN: {
    label: "Danh sách GVCN",
    fields: [
      { key: "giaoVienChuNhiem", label: "Giáo viên chủ nhiệm" },
      { key: "lop", label: "Lớp" }
    ]
  }
};

const EMPTY_DATA = {
  PhanCongVGBM: [],
  GVBM: [],
  GVCN: []
};

export default function CapNhatPhanCongDialog({
  open,
  onClose,
  db
}) {
  const [activeTab, setActiveTab] = useState("PhanCongVGBM");
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const tableContainerRef = useRef(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  // Đọc dữ liệu từ Firestore
  
  // ================= CACHE LOCAL STORAGE =================

  const saveCache = (nextData) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          version: CACHE_VERSION,
          data: nextData,
          updatedAt: new Date().toISOString()
        })
      );
    } catch (err) {
      console.warn("Không thể lưu cache:", err);
    }
  };

  const getCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);

      if (!cached) return null;

      const parsed = JSON.parse(cached);

      if (
        parsed.version !== CACHE_VERSION ||
        !parsed.data ||
        !Object.keys(CONFIG).every(
          key => Array.isArray(parsed.data[key])
        )
      ) {
        return null;
      }

      return parsed.data;
    } catch (err) {
      console.warn("Cache không hợp lệ:", err);
      return null;
    }
  };

  // ================= ÁP DỤNG DỮ LIỆU =================

  const applyLoadedData = (nextData) => {
    setData(nextData);

    const classes = [
      ...new Set(
        (nextData.GVCN || [])
          .map(item => String(item.lop || "").trim())
          .filter(Boolean)
      )
    ].sort((a, b) =>
      a.localeCompare(b, "vi", { numeric: true })
    );

    setSelectedClass(prev =>
      classes.includes(prev) ? prev : classes[0] || ""
    );
  };

  // ================= ĐỌC DỮ LIỆU =================

  const loadData = async (forceRefresh = false) => {
    if (!db) return;

    setError("");

    // 1. ƯU TIÊN CACHE
    if (!forceRefresh) {
      const cachedData = getCache();

      if (cachedData) {
        applyLoadedData(cachedData);
        setLoading(false);
        return;
      }
    }

    // 2. KHÔNG CÓ CACHE HOẶC YÊU CẦU TẢI LẠI
    setLoading(true);

    try {
      const keys = Object.keys(CONFIG);

      const results = await Promise.all(
        keys.map(async (key) => {
          const snapshot = await getDoc(
            doc(db, COLLECTION_NAME, key)
          );

          return [
            key,
            snapshot.exists() &&
            Array.isArray(snapshot.data().data)
              ? snapshot.data().data
              : []
          ];
        })
      );

      const nextData = Object.fromEntries(results);

      // 3. CẬP NHẬT STATE
      applyLoadedData(nextData);

      // 4. LƯU CACHE
      saveCache(nextData);

    } catch (err) {
      console.error("Lỗi đọc dữ liệu phân công:", err);

      setError(
        "Không thể tải dữ liệu phân công từ Firestore."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (open) {
      setActiveTab("PhanCongVGBM");
      loadData();
    }
  }, [open, db]);

  // Thay đổi dữ liệu một ô
  const handleChange = (index, field, value) => {
    setData((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  // Thêm dòng và tự động cuộn đến dòng mới
    const handleAdd = () => {
    const newRow = {};

    CONFIG[activeTab].fields.forEach(({ key }) => {
        newRow[key] = "";
    });

    // Tab Phân công GVBM:
    // Dòng mới tự động thuộc lớp đang chọn
    if (activeTab === "PhanCongVGBM") {
        if (!selectedClass) {
        setSnackbar({
            open: true,
            severity: "warning",
            message: "Vui lòng chọn lớp trước khi thêm phân công."
        });
        return;
        }

        newRow.lop = selectedClass;
    }

    setData(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], newRow]
    }));

    // Cuộn xuống cuối bảng sau khi React cập nhật giao diện
    requestAnimationFrame(() => {
        const container = tableContainerRef.current;

        if (container) {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });
        }
    });
    };

  // Xóa dòng
  const handleDelete = (index) => {
    setData((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(
        (_, i) => i !== index
      )
    }));
  };

  // Lưu tab đang mở
  const handleSave = async () => {
    if (!db) return;

    const fields = CONFIG[activeTab].fields;
    const currentData = data[activeTab];

    // Loại bỏ dòng trống hoàn toàn
    const filteredData = currentData.filter((item) =>
        fields.some(({ key }) => String(item[key] ?? "").trim())
    );

    // Kiểm tra dòng nhập chưa đủ thông tin
    const invalidIndex = filteredData.findIndex((item) =>
        fields.some(({ key }) => !String(item[key] ?? "").trim())
    );

    if (invalidIndex !== -1) {
        setSnackbar({
        open: true,
        severity: "warning",
        message: `Vui lòng nhập đầy đủ thông tin tại dòng ${invalidIndex + 1}.`
        });
        return;
    }

    setSaving(true);

    try {
        // Lưu dữ liệu lên Firestore
        await setDoc(
        doc(db, COLLECTION_NAME, activeTab),
        {
            data: filteredData,
            updatedAt: new Date().toISOString()
        }
        );

        // Cập nhật state và cache
        const nextData = {
        ...data,
        [activeTab]: filteredData
        };

        setData(nextData);
        saveCache(nextData);

        setSnackbar({
        open: true,
        severity: "success",
        message: `Đã cập nhật ${CONFIG[activeTab].label}: ${filteredData.length} dòng.`
        });

    } catch (err) {
        console.error("Lỗi lưu phân công:", err);

        setSnackbar({
        open: true,
        severity: "error",
        message: err.message || "Không thể lưu dữ liệu."
        });

    } finally {
        setSaving(false);
    }
    };

  const currentConfig = CONFIG[activeTab];

    // Danh sách lớp lấy từ GVCN
    const classOptions = [
    ...new Set(
        (data.GVCN || [])
        .map(item => String(item.lop || "").trim())
        .filter(Boolean)
    )
    ].sort((a, b) =>
    a.localeCompare(b, "vi", { numeric: true })
    );

    // Danh sách môn học lấy từ document GVBM
    const subjectOptions = [
    ...new Set(
        (data.GVBM || [])
        .map(item => String(item.monHoc || "").trim())
        .filter(Boolean)
    )
    ].sort((a, b) => a.localeCompare(b, "vi"));

    // Danh sách giáo viên bộ môn lấy từ document GVBM
    const teacherOptions = [
    ...new Set(
        (data.GVBM || [])
        .map(item => String(item.giaoVien || "").trim())
        .filter(Boolean)
    )
    ].sort((a, b) => a.localeCompare(b, "vi"));

    // Tab 0 chỉ hiển thị các dòng thuộc lớp đang chọn
    const currentRows = activeTab === "PhanCongVGBM"
    ? (data.PhanCongVGBM || [])
        .map((item, index) => ({ item, index }))
        .filter(({ item }) =>
            item.lop === selectedClass
        )
    : (data[activeTab] || [])
        .map((item, index) => ({ item, index }));

const getTeacherOptionsBySubject = (monHoc) => {
  if (!monHoc) return [];

  return [
    ...new Set(
      (data.GVBM || [])
        .filter(
          (item) =>
            String(item.monHoc || "").trim() ===
            String(monHoc).trim()
        )
        .map((item) => String(item.giaoVien || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "vi"));
};




return (
  <>
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: 650,
          maxWidth: "calc(100% - 32px)",
          borderRadius: "18px",
          overflow: "hidden",
          background: "#f8fafc",
        },
      }}
    >
      {/* ===== HEADER ===== */}
      <Box
        sx={{
          px: 3,
          py: 1.8,
          background: "linear-gradient(135deg, #1976d2, #42a5f5)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EditIcon fontSize="small" />
          </Box>

          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
            Cập nhật dữ liệu phân công
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Tải lại dữ liệu">
            <span>
              <IconButton
                onClick={() => loadData(true)}
                disabled={loading || saving}
                sx={{
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.15)",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.25)",
                  },
                }}
              >
                <RefreshCw size={20} />
              </IconButton>
            </span>
          </Tooltip>

          <IconButton
            onClick={onClose}
            disabled={saving}
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.25)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* ===== CONTENT ===== */}
      <DialogContent
        sx={{
          px: 3,
          py: 2.5,
          background: "#f8fafc",
          overflowX: "hidden",
        }}
      >
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: "12px", fontSize: 16 }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              minHeight: 250,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <CircularProgress size={26} />
            <Typography sx={{ fontSize: 16, color: "#475569" }}>
              Đang tải dữ liệu...
            </Typography>
          </Box>
        ) : (
          <>
            {/* ===== TABS ===== */}
            <Box
              sx={{
                bgcolor: "#fff",
                borderRadius: "12px",
                p: 0.5,
                mb: 2,
                border: "1px solid #e2e8f0",
                width: "100%",
                minWidth: 0,
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                variant="fullWidth"
                sx={{
                  minHeight: 44,
                  "& .MuiTab-root": {
                    minHeight: 44,
                    minWidth: 0,
                    px: 0.5,
                    fontSize: 16,
                    fontWeight: 600,
                    textTransform: "none",
                    color: "#64748b",
                    whiteSpace: "nowrap",
                  },
                  "& .Mui-selected": {
                    color: "#1976d2",
                  },
                  "& .MuiTabs-indicator": {
                    height: 3,
                    borderRadius: 3,
                  },
                }}
              >
                <Tab value="PhanCongVGBM" label="Phân công GVBM" />
                <Tab value="GVBM" label="Danh sách GVBM" />
                <Tab value="GVCN" label="Danh sách GVCN" />
              </Tabs>
            </Box>

            {/* ===== TOOLBAR ===== */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1.5,
                    flexWrap: "wrap",
                    width: "100%",
                    minWidth: 0,
                }}
                >
                <Box
                    sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                    minWidth: 0,
                    }}
                >
                    {activeTab === "PhanCongVGBM" && (
                    <>
                        <FormControl
                        size="small"
                        sx={{
                            minWidth: 125,
                            "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                            bgcolor: "#fff",
                            fontSize: 16,
                            },
                            "& .MuiInputLabel-root": {
                            fontSize: 16,
                            },
                        }}
                        >
                        <InputLabel>Chọn lớp</InputLabel>

                        <Select
                            value={selectedClass}
                            label="Chọn lớp"
                            onChange={(event) =>
                            setSelectedClass(event.target.value)
                            }
                        >
                            {classOptions.map((lop) => (
                            <MenuItem key={lop} value={lop} sx={{ fontSize: 16 }}>
                                {lop}
                            </MenuItem>
                            ))}
                        </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            label="Giáo viên chủ nhiệm"
                            value={
                                (
                                data.GVCN?.find(
                                    (row) =>
                                    String(row.lop || "").trim() ===
                                    String(selectedClass || "").trim()
                                )?.giaoVienChuNhiem || ""
                                ).toLocaleUpperCase("vi-VN")
                            }
                            placeholder="Chưa có GVCN"
                            InputProps={{ readOnly: true }}
                            sx={{
                                width: 230,
                                "& .MuiOutlinedInput-root": {
                                borderRadius: "10px",
                                bgcolor: "#fff",
                                fontSize: 16,
                                },
                                "& .MuiInputLabel-root": {
                                fontSize: 16,
                                },
                            }}
                         />
                    </>
                    )}

                    {activeTab !== "PhanCongVGBM" && (
                    <Typography
                        sx={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#334155",
                        }}
                    >
                        {currentConfig.label}
                        <Box
                        component="span"
                        sx={{
                            ml: 0.7,
                            color: "#64748b",
                            fontWeight: 500,
                        }}
                        >
                        ({currentRows.length} giáo viên)
                        </Box>
                    </Typography>
                    )}
                </Box>
              </Box>

            {/* ===== DATA TABLE ===== */}
            <TableContainer
              ref={tableContainerRef}
              component={Paper}
              elevation={0}
              sx={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                overflowX: "hidden",
                overflowY: "auto",
                maxHeight: 420,
                bgcolor: "#fff",
              }}
            >
              <Table
                stickyHeader
                size="small"
                sx={{
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  tableLayout: "fixed",
                  borderCollapse: "collapse",
                }}
              >
                <colgroup>
                  <col style={{ width: "48px" }} />
                  {currentConfig.fields
                    .filter(
                      (field) =>
                        !(
                          activeTab === "PhanCongVGBM" &&
                          field.key === "lop"
                        )
                    )
                    .map((field) => {
                      const visibleFields = currentConfig.fields.filter(
                        (f) =>
                          !(
                            activeTab === "PhanCongVGBM" &&
                            f.key === "lop"
                          )
                      );

                      const count = visibleFields.length;
                      let width = `${(100 / count)}%`;

                      if (activeTab === "PhanCongVGBM") {
                        width = field.key === "monHoc" ? "35%" : "65%";
                        } else if (activeTab === "GVBM") {
                        width = field.key === "giaoVien" ? "65%" : "35%";
                      }

                      if (
                        activeTab === "GVCN" &&
                        field.key === "giaoVienChuNhiem"
                      ) {
                        width = "65%";
                      } else if (
                        activeTab === "GVCN"
                      ) {
                        width = "35%";
                      }

                      return <col key={field.key} style={{ width }} />;
                    })}
                  <col style={{ width: "48px" }} />
                </colgroup>

                <TableHead>
                  <TableRow>
                    <TableCell
                      align="center"
                      sx={{
                        width: 48,
                        minWidth: 48,
                        maxWidth: 48,
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#334155",
                        bgcolor: "#eff6ff",
                        py: 1.5,
                        px: 0.5,
                      }}
                    >
                      STT
                    </TableCell>

                    {currentConfig.fields
                      .filter(
                        (field) =>
                          !(
                            activeTab === "PhanCongVGBM" &&
                            field.key === "lop"
                          )
                      )
                      .map((field) => (
                        <TableCell
                          key={field.key}
                          sx={{
                            minWidth: 0,
                            maxWidth: 0,
                            fontWeight: 700,
                            fontSize: 16,
                            color: "#334155",
                            bgcolor: "#eff6ff",
                            py: 1.5,
                            px: 0.75,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {field.label}
                        </TableCell>
                      ))}

                    <TableCell
                      align="center"
                      sx={{
                        width: 48,
                        minWidth: 48,
                        maxWidth: 48,
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#334155",
                        bgcolor: "#eff6ff",
                        py: 1.5,
                        px: 0.5,
                      }}
                    >
                      Xóa
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {currentRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          currentConfig.fields.filter(
                            (field) =>
                              !(
                                activeTab === "PhanCongVGBM" &&
                                field.key === "lop"
                              )
                          ).length + 2
                        }
                        align="center"
                        sx={{
                          py: 5,
                          color: "#94a3b8",
                          fontSize: 16,
                        }}
                      >
                        {activeTab === "PhanCongVGBM" && !selectedClass
                          ? "Vui lòng chọn lớp."
                          : "Chưa có dữ liệu. Nhấn nút thêm dòng để nhập."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentRows.map(({ item, index }, displayIndex) => (
                      <TableRow
                        key={index}
                        hover
                        sx={{
                          "&:hover": {
                            bgcolor: "#f8fafc",
                          },
                          "&:last-child td": {
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell
                          align="center"
                          sx={{
                            width: 48,
                            minWidth: 48,
                            maxWidth: 48,
                            fontSize: 16,
                            color: "#64748b",
                            py: 1.3,
                            px: 0.5,
                          }}
                        >
                          {displayIndex + 1}
                        </TableCell>

                        {currentConfig.fields
                          .filter(
                            (field) =>
                              !(
                                activeTab === "PhanCongVGBM" &&
                                field.key === "lop"
                              )
                          )
                          .map((field) => (
                            <TableCell
                              key={field.key}
                              sx={{
                                py: 1.2,
                                px: 0.75,
                                minWidth: 0,
                                maxWidth: 0,
                                overflow: "hidden",
                              }}
                            >
                              <Box sx={{ width: "100%", minWidth: 0 }}>
                                {activeTab === "PhanCongVGBM" &&
                                field.key === "monHoc" ? (
                                  <FormControl
                                    fullWidth
                                    size="small"
                                    sx={{
                                      minWidth: 0,
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "10px",
                                        bgcolor: "#fff",
                                        fontSize: 16,
                                      },
                                      "& .MuiSelect-select": {
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      },
                                    }}
                                  >
                                    <Select
                                      value={item.monHoc || ""}
                                      displayEmpty
                                      onChange={(event) => {
                                        const monHoc = event.target.value;
                                        const validTeachers =
                                          getTeacherOptionsBySubject(monHoc);

                                        setData((prev) => ({
                                          ...prev,
                                          PhanCongVGBM: prev.PhanCongVGBM.map(
                                            (row, i) =>
                                              i === index
                                                ? {
                                                    ...row,
                                                    monHoc,
                                                    giaoVienBoMon:
                                                      validTeachers.includes(
                                                        row.giaoVienBoMon
                                                      )
                                                        ? row.giaoVienBoMon
                                                        : "",
                                                  }
                                                : row
                                          ),
                                        }));
                                      }}
                                    >
                                      <MenuItem value="" sx={{ fontSize: 16 }}>
                                        <em>Chọn môn học</em>
                                      </MenuItem>

                                      {subjectOptions.map((mon) => (
                                        <MenuItem
                                          key={mon}
                                          value={mon}
                                          sx={{ fontSize: 16 }}
                                        >
                                          {mon}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                ) : activeTab === "PhanCongVGBM" &&
                                  field.key === "giaoVienBoMon" ? (
                                  <FormControl
                                    fullWidth
                                    size="small"
                                    sx={{
                                      minWidth: 0,
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "10px",
                                        bgcolor: "#fff",
                                        fontSize: 16,
                                      },
                                      "& .MuiSelect-select": {
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      },
                                    }}
                                  >
                                    <Select
                                      value={item.giaoVienBoMon || ""}
                                      displayEmpty
                                      disabled={!item.monHoc}
                                      onChange={(event) =>
                                        handleChange(
                                          index,
                                          field.key,
                                          event.target.value
                                        )
                                      }
                                    >
                                      <MenuItem value="" sx={{ fontSize: 16 }}>
                                        <em>
                                          {item.monHoc
                                            ? "Chọn giáo viên"
                                            : "Chọn môn học trước"}
                                        </em>
                                      </MenuItem>

                                      {getTeacherOptionsBySubject(
                                        item.monHoc
                                      ).map((gv) => (
                                        <MenuItem
                                          key={gv}
                                          value={gv}
                                          sx={{ fontSize: 16 }}
                                        >
                                          {gv}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                ) : (
                                  <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    value={item[field.key] ?? ""}
                                    onChange={(event) =>
                                      handleChange(
                                        index,
                                        field.key,
                                        event.target.value
                                      )
                                    }
                                    placeholder={field.label}
                                    sx={{
                                      minWidth: 0,
                                      "& .MuiOutlinedInput-root": {
                                        width: "100%",
                                        minWidth: 0,
                                        borderRadius: "10px",
                                        bgcolor: "#fff",
                                        fontSize: 16,
                                      },
                                      "& .MuiInputBase-input": {
                                        minWidth: 0,
                                        fontSize: 16,
                                        px: 1,
                                      },
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                          ))}

                        <TableCell
                          align="center"
                          sx={{
                            width: 48,
                            minWidth: 48,
                            maxWidth: 48,
                            px: 0.25,
                          }}
                        >
                          <Tooltip title="Xóa dòng">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(index)}
                              sx={{
                                color: "#ef4444",
                                "&:hover": {
                                  bgcolor: "#fee2e2",
                                },
                              }}
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* ===== THÊM DÒNG - BÊN TRÁI ===== */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                mt: 1.5,
              }}
            >
              <Tooltip title="Thêm dòng mới">
                <IconButton
                  onClick={handleAdd}
                  disabled={
                    activeTab === "PhanCongVGBM" && !selectedClass
                  }
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "11px",
                    color: "#fff",
                    bgcolor: "#1976d2",
                    boxShadow: "0 4px 10px rgba(25,118,210,0.2)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "#1565c0",
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 14px rgba(25,118,210,0.3)",
                    },
                    "&.Mui-disabled": {
                      bgcolor: "#cbd5e1",
                      color: "#fff",
                    },
                  }}
                >
                  <Plus size={22} strokeWidth={2.5} />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}
      </DialogContent>

      {/* ===== ACTIONS ===== */}
      <Box
        sx={{
          px: 3,
          pb: 2.5,
          pt: 1,
          display: "flex",
          justifyContent: "center",
          gap: 2,
          background: "#f8fafc",
        }}
      >
        <Button
          onClick={onClose}
          disabled={saving}
          variant="outlined"
          sx={{
            minWidth: 110,
            height: 44,
            borderRadius: "12px",
            fontSize: 16,
            textTransform: "none",
            fontWeight: 600,
            borderColor: "#cbd5e1",
            color: "#475569",
            bgcolor: "#fff",
            "&:hover": {
              borderColor: "#94a3b8",
              bgcolor: "#f1f5f9",
            },
          }}
        >
          Hủy
        </Button>

        <Button
          onClick={handleSave}
          disabled={loading || saving || !!error}
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress size={17} color="inherit" />
            ) : (
              <Save size={18} />
            )
          }
          sx={{
            minWidth: 140,
            height: 44,
            borderRadius: "12px",
            fontSize: 16,
            textTransform: "none",
            fontWeight: 700,
            background: "linear-gradient(135deg, #1976d2, #42a5f5)",
            boxShadow: "0 10px 20px rgba(25,118,210,0.2)",
            "&:hover": {
              background: "linear-gradient(135deg, #1565c0, #1976d2)",
            },
            "&.Mui-disabled": {
              background: "#cbd5e1",
              color: "#fff",
            },
          }}
        >
          {saving ? "Đang lưu..." : "Lưu dữ liệu"}
        </Button>
      </Box>
    </Dialog>

    {/* ===== SNACKBAR ===== */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      onClose={() =>
        setSnackbar((prev) => ({
          ...prev,
          open: false,
        }))
      }
    >
      <Alert
        severity={snackbar.severity}
        variant="filled"
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false,
          }))
        }
        sx={{
          width: "100%",
          borderRadius: "10px",
          fontSize: 16,
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  </>
);




}

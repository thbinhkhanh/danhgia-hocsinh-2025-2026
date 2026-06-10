import React, { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Checkbox,
  Box,
  IconButton,
  TextField,
  MenuItem
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DeleteDataClassesConfirmDialog from "./DeleteDataClassesConfirmDialog";

export default function DeleteDataClassesDialog({
  open,
  onClose,
  classesList,
  selectedLop,
  hocKi,
  setHocKi,
  onConfirmDelete,
  examType,
}) {
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  useEffect(() => {
    if (open) {
      setSelected(selectedLop ? [selectedLop] : []);
    } else {
      setSelected([]);
      setConfirmOpen(false);
    }
  }, [open, selectedLop]);

  // =========================
  // GROUP DATA (3,4,5...)
  // =========================
  const khoiGroups = classesList.reduce((acc, lop) => {
    const khoi = String(lop).match(/^\d+/)?.[0];
    if (!khoi) return acc;

    if (!acc[khoi]) acc[khoi] = [];
    acc[khoi].push(lop);

    return acc;
  }, {});

  // =========================
  // TOGGLE 1 LỚP (FIXED)
  // =========================
  const toggleLop = (lop) => {
    setSelected((prev) => {
      const set = new Set(prev);

      if (set.has(lop)) set.delete(lop);
      else set.add(lop);

      return Array.from(set);
    });
  };

  // =========================
  // TOGGLE KHỐI
  // =========================
  const toggleKhoi = (group) => {
    const allSelected = group.every((l) =>
      selected.includes(l)
    );

    setSelected((prev) => {
      const set = new Set(prev);

      if (allSelected) {
        group.forEach((l) => set.delete(l));
      } else {
        group.forEach((l) => set.add(l));
      }

      return Array.from(set);
    });
  };

  // =========================
  // TOGGLE TỔNG TRƯỜNG
  // =========================
  const toggleAll = () => {
    setSelected((prev) =>
      prev.length === classesList.length
        ? []
        : [...classesList]
    );
  };

  // =========================
  // CHECK HELPERS
  // =========================
  const isGroupSelected = (group) =>
    group.length > 0 &&
    group.every((l) => selected.includes(l));

  const isGroupPartial = (group) =>
    group.some((l) => selected.includes(l)) &&
    !isGroupSelected(group);

  const isAllSelected =
    selected.length === classesList.length;

  return (
  <>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: "75vh",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 3,
          pr: 1.5, // 12px bên phải
          py: 1.5,
          bgcolor: "#1976d2",
          color: "#fff",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            🎯 Xóa kết quả kiểm tra
          </Typography>

          <IconButton
            onClick={onClose}
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              p: 0.8,
              "&:hover": {
                bgcolor: "#fff",
                color: "#ef4444",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* CONTENT */}
      <DialogContent
        sx={{
          flex: 1,
          px: 3,
          py: 2,
          overflowY: "auto",
        }}
      >
        <Typography
          sx={{
            mb: 2,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          Chọn các lớp cần xóa dữ liệu
        </Typography>

        {/* TOÀN TRƯỜNG */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            gap: 2,
          }}
        >
          {/* TOÀN TRƯỜNG */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1,
              py: 0.6,
              bgcolor: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              flex: 1,
            }}
          >
            <Checkbox
              checked={isAllSelected}
              indeterminate={
                selected.length > 0 &&
                selected.length < classesList.length
              }
              onChange={toggleAll}
            />

            <Typography
              sx={{
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              Toàn trường ({selected.length}/{classesList.length})
            </Typography>
          </Box>

          {/* HỌC KỲ */}
          <TextField
            select
            size="small"
            label="Học kỳ"
            value={hocKi}
            onChange={(e) => setHocKi(e.target.value)}
            sx={{
              width: {
                xs: 120, // điện thoại
                sm: 150, // tablet trở lên
              },
            }}
          >
            <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
            <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
            <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
            <MenuItem value="Cuối năm">Cuối năm</MenuItem>
          </TextField>
        </Box>

        {/* DANH SÁCH KHỐI */}
        <Box
          sx={{
            bgcolor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            p: 1.5,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
              alignItems: "start",
            }}
          >
            {Object.entries(khoiGroups).map(([khoi, group]) => (
              <Box
                key={khoi}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {/* HEADER KHỐI */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    bgcolor: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    px: 1,
                    py: 0.4,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={isGroupSelected(group)}
                    indeterminate={isGroupPartial(group)}
                    onChange={() => toggleKhoi(group)}
                  />

                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    Khối {khoi}
                  </Typography>

                  <Typography
                    sx={{
                      ml: 1,
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    ({group.length})
                  </Typography>
                </Box>

                {/* DANH SÁCH LỚP */}
                <Box
                  sx={{
                    p: 1,
                  }}
                >
                  {group.map((lop) => (
                    <Box
                      key={lop}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selected.includes(lop)}
                        onChange={() => toggleLop(lop)}
                      />

                      <Typography
                        sx={{
                          fontSize: 14,
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                        onClick={() => toggleLop(lop)}
                      >
                        {lop}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </DialogContent>

      {/* FOOTER */}
      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          justifyContent: "flex-end",
          gap: 2,
        }}
      >
        <Button
          onClick={() => {
            setSelected([]);
            onClose();
          }}
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
          Hủy
        </Button>

        <Button
          variant="contained"
          color="error"
          disabled={selected.length === 0}
          startIcon={<DeleteOutlineIcon />}
          onClick={() => setConfirmOpen(true)}
          sx={{
            minWidth: 130,
            height: 42,
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 700,
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            boxShadow: "0 10px 20px rgba(239,68,68,0.25)",
            "&:hover": {
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              boxShadow: "0 12px 24px rgba(220,38,38,0.35)",
            },
            "&.Mui-disabled": {
              background: "#fca5a5",
              color: "#fff",
            },
          }}
        >
          Xóa ({selected.length})
        </Button>
      </DialogActions>
    </Dialog>

    <DeleteDataClassesConfirmDialog
      open={confirmOpen}
      selectedCount={selected.length}
      selectedClasses={selected}
      onClose={() => setConfirmOpen(false)}
      onConfirmDelete={async (selected) => {
        try {
          await onConfirmDelete(selected, examType);

          setSelected([]);
          setConfirmOpen(false);
        } catch (e) {
          console.error(e);
        }
      }}
    />
  </>
);
}
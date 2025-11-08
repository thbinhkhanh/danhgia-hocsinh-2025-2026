// src/pages/ThongKe.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { collection, getDocs, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";

export default function ThongKe() {
  const [config, setConfig] = useState({ hocKy: "", mon: "" });
  const [rowsToRender, setRowsToRender] = useState([]);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const mapTerm = {
    "Giữa kỳ I": "GKI",
    "Cuối kỳ I": "CKI",
    "Giữa kỳ II": "GKII",
    "Cả năm": "CN",
  };

  // 🔹 Hàm load CONFIG từ Firestore
  const fetchConfig = async () => {
    try {
      const ref = doc(db, "CONFIG", "config");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          hocKy: data.hocKy || "Giữa kỳ I",
          mon: data.mon || "Tin học",
        });
      } else {
        setConfig({ hocKy: "Giữa kỳ I", mon: "Tin học" });
      }
    } catch (err) {
      console.error("❌ Lỗi đọc CONFIG:", err);
    }
  };

  // 🔹 Hàm lấy dữ liệu thống kê
  const fetchThongKeData = async (hocKy, mon) => {
    if (!hocKy || !mon) return;
    const selectedTerm = mapTerm[hocKy];

    try {
      const snap = await getDocs(collection(db, "DANHSACH"));
      const classes = snap.docs
        .map((d) => d.data()?.lop || d.id)
        .filter(Boolean)
        .sort((a, b) => {
          const [aMajor, aMinor = "0"] = String(a).split(".");
          const [bMajor, bMinor = "0"] = String(b).split(".");
          const ai = parseInt(aMajor, 10) || 0;
          const bi = parseInt(bMajor, 10) || 0;
          if (ai !== bi) return ai - bi;
          return aMinor.localeCompare(bMinor, undefined, { numeric: true });
        });

      const scoreDocRef = doc(db, "KTDK", selectedTerm);
      const scoreSnap = await getDoc(scoreDocRef);
      const scoreData = scoreSnap.exists() ? scoreSnap.data() : {};

      const dataByClass = {};
      classes.forEach((lop) => {
        const classKey = `${lop}${mon === "Công nghệ" ? "_CN" : ""}`;
        const classScores = scoreData[classKey] || {};
        let tot = 0,
          hoanThanh = 0,
          chuaHoanThanh = 0;
        Object.values(classScores).forEach((s) => {
          let mucDat = "";

          // 🔹 Nếu là Giữa kỳ → dùng dgtx
          if (selectedTerm === "GKI" || selectedTerm === "GKII") {
            mucDat = s?.dgtx?.trim() || "";
          } 
          // 🔹 Còn lại (Cuối kỳ I, Cả năm) → dùng mucDat
          else {
            mucDat = s?.mucDat?.trim() || "";
          }

          if (mucDat === "T") tot++;
          else if (mucDat === "H") hoanThanh++;
          else chuaHoanThanh++;
        });

        const tong = tot + hoanThanh + chuaHoanThanh;
        dataByClass[lop] = {
          tot,
          hoanThanh,
          chuaHoanThanh,
          totTL: tong ? ((tot / tong) * 100).toFixed(1) : "",
          hoanThanhTL: tong ? ((hoanThanh / tong) * 100).toFixed(1) : "",
          chuaHoanThanhTL: tong ? ((chuaHoanThanh / tong) * 100).toFixed(1) : "",
        };
      });

      const grouped = {};
      classes.forEach((lop) => {
        const khoi = String(lop).split(".")[0];
        if (!grouped[khoi]) grouped[khoi] = [];
        grouped[khoi].push(lop);
      });

      const rows = [];
      Object.keys(grouped)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .forEach((khoi) => {
          let kTot = 0,
            kH = 0,
            kC = 0,
            kTong = 0;
          grouped[khoi].forEach((lop) => {
            const d = dataByClass[lop] || {};
            kTot += d.tot || 0;
            kH += d.hoanThanh || 0;
            kC += d.chuaHoanThanh || 0;
            kTong += (d.tot || 0) + (d.hoanThanh || 0) + (d.chuaHoanThanh || 0);

            rows.push({ type: "class", label: lop, khoi, ...d });
          });
          rows.push({
            type: "khoi",
            label: `KHỐI ${khoi}`,
            khoi,
            tot: kTot,
            hoanThanh: kH,
            chuaHoanThanh: kC,
            totTL: kTong ? ((kTot / kTong) * 100).toFixed(1) : "",
            hoanThanhTL: kTong ? ((kH / kTong) * 100).toFixed(1) : "",
            chuaHoanThanhTL: kTong ? ((kC / kTong) * 100).toFixed(1) : "",
          });
        });

      const total = rows
        .filter((r) => r.type === "khoi")
        .reduce(
          (acc, r) => {
            acc.tot += r.tot || 0;
            acc.hoanThanh += r.hoanThanh || 0;
            acc.chuaHoanThanh += r.chuaHoanThanh || 0;
            return acc;
          },
          { tot: 0, hoanThanh: 0, chuaHoanThanh: 0 }
        );
      const tongAll = total.tot + total.hoanThanh + total.chuaHoanThanh;

      setRowsToRender([
        ...rows,
        {
          type: "truong",
          label: "TRƯỜNG",
          tot: total.tot,
          hoanThanh: total.hoanThanh,
          chuaHoanThanh: total.chuaHoanThanh,
          totTL: tongAll ? ((total.tot / tongAll) * 100).toFixed(1) : "",
          hoanThanhTL: tongAll ? ((total.hoanThanh / tongAll) * 100).toFixed(1) : "",
          chuaHoanThanhTL: tongAll ? ((total.chuaHoanThanh / tongAll) * 100).toFixed(1) : "",
        },
      ]);
    } catch (err) {
      console.error("❌ Lỗi khi thống kê:", err);
      setRowsToRender([]);
    }
  };

  // 🔹 Khi load lần đầu
  useEffect(() => {
    // Lắng nghe thay đổi trực tiếp từ Firestore CONFIG/config
    const ref = doc(db, "CONFIG", "config");
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          hocKy: data.hocKy || "Giữa kỳ I",
          mon: data.mon || "Tin học",
        });
      }
    });
    return () => unsubscribe();
  }, []);


  // 🔹 Khi config thay đổi, load lại thống kê
  useEffect(() => {
    if (config.hocKy && config.mon) {
      fetchThongKeData(config.hocKy, config.mon);
    }
  }, [config]);

  // 🔹 Render bảng
  const renderRows = (rows) => {
    // 🔹 Nhóm các lớp theo khối để biết khối nào có dữ liệu
    const khoiMap = {};
    rows.forEach((row) => {
      if (row.type === "class") {
        if (!khoiMap[row.khoi]) khoiMap[row.khoi] = 0;
        const total = (row.tot || 0) + (row.hoanThanh || 0) + (row.chuaHoanThanh || 0);
        khoiMap[row.khoi] += total;
      }
    });

    return rows
      // 🔹 Lọc bỏ lớp trống và khối trống
      .filter((row) => {
        if (row.type === "class") {
          const total = (row.tot || 0) + (row.hoanThanh || 0) + (row.chuaHoanThanh || 0);
          return total > 0;
        }
        if (row.type === "khoi") {
          return khoiMap[row.khoi] > 0;
        }
        return true; // TRƯỜNG luôn hiện
      })
      .map((row, idx) => {
        const isKhoi = row.type === "khoi";
        const isTruong = row.type === "truong";
        const siSo =
          (row.tot || 0) + (row.hoanThanh || 0) + (row.chuaHoanThanh || 0);

        // 🔹 Ẩn các giá trị 0 hoặc 0.0
        const display = (val) => {
          if (!val || Number(val) === 0) return "";
          return val;
        };

        // 🔹 Style riêng cho Khối và Trường
        const rowStyle = isTruong
          ? { backgroundColor: "#ffe5e5" } // đỏ nhạt cho Trường
          : isKhoi
          ? { backgroundColor: "#e0f0ff" } // xanh nhạt cho Khối
          : {};

        const textColor = isKhoi ? "#1976d2" : isTruong ? "#d32f2f" : "inherit";
        const fontWeight = isKhoi || isTruong ? "bold" : 500;

        return (
          <TableRow key={`${row.label}-${idx}`} sx={rowStyle}>
            <TableCell align="center" sx={{ fontWeight, color: textColor, borderRight: "1px solid #ccc" }}>
              {row.label}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight }}>{display(siSo)}</TableCell>
            <TableCell align="center" sx={{ fontWeight }}>{display(row.tot)}</TableCell>
            <TableCell align="center" sx={{ fontWeight }}>{display(row.totTL)}</TableCell>
            <TableCell align="center" sx={{ fontWeight }}>{display(row.hoanThanh)}</TableCell>
            <TableCell align="center" sx={{ fontWeight }}>{display(row.hoanThanhTL)}</TableCell>
            <TableCell align="center" sx={{ fontWeight }}>{display(row.chuaHoanThanh)}</TableCell>
            <TableCell align="center" sx={{ fontWeight }}>{display(row.chuaHoanThanhTL)}</TableCell>
          </TableRow>
        );
      });
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 800,
          mx: "auto",
          position: "relative",
        }}
      >
        <Box sx={{ position: "absolute", top: 12, left: 12 }}>
          <Tooltip title="Tải xuống Excel" arrow>
            <IconButton
              onClick={() => console.log("TODO: xuất Excel")}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" },
              }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography
          variant="h5"
          fontWeight="bold"
          color="primary"
          gutterBottom
          sx={{ textAlign: "center", mb: 2 }}
        >
          {`THỐNG KÊ CHẤT LƯỢNG ${config.hocKy?.toUpperCase() || ""}`}
        </Typography>

        {/* 🔹 Chọn môn */}
        <Box
          sx={{
            textAlign: "center",
            mb: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
            Môn:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={config.mon || "Tin học"}
              onChange={async (e) => {
                const newMon = e.target.value;
                try {
                  await setDoc(doc(db, "CONFIG", "config"), { mon: newMon }, { merge: true });
                  setConfig((prev) => ({ ...prev, mon: newMon }));
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              <MenuItem value="Tin học">Tin học</MenuItem>
              <MenuItem value="Công nghệ">Công nghệ</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Bảng thống kê */}
        <TableContainer component={Paper}>
          <Table size="small" sx={{ border: "1px solid #ccc" }}>
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: "#1976d2",
                  "& th": {
                    color: "white",
                    fontWeight: "bold",
                    textAlign: "center",
                    border: "1px solid #fff",
                  },
                }}
              >
                <TableCell rowSpan={2}>KHỐI / LỚP</TableCell>
                <TableCell rowSpan={2}>SĨ SỐ</TableCell>
                <TableCell colSpan={2}>TỐT</TableCell>
                <TableCell colSpan={2}>HT</TableCell>
                <TableCell colSpan={2}>CHƯA HT</TableCell>
              </TableRow>
              <TableRow
                sx={{
                  backgroundColor: "#1976d2",
                  "& th": {
                    color: "white",
                    textAlign: "center",
                    border: "1px solid #fff",
                  },
                }}
              >
                <TableCell>SL</TableCell>
                <TableCell>TL</TableCell>
                <TableCell>SL</TableCell>
                <TableCell>TL</TableCell>
                <TableCell>SL</TableCell>
                <TableCell>TL</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{renderRows(rowsToRender)}</TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}

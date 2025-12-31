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
import { exportThongKeExcel } from "../utils/exportThongKeExcel";

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
    const subjectKey = mon === "Công nghệ" ? "CongNghe" : "TinHoc";

    try {
      // 1️⃣ Lấy danh sách lớp
      const classSnap = await getDocs(collection(db, "DANHSACH"));
      const classes = classSnap.docs
        .map((d) => d.data()?.lop || d.id)
        .filter(Boolean)
        .sort((a, b) => {
          const [aMajor, aMinor = "0"] = String(a).split(".");
          const [bMajor, bMinor = "0"] = String(b).split(".");
          return parseInt(aMajor) - parseInt(bMajor) ||
            aMinor.localeCompare(bMinor, undefined, { numeric: true });
        });

      // 2️⃣ Đọc DATA TẤT CẢ CÁC LỚP SONG SONG
      const classResults = await Promise.all(
        classes.map(async (lop) => {
          const classKey = lop.replace(".", "_");
          const hsSnap = await getDocs(
            collection(db, "DATA", classKey, "HOCSINH")
          );

          let tot = 0, hoanThanh = 0, chuaHoanThanh = 0;

          hsSnap.forEach((docSnap) => {
            const hs = docSnap.data();
            const ktdk = hs?.[subjectKey]?.ktdk?.[selectedTerm];
            if (!ktdk) return;

            let mucDat = "";

            if (selectedTerm === "GKI" || selectedTerm === "GKII") {
              mucDat = (ktdk.dgtx_mucdat || "").trim();
            } else {
              mucDat = (ktdk.mucDat || "").trim();
            }

            if (mucDat === "T") tot++;
            else if (mucDat === "H") hoanThanh++;
            else if (mucDat) chuaHoanThanh++;
          });

          const tong = tot + hoanThanh + chuaHoanThanh;

          return {
            lop,
            khoi: lop.split(".")[0],
            tot,
            hoanThanh,
            chuaHoanThanh,
            totTL: tong ? ((tot / tong) * 100).toFixed(1) : "",
            hoanThanhTL: tong ? ((hoanThanh / tong) * 100).toFixed(1) : "",
            chuaHoanThanhTL: tong ? ((chuaHoanThanh / tong) * 100).toFixed(1) : "",
          };
        })
      );

      // 3️⃣ Gom theo khối
      const grouped = {};
      classResults.forEach((c) => {
        if (!grouped[c.khoi]) grouped[c.khoi] = [];
        grouped[c.khoi].push(c);
      });

      const rows = [];

      Object.keys(grouped)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((khoi) => {
          let kTot = 0, kH = 0, kC = 0, kTong = 0;

          grouped[khoi].forEach((c) => {
            kTot += c.tot;
            kH += c.hoanThanh;
            kC += c.chuaHoanThanh;
            kTong += c.tot + c.hoanThanh + c.chuaHoanThanh;

            rows.push({
              type: "class",
              label: c.lop,
              khoi,
              ...c,
            });
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

      // 4️⃣ Toàn trường
      const total = rows
        .filter((r) => r.type === "khoi")
        .reduce(
          (acc, r) => {
            acc.tot += r.tot;
            acc.hoanThanh += r.hoanThanh;
            acc.chuaHoanThanh += r.chuaHoanThanh;
            return acc;
          },
          { tot: 0, hoanThanh: 0, chuaHoanThanh: 0 }
        );

      const tongAll =
        total.tot + total.hoanThanh + total.chuaHoanThanh;

      setRowsToRender([
        ...rows,
        {
          type: "truong",
          label: "TRƯỜNG",
          ...total,
          totTL: tongAll ? ((total.tot / tongAll) * 100).toFixed(1) : "",
          hoanThanhTL: tongAll
            ? ((total.hoanThanh / tongAll) * 100).toFixed(1)
            : "",
          chuaHoanThanhTL: tongAll
            ? ((total.chuaHoanThanh / tongAll) * 100).toFixed(1)
            : "",
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
              onClick={() => exportThongKeExcel(rowsToRender, config)}
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
          {`THỐNG KÊ ${config.hocKy?.toUpperCase() || ""}`}
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

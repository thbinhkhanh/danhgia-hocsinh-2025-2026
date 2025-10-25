import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
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
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ThongKe() {
  const [selectedTerm, setSelectedTerm] = useState("HK1");
  const [isCongNghe, setIsCongNghe] = useState(false);
  const [rowsToRender, setRowsToRender] = useState([]);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // 🔹 Hàm chính: fetch dữ liệu thống kê
  const fetchThongKeData = async () => {
    try {
      // 1️⃣ Lấy danh sách lớp
      const snap = await getDocs(collection(db, "DANHSACH"));
      const classes = snap.docs
        .map((d) => {
          const data = d.data();
          return data?.lop ? data.lop : d.id;
        })
        .filter(Boolean)
        .sort((a, b) => {
          const [aMajor, aMinor = "0"] = String(a).split(".");
          const [bMajor, bMinor = "0"] = String(b).split(".");
          const ai = parseInt(aMajor, 10) || 0;
          const bi = parseInt(bMajor, 10) || 0;
          if (ai !== bi) return ai - bi;
          return aMinor.localeCompare(bMinor, undefined, { numeric: true });
        });

      // 2️⃣ Lấy dữ liệu bảng điểm tương ứng
      const termDoc = selectedTerm === "HK1" ? "HK1" : "CN";
      const scoreDocRef = doc(db, "BANGDIEM", termDoc);
      const scoreSnap = await getDoc(scoreDocRef);
      const scoreData = scoreSnap.exists() ? scoreSnap.data() : {};

      // 3️⃣ Tạo thống kê cho từng lớp
      const dataByClass = {};
      classes.forEach((lop) => {
        const classKey = `${lop}${isCongNghe ? "_CN" : ""}_${selectedTerm}`;
        const classScores = scoreData[classKey] || {};

        let tot = 0,
          hoanThanh = 0,
          chuaHoanThanh = 0;
        Object.values(classScores).forEach((s) => {
          if (s?.xepLoai === "T") tot++;
          else if (s?.xepLoai === "H") hoanThanh++;
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

      // 4️⃣ Gom theo khối
      const grouped = {};
      classes.forEach((lop) => {
        const khoi = String(lop).split(".")[0];
        if (!grouped[khoi]) grouped[khoi] = [];
        grouped[khoi].push(lop);
      });

      const rows = [];
      Object.keys(grouped)
        .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))
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

            rows.push({
              type: "class",
              label: lop,
              khoi,
              ...d,
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

      // 5️⃣ Tính tổng toàn trường
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

  useEffect(() => {
    fetchThongKeData();
  }, [selectedTerm, isCongNghe]);

  const title = isCongNghe ? "CÔNG NGHỆ" : "TIN HỌC";

  const cellWidth = 60; // chiều rộng cột
  const cellBorder = "1px solid #ccc"; // màu đường kẻ dọc

const renderRows = (rows) =>
  rows.map((row, idx) => {
    const isKhoi = row.type === "khoi";
    const isTruong = row.type === "truong";
    const siSo = (row.tot || 0) + (row.hoanThanh || 0) + (row.chuaHoanThanh || 0);

    const display = (val) => (val && val !== 0 ? val : "");

    return (
      <TableRow
        key={`${row.label}-${idx}`}
        sx={
          isTruong
            ? { backgroundColor: "#f1f1f1" }
            : isKhoi
            ? { backgroundColor: "#fafafa" }
            : {}
        }
      >
        <TableCell
          align="center"
          sx={{
            fontWeight: isKhoi || isTruong ? "bold" : 500,
            borderRight: "1px solid #ccc",
          }}
        >
          {row.label}
        </TableCell>

        <TableCell align="center" sx={{ width: 60, borderRight: "1px solid #ccc" }}>
          {display(siSo)}
        </TableCell>

        <TableCell align="center" sx={{ width: 60, borderRight: "1px solid #ccc" }}>
          {display(row.tot)}
        </TableCell>
        <TableCell align="center" sx={{ width: 60, borderRight: "1px solid #ccc" }}>
          {display(row.totTL)}
        </TableCell>
        <TableCell align="center" sx={{ width: 60, borderRight: "1px solid #ccc" }}>
          {display(row.hoanThanh)}
        </TableCell>
        <TableCell align="center" sx={{ width: 60, borderRight: "1px solid #ccc" }}>
          {display(row.hoanThanhTL)}
        </TableCell>
        <TableCell align="center" sx={{ width: 60, borderRight: "1px solid #ccc" }}>
          {display(row.chuaHoanThanh)}
        </TableCell>
        <TableCell align="center" sx={{ width: 60 }}>
          {display(row.chuaHoanThanhTL)}
        </TableCell>
      </TableRow>
    );
  });



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
      {/* 🔹 Nút tải Excel */}
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

      {/* 🔹 Nếu là mobile thì đặt chọn học kỳ xuống cùng hàng với chọn môn */}
      {isMobile ? (
        <>
          {/* 🔹 Tiêu đề */}
          <Typography
            variant="h5"
            fontWeight="bold"
            color="primary"
            gutterBottom
            sx={{ textAlign: "center", mb: 1 }}
          >
            THỐNG KÊ CHẤT LƯỢNG
          </Typography>

          {/* 🔹 Hàng gồm: Môn + Học kỳ */}
          <Box
            sx={{
              textAlign: "center",
              mb: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              Môn:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={isCongNghe ? "CN" : "TH"}
                onChange={(e) => setIsCongNghe(e.target.value === "CN")}
              >
                <MenuItem value="TH">Tin học</MenuItem>
                <MenuItem value="CN">Công nghệ</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
              >
                <MenuItem value="HK1">Học kì I</MenuItem>
                <MenuItem value="ALL">Cả năm</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </>
      ) : (
        <>
          {/* 🔹 Chọn học kỳ ở góc phải như cũ */}
          <Box sx={{ position: "absolute", top: 12, right: 12 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
              >
                <MenuItem value="HK1">Học kì I</MenuItem>
                <MenuItem value="ALL">Cả năm</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 🔹 Tiêu đề */}
          <Typography
            variant="h5"
            fontWeight="bold"
            color="primary"
            gutterBottom
            sx={{ textAlign: "center", mb: 1 }}
          >
            THỐNG KÊ CHẤT LƯỢNG
          </Typography>

          {/* 🔹 Ô chọn Môn */}
          <Box
            sx={{
              textAlign: "center",
              mb: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
              Môn:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={isCongNghe ? "CN" : "TH"}
                onChange={(e) => setIsCongNghe(e.target.value === "CN")}
              >
                <MenuItem value="TH">Tin học</MenuItem>
                <MenuItem value="CN">Công nghệ</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </>
      )}

      {/* 🔹 Bảng thống kê */}
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

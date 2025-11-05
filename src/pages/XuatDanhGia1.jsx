import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  Typography,
  Stack,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ExcelJS from "exceljs";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function XuatDanhGia() {
  const [term, setTerm] = useState("HK1"); // 🔹 Học kỳ mặc định: HK1
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [folderHandle, setFolderHandle] = useState(null);

  const fetchKTDKDataForClass = async (term, className) => {
    try {
      const ref = doc(db, "KTDK", term);
      const snap = await getDoc(ref);
      if (!snap.exists()) return {};

      const data = snap.data();
      const classKey = `${className}_${term}`;
      const rawData = data[classKey] || {};

      const classData = {};
      Object.keys(rawData).forEach((key) => {
        const idText = String(key).trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
        classData[idText] = rawData[key];
      });

      return classData;
    } catch (err) {
      console.error(`❌ Lỗi đọc Firestore cho lớp ${className}:`, err);
      return {};
    }
  };

  const handleExportAll = async () => {
    if (!folderHandle) {
      setMessage("⚠️ Vui lòng chọn thư mục trước khi xuất!");
      return;
    }

    setMessage("");
    setLoading(true);
    setSuccess(false);
    setProcessedFiles([]);
    setProgress(0);

    try {
      const files = [];
      for await (const entry of folderHandle.values()) {
        if (entry.kind === "file" && entry.name.endsWith(".xlsx")) {
          files.push(entry);
        }
      }

      if (files.length === 0) {
        setMessage("⚠️ Không tìm thấy file .xlsx nào trong thư mục!");
        setLoading(false);
        return;
      }

      // 🧩 Kiểm tra Firestore có dữ liệu cho kỳ đó không
      const ref = doc(db, "KTDK", term);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const termText = term === "CN" ? "Cả năm" : "Học kỳ I";
        setMessage(`⚠️ Không tìm thấy dữ liệu ${termText}.`);
        setLoading(false);
        return;
      }

      const data = snap.data();
      const openedFiles = [];
      const skipped = [];
      let done = 0;

      for (const fileEntry of files) {
        const className = fileEntry.name.replace(/\.xlsx$/i, "");
        const classKey = `${className}_${term}`;
        const classDataRaw = data[classKey];

        if (!classDataRaw || Object.keys(classDataRaw).length === 0) {
          skipped.push(`Không tìm thấy dữ liệu lớp ${className}.`);
          continue;
        }

        const classData = {};
        Object.keys(classDataRaw).forEach((key) => {
          const idText = String(key).trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
          classData[idText] = classDataRaw[key];
        });

        const file = await fileEntry.getFile();
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();

        try {
          await workbook.xlsx.load(buffer);
        } catch {
          skipped.push(`Không thể đọc file Excel ${fileEntry.name} (có thể bị lỗi hoặc khóa).`);
          continue;
        }

        let sheetName = className.endsWith("_CN")
          ? "TH-CN (Công nghệ)"
          : "TH-CN (Tin học)";

        const sheet = workbook.worksheets.find((s) => s.name === sheetName);
        if (!sheet) {
          skipped.push(`File ${fileEntry.name} không có sheet "${sheetName}".`);
          continue;
        }

        const headerRow = sheet.getRow(1).values;
        const colId = headerRow.indexOf("Mã học sinh");
        const colDgtx = headerRow.indexOf("Mức đạt được");
        const colNX = headerRow.indexOf("Nội dung nhận xét");

        if (colId === -1) {
          skipped.push(`File ${fileEntry.name} sai cấu trúc.`);
          continue;
        }

        let matchCount = 0;
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber < 2) return;
          const idCell = row.getCell(colId);
          const idExcel = String(idCell.value || "")
            .trim()
            .replace(/[\u200B-\u200D\uFEFF]/g, "");
          const hs = classData[idExcel];
          if (hs) {
            matchCount++;
            if (colDgtx > 0) row.getCell(colDgtx).value = hs.dgtx || "";
            if (colNX > 0) row.getCell(colNX).value = hs.nhanXet || "";
          }
        });

        if (matchCount === 0) {
          skipped.push(`Lớp ${className}: Không có học sinh nào khớp trong Excel.`);
          continue;
        }

        try {
          const writable = await fileEntry.createWritable();
          const bufferOut = await workbook.xlsx.writeBuffer();
          await writable.write(bufferOut);
          await writable.close();
        } catch {
          skipped.push(`Không thể ghi dữ liệu vào file ${fileEntry.name}.`);
          continue;
        }

        openedFiles.push(className);
        done++;
        setProgress(Math.round((done / files.length) * 100));
      }

      setProcessedFiles(openedFiles);
      setSuccess(true);

      if (openedFiles.length > 0) {
        const tinHoc = openedFiles
          .filter((n) => !n.endsWith("_CN"))
          .sort((a, b) => {
            const [gA, nA] = a.split(".").map(Number);
            const [gB, nB] = b.split(".").map(Number);
            return gA === gB ? nA - nB : gA - gB;
          });

        const congNghe = openedFiles
          .filter((n) => n.endsWith("_CN"))
          .map((n) => n.replace("_CN", ""))
          .sort((a, b) => {
            const [gA, nA] = a.split(".").map(Number);
            const [gB, nB] = b.split(".").map(Number);
            return gA === gB ? nA - nB : gA - gB;
          });

        setMessage(
          <div style={{ lineHeight: 1.6, fontSize: "0.95rem" }}>
            ✅ <strong>Đã xuất kết quả lớp:</strong>

            <div style={{ marginTop: 8, marginLeft: 20 }}>
              • <strong>Tin học:</strong>
              <div style={{ marginLeft: 24, whiteSpace: "pre-line", lineHeight: 1.6 }}>
                {(() => {
                  if (tinHoc.length === 0) return "Không có";
                  const groups = {};
                  tinHoc.forEach((cls) => {
                    const grade = cls.split(".")[0];
                    if (!groups[grade]) groups[grade] = [];
                    groups[grade].push(cls);
                  });
                  return Object.values(groups)
                    .map((arr) => "  " + arr.join(", "))
                    .join("\n");
                })()}
              </div>
            </div>

            <div style={{ marginTop: 8, marginLeft: 20 }}>
              • <strong>Công nghệ:</strong>
              <div style={{ marginLeft: 24, whiteSpace: "pre-line", lineHeight: 1.6 }}>
                {(() => {
                  if (congNghe.length === 0) return "Không có";
                  const groups = {};
                  congNghe.forEach((cls) => {
                    const grade = cls.split(".")[0];
                    if (!groups[grade]) groups[grade] = [];
                    groups[grade].push(cls);
                  });
                  return Object.values(groups)
                    .map((arr) => "  " + arr.join(", "))
                    .join("\n");
                })()}
              </div>
            </div>

            {skipped.length > 0 && (
              <div style={{ marginTop: 10, marginLeft: 20 }}>
                ⚠️ <strong>Các lớp bị bỏ qua:</strong>
                <ul
                  style={{
                    marginTop: 6,
                    marginLeft: 24,
                    lineHeight: 1.6,
                    listStyleType: "none",
                    padding: 0,
                  }}
                >
                  {skipped.map((msg, idx) => (
                    <li key={idx}>❌ {msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      } else {
        setMessage(
          <>
            ⚠️ Không có lớp nào được xuất.
            {skipped.length > 0 && (
              <ul style={{ marginTop: 6, marginLeft: 24, lineHeight: 1.6 }}>
                {skipped.map((msg, idx) => (
                  <li key={idx}>❌ {msg}</li>
                ))}
              </ul>
            )}
          </>
        );
      }
    } catch (err) {
      console.error("❌ Lỗi tổng:", err);
      setMessage("❌ Có lỗi xảy ra khi ghi dữ liệu.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFolder = async () => {
    setMessage("");
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      setFolderHandle(handle);
    } catch (err) {
      console.error("❌ Lỗi chọn thư mục:", err);
      setMessage("❌ Không thể mở thư mục hoặc bạn đã hủy.");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 5 }}>
      <Card elevation={6} sx={{ p: 4, borderRadius: 3, maxWidth: 450, mx: "auto" }}>
        <Typography variant="h5" color="primary" fontWeight="bold" align="center">
          XUẤT KẾT QUẢ GIÁO DỤC
        </Typography>

        <Stack spacing={3} sx={{ mt: 3 }}>
          {/* --- Chọn thư mục + học kỳ (bằng nhau, cùng chiều cao) --- */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleSelectFolder}
              sx={{ flex: 1, height: "100%" }}
            >
              📁 Chọn thư mục
            </Button>

            <FormControl fullWidth sx={{ flex: 1 }}>
              <InputLabel>Học kỳ</InputLabel>
              <Select
                value={term}
                label="Học kỳ"
                onChange={(e) => {
                  setTerm(e.target.value);
                  setMessage("");        // 🔹 Ẩn thông báo cũ khi đổi học kỳ
                  setSuccess(false);     // 🔹 Đặt lại trạng thái xuất thành chưa thành công
                }}
                size="small"
                sx={{
                  "& .MuiSelect-select": {
                    py: 0.9,
                  },
                }}
              >

                <MenuItem value="HK1">Học kỳ I</MenuItem>
                <MenuItem value="CN">Cả năm</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {folderHandle && (
            <Typography variant="body2" color="textPrimary" sx={{ mt: 0.5 }}>
              Thư mục đã chọn: <strong>{folderHandle.name}</strong>
            </Typography>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleExportAll}
            disabled={loading || !folderHandle}
          >
            Thực hiện
          </Button>

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Box sx={{ width: "75%" }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mt: 1, textAlign: "center" }}
                >
                  🔄 Đang xuất kết quả... {progress}%
                </Typography>
              </Box>
            </Box>
          )}

          {message && !loading && (
            <Alert severity={success ? "success" : "error"}>{message}</Alert>
          )}
        </Stack>
      </Card>
    </Box>
  );
}

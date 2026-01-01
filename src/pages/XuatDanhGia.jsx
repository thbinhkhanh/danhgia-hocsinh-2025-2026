import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  Typography,
  Stack,
  LinearProgress,
  Alert,
} from "@mui/material";

import ExcelJS from "exceljs";

import { doc, getDocs, collection } from "firebase/firestore";
import { getDatabase } from "firebase/database";

import { db } from "../firebase";
import { useConfig } from "../context/ConfigContext";

export default function XuatDanhGia() {
  const { config } = useConfig();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [folderHandle, setFolderHandle] = useState(null);

  const [openedFiles, setOpenedFiles] = useState([]);
  const [skipped, setSkipped] = useState([]);

  const rtdb = getDatabase();

  const mapTerm = (text) => {
    switch (text) {
      case "Giữa kỳ I":
        return "GKI";
      case "Cuối kỳ I":
        return "CKI";
      case "Giữa kỳ II":
        return "GKII";
      case "Cả năm":
        return "CN";
      default:
        return "GKI";
    }
  };

  const [termText, setTermText] = useState(config.hocKy || "Giữa kỳ I");
  const [term, setTerm] = useState(mapTerm(termText));

  useEffect(() => {
    if (config.hocKy && config.hocKy !== termText) {
      setTermText(config.hocKy);
      setTerm(mapTerm(config.hocKy));
    }
  }, [config.hocKy]);

  const handleSelectFolder = async () => {
    setMessage("");
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      setFolderHandle(handle);
    } catch {
      setMessage("❌ Không thể mở thư mục hoặc bạn đã hủy.");
    }
  };

  const handleExportAll = async () => {
    if (!folderHandle) {
      setMessage("⚠️ Vui lòng chọn thư mục trước khi xuất!");
      return;
    }

    setLoading(true);
    setSuccess(false);
    setProgress(0);
    setMessage("");
    setOpenedFiles([]);
    setSkipped([]);

    try {
      const files = [];
      for await (const entry of folderHandle.values()) {
        if (entry.kind === "file" && entry.name.endsWith(".xlsx")) {
          files.push(entry);
        }
      }

      if (files.length === 0) {
        setMessage("⚠️ Không tìm thấy file .xlsx nào trong thư mục!");
        return;
      }

      const opened = [];
      const skip = [];
      let done = 0;

      for (const fileEntry of files) {
        const className = fileEntry.name.replace(/\.xlsx$/i, "");
        const lopKey = className.replace(".", "_");

        const hsSnap = await getDocs(collection(db, "DATA", lopKey, "HOCSINH"));
        if (hsSnap.empty) {
          skip.push(`Không có dữ liệu DATA lớp ${className}`);
          continue;
        }

        const classData = {};
        hsSnap.forEach(docSnap => {
          classData[docSnap.id] = docSnap.data();
        });

        const file = await fileEntry.getFile();
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();

        try {
          await workbook.xlsx.load(buffer);
        } catch {
          skip.push(`Không thể mở file ${fileEntry.name}`);
          continue;
        }

        const sheetNames = ["TH-CN (Tin học)", "TH-CN (Công nghệ)"];
        let matchCount = 0;

        for (const sheetName of sheetNames) {
          const sheet = workbook.worksheets.find(s => s.name === sheetName);
          if (!sheet) continue;

          const monKey = sheetName === "TH-CN (Tin học)" ? "TinHoc" : "CongNghe";
          const headerRow = sheet.getRow(1).values;
          const colId = headerRow.indexOf("Mã học sinh");
          const colDgtx = headerRow.indexOf("Mức đạt được");
          const colNX = headerRow.indexOf("Nội dung nhận xét");

          if (colId === -1) {
            skip.push(`File ${fileEntry.name} sheet ${sheetName} sai cấu trúc`);
            continue;
          }

          sheet.eachRow((row, rowNumber) => {
            if (rowNumber < 2) return;

            const maHS = String(row.getCell(colId).value || "")
              .trim()
              .replace(/[\u200B-\u200D\uFEFF]/g, "");
            const hs = classData[maHS];
            if (!hs || !hs[monKey]?.ktdk?.[term]) return;

            const ktdk = hs[monKey].ktdk[term];
            matchCount++;

            if (term === "GKI" || term === "GKII") {
              if (colDgtx > 0) row.getCell(colDgtx).value = ktdk.dgtx_mucdat || "";
              if (colNX > 0) row.getCell(colNX).value = ktdk.dgtx_nx || "";
            } else {
              if (colDgtx > 0) row.getCell(colDgtx).value = ktdk.mucDat || "";
              if (colNX > 0) row.getCell(colNX).value = ktdk.nhanXet || "";
              row.getCell(6).value = ktdk.tongCong ?? "";
            }
          });
        }

        if (matchCount === 0) {
          skip.push(`Lớp ${className}: Không khớp học sinh`);
          continue;
        }

        const writable = await fileEntry.createWritable();
        const bufferOut = await workbook.xlsx.writeBuffer();
        await writable.write(bufferOut);
        await writable.close();

        opened.push(className);
        done++;
        setProgress(Math.round((done / files.length) * 100));
      }

      setOpenedFiles(opened);
      setSkipped(skip);
      setSuccess(true);
      setMessage(`✅ Hoàn tất xuất dữ liệu ${termText} từ DATA`);

      if (skip.length > 0) console.warn("Các file/sheet bị bỏ qua:", skip);
    } catch (err) {
      console.error("❌ Lỗi:", err);
      setMessage("❌ Có lỗi xảy ra khi xuất dữ liệu");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 5 }}>
    <Card elevation={6} sx={{ p: 4, borderRadius: 3, maxWidth: 380, mx: "auto" }}>
      <Typography
        variant="h5"
        color="primary"
        fontWeight="bold"
        align="center"
        sx={{ mb: 2 }}
      >
        {/*{`XUẤT KẾT QUẢ ${termText ? ` ${termText.toUpperCase()}` : ""}`}*/}
        XUẤT KẾT QUẢ
      </Typography>

      <Stack spacing={3}>
        <Button variant="outlined" color="primary" onClick={handleSelectFolder}>
          📁 Chọn thư mục
        </Button>

        {folderHandle && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Thư mục đã chọn: <strong>{folderHandle.name}</strong>
          </Typography>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleExportAll}
          disabled={loading || !folderHandle}
        >
          Xuất kết quả
        </Button>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Box sx={{ width: "75%" }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
                🔄 Đang xuất kết quả... {progress}%
              </Typography>
            </Box>
          </Box>
        )}

        {message && !loading && (
          <Alert severity={success ? "success" : "error"}>{message}</Alert>
        )}

        {/* Bảng tổng hợp */}
        {!loading && (openedFiles.length > 0 || skipped.length > 0) && (
          <Box sx={{ mt: 2 }}>
            {/* Lớp xuất thành công */}
            {openedFiles.length > 0 && (
              <Box sx={{ mb: 2, ml: 3 }}> {/* tăng lùi đầu dòng cho cả block */}
                <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                  ✅ Lớp xuất thành công:
                </Typography>

                {["4", "5"].map((grade) => {
                  const filtered = openedFiles
                    .filter((l) => l.startsWith(grade + "."))
                    .sort((a, b) => parseFloat(a) - parseFloat(b));
                  if (filtered.length === 0) return null;
                  return (
                    <Box key={grade} sx={{ ml: 3, mb: 0.5 }}> {/* lùi cấp 1 nhiều hơn */}
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        Lớp {grade}:
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 4 }}> {/* lùi danh sách thêm 1 cấp */}
                        {filtered.join(", ")}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Lớp chưa xuất / lỗi */}
            {skipped.length > 0 && (
              <Box sx={{ mt: 1, ml: 3 }}>
                <Typography variant="subtitle2" color="error.main" sx={{ mb: 0.5 }}>
                  ❌ Lớp chưa xuất / lỗi:
                </Typography>
                <Typography variant="body2" sx={{ ml: 4 }}>
                  {skipped.join(", ")}
                </Typography>
              </Box>
            )}
          </Box>
        )}

      </Stack>
    </Card>
  </Box>
);

}

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  Typography,
  Stack,
  LinearProgress,
  Alert,
  IconButton
} from "@mui/material";

import ExcelJS from "exceljs";

import { doc, getDocs, collection } from "firebase/firestore";
import { getDatabase } from "firebase/database";

import { db } from "../firebase";
import { useConfig } from "../context/ConfigContext";

import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";

export default function XuatDanhGia() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

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
      case "Cuối năm":
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

        const hsSnap = await getDocs(collection(db, `DATA_${namHocKey}`, lopKey, "HOCSINH"));
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
              // Giữa kỳ: xuất mucDat + nhanXet
              if (colDgtx > 0) row.getCell(colDgtx).value = ktdk.mucDat || "";
              if (colNX > 0) row.getCell(colNX).value = ktdk.nhanXet || "";
              // KHÔNG ghi tongCong
            } else {
              // Cuối kỳ / Cuối năm: xuất mucDat + nhanXet + tongCong
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
  <>
    {/* ===== PAGE WRAPPER ===== */}
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", py: 4 }}>

      {/* ===== CARD MAIN ===== */}
      <Card
        elevation={0}
        sx={{
          maxWidth: 520,
          mx: "auto",
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          bgcolor: "#fff",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 1.5,
            bgcolor: "#1976d2",
            color: "#fff",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Xuất kết quả đánh giá
            </Typography>

            <IconButton
              onClick={() => navigate("/dashboard")}
              sx={{
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                transition: "all .2s ease",

                "&:hover": {
                  bgcolor: "#fff",
                  color: "#ef4444",
                  transform: "scale(1.05)",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* ===== CONTENT ===== */}
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.2}>

            {/* ===== CHỌN THƯ MỤC ===== */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
              }}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSelectFolder}
              >
                📁 Chọn thư mục dữ liệu
              </Button>

              {folderHandle && (
                <Typography
                  sx={{
                    mt: 1,
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  Thư mục: <b>{folderHandle.name}</b>
                </Typography>
              )}
            </Box>

            {/* ===== ACTION ===== */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
              }}
            >
              <Button
                fullWidth
                variant="contained"
                onClick={handleExportAll}
                disabled={loading || !folderHandle}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: "none",
                }}
              >
                Bắt đầu xuất
              </Button>
            </Box>

            {/* ===== PROGRESS ===== */}
            {loading && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 8, borderRadius: 5 }}
                />

                <Typography
                  sx={{
                    mt: 1,
                    textAlign: "center",
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  Đang xử lý... {progress}%
                </Typography>
              </Box>
            )}

            {/* ===== MESSAGE ===== */}
            {message && !loading && (
              <Alert severity={success ? "success" : "error"}>
                {message}
              </Alert>
            )}

            {/* ===== RESULT SUMMARY ===== */}
            {!loading && (openedFiles.length > 0 || skipped.length > 0) && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#fff",
                }}
              >

                {/* SUCCESS */}
                {openedFiles.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "green",
                        mb: 1,
                      }}
                    >
                      ✅ Xuất thành công
                    </Typography>

                    {["4", "5"].map((grade) => {
                      const filtered = openedFiles
                        .filter((l) => l.startsWith(grade + "."))
                        .sort((a, b) => parseFloat(a) - parseFloat(b));

                      if (!filtered.length) return null;

                      return (
                        <Box key={grade} sx={{ ml: 2, mb: 1 }}>
                          <Typography sx={{ fontWeight: 600 }}>
                            Lớp {grade}
                          </Typography>

                          <Typography sx={{ ml: 2, fontSize: 13 }}>
                            {filtered.join(", ")}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* SKIPPED */}
                {skipped.length > 0 && (
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#ef4444",
                        mb: 1,
                      }}
                    >
                      ❌ Bỏ qua / lỗi
                    </Typography>

                    <Typography sx={{ fontSize: 13, ml: 2 }}>
                      {skipped.join(", ")}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

          </Stack>
        </Box>
      </Card>
    </Box>
  </>
);

}

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  Typography,
  Stack,
  LinearProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import ExcelJS from "exceljs";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useConfig } from "../context/ConfigContext"; // ✅ lấy context

export default function XuatDanhGia() {
  const { config, setConfig } = useConfig(); // lấy context config
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [folderHandle, setFolderHandle] = useState(null);

  /// 🔹 Map giữa tên học kỳ và mã Firestore
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

  // 🔹 State
  const [term, setTerm] = useState(mapTerm("Giữa kỳ I")); // bây giờ gọi được
  const [termText, setTermText] = useState("Giữa kỳ I");

  // 🔹 Đọc học kỳ hiện tại từ Firestore CONFIG
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const ref = doc(db, "CONFIG", "config");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const hocky = data.hocky || "Giữa kỳ I";
          setTermText(hocky);
          setTerm(mapTerm(hocky)); // key Firestore
          setConfig((prev) => ({ ...prev, hocky })); // cập nhật context
        }
      } catch (err) {
        console.error("❌ Lỗi đọc học kỳ từ CONFIG:", err);
      }
    };
    fetchConfig();
  }, [setConfig]);

  // 🔹 Khi đổi học kỳ (người dùng chọn)
  const handleTermChange = async (e) => {
    const newTermText = e.target.value;
    const newTermCode = mapTerm(newTermText);
    setTermText(newTermText);
    setTerm(newTermCode); // key Firestore
    setMessage("");

    try {
      const ref = doc(db, "CONFIG", "config");
      await setDoc(ref, { hocky: newTermText }, { merge: true });
      setConfig((prev) => ({ ...prev, hocky: newTermText }));
      console.log(`✅ Cập nhật Firestore & context: ${newTermText}`);
    } catch (err) {
      console.error("❌ Lỗi cập nhật học kỳ:", err);
      setMessage("❌ Lỗi cập nhật học kỳ lên Firestore.");
    }
  };

  // 🔹 Chọn thư mục xuất
  const handleSelectFolder = async () => {
    setMessage("");
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      setFolderHandle(handle);
    } catch {
      setMessage("❌ Không thể mở thư mục hoặc bạn đã hủy.");
    }
  };

  // 🔹 Hàm xuất dữ liệu
  const handleExportAll = async () => {
  if (!folderHandle) {
    setMessage("⚠️ Vui lòng chọn thư mục trước khi xuất!");
    return;
  }

  setMessage("");
  setLoading(true);
  setSuccess(false);
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

    const ref = doc(db, "KTDK", term);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
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
      const classDataRaw = data[className]; // ✅ lấy theo lớp
      if (!classDataRaw || Object.keys(classDataRaw).length === 0) {
        skipped.push(`Không có dữ liệu lớp ${className}.`);
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
        skipped.push(`Không thể mở file ${fileEntry.name}.`);
        continue;
      }

      const sheetName = className.endsWith("_CN")
        ? "TH-CN (Công nghệ)"
        : "TH-CN (Tin học)";
      const sheet = workbook.worksheets.find((s) => s.name === sheetName);
      if (!sheet) {
        skipped.push(`Không có sheet "${sheetName}" trong ${fileEntry.name}`);
        continue;
      }

      const headerRow = sheet.getRow(1).values;
      const colId = headerRow.indexOf("Mã học sinh");
      const colDgtx = headerRow.indexOf("Mức đạt được");
      const colNX = headerRow.indexOf("Nội dung nhận xét");
      if (colId === -1) {
        skipped.push(`File ${fileEntry.name} sai cấu trúc`);
        continue;
      }

      let matchCount = 0;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber < 2) return;
        const idExcel = String(row.getCell(colId).value || "")
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
        skipped.push(`Lớp ${className}: Không có học sinh nào khớp trong Excel`);
        continue;
      }

      try {
        const writable = await fileEntry.createWritable();
        const bufferOut = await workbook.xlsx.writeBuffer();
        await writable.write(bufferOut);
        await writable.close();
      } catch {
        skipped.push(`Không thể ghi dữ liệu vào file ${fileEntry.name}`);
        continue;
      }

      openedFiles.push(className);
      done++;
      setProgress(Math.round((done / files.length) * 100));
    }

    setSuccess(true);

    // 🔹 Hiển thị thông báo HTML đẹp
    if (openedFiles.length > 0) {
      const tinHoc = openedFiles.filter((n) => !n.endsWith("_CN")).sort();
      const congNghe = openedFiles.filter((n) => n.endsWith("_CN")).map((n) => n.replace("_CN", "")).sort();

      const groupClassesByGrade = (classes) => {
        if (classes.length === 0) return ["Không có"];
        const groups = {};
        classes.forEach((cls) => {
          const grade = cls.split(".")[0];
          if (!groups[grade]) groups[grade] = [];
          groups[grade].push(cls);
        });
        // Trả về mảng các dòng, mỗi dòng là các lớp cùng khối nối bằng dấu phẩy
        return Object.keys(groups)
          .sort() // sắp xếp khối theo thứ tự
          .map((grade) => groups[grade].join(", "));
      };

      setMessage(
        <div style={{ lineHeight: 1.6, fontSize: "0.95rem" }}>
          ✅ <strong>Đã xuất kết quả lớp:</strong>

          <div style={{ marginTop: 8, marginLeft: 20 }}>
            • <strong>Tin học:</strong>
            <div style={{ marginLeft: 24, whiteSpace: "pre-line", lineHeight: 1.6 }}>
              {groupClassesByGrade(tinHoc).join("\n")}
            </div>
          </div>

          <div style={{ marginTop: 8, marginLeft: 20 }}>
            • <strong>Công nghệ:</strong>
            <div style={{ marginLeft: 24, whiteSpace: "pre-line", lineHeight: 1.6 }}>
              {groupClassesByGrade(congNghe).join("\n")}
            </div>
          </div>

          {skipped.length > 0 && (
            <div style={{ marginTop: 10, marginLeft: 20 }}>
              ⚠️ <strong>Các lớp bị bỏ qua:</strong>
              <ul style={{ marginTop: 6, marginLeft: 24, lineHeight: 1.6, listStyleType: "none", padding: 0 }}>
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
        <div>
          ⚠️ Không có lớp nào được xuất.
          {skipped.length > 0 && (
            <ul style={{ marginTop: 6, marginLeft: 24, lineHeight: 1.6 }}>
              {skipped.map((msg, idx) => (
                <li key={idx}>❌ {msg}</li>
              ))}
            </ul>
          )}
        </div>
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


  return (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 5 }}>
    <Card elevation={6} sx={{ p: 4, borderRadius: 3, maxWidth: 400, mx: "auto" }}>
      <Typography variant="h5" color="primary" fontWeight="bold" align="center">
        XUẤT KẾT QUẢ GIÁO DỤC
      </Typography>

      <Stack spacing={3} sx={{ mt: 3 }}>
        {/* 🔹 Chọn học kỳ */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={termText}
            onChange={handleTermChange}
            sx={{
              bgcolor: "white",
              borderRadius: 1,
              fontSize: 14,
              "& .MuiSelect-select": { py: 0.8, px: 1 },
            }}
          >
            <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
            <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
            <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
            <MenuItem value="Cả năm">Cả năm</MenuItem>
          </Select>
        </FormControl>

        {/* 🔹 Chọn thư mục */}
        <Button
          variant="outlined"
          color="primary"
          onClick={handleSelectFolder}
        >
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
          Thực hiện
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
      </Stack>
    </Card>
  </Box>
);

}

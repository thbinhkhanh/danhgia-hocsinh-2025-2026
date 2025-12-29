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

import {
  doc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
} from "firebase/firestore";

import { getDatabase, ref, get, set } from "firebase/database";

import { db } from "../firebase";
import { useConfig } from "../context/ConfigContext";



export default function XuatDanhGia() {
  const { config } = useConfig(); // ✅ Lấy học kỳ từ context
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [folderHandle, setFolderHandle] = useState(null);

  const rtdb = getDatabase(); // ✅ BẮT BUỘC PHẢI CÓ

  // 🔹 Map học kỳ hiển thị → mã Firestore
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

  // 🔹 Khi học kỳ trong context thay đổi → cập nhật mã Firestore
  const [termText, setTermText] = useState(config.hocKy || "Giữa kỳ I");
  const [term, setTerm] = useState(mapTerm(termText));

  useEffect(() => {
    if (config.hocKy && config.hocKy !== termText) {
      setTermText(config.hocKy);
      setTerm(mapTerm(config.hocKy));
    }
  }, [config.hocKy]);

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
        const classDataRaw = data[className];
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
          if (rowNumber < 2) return; // bỏ header
          const idExcel = String(row.getCell(colId).value || "")
            .trim()
            .replace(/[\u200B-\u200D\uFEFF]/g, "");
          const hs = classData[idExcel];
          if (!hs) return;

          matchCount++;

          if (term === "GKI" || term === "GKII") {
            // Giữa kỳ I & II: xuất dgtx_mucdat + dgtx_nx
            if (colDgtx > 0) row.getCell(colDgtx).value = hs.dgtx_mucdat || "";
            if (colNX > 0) row.getCell(colNX).value = hs.dgtx_nx || "";
          } else {
            // Cuối kỳ hoặc cả năm: xuất dgtx_mucdat + nhanXet + tongCong (cột F)
            if (colDgtx > 0) row.getCell(colDgtx).value = hs.mucDat || "";
            if (colNX > 0) row.getCell(colNX).value = hs.nhanXet || "";
            // Cột F (index 6 trong ExcelJS, 1-based) = tongCong
            row.getCell(6).value = hs.tongCong ?? "";
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

      if (openedFiles.length > 0) {
        const tinHoc = openedFiles.filter((n) => !n.endsWith("_CN")).sort();
        const congNghe = openedFiles
          .filter((n) => n.endsWith("_CN"))
          .map((n) => n.replace("_CN", ""))
          .sort();

        const groupClassesByGrade = (classes) => {
          if (classes.length === 0) return ["Không có"];
          const groups = {};
          classes.forEach((cls) => {
            const grade = cls.split(".")[0];
            if (!groups[grade]) groups[grade] = [];
            groups[grade].push(cls);
          });
          return Object.keys(groups)
            .sort()
            .map((grade) => groups[grade].join(", "));
        };

        setMessage(
          <div style={{ lineHeight: 1.6, fontSize: "0.95rem" }}>
            ✅ <strong>Đã xuất kết quả {termText}:</strong>

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

  const handleChuyenDuLieu = async () => {
  try {
    setLoading(true);
    setMessage("🔄 Đang chuyển đổi dữ liệu...");
    setProgress(0);

    const TERM_LIST = ["GKI", "CKI", "GKII", "CN"];
    const CLASS_LIST = [
      "4.1", "4.2", "4.3", "4.4", "4.5", "4.6",
      "5.1", "5.1_CN", "5.2", "5.3", "5.4", "5.4_CN"
    ];

    // 1️⃣ Lấy toàn bộ KTDK theo học kỳ
    const ktdkByTerm = {};
    for (const term of TERM_LIST) {
      const snap = await getDoc(doc(db, "KTDK", term));
      if (snap.exists()) ktdkByTerm[term] = snap.data();
    }

    let done = 0;

    // 2️⃣ Duyệt qua tất cả lớp
    for (const lop of CLASS_LIST) {
      const lopKey = lop.replace(".", "_");
      const batch = writeBatch(db);

      // Lấy danh sách học sinh
      const dsSnap = await getDoc(doc(db, "DANHSACH", lop));
      if (!dsSnap.exists()) continue;
      const danhSach = dsSnap.data();

      // Lấy DGTX theo tuần
      const tuanSnap = await getDocs(collection(db, `DGTX/${lop}/tuan`));
      const dgtxTuanMap = {};

      tuanSnap.forEach(tuanDoc => {
        const tuanId = tuanDoc.id;
        const tuanData = tuanDoc.data();

        Object.entries(tuanData).forEach(([maHS, info]) => {
          if (!dgtxTuanMap[maHS]) dgtxTuanMap[maHS] = {};

          const { hoVaTen, diemTN, diemTracNghiem, ...rest } = info || {};

          // Gán dữ liệu với field mới
          dgtxTuanMap[maHS][tuanId] = {
            ...rest,
            ...(diemTN !== undefined ? { TN_diem: diemTN } : {}),
            ...(diemTracNghiem !== undefined ? { TN_status: diemTracNghiem } : {})
          };
        });
      });


      let stt = 1;

      for (const [maHS, hs] of Object.entries(danhSach)) {
        const hsRef = doc(db, "DATA", lopKey, "HOCSINH", maHS);

        // Chuẩn bị KTDK cho TinHoc & CongNghe
        const tinHocKtdk = {};
        const congNgheKtdk = {};

        for (const term of TERM_LIST) {
          const tin = ktdkByTerm[term]?.[lop]?.[maHS] || {};
          const cn = ktdkByTerm[term]?.[`${lop}_CN`]?.[maHS] || {};

          tinHocKtdk[term] = {
            dgtx_gv: tin.dgtx_gv || "",
            dgtx_mucdat: tin.dgtx_mucdat || "",
            dgtx_nx: tin.dgtx_nx || "",
            mucDat: tin.mucDat || "",
            nhanXet: tin.nhanXet || "",
            tongCong: tin.tongCong ?? null,
            lyThuyet: tin.lyThuyet ?? null,
            thucHanh: tin.thucHanh ?? null
          };

          congNgheKtdk[term] = {
            dgtx_gv: cn.dgtx_gv || "",
            dgtx_mucdat: cn.dgtx_mucdat || "",
            dgtx_nx: cn.dgtx_nx || "",
            mucDat: cn.mucDat || "",
            nhanXet: cn.nhanXet || "",
            tongCong: cn.tongCong ?? null,
            lyThuyet: cn.lyThuyet ?? null,
            thucHanh: cn.thucHanh ?? "" // luôn chuỗi T/H/C
          };
        }

        let congNgheData = {};
        let tinHocData = {};

        if (!lop.includes("_CN") && CLASS_LIST.includes(`${lop}_CN`)) {
          // Lớp thường có CN
          tinHocData = { dgtx: dgtxTuanMap[maHS] || {}, ktdk: tinHocKtdk };
          congNgheData = { dgtx: {}, ktdk: congNgheKtdk };
        } else if (lop.includes("_CN")) {
          // Lớp CN chỉ CongNghe
          congNgheData = { dgtx: dgtxTuanMap[maHS] || {}, ktdk: congNgheKtdk };
        } else {
          // Lớp bình thường chỉ TinHoc
          tinHocData = { dgtx: dgtxTuanMap[maHS] || {}, ktdk: tinHocKtdk };
        }

        const hsData = {
          hoVaTen: hs.hoVaTen || "",
          stt: stt++,
          ...(Object.keys(congNgheData).length ? { CongNghe: congNgheData } : {}),
          ...(Object.keys(tinHocData).length ? { TinHoc: tinHocData } : {})
        };

        batch.set(hsRef, hsData, { merge: true });
      }

      await batch.commit();
      done++;
      setProgress(Math.round((done / CLASS_LIST.length) * 100));
    }

    setMessage("✅ Chuyển đổi toàn bộ dữ liệu TẤT CẢ lớp, bao gồm CN!");
    setSuccess(true);
  } catch (err) {
    console.error("❌ Lỗi chuyển đổi:", err);
    setMessage("❌ Lỗi khi chuyển dữ liệu");
    setSuccess(false);
  } finally {
    setLoading(false);
  }
};


  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 5 }}>
      <Card elevation={6} sx={{ p: 4, borderRadius: 3, maxWidth: 420, mx: "auto" }}>
        <Typography
          variant="h5"
          color="primary"
          fontWeight="bold"
          align="center"
          sx={{ mb: 2 }}
        >
          {`XUẤT KẾT QUẢ ${termText ? ` ${termText.toUpperCase()}` : ""}`}
        </Typography>


        <Stack spacing={3}>
          {/* 🔹 Chọn thư mục */}
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

          {/*<Button
            variant="contained"
            color="warning"
            onClick={handleChuyenDuLieu}
            disabled={loading}
          >
            🔁 Chuyển dữ liệu vào DATA
          </Button>*/}

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

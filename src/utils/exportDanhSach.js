// exportDanhsach.js
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Xuất danh sách học sinh của một lớp ra Excel
 * @param {string} className - Tên lớp (ví dụ: "4.5_CN")
 */
export const exportDanhsach = async (className) => {
  if (!className) {
    console.error("❌ Thiếu tên lớp để xuất danh sách!");
    return;
  }

  try {
    // 🔹 Lấy dữ liệu từ Firestore
    const classDocRef = doc(db, "DANHSACH", className);
    const classSnap = await getDoc(classDocRef);

    if (!classSnap.exists()) {
      alert(`Không tìm thấy danh sách học sinh của lớp "${className}"`);
      return;
    }

    const data = classSnap.data();

    // 🔹 Xử lý danh sách học sinh
    let students = Object.entries(data).map(([maDinhDanh, info]) => ({
      "MÃ ĐỊNH DANH": maDinhDanh,
      "HỌ VÀ TÊN": info.hoVaTen || "",
      "GHI CHÚ": "",
    }));

    // 🔹 Sắp xếp theo tên từ phải sang trái (giống DanhSachHS)
    students.sort((a, b) => {
      const partsA = a["HỌ VÀ TÊN"].replace(/\//g, " ").trim().split(/\s+/);
      const partsB = b["HỌ VÀ TÊN"].replace(/\//g, " ").trim().split(/\s+/);
      const len = Math.max(partsA.length, partsB.length);
      for (let i = 1; i <= len; i++) {
        const wordA = partsA[partsA.length - i] || "";
        const wordB = partsB[partsB.length - i] || "";
        const cmp = wordA.localeCompare(wordB, "vi", { sensitivity: "base" });
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    // 🔹 Thêm STT
    students = students.map((stu, idx) => ({
      STT: idx + 1,
      ...stu,
    }));

    // 🧾 Tạo workbook và worksheet
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Danh sách", {
        pageSetup: {
            paperSize: 9,             // A4
            orientation: "portrait",  // dọc
            fitToPage: true,          // vừa 1 trang
            margins: {                // ✅ đặt lề trang
            top: 0.5,
            bottom: 0.5,
            left: 0.5,
            right: 0.5,
            header: 0.3,
            footer: 0.3,
            },
        },
        });


    // 🔹 Tiêu đề
    const titleRow = sheet.addRow([`DANH SÁCH HỌC SINH LỚP ${className}`]);
    titleRow.font = { size: 14, bold: true, color: { argb: "FF0D47A1" } };
    sheet.mergeCells(`A1:D1`);
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 28;
    sheet.addRow([]);

    // 🔹 Header
    const headerKeys = ["STT", "MÃ ĐỊNH DANH", "HỌ VÀ TÊN", "GHI CHÚ"];
    const headerRow = sheet.addRow(headerKeys);
    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1976D2" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // 🔹 Ghi dữ liệu học sinh
    students.forEach((stu) => {
      const row = sheet.addRow(headerKeys.map((k) => stu[k] || ""));
      row.height = 40; // tăng chiều cao hàng

      row.eachCell((cell, colNumber) => {
        const key = headerKeys[colNumber - 1];
        cell.alignment = {
          horizontal: key === "HỌ VÀ TÊN" ? "left" : "center",
          vertical: "middle",
          indent: key === "HỌ VÀ TÊN" ? 1 : 0, // thụt lề nhẹ
          wrapText: key === "HỌ VÀ TÊN" || key === "GHI CHÚ", // tự động xuống dòng
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // 🔹 Đặt độ rộng cột
    sheet.columns = [
      { width: 8 },   // STT
      { width: 18 },  // MÃ ĐỊNH DANH
      { width: 36 },  // ✅ HỌ VÀ TÊN — tăng rộng, dễ đọc
      { width: 40 },  // ✅ GHI CHÚ — đủ chỗ viết nhiều
    ];

    // 💾 Xuất file Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Danh sách HS lớp ${className}.xlsx`);
  } catch (err) {
    console.error("❌ Lỗi khi xuất danh sách:", err);
    alert("Xuất danh sách thất bại. Vui lòng thử lại!");
  }
};

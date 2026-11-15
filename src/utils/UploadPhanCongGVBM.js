
import * as XLSX from "xlsx";
import { doc, writeBatch } from "firebase/firestore";

/**
 * Excel:
 * B:D -> PhanCongVGBM
 * F:G -> GVBM
 * I:J -> GVCN
 *
 * Firestore:
 * INDANHGIA_2026-2027
 */
export const UploadPhanCongGVBM = async ({ file, db }) => {
  if (!file) throw new Error("Vui lòng chọn file Excel.");
  if (!db) throw new Error("Chưa có kết nối Firestore.");

  try {
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("File Excel không có trang tính.");
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false
    });

    if (!rows || rows.length < 2) {
      throw new Error("File Excel không có dữ liệu phân công.");
    }

    // Chuẩn hóa dữ liệu, loại bỏ khoảng trắng thừa
    const clean = (value) =>
      String(value ?? "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // B:D - Phân công giáo viên bộ môn
    const phanCongVGBM = rows.slice(1)
      .map((row) => ({
        lop: clean(row[1]),
        monHoc: clean(row[2]),
        giaoVienBoMon: clean(row[3])
      }))
      .filter(item =>
        item.lop && item.monHoc && item.giaoVienBoMon
      );

    // F:G - Danh sách giáo viên bộ môn
    const gvbm = rows.slice(1)
      .map((row) => ({
        giaoVien: clean(row[5]),
        monHoc: clean(row[6])
      }))
      .filter(item =>
        item.giaoVien && item.monHoc
      );

    // I:J - Danh sách giáo viên chủ nhiệm
    const gvcn = rows.slice(1)
      .map((row) => ({
        giaoVienChuNhiem: clean(row[8]),
        lop: clean(row[9])
      }))
      .filter(item =>
        item.giaoVienChuNhiem && item.lop
      );

    if (
      phanCongVGBM.length === 0 &&
      gvbm.length === 0 &&
      gvcn.length === 0
    ) {
      throw new Error(
        "Không tìm thấy dữ liệu trong các cột B:D, F:G, I:J."
      );
    }

    // Lưu cố định vào collection năm học
    const collectionName = "INDANHGIA_2026-2027";
    const batch = writeBatch(db);
    const updatedAt = new Date().toISOString();

    batch.set(doc(db, collectionName, "PhanCongVGBM"), {
      data: phanCongVGBM,
      updatedAt
    });

    batch.set(doc(db, collectionName, "GVBM"), {
      data: gvbm,
      updatedAt
    });

    batch.set(doc(db, collectionName, "GVCN"), {
      data: gvcn,
      updatedAt
    });

    await batch.commit();

    return {
      success: true,
      counts: {
        PhanCongVGBM: phanCongVGBM.length,
        GVBM: gvbm.length,
        GVCN: gvcn.length
      }
    };

  } catch (error) {
    console.error("Lỗi nhập file phân công:", error);
    throw error;
  }
};

export default UploadPhanCongGVBM;

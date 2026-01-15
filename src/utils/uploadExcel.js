// src/utils/uploadExcel.js
//import * as XLSX from "xlsx";
import { doc, setDoc } from "firebase/firestore";

/* ================== UPLOAD DANH SÁCH HỌC SINH ================== */
export const uploadStudents = async ({
  file,
  db,
  selectedClass,
  onProgress,
}) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  const dataToSave = {};
  const total = jsonData.length;

  for (let i = 0; i < jsonData.length; i++) {
    const item = jsonData[i];

    if (item.maDinhDanh && item.hoVaTen) {
      dataToSave[item.maDinhDanh] = {
        hoVaTen: item.hoVaTen,
      };
    }

    // 🔥 Progress khi xử lý file (NHANH – mượt)
    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  // ✅ GHI FIRESTORE 1 LẦN DUY NHẤT
  await setDoc(
    doc(db, "DANHSACH", selectedClass),
    dataToSave,
    { merge: true }
  );
};


/* ================== UPLOAD PHÂN PHỐI CHƯƠNG TRÌNH ================== */
export const uploadPPCT = async ({
  file,
  db,
  namHoc,
  onProgress,
}) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  const validRows = jsonData.filter(
    (i) =>
      i["Tuần"] &&
      i["Chủ đề"] &&
      i["Tên bài học"] &&
      i["Khối"] &&
      (i["LT"] || i["TH"])
  );

  const khoiData = {};
  const updatedKhoiSet = new Set(); // ⭐ QUAN TRỌNG

  for (let i = 0; i < validRows.length; i++) {
    const item = validRows[i];
    const khoi = `khoi${item["Khối"]}`;
    const khoiNamHoc = `${khoi}_${namHoc}`;
    updatedKhoiSet.add(khoi); // ⭐ lưu khối

    const tuanKey =
      "tuan_" +
      String(item["Tuần"]).replace(/\s+/g, "").replace(/\+/g, "_");

    if (!khoiData[khoiNamHoc]) khoiData[khoiNamHoc] = {};

    khoiData[khoiNamHoc][tuanKey] = {
      chuDe: item["Chủ đề"],
      tenBaiHoc: item["Tên bài học"],
      lt: Number(item["LT"] || 0),
      th: Number(item["TH"] || 0),
    };

    if (onProgress) {
      onProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
  }

  for (const khoiNamHoc in khoiData) {
    await setDoc(doc(db, "PPCT", khoiNamHoc), khoiData[khoiNamHoc]);
  }

  // ✅ TRẢ VỀ CÁC KHỐI ĐÃ ĐƯỢC UPDATE
  return Array.from(updatedKhoiSet);
};


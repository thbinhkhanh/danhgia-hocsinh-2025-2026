import * as XLSX from "xlsx";
import { doc, setDoc } from "firebase/firestore";

export const uploadStudents = async ({
  file,
  db,
  selectedClass,
  namHocKey,
  onProgress,
}) => {
  if (!namHocKey) {
    throw new Error("namHocKey is undefined ❌");
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  // 👉 Gom nhóm theo lớp
  const groupedByClass = {};

  jsonData.forEach((item) => {
    const ma =
      item.maDinhDanh ||
      item["MÃ ĐỊNH DANH"];

    const ten =
      item.hoVaTen ||
      item["HỌ VÀ TÊN"];

    const lopRaw =
      item.lop ||
      item["LỚP"] ||
      selectedClass;

    // ✅ FIX: đọc STT đa dạng header
    const stt =
      item.stt ||
      item["STT"] ||
      item["SỐ THỨ TỰ"] ||
      item["SO THU TU"];

    if (ma && ten) {
      if (!groupedByClass[lopRaw]) {
        groupedByClass[lopRaw] = {};
      }

      groupedByClass[lopRaw][ma] = {
        hoVaTen: (ten || "").toUpperCase(), // ✅ IN HOA
        lop: String(lopRaw),          // luôn là string "4.1"
        stt: stt ? Number(stt) : null // ép số an toàn
      };
    }
  });

  // 👉 Ghi từng lớp vào Firestore
  const classKeys = Object.keys(groupedByClass);

  for (let i = 0; i < classKeys.length; i++) {
    const lop = classKeys[i];

    const classRef = doc(db, `DANHSACH_${namHocKey}`, lop);

    await setDoc(classRef, groupedByClass[lop], { merge: true });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / classKeys.length) * 100));
    }
  }
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


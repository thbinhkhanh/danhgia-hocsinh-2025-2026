import * as XLSX from "xlsx";
import { doc, setDoc } from "firebase/firestore";

/* ================== UPLOAD HỌC SINH ================== */
export const uploadStudents = async ({
  file,
  files,
  db,
  selectedClass,
  namHocKey,
  onProgress,
}) => {
  if (!namHocKey) {
    throw new Error("namHocKey is undefined ❌");
  }

  // file đơn hoặc thư mục
  const fileList = files
    ? Array.from(files)
    : file
      ? [file]
      : [];

  if (!fileList.length) return;

  const groupedByClass = {};

  // ===== Đọc tất cả file =====
  for (const f of fileList) {
    const path = f.webkitRelativePath || f.name;

    // tên file => tên lớp nếu không có cột LỚP
    const fileClass = path
      .split("/")
      .pop()
      .replace(/\.[^/.]+$/, "")
      .trim();

    const data = await f.arrayBuffer();

    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    jsonData.forEach((item) => {
      const ma =
        item.maDinhDanh ||
        item["MÃ ĐỊNH DANH"];

      const ten =
        item.hoVaTen ||
        item["HỌ VÀ TÊN"];

      const lop =
        item.lop ||
        item["LỚP"] ||
        selectedClass ||
        fileClass;

      const stt =
        item.stt ||
        item["STT"] ||
        item["SỐ THỨ TỰ"] ||
        item["SO THU TU"];

      if (!ma || !ten) return;

      if (!groupedByClass[lop]) {
        groupedByClass[lop] = {};
      }

      groupedByClass[lop][String(ma).trim()] = {
        hoVaTen: String(ten).trim().toUpperCase(),
        lop: String(lop),
        stt: stt ? Number(stt) : null,
      };
    });
  }

  // ===== Upload Firestore =====
  const classKeys = Object.keys(groupedByClass);

  for (let i = 0; i < classKeys.length; i++) {
    const lop = classKeys[i];

    await setDoc(
      doc(db, `DANHSACH_${namHocKey}`, lop),
      groupedByClass[lop],
      { merge: true }
    );

    if (onProgress) {
      onProgress(
        Math.round(((i + 1) / classKeys.length) * 100)
      );
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
  const updatedKhoiSet = new Set();

  for (let i = 0; i < validRows.length; i++) {
    const item = validRows[i];

    const khoi = `khoi${item["Khối"]}`;
    const khoiNamHoc = `${khoi}_${namHoc}`;

    updatedKhoiSet.add(khoi);

    const tuanKey =
      "tuan_" +
      String(item["Tuần"])
        .replace(/\s+/g, "")
        .replace(/\+/g, "_");

    if (!khoiData[khoiNamHoc]) {
      khoiData[khoiNamHoc] = {};
    }

    khoiData[khoiNamHoc][tuanKey] = {
      chuDe: item["Chủ đề"],
      tenBaiHoc: item["Tên bài học"],
      lt: Number(item["LT"] || 0),
      th: Number(item["TH"] || 0),
    };

    if (onProgress) {
      onProgress(
        Math.round(((i + 1) / validRows.length) * 100)
      );
    }
  }

  for (const khoiNamHoc in khoiData) {
    await setDoc(
      doc(db, "PPCT", khoiNamHoc),
      khoiData[khoiNamHoc]
    );
  }

  return Array.from(updatedKhoiSet);
};
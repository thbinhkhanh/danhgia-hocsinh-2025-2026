import * as XLSX from "xlsx";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";

/* ================== UPLOAD HỌC SINH (FAST) ================== */
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

  const fileList = files
    ? Array.from(files)
    : file
      ? [file]
      : [];

  if (!fileList.length) return;

  let allRows = [];

  // ===== LOAD ALL ROWS =====
  for (const f of fileList) {
    const path = f.webkitRelativePath || f.name;

    const fileClass = path
      .split("/")
      .pop()
      .replace(/\.[^/.]+$/, "")
      .trim();

    const workbook = XLSX.read(await f.arrayBuffer());
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    rows.forEach((item) => {
      const ma = item.maDinhDanh || item["MÃ ĐỊNH DANH"];
      const ten = item.hoVaTen || item["HỌ VÀ TÊN"];

      if (!ma || !ten) return;

      const rawLop =
        item.lop ||
        item["LỚP"] ||
        selectedClass ||
        fileClass;

      const lop = String(rawLop)
        .replaceAll("_", ".")
        .trim();

      const stt =
        item.stt ||
        item["STT"] ||
        item["SỐ THỨ TỰ"] ||
        item["SO THU TU"];

      allRows.push({
        ma,
        ten,
        lop,
        stt,
      });
    });
  }

  // ===== 📌 1. AUTO ADD CLASS TO DANHSACH_LOP =====
  const classSet = new Set(allRows.map((r) => r.lop));
  const newClasses = Array.from(classSet);

  const classRef = doc(db, "DANHSACH_LOP", namHocKey);
  const classSnap = await getDoc(classRef);

  let existingClasses = [];

  if (classSnap.exists()) {
    existingClasses = classSnap.data().list || [];
  }

  const mergedClasses = Array.from(
    new Set([...existingClasses, ...newClasses])
  ).sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

  await setDoc(
    classRef,
    { list: mergedClasses },
    { merge: true }
  );

  // ===== TEMPLATE =====
  const buildSubject = () => ({
    dgtx: {},
    ktdk: {
      CN: {},
      CKI: {},
      GKI: {},
      GKII: {},
    },
    ontap: {
      CN: {},
      CKI: {},
      GKI: {},
      GKII: {},
    },
  });

  const batchSize = 450;
  let done = 0;

  // ===== UPLOAD STUDENTS =====
  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = allRows.slice(i, i + batchSize);

    chunk.forEach(({ ma, ten, lop, stt }) => {
      const ref = doc(
        db,
        `DATA_${namHocKey}`,
        lop,
        "HOCSINH",
        String(ma).trim()
      );

      batch.set(
        ref,
        {
          hoVaTen: ten.toUpperCase(),
          lop,
          stt: stt ? Number(stt) : null,
          TinHoc: buildSubject(),
          CongNghe: buildSubject(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    done += chunk.length;

    if (onProgress) {
      onProgress(Math.round((done / allRows.length) * 100));
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
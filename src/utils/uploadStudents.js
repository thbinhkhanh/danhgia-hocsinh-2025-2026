import * as XLSX from "xlsx";

import {
  doc,
  writeBatch,
  collection,
  getDocs,
} from "firebase/firestore";

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

  const fileList = files
    ? Array.from(files)
    : file
    ? [file]
    : [];

  if (!fileList.length) return;

  let allRows = [];

  // ================= NORMALIZE =================

  const normalizeId = (id) =>
    String(id)
      .replace(/\.0$/, "")
      .trim()
      .replace(/\s+/g, "");

  const normalizeClass = (lop) =>
    String(lop)
      .trim()
      .replace(/\./g, "_");

  const makeKey = (lop, ma) =>
    `${normalizeClass(lop)}_${normalizeId(ma)}`;

  // ================= LOAD EXCEL =================

  for (const f of fileList) {
    const path = f.webkitRelativePath || f.name;

    const fileClass = path
      .split("/")
      .pop()
      .replace(/\.[^/.]+$/, "")
      .trim();

    const workbook = XLSX.read(
      await f.arrayBuffer()
    );

    const sheet =
      workbook.Sheets[
        workbook.SheetNames[0]
      ];

    const rows =
      XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

    if (!rows.length) continue;

    rows.forEach((item) => {
      const ma =
        item["Mã học sinh"] ||
        item["MÃ HỌC SINH"] ||
        item.maDinhDanh;

      const ten =
        item["Họ và tên"] ||
        item["HỌ VÀ TÊN"] ||
        item.hoVaTen;

      if (!ma || !ten) return;

      // Cột lớp hoặc fallback tên file
      let rawLop =
        item["Lớp"] ||
        item["LỚP"] ||
        item.lop;

      if (!rawLop) {
        rawLop = fileClass;
      }

      const lop = normalizeClass(rawLop);

      allRows.push({
        ma: normalizeId(ma),
        ten,
        lop,
        stt:
          item.stt ||
          item["STT"] ||
          item["SỐ THỨ TỰ"] ||
          item["SO THU TU"],
      });
    });
  }

  // ================= BUILD SOURCE SET =================

  const sourceSet = new Set(
    allRows.map((r) =>
      makeKey(r.lop, r.ma)
    )
  );

  // ================= BUILD TARGET SET =================

  const targetSet = new Set();

  const classList = [
    ...new Set(
      allRows.map((r) => r.lop)
    ),
  ];

  for (const lop of classList) {
    const snap = await getDocs(
      collection(
        db,
        `DATA_${namHocKey}`,
        lop,
        "HOCSINH"
      )
    );

    snap.forEach((studentDoc) => {
      targetSet.add(
        makeKey(lop, studentDoc.id)
      );
    });
  }

  // ================= DIFF =================

  const missingKeys = [
    ...sourceSet,
  ].filter(
    (key) => !targetSet.has(key)
  );

  if (!missingKeys.length) {
    return;
  }

  // ================= MAP BACK =================

  const missingStudents =
    allRows.filter((row) =>
      missingKeys.includes(
        makeKey(row.lop, row.ma)
      )
    );

  // ================= SUBJECT =================

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

  // ================= BATCH INSERT =================

  const batchSize = 450;

  let done = 0;

  for (
    let i = 0;
    i < missingStudents.length;
    i += batchSize
  ) {
    const batch = writeBatch(db);

    const chunk =
      missingStudents.slice(
        i,
        i + batchSize
      );

    for (const {
      ma,
      ten,
      lop,
      stt,
    } of chunk) {
      batch.set(
        doc(
          db,
          `DATA_${namHocKey}`,
          lop,
          "HOCSINH",
          ma
        ),
        {
          hoVaTen:
            String(ten).toUpperCase(),

          lop,

          stt: stt
            ? Number(stt)
            : null,

          TinHoc: buildSubject(),

          CongNghe:
            buildSubject(),
        }
      );
    }

    await batch.commit();

    done += chunk.length;

    if (onProgress) {
      onProgress(
        Math.round(
          (done /
            missingStudents.length) *
            100
        )
      );
    }
  }
};

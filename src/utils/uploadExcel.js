import * as XLSX from "xlsx";
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  collection,
  getDocs,
} from "firebase/firestore";

/* ================== UPLOAD HỌC SINH (FAST DIFF MAP VERSION) ================== */
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
      .replace(/\./g, "_"); // 4.1 -> 4_1

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

    const workbook = XLSX.read(await f.arrayBuffer());
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

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

      // 👉 cột lớp hoặc fallback file name
      let rawLop =
        item["Lớp"] ||
        item["LỚP"] ||
        item.lop;

      if (!rawLop) rawLop = fileClass;

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


  // ================= BUILD SOURCE SET (EXCEL) =================
  const sourceSet = new Set(
    allRows.map((r) => makeKey(r.lop, r.ma))
  );

  // ================= BUILD TARGET SET (FIRESTORE) =================
  const targetSet = new Set();

  const classList = [...new Set(allRows.map((r) => r.lop))];

  for (const lop of classList) {
    const snap = await getDocs(
      collection(db, `DATA_${namHocKey}`, lop, "HOCSINH")
    );

    snap.forEach((doc) => {
      targetSet.add(makeKey(lop, doc.id));
    });
  }

  // ================= DIFF =================
  const missingKeys = [...sourceSet].filter(
    (key) => !targetSet.has(key)
  );

  if (!missingKeys.length) {
    return;
  }

  // ================= MAP BACK TO STUDENTS =================
  const missingStudents = allRows.filter((row) =>
    missingKeys.includes(makeKey(row.lop, row.ma))
  );

  // ================= BATCH INSERT =================
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

  for (let i = 0; i < missingStudents.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = missingStudents.slice(i, i + batchSize);

    for (const { ma, ten, lop, stt } of chunk) {
      batch.set(
        doc(db, `DATA_${namHocKey}`, lop, "HOCSINH", ma),
        {
          hoVaTen: ten.toUpperCase(),
          lop,
          stt: stt ? Number(stt) : null,
          TinHoc: buildSubject(),
          CongNghe: buildSubject(),
        }
      );

    }

    await batch.commit();

    done += chunk.length;

    if (onProgress) {
      onProgress(
        Math.round((done / missingStudents.length) * 100)
      );
    }
  }

};

/* ================== UPLOAD PHÂN PHỐI CHƯƠNG TRÌNH ================== */
export const uploadPPCT = async ({
  file,
  db,
  namHoc,
  mon = "Tin học",
  khoi,
  onProgress,
}) => {
  if (!file) {
    throw new Error("Chưa chọn file PPCT ❌");
  }

  if (!namHoc) {
    throw new Error("Năm học không xác định ❌");
  }

  if (!mon) {
    throw new Error("Môn học không xác định ❌");
  }

  if (!khoi) {
    throw new Error("Khối không xác định ❌");
  }

  // ================= ĐỌC FILE EXCEL =================

  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data);

  const sheet =
    workbook.Sheets[workbook.SheetNames[0]];

  const jsonData = XLSX.utils.sheet_to_json(
    sheet,
    {
      defval: "",
    }
  );

  if (!jsonData.length) {
    throw new Error(
      "File Excel không có dữ liệu ❌"
    );
  }

  // ================= XÁC ĐỊNH DOCUMENT =================

  /*
   * Tin học:
   *
   * PPCT/khoi4_2025-2026
   * PPCT/khoi5_2025-2026
   *
   * Công nghệ:
   *
   * PPCT/CongNghe_khoi4_2025-2026
   * PPCT/CongNghe_khoi5_2025-2026
   */

  const ppctDocId =
    mon === "Tin học"
      ? `${khoi}_${namHoc}`
      : `CongNghe_${khoi}_${namHoc}`;

  console.log(
    "================================="
  );

  console.log("📚 UPLOAD PPCT");

  console.log("Môn:", mon);

  console.log("Khối:", khoi);

  console.log("Năm học:", namHoc);

  console.log(
    "Document:",
    `PPCT/${ppctDocId}`
  );

  console.log(
    "================================="
  );

  // ================= XỬ LÝ DỮ LIỆU =================

  const ppctData = {};

  let currentChuDe = "";

  const rows = jsonData;

  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];

    // -----------------------------
    // Lấy tuần
    // -----------------------------

    const rawTuan = String(
      item["Tuần"] || ""
    ).trim();

    if (!rawTuan) {
      continue;
    }

    // -----------------------------
    // Lấy chủ đề
    // -----------------------------

    const rawChuDe = String(
      item["Chủ đề"] || ""
    ).trim();

    /*
     * Nếu dòng có Chủ đề mới
     * thì cập nhật chủ đề hiện tại.
     *
     * Nếu Chủ đề trống:
     * dùng lại Chủ đề của dòng trước.
     */

    if (rawChuDe) {
      currentChuDe = rawChuDe;
    }

    // -----------------------------
    // Lấy tên bài học
    // -----------------------------

    const tenBaiHoc = String(
      item["Tên bài học"] || ""
    ).trim();

    if (!tenBaiHoc) {
      continue;
    }

    // -----------------------------
    // LT / TH
    // -----------------------------

    const lt =
      item["LT"] === "" ||
      item["LT"] === null ||
      item["LT"] === undefined
        ? 0
        : Number(item["LT"]) || 0;

    const th =
      item["TH"] === "" ||
      item["TH"] === null ||
      item["TH"] === undefined
        ? 0
        : Number(item["TH"]) || 0;

    // -----------------------------
    // TẠO KEY TUẦN
    // -----------------------------

    /*
     * CHUẨN LƯU CHUNG CHO CẢ
     * TIN HỌC VÀ CÔNG NGHỆ
     *
     * Excel:
     *
     * 1 – 2   → tuan_1,2
     * 3 – 6   → tuan_3,6
     * 7 – 8   → tuan_7,8
     * 13 – 16 → tuan_13,16
     * 17      → tuan_17
     *
     * Lưu ý:
     * KHÔNG dùng "_" để ngăn cách
     * hai số tuần.
     *
     * "_" chỉ nằm sau "tuan".
     */

    const tuanKey =
      "tuan_" +
      rawTuan
        .replace(/\s+/g, "")
        .replace(/[–—−-]/g, ",")
        .replace(/\+/g, ",");

    // -----------------------------
    // Ghi vào object
    // -----------------------------

    ppctData[tuanKey] = {
      chuDe: currentChuDe,

      tenBaiHoc,

      lt,

      th,
    };

    console.log(
      `📌 ${tuanKey}`,
      ppctData[tuanKey]
    );

    // -----------------------------
    // Tiến trình
    // -----------------------------

    if (onProgress) {
      onProgress(
        Math.round(
          ((i + 1) / rows.length) * 80
        )
      );
    }
  }

  // ================= KIỂM TRA =================

  const totalRows =
    Object.keys(ppctData).length;

  if (!totalRows) {
    throw new Error(
      "Không tìm thấy dòng PPCT hợp lệ. Kiểm tra các cột: Tuần, Chủ đề, Tên bài học, LT, TH."
    );
  }

  // ================= GHI FIRESTORE =================

  try {
    const ref = doc(
      db,
      "PPCT",
      ppctDocId
    );

    console.log(
      "⏳ Đang ghi Firestore:",
      `PPCT/${ppctDocId}`
    );

    await setDoc(
      ref,
      ppctData
    );

    console.log(
      "✅ Ghi Firestore thành công:",
      `PPCT/${ppctDocId}`
    );

    if (onProgress) {
      onProgress(100);
    }

    return {
      success: true,

      docId: ppctDocId,

      mon,

      khoi,

      namHoc,

      totalRows,
    };
  } catch (error) {
    console.error(
      "❌ Lỗi ghi PPCT vào Firestore:",
      error
    );

    throw error;
  }
};
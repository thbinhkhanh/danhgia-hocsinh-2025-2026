import * as XLSX from "xlsx";

import {
  doc,
  setDoc,
} from "firebase/firestore";

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
    throw new Error(
      "Chưa chọn file PPCT ❌"
    );
  }

  if (!namHoc) {
    throw new Error(
      "Năm học không xác định ❌"
    );
  }

  if (!mon) {
    throw new Error(
      "Môn học không xác định ❌"
    );
  }

  if (!khoi) {
    throw new Error(
      "Khối không xác định ❌"
    );
  }

  // ================= ĐỌC FILE EXCEL =================

  const data =
    await file.arrayBuffer();

  const workbook = XLSX.read(data);

  const sheet =
    workbook.Sheets[
      workbook.SheetNames[0]
    ];

  const jsonData =
    XLSX.utils.sheet_to_json(
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

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {
    const item = rows[i];

    // ================= TUẦN =================

    const rawTuan = String(
      item["Tuần"] || ""
    ).trim();

    if (!rawTuan) {
      continue;
    }

    // ================= CHỦ ĐỀ =================

    const rawChuDe = String(
      item["Chủ đề"] || ""
    ).trim();

    if (rawChuDe) {
      currentChuDe = rawChuDe;
    }

    // ================= TÊN BÀI HỌC =================

    const tenBaiHoc = String(
      item["Tên bài học"] || ""
    ).trim();

    if (!tenBaiHoc) {
      continue;
    }

    // ================= LT / TH =================

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

    // ================= TẠO KEY TUẦN =================

    /*
     * Ví dụ:
     *
     * 1 – 2   → tuan_1,2
     * 3 – 6   → tuan_3,6
     * 7 – 8   → tuan_7,8
     * 13 – 16 → tuan_13,16
     * 17      → tuan_17
     *
     * Dấu "_" chỉ nằm sau "tuan".
     */

    const tuanKey =
      "tuan_" +
      rawTuan
        .replace(/\s+/g, "")
        .replace(
          /[–—−-]/g,
          ","
        )
        .replace(
          /\+/g,
          ","
        );

    // ================= GHI OBJECT =================

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

    // ================= TIẾN TRÌNH =================

    if (onProgress) {
      onProgress(
        Math.round(
          ((i + 1) /
            rows.length) *
            80
        )
      );
    }
  }

  // ================= KIỂM TRA =================

  const totalRows =
    Object.keys(
      ppctData
    ).length;

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

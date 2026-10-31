export const generateNhanXet = (student, subject, tongCong = null, mucDat = null, nhanXetData = null) => {
  if (!nhanXetData) return student?.nhanXet || "";

  // ===== 1. xác định mức đạt =====
  let computedMucDat = mucDat;

  if (!computedMucDat && subject === "Tin học" && tongCong != null) {
    computedMucDat = tongCong >= 9 ? "T" : tongCong >= 5 ? "H" : "C";
  } 
  else if (!computedMucDat && subject === "Công nghệ" && student?.thucHanh) {
    const lt = parseFloat(student.lyThuyet);
    computedMucDat = !isNaN(lt) ? (lt >= 9 ? "T" : lt >= 5 ? "H" : "C") : "C";
  }

  if (!computedMucDat) return student?.nhanXet || "";

  // ===== 2. map mức đạt =====
  const map = {
    T: "TỐT",
    H: "KHÁ",
    C: "ĐẠT",
  };

  const loai = map[computedMucDat] || "ĐẠT";

  const pickRandom = (arr) =>
    Array.isArray(arr) && arr.length
      ? arr[Math.floor(Math.random() * arr.length)]
      : "";

  const isCuoiKy = tongCong > 0;

  // ===== 3. CÔNG NGHỆ =====
  if (subject === "Công nghệ") {
    const source = nhanXetData;

    if (isCuoiKy) {
      const lt = parseFloat(student?.lyThuyet);
      const th = student?.thucHanh;

      const loaiLT =
        !isNaN(lt)
          ? (lt >= 9 ? "TỐT" : lt >= 7 ? "KHÁ" : lt >= 5 ? "ĐẠT" : "CHƯA ĐẠT")
          : loai;

      const loaiTH =
        th === "T" ? "TỐT"
        : th === "H" ? "KHÁ"
        : th === "C" ? "CHƯA ĐẠT"
        : loai;

      const arrLT = source?.[loaiLT]?.lyThuyet || [];
      const arrTH = source?.[loaiTH]?.thucHanh || [];

      const nxLT = pickRandom(arrLT);
      const nxTH = pickRandom(arrTH);

      return nxLT && nxTH ? `${nxLT}; ${nxTH}` : nxLT || nxTH || "";
    }

    return pickRandom(source?.[loai]?.lyThuyet || []);
  }

  // ===== 4. TIN HỌC =====
  const source = nhanXetData;

  const xepLoaiLT = (diem) => {
    const s = Number(diem);
    if (s >= 4.5) return "TỐT";
    if (s >= 3.5) return "KHÁ";
    if (s >= 2.5) return "ĐẠT";
    return "CHƯA ĐẠT";
  };

  const xepLoaiTH = (diem) => {
    const s = Number(diem);
    if (s >= 4.5) return "TỐT";
    if (s >= 3.5) return "KHÁ";
    if (s >= 2.5) return "ĐẠT";
    return "CHƯA ĐẠT";
  };

  if (isCuoiKy) {
    const lt = student?.lyThuyet;
    const th = student?.thucHanh;

    // ❗ nếu thiếu điểm → fallback
    if (
      lt === "" || lt == null ||
      th === "" || th == null
    ) {
      return student?.nhanXet || "";
    }

    const loaiLT = xepLoaiLT(lt);
    const loaiTH = xepLoaiTH(th);

    const nxLT = pickRandom(source?.[loaiLT]?.lyThuyet || []);
    const nxTH = pickRandom(source?.[loaiTH]?.thucHanh || []);

    return nxLT && nxTH
      ? `${nxLT}; ${nxTH}`
      : nxLT || nxTH || "";
  }

  // ===== học kỳ / giữa kỳ: chỉ lấy lý thuyết =====
  const lt = student?.lyThuyet;

  if (lt === "" || lt == null) {
    return student?.nhanXet || "";
  }

  const loaiLT = xepLoaiLT(lt);
  return pickRandom(source?.[loaiLT]?.lyThuyet || []);
};
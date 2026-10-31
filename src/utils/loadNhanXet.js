import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // Điều chỉnh lại đường dẫn import firebase cho đúng với dự án của bạn

export const loadNhanXet = async (namHocKey, selectedSubject, hocKy, setNhanXetData) => {
  try {
    const col = `NHAN_XET_${namHocKey}`;

    const docId =
      selectedSubject === "Công nghệ"
        ? (hocKy?.includes("Cuối") ? "CongNghe_CuoiKy" : "CongNghe_GiuaKy")
        : (hocKy?.includes("Cuối") ? "TinHoc_CuoiKy" : "TinHoc_GiuaKy");

    const snap = await getDoc(doc(db, col, docId));

    // =========================
    // 🔥 SAFE NORMALIZER (FIX [object Object])
    // =========================
    const safe = (v) => {
      if (!v) return [];

      // array case
      if (Array.isArray(v)) {
        return v.map(i =>
          typeof i === "string"
            ? i
            : (i?.text || i?.value || "")
        ).filter(Boolean);
      }

      // object case (Firestore map)
      if (typeof v === "object") {
        return Object.values(v).map(i =>
          typeof i === "string"
            ? i
            : (i?.text || i?.value || "")
        ).filter(Boolean);
      }

      return [];
    };

    // =========================
    // 🔥 DEFAULT DATA
    // =========================
    if (!snap.exists()) {
      setNhanXetData({
        TỐT: { lyThuyet: [], thucHanh: [] },
        KHÁ: { lyThuyet: [], thucHanh: [] },
        ĐẠT: { lyThuyet: [], thucHanh: [] },
        "CHƯA ĐẠT": { lyThuyet: [], thucHanh: [] },
      });
      return;
    }

    const raw = snap.data();

    // =========================
    // 🔥 NORMALIZE FIRESTORE → UI FORMAT
    // =========================
    const normalized = {
      TỐT: {
        lyThuyet: safe(raw?.tot?.lyThuyet),
        thucHanh: safe(raw?.tot?.thucHanh),
      },
      KHÁ: {
        lyThuyet: safe(raw?.kha?.lyThuyet),
        thucHanh: safe(raw?.kha?.thucHanh),
      },
      ĐẠT: {
        lyThuyet: safe(raw?.trungbinh?.lyThuyet),
        thucHanh: safe(raw?.trungbinh?.thucHanh),
      },
      "CHƯA ĐẠT": {
        lyThuyet: safe(raw?.yeu?.lyThuyet),
        thucHanh: safe(raw?.yeu?.thucHanh),
      },
    };

    setNhanXetData(normalized);

  } catch (err) {
    console.error("loadNhanXet error:", err);
  }
};
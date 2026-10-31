import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// Hàm tính điểm trung bình ĐGTX từ các tuần học
const tinhDiemTrungBinhTheoKhoang = (statusByWeek, from, to) => {
  const diemMap = { T: 3, H: 2, C: 1 };
  let tong = 0;
  let dem = 0;

  const toShort = (statusStr) =>
    statusStr === "Hoàn thành tốt" ? "T" :
    statusStr === "Hoàn thành" ? "H" :
    statusStr === "Chưa hoàn thành" ? "C" :
    ["T", "H", "C"].includes(statusStr) ? statusStr : "";

  for (let i = from; i <= to; i++) {
    const weekId = `tuan_${i}`;
    const raw = statusByWeek?.[weekId];

    if (!raw || typeof raw !== "object") continue;

    const hsShort = toShort(raw.hs || "");
    const btShort = toShort(raw.gv || "");

    const diemNX = hsShort ? diemMap[hsShort] : null;
    const diemBT = btShort ? diemMap[btShort] : null;

    if (diemNX !== null && diemBT !== null) {
      tong += (diemNX + diemBT) / 2;
      dem++;
    } else if (diemNX !== null) {
      tong += diemNX;
      dem++;
    } else if (diemBT !== null) {
      tong += diemBT;
      dem++;
    }
  }

  const diemTB = dem > 0 ? tong / dem : null;
  return { diemTB };
};

const danhGiaXepLoaiDGTX = (statusByWeek, from, to) => {
  const { diemTB } = tinhDiemTrungBinhTheoKhoang(statusByWeek, from, to);

  if (diemTB === null) return "";
  if (diemTB >= 2.5) return "T";
  if (diemTB >= 1.5) return "H";
  return "C";
};

const getWeekRangeBySemester = (hocKy) => {
  const hocKyMap = {
    "Giữa kỳ I": { from: 1, to: 9 },
    "Cuối kỳ I": { from: 10, to: 18 },
    "Giữa kỳ II": { from: 19, to: 27 },
    "Cuối năm": { from: 28, to: 35 },
  };
  return hocKyMap[hocKy] || { from: 1, to: 35 };
};

export const fetchStudentsAndStatus = async ({
  cls,
  selectedClass,
  config,
  selectedSubject,
  namHocKey,
  getDgtxMucDat,
  generateNhanXet,
  setStudents,
  setOriginalStudents,
  setStudentsForClass,
  studentData = {},       // ⚡ Thêm bộ nhớ cache từ Context
  setStudentData,         // ⚡ Hàm cập nhật cache
  forceReload = false,    // ⚡ Cờ ép buộc tải lại khi bấm nút Refresh
}) => {
  const currentClass = cls || selectedClass;
  if (!currentClass) return;

  try {
    let termDoc;
    switch (config?.hocKy) {
      case "Giữa kỳ I": termDoc = "GKI"; break;
      case "Cuối kỳ I": termDoc = "CKI"; break;
      case "Giữa kỳ II": termDoc = "GKII"; break;
      default: termDoc = "CN";
    }

    const classKey = currentClass.replace(".", "_");
    const subjectKey = selectedSubject === "Công nghệ" ? "CongNghe" : "TinHoc";
    const cacheKey = `${classKey}_${selectedSubject}_${termDoc}`;

    // 🚀 1. KIỂM TRA CACHE: Nếu đã có và không phải ép tải lại thì dùng luôn lập tức!
    if (!forceReload && studentData[cacheKey]?.length) {
      const cachedList = studentData[cacheKey];
      setStudents(cachedList);
      if (setOriginalStudents) setOriginalStudents(cachedList);
      if (setStudentsForClass) setStudentsForClass(termDoc, classKey, cachedList);
      return;
    }

    const isGiuaKy = termDoc === "GKI" || termDoc === "GKII";
    const mucDatFromContext = (maHS) =>
      getDgtxMucDat ? getDgtxMucDat(namHocKey, classKey, subjectKey, termDoc, maHS) : "";

    const hsCollection = collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH");
    const snap = await getDocs(hsCollection);
    
    if (snap.empty) {
      setStudents([]);
      return;
    }

    const { from: weekFrom, to: weekTo } = getWeekRangeBySemester(config?.hocKy || "Giữa kỳ I");
    const studentList = [];

    snap.forEach((docSnap) => {
      const maHS = docSnap.id;
      const data = docSnap.data();
      const subjectData = data?.[subjectKey] || {};

      let termData = {};
      let dgtx_mucdat = "";
      let nhanXet = "";
      let lyThuyet = null;
      let thucHanh = null;
      let tongCong = null;
      let mucDat = "";

      const ktdkAll = subjectData.ktdk || {};
      const mucDat_GKI = ktdkAll?.GKI?.mucDat || "";
      const mucDat_CKI = ktdkAll?.CKI?.mucDat || "";
      const mucDat_GKII = ktdkAll?.GKII?.mucDat || "";
      const mucDat_CN = ktdkAll?.CN?.mucDat || "";

      termData = subjectData.ktdk?.[termDoc] || {};

      const statusByWeek = {};
      const dgtxWeek = subjectData.dgtx || {};
      Object.entries(dgtxWeek).forEach(([key, value]) => {
        if (!key.startsWith("tuan_")) return;
        const weekNum = Number(key.replace(/\D/g, ""));
        if (weekNum >= weekFrom && weekNum <= weekTo) {
          statusByWeek[key] = {
            hs: value?.status || "",
            gv: value?.TN_status || "",
            TN_diem: value?.TN_diem ?? null,
          };
        }
      });

      const xepLoaiTuDong = danhGiaXepLoaiDGTX(statusByWeek, weekFrom, weekTo);

      dgtx_mucdat = mucDatFromContext(maHS) || termData.dgtx_gv || termData.dgtx_mucdat || xepLoaiTuDong;
      nhanXet = termData.nhanXet || "";

      if (selectedSubject === "Công nghệ") {
        lyThuyet = termData.lyThuyet ?? null;
        thucHanh = termData.thucHanh ?? null;

        tongCong =
          termData.tongCong != null && !isNaN(termData.tongCong)
            ? Math.round(Number(termData.tongCong))
            : lyThuyet != null && !isNaN(lyThuyet)
            ? Math.round(Number(lyThuyet))
            : null;

        mucDat = termData.mucDat || "";
      } else {
        lyThuyet = termData.lyThuyet != null ? Number(termData.lyThuyet) : null;
        thucHanh = termData.thucHanh != null ? Number(termData.thucHanh) : null;

        tongCong =
          lyThuyet != null && !isNaN(lyThuyet) &&
          thucHanh != null && !isNaN(thucHanh)
            ? Math.round(lyThuyet + thucHanh)
            : termData.tongCong != null && !isNaN(termData.tongCong)
            ? Math.round(Number(termData.tongCong))
            : null;

        mucDat =
          tongCong == null || tongCong === ""
            ? ""
            : isGiuaKy
            ? (dgtx_mucdat || "")
            : tongCong >= 9
            ? "T"
            : tongCong >= 5
            ? "H"
            : "C";
      }

      if (!nhanXet || nhanXet.trim() === "") {
        nhanXet = generateNhanXet
          ? generateNhanXet({ lyThuyet, thucHanh, tongCong, mucDat }, selectedSubject, tongCong, mucDat)
          : "";
      }

      studentList.push({
        maDinhDanh: maHS,
        hoVaTen: subjectData.hoVaTen || data.hoVaTen || "",
        ghiChu: data.ghiChu || "",
        stt: data.stt || null,
        dgtx_mucdat,
        mucDat,
        nhanXet,
        nhanXet_goc: nhanXet || "",
        mucDat_goc: mucDat || "",
        lyThuyet,
        thucHanh,
        tongCong,
        mucDat_GKI,
        mucDat_CKI,
        mucDat_GKII,
        mucDat_CN,
        dgtx: {
          TinHoc: { ktdk: data.TinHoc?.ktdk || {}, tuan: data.TinHoc?.tuan || {} },
          CongNghe: { ktdk: data.CongNghe?.ktdk || {}, tuan: data.CongNghe?.tuan || {} },
        },
      });
    });

    studentList.sort((a, b) => {
      const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
      const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
      return nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
    });

    const finalList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

    // 🚀 2. LƯU VÀO CACHE: Lưu lại kết quả vào state bộ nhớ chung để lần sau dùng lại
    if (setStudentData) {
      setStudentData((prev) => ({ ...prev, [cacheKey]: finalList }));
    }

    setStudents(finalList);
    if (setOriginalStudents) setOriginalStudents(finalList);
    if (setStudentsForClass) setStudentsForClass(termDoc, classKey, finalList);
  } catch (err) {
    console.error("❌ Lỗi khi lấy dữ liệu từ DATA:", err);
    setStudents([]);
  }
};
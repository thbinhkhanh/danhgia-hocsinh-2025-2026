import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export const fetchStudentsAndStatus = async (arg1, arg2) => {
  // 🟢 Hỗ trợ tương thích ngược: Xử lý linh hoạt cả 2 cách gọi (Truyền object hoặc truyền lẻ từng tham số)
  let cls, selectedClass, config, selectedSubject, namHocKey, getDgtxMucDat, generateNhanXet, setStudents, setOriginalStudents, setStudentsForClass, studentData, setStudentData, forceReload;

  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    // Gọi theo dạng object (dùng khi bấm nút Làm mới với forceReload)
    ({
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
      studentData = {},
      setStudentData,
      forceReload = false,
    } = arg1);
  } else {
    // Gọi theo dạng truyền từng tham số lẻ (từ các component khác)
    cls = arg1;
    forceReload = arg2 || false;
  }

  // 🟢 BẢO VỆ AN TOÀN: Ép kiểu chuỗi tuyệt đối cho tên lớp để chống lỗi .replace is not a function
  let rawClass = cls || selectedClass || "";
  if (typeof rawClass !== "string") {
    rawClass = String(rawClass?.target?.value || rawClass?.name || "");
  }

  const currentClass = rawClass.trim();
  if (!currentClass) {
    console.warn("⚠️ Tên lớp không hợp lệ hoặc bị trống.");
    return;
  }

  try {
    let termDoc;
    switch (config?.hocKy) {
      case "Giữa kỳ I": termDoc = "GKI"; break;
      case "Cuối kỳ I": termDoc = "CKI"; break;
      case "Giữa kỳ II": termDoc = "GKII"; break;
      default: termDoc = "CN";
    }

    const classKey = currentClass.replace(/\./g, "_"); // 👈 Tuyệt đối an toàn vì currentClass chắc chắn là string
    const subjectKey = selectedSubject === "Công nghệ" ? "CongNghe" : "TinHoc";
    const cacheKey = `${classKey}_${selectedSubject}_${termDoc}`;

    // 🚀 1. KIỂM TRA CACHE: Nếu có cờ forceReload = true thì BỎ QUA CACHE, bắt buộc đọc mới từ Firestore
    if (!forceReload && studentData && studentData[cacheKey]?.length) {
      const cachedList = studentData[cacheKey];
      if (setStudents) setStudents(cachedList);
      if (setOriginalStudents) setOriginalStudents(cachedList);
      if (setStudentsForClass) setStudentsForClass(termDoc, classKey, cachedList);
      return;
    }

    const hsCollection = collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH");
    const snap = await getDocs(hsCollection);
    
    if (snap.empty) {
      if (setStudents) setStudents([]);
      return;
    }

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

      // 🟢 Lấy dữ liệu trực tiếp của học kỳ hiện tại từ Firestore
      // Lấy dữ liệu trực tiếp của học kỳ hiện tại từ Firestore
      termData = subjectData.ktdk?.[termDoc] || {};

      dgtx_mucdat = termData.dgtx_mucdat || termData.dgtx_gv || "";

      lyThuyet =
        termData.lyThuyet != null && termData.lyThuyet !== ""
          ? Number(termData.lyThuyet)
          : null;

      // Công nghệ: thực hành là T/H/C.
      // Tin học: thực hành là điểm số.
      if (selectedSubject === "Công nghệ") {
        thucHanh = termData.thucHanh ?? "";
      } else {
        thucHanh =
          termData.thucHanh != null && termData.thucHanh !== ""
            ? Number(termData.thucHanh)
            : null;
      }

      nhanXet = termData.nhanXet || "";

      // Ưu tiên tongCong đã lưu trong Firestore.
      // Chỉ tính tổng đối với Tin học khi chưa có tongCong.
      if (termData.tongCong != null && termData.tongCong !== "") {
        tongCong = Number(termData.tongCong);
      } else if (
        selectedSubject === "Tin học" &&
        lyThuyet != null &&
        thucHanh != null &&
        !isNaN(lyThuyet) &&
        !isNaN(thucHanh)
      ) {
        tongCong = Math.round(lyThuyet + thucHanh);
      } else {
        tongCong = null;
      }

      mucDat = termData.mucDat || "";

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

    // 🚀 2. LƯU VÀO CACHE: Lưu lại kết quả vào state bộ nhớ chung
    if (setStudentData) {
      setStudentData((prev) => ({ ...prev, [cacheKey]: finalList }));
    }

    if (setStudents) setStudents(finalList);
    if (setOriginalStudents) setOriginalStudents(finalList);
    if (setStudentsForClass) setStudentsForClass(termDoc, classKey, finalList);
  } catch (err) {
    console.error("❌ Lỗi khi lấy dữ liệu từ DATA:", err);
    if (setStudents) setStudents([]);
  }
};
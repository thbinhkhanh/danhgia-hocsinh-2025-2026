import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export const getQuizDocId = async ({
  db,
  configData,
  namHoc,
  classLabel,
  hocKiFromConfig,
  monHocFromConfig,
  studentInfo,
  setNotFoundMessage,
  examType,
}) => {
  const hocKiMap = {
    "Cuối kỳ I": "CKI",
    "Giữa kỳ I": "GKI",
    "Giữa kỳ II": "GKII",
    "Cuối năm": "CN",
  };

  const hocKiCode = hocKiMap[hocKiFromConfig];

  const yearKey = namHoc
    ? namHoc.split("-").map(x => x.slice(-2)).join("-")
    : "";
  
  // ================= KIEM TRA BAI CU =================
  if (configData.kiemTraBaiCu === true || examType === "kiemtrabaicu") {
    const docId = configData.deTracNghiem;

    console.log("🔍 KIỂM TRA BÀI CŨ");
    console.log("📌 deTracNghiem:", docId);
    console.log("📌 Collection:", "KIEMTRA_BAICU");

    if (!docId) {
      setNotFoundMessage("❌ Chưa cấu hình đề kiểm tra bài cũ");
      return null;
    }

    const examRef = doc(db, "KIEMTRA_BAICU", docId);
    const examSnap = await getDoc(examRef);

    if (!examSnap.exists()) {
      console.error("❌ Không tìm thấy đề:", docId);
      setNotFoundMessage("❌ Không tìm thấy đề kiểm tra bài cũ");
      return null;
    }

    console.log("✅ Đã tìm thấy đề kiểm tra bài cũ:", docId);

    return {
      docId,
      collectionName: "KIEMTRA_BAICU",
    };
  }

  // ================= ON TAP OLD =================
  if (configData.onTap) {
    const snap = await getDocs(collection(db, "NGANHANG_DE"));

    const found = snap.docs.find(d =>
      d.id.includes(classLabel) &&
      d.id.includes(hocKiCode)
    );

    if (!found) {
      setNotFoundMessage("❌ Không tìm thấy đề ôn tập");
      return null;
    }

    return { docId: found.id, collectionName: "NGANHANG_DE" };
  }

  // ================= KIEM TRA DINH KI =================
  if (configData.kiemTraDinhKi) {
    const snap = await getDocs(collection(db, "DETHI"));
    const classNumber = classLabel.match(/\d+/)?.[0];

    const found = snap.docs.find(d => {
      const id = d.id;

      return (
        id.includes(`Lớp ${classNumber}`) &&
        id.includes(monHocFromConfig) &&
        id.includes(hocKiCode) &&
        id.includes(yearKey)
      );
    });

    if (!found) {
      setNotFoundMessage("❌ Không tìm thấy đề KTĐK");
      return null;
    }

    return {
      docId: found.id,
      collectionName: "NGANHANG_DE",
    };
  }

  // ================= DE ON TAP NEW =================
  if (examType === "ontap") {
    const classNumber = classLabel.match(/\d+/)?.[0];

    const expectedPrefix =
      `quiz_Lớp ${classNumber}_${studentInfo.mon}`;

    const snap = await getDocs(collection(db, "DE_ONTAP"));

    const found = snap.docs.find(d =>
      d.id.includes(expectedPrefix) &&
      d.id.includes(hocKiCode) &&
      d.id.includes(yearKey)
    );

    if (!found) {
      setNotFoundMessage("❌ Không tìm thấy đề ôn tập");
      return null;
    }

    return {
      docId: found.id,
      collectionName: "DE_ONTAP",
    };
  }

  // ================= BAI TAP TUAN =================
  if (configData.baiTapTuan) {
    const expectedId =
      `quiz_Lớp ${classLabel.match(/\d+/)[0]}_${studentInfo.mon}_${studentInfo.selectedWeek}`;

    const snap = await getDocs(collection(db, "BAITAP_TUAN"));

    const found = snap.docs.find(d => d.id === expectedId);

    if (!found) {
      setNotFoundMessage("❌ Không tìm thấy bài tập tuần");
      return null;
    }

    return { docId: found.id, collectionName: "BAITAP_TUAN" };
  }

  setNotFoundMessage("❌ Không xác định loại đề");
  return null;
};
// utils/getQuizDocId.js

import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export const getQuizDocId = async ({
  db,
  configData,
  classLabel,
  hocKiFromConfig,
  monHocFromConfig,
  studentInfo,
  setNotFoundMessage,
}) => {
  const hocKiMap = {
    "Cuối kỳ I": "CKI",
    "Giữa kỳ I": "GKI",
    "Giữa kỳ II": "GKII",
    "Cả năm": "CN",
  };

  const hocKiCode = hocKiMap[hocKiFromConfig];

  if (configData.onTap) {
    const snap = await getDocs(collection(db, "NGANHANG_DE"));
    const found = snap.docs.find(d =>
      d.id.includes(classLabel) && d.id.includes(hocKiCode)
    );

    if (!found) {
      setNotFoundMessage("❌ Không tìm thấy đề ôn tập");
      return null;
    }

    return { docId: found.id, collectionName: "NGANHANG_DE" };
  }

  if (configData.kiemTraDinhKi) {
    const snap = await getDocs(collection(db, "DETHI"));
    const found = snap.docs.find(d =>
      d.id.includes(classLabel) &&
      d.id.includes(hocKiCode) &&
      d.id.includes(monHocFromConfig)
    );

    if (!found) {
      setNotFoundMessage("❌ Không tìm thấy đề KTĐK");
      return null;
    }

    return { docId: found.id, collectionName: "NGANHANG_DE" };
  }

  if (configData.baiTapTuan) {
    const expectedId = `quiz_Lớp ${classLabel.match(/\d+/)[0]}_${studentInfo.mon}_${studentInfo.selectedWeek}`;
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
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Lấy dữ liệu backup theo tùy chọn
 * @param {function} onProgress - callback 0–100
 * @param {string[]} selectedCollections - các collection được chọn để backup
 * @returns {object} backupData
 */
export const fetchAllBackup = async (onProgress, selectedCollections) => {
  try {
    const backupData = {
      DANHSACH: {},
      CONFIG: {},
      KTDK: {},
      DGTX: {},
      BAITAP_TUAN: {},
      TRACNGHIEM_BK: {},
      TRACNGHIEM_LVB: {},
    };

    const QUIZ_ARRAY = ["BAITAP_TUAN", "TRACNGHIEM_BK", "TRACNGHIEM_LVB"];

    if (!selectedCollections || selectedCollections.length === 0) {
      console.warn("⚠️ Không có collection nào được chọn để backup");
      return {};
    }

    let progressCount = 0;
    const progressStep = Math.floor(100 / selectedCollections.length);

    for (const colName of selectedCollections) {
      // 1️⃣ QUIZ: questions nằm trong document
      if (QUIZ_ARRAY.includes(colName)) {
        const snap = await getDocs(collection(db, colName));
        snap.forEach(d => {
          backupData[colName][d.id] = d.data();
        });

        progressCount += progressStep;
        if (onProgress) onProgress(Math.min(progressCount, 99));
        continue;
      }

      // 2️⃣ DGTX (nhiều cấp)
      if (colName === "DGTX") {
        const classSnap = await getDocs(collection(db, "DANHSACH"));
        const classIds = classSnap.docs.map(d => d.id);
        const classIdsWithCN = [...classIds, ...classIds.map(id => `${id}_CN`)];

        for (const lopId of classIdsWithCN) {
          const tuanSnap = await getDocs(collection(db, "DGTX", lopId, "tuan"));
          if (!tuanSnap.empty) {
            backupData.DGTX[lopId] = { tuan: {} };
            tuanSnap.forEach(t => {
              backupData.DGTX[lopId].tuan[t.id] = t.data();
            });
          }
        }

        progressCount += progressStep;
        if (onProgress) onProgress(Math.min(progressCount, 99));
        continue;
      }

      // 3️⃣ KTDK
      if (colName === "KTDK") {
        const snap = await getDocs(collection(db, "KTDK"));
        snap.forEach(d => {
          backupData.KTDK[d.id] = d.data();
        });

        progressCount += progressStep;
        if (onProgress) onProgress(Math.min(progressCount, 99));
        continue;
      }

      // 4️⃣ Collection phẳng khác (DANHSACH, CONFIG)
      if (["DANHSACH", "CONFIG"].includes(colName)) {
        const snap = await getDocs(collection(db, colName));
        snap.forEach(d => {
          backupData[colName][d.id] = d.data();
        });

        progressCount += progressStep;
        if (onProgress) onProgress(Math.min(progressCount, 99));
        continue;
      }
    }

    // Lọc DGTX rỗng nếu được backup
    if (selectedCollections.includes("DGTX")) {
      Object.keys(backupData.DGTX).forEach(lopId => {
        if (
          !backupData.DGTX[lopId]?.tuan ||
          Object.keys(backupData.DGTX[lopId].tuan).length === 0
        ) {
          delete backupData.DGTX[lopId];
        }
      });
    }

    if (onProgress) onProgress(100);
    console.log("✅ Backup hoàn tất");
    return backupData;

  } catch (err) {
    console.error("❌ Lỗi khi backup:", err);
    return {};
  }
};
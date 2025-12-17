import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Phục hồi dữ liệu từ file JSON backup theo tùy chọn
 * @param {File} file
 * @param {string[]} selectedCollections - các collection được chọn để phục hồi
 * @param {function} onProgress callback 0–100
 */
export const restoreAllFromJson = async (file, selectedCollections, onProgress) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const QUIZ_ARRAY = [
      "BAITAP_TUAN",
      "TRACNGHIEM_BK",
      "TRACNGHIEM_LVB",
    ];

    // Lọc collection có trong file và được chọn
    const collections = Object.keys(data).filter(c => selectedCollections.includes(c));

    let progressCount = 0;
    const progressStep = Math.floor(100 / collections.length);

    for (const colName of collections) {
      // --------------------------------------------
      // 1️⃣ QUIZ (questions là array trong document)
      // --------------------------------------------
      if (QUIZ_ARRAY.includes(colName)) {
        const docs = data[colName] || {};
        const ids = Object.keys(docs);
        const total = ids.length;

        for (let i = 0; i < total; i++) {
          const id = ids[i];
          await setDoc(doc(db, colName, id), docs[id], { merge: true });

          if (onProgress) {
            const step = ((i + 1) / total) * progressStep;
            onProgress(Math.min(Math.round(progressCount + step), 99));
          }
        }

        progressCount += progressStep;
        continue;
      }

      // --------------------------------------------
      // 2️⃣ DGTX (nhiều cấp)
      // --------------------------------------------
      if (colName === "DGTX") {
        const classes = Object.keys(data.DGTX || {});
        const totalClasses = classes.length;

        for (let i = 0; i < totalClasses; i++) {
          const lopId = classes[i];
          const tuanData = data.DGTX[lopId]?.tuan || {};
          const tuanIds = Object.keys(tuanData);

          for (const tuanId of tuanIds) {
            await setDoc(
              doc(db, "DGTX", lopId, "tuan", tuanId),
              tuanData[tuanId],
              { merge: true }
            );
          }

          if (onProgress) {
            const step = ((i + 1) / totalClasses) * progressStep;
            onProgress(Math.min(Math.round(progressCount + step), 99));
          }
        }

        progressCount += progressStep;
        continue;
      }

      // --------------------------------------------
      // 3️⃣ KTDK
      // --------------------------------------------
      if (colName === "KTDK") {
        const docs = data.KTDK || {};
        const ids = Object.keys(docs);
        const total = ids.length;

        for (let i = 0; i < total; i++) {
          const id = ids[i];
          await setDoc(doc(db, "KTDK", id), docs[id], { merge: true });

          if (onProgress) {
            const step = ((i + 1) / total) * progressStep;
            onProgress(Math.min(Math.round(progressCount + step), 99));
          }
        }

        progressCount += progressStep;
        continue;
      }

      // --------------------------------------------
      // 4️⃣ DANHSACH, CONFIG (collection phẳng)
      // --------------------------------------------
      if (["DANHSACH", "CONFIG"].includes(colName)) {
        const docs = data[colName] || {};
        const ids = Object.keys(docs);
        const total = ids.length;

        for (let i = 0; i < total; i++) {
          const id = ids[i];
          await setDoc(doc(db, colName, id), docs[id], { merge: true });

          if (onProgress) {
            const step = ((i + 1) / total) * progressStep;
            onProgress(Math.min(Math.round(progressCount + step), 99));
          }
        }

        progressCount += progressStep;
        continue;
      }
    }

    if (onProgress) onProgress(100);
    console.log("✅ Phục hồi dữ liệu hoàn tất!");
    return true;

  } catch (err) {
    console.error("❌ Lỗi khi phục hồi:", err);
    return false;
  }
};

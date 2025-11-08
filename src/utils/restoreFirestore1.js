import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Hàm phục hồi toàn bộ dữ liệu từ file JSON, với progress callback
 * @param {File} file - file JSON backup
 * @param {function} onProgress - callback nhận giá trị 0-100 để cập nhật thanh tiến trình
 */
export const restoreAllFromJson = async (file, onProgress) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const collections = Object.keys(data);
    let progressCount = 0;

    for (let colIndex = 0; colIndex < collections.length; colIndex++) {
      const colName = collections[colIndex];

      if (colName === "DGTX") {
        const classes = Object.keys(data.DGTX);
        const totalClasses = classes.length;

        for (let i = 0; i < totalClasses; i++) {
          const lopId = classes[i];
          const tuanData = data.DGTX[lopId]?.tuan || {};

          // Restore tuần song song
          await Promise.all(
            Object.entries(tuanData).map(async ([tuanId, weekContent]) => {
              const tuanRef = doc(db, "DGTX", lopId, "tuan", tuanId);
              await setDoc(tuanRef, weekContent, { merge: true });
            })
          );

          // Cập nhật progress DGTX (70%)
          if (onProgress) {
            const dgtxProgress = ((i + 1) / totalClasses) * 70;
            onProgress(Math.round(progressCount + dgtxProgress));
          }
        }

        progressCount += 70;
      } else {
        const docs = data[colName] || {};
        const docIds = Object.keys(docs);
        const totalDocs = docIds.length;

        for (let j = 0; j < totalDocs; j++) {
          const id = docIds[j];
          await setDoc(doc(db, colName, id), docs[id], { merge: true });

          // Cập nhật progress phần còn lại (chia đều 30%)
          if (onProgress) {
            const otherProgress = ((j + 1) / totalDocs) * (30 / (collections.length - 1));
            onProgress(Math.round(progressCount + otherProgress));
          }
        }

        progressCount += 30 / (collections.length - 1);
      }
    }

    if (onProgress) onProgress(100);
    return true;
  } catch (err) {
    console.error("❌ Lỗi khi phục hồi backup:", err);
    return false;
  }
};

import { useEffect, useRef, useState } from "react";

export const useQuizTimer = ({
  started,
  submitted,
  initialTime = 0,
  onTimeUp,
  resetKey, // 👈 thêm để reset khi đổi đề
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [startTime, setStartTime] = useState(null);

  const intervalRef = useRef(null);
  const hasCalledTimeUp = useRef(false);

  // ===============================
  // RESET TIMER (KHI ĐỔI ĐỀ / INITIAL TIME / RESET KEY)
  // ===============================
  useEffect(() => {
    setTimeLeft(initialTime);
    setStartTime(null);
    hasCalledTimeUp.current = false;

    // clear interval cũ nếu có
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [initialTime, resetKey]);

  // ===============================
  // GHI NHẬN START TIME
  // ===============================
  useEffect(() => {
    if (started && !startTime) {
      setStartTime(Date.now());
    }
  }, [started, startTime]);

  // ===============================
  // COUNTDOWN LOGIC
  // ===============================
  useEffect(() => {
    if (!started || submitted) return;

    // clear interval cũ trước khi tạo mới
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;

          if (!hasCalledTimeUp.current) {
            hasCalledTimeUp.current = true;
            onTimeUp && onTimeUp();
          }

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [started, submitted]);

  // ===============================
  // FORMAT TIME
  // ===============================
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return {
    timeLeft,
    setTimeLeft,
    startTime,
    formatTime,
  };
};
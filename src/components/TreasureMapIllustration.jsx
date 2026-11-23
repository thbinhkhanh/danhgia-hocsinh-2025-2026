import React, { useMemo } from "react";

import tropicalMap from "../assets/maps/tropical-map.png";
import arcticMap from "../assets/maps/arctic-map.png";
import desertMap from "../assets/maps/desert-map.png";
import volcanoMap from "../assets/maps/volcano-map.png";

const MAPS = {
  tropical: {
    image: tropicalMap,
    name: "Đảo nhiệt đới",
    route: [
      [75, 245],
      [145, 205],
      [215, 225],
      [285, 165],
      [365, 185],
      [435, 115],
      [520, 145],
      [600, 85],
      [690, 105],
    ],
    color: "#087f5b",
  },

  arctic: {
    image: arcticMap,
    name: "Vương quốc băng giá",
    route: [
      [75, 245],
      [145, 220],
      [205, 155],
      [280, 185],
      [355, 115],
      [430, 145],
      [505, 75],
      [585, 110],
      [690, 55],
    ],
    color: "#2563eb",
  },

  desert: {
    image: desertMap,
    name: "Sa mạc kim tự tháp",
    route: [
      [70, 230],
      [145, 175],
      [225, 205],
      [300, 130],
      [375, 175],
      [455, 105],
      [530, 150],
      [605, 80],
      [690, 110],
    ],
    color: "#b7791f",
  },

  volcano: {
    image: volcanoMap,
    name: "Đảo núi lửa",
    route: [
      [75, 250],
      [145, 205],
      [220, 225],
      [285, 155],
      [365, 190],
      [430, 125],
      [505, 155],
      [585, 85],
      [690, 65],
    ],
    color: "#dc4c35",
  },
};

// Nội suy vị trí các chặng theo số lượng câu hỏi.
function getStagePositions(count, route) {
  if (!count) return [];

  if (count === 1) {
    const middle = Math.floor(route.length / 2);
    return [route[middle]];
  }

  return Array.from({ length: count }, (_, index) => {
    const progress = (index / (count - 1)) * (route.length - 1);
    const segment = Math.floor(progress);
    const ratio = progress - segment;

    const start = route[segment];
    const end = route[Math.min(segment + 1, route.length - 1)];

    return [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ];
  });
}

// Tạo đường cong mềm mại đi qua các chặng.
function makeCurvedPath(points) {
  if (!points.length) return "";

  if (points.length === 1) {
    return `M ${points[0][0]} ${points[0][1]}`;
  }

  let path = `M ${points[0][0]} ${points[0][1]}`;

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];

    const midX = (previous[0] + current[0]) / 2;
    const midY = (previous[1] + current[1]) / 2;

    path += ` Q ${previous[0]} ${previous[1]} ${midX} ${midY}`;
    if (i === points.length - 1) {
      path += ` T ${current[0]} ${current[1]}`;
    }
  }

  return path;
}

function isStageCompleted(completed, index) {
  if (completed instanceof Set) return completed.has(index);
  if (Array.isArray(completed)) {
    return completed.includes(index) || completed[index] === true;
  }
  if (completed && typeof completed === "object") {
    return Boolean(completed[index]);
  }
  return false;
}

export default function TreasureMapIllustration({
  themeId = "tropical",
  stages = [],
  stepIndex = 0,
  completed = [],
  inspectedStage = null,
  onInspect = () => {},
  explorerEmoji = "🧭",
  goalEmoji = "🏆",
}) {
  const map = MAPS[themeId] || MAPS.tropical;

  const positions = useMemo(
    () => getStagePositions(stages.length, map.route),
    [stages.length, map.route]
  );

  const routePath = useMemo(
    () => makeCurvedPath(positions),
    [positions]
  );

  const explorerPosition =
    positions[Math.min(stepIndex, positions.length - 1)];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "760 / 320",
        overflow: "hidden",
        borderRadius: 20,
        background: "#dbeafe",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
      }}
    >
      {/* Ảnh nền bản đồ */}
      <img
        src={map.image}
        alt={map.name}
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      <svg
        viewBox="0 0 760 320"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        {/* Đường viền hành trình */}
        {routePath && (
          <>
            <path
              d={routePath}
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2 1"
            />

            <path
              d={routePath}
              fill="none"
              stroke={map.color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 9"
            />
          </>
        )}

        {/* Các chặng khám phá */}
        {stages.map((stage, index) => {
          const position = positions[index];
          if (!position) return null;

          const [x, y] = position;
          const done = isStageCompleted(completed, index);
          const current = index === stepIndex;
          const inspected = inspectedStage === index;

          const label =
            stage?.title ||
            stage?.name ||
            stage?.ten ||
            `Chặng ${index + 1}`;

          return (
            <g
              key={stage?.id ?? index}
              onClick={() => onInspect(index)}
              style={{ cursor: "pointer" }}
            >
              {/* Vùng bấm */}
              <circle
                cx={x}
                cy={y}
                r="25"
                fill="transparent"
              />

              {/* Vòng sáng chặng hiện tại */}
              {current && (
                <circle
                  cx={x}
                  cy={y}
                  r="22"
                  fill="rgba(255,255,255,0.35)"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
              )}

              {/* Điểm chặng */}
              <circle
                cx={x}
                cy={y}
                r={inspected ? 17 : 14}
                fill={
                  done
                    ? "#16a34a"
                    : current
                    ? "#f59e0b"
                    : "#ffffff"
                }
                stroke="#ffffff"
                strokeWidth="4"
                style={{
                  filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.3))",
                  transition: "all 0.2s ease",
                }}
              />

              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fontSize="15"
                fontWeight="bold"
                fill={done || current ? "#ffffff" : "#334155"}
                style={{ pointerEvents: "none" }}
              >
                {done ? "✓" : index + 1}
              </text>

              {/* Tên chặng */}
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={x - 43}
                  y={y + 22}
                  width="86"
                  height="19"
                  rx="9"
                  fill="rgba(255,255,255,0.92)"
                />
                <text
                  x={x}
                  y={y + 35}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#263445"
                >
                  {String(label).length > 13
                    ? `${String(label).slice(0, 12)}…`
                    : label}
                </text>
              </g>
            </g>
          );
        })}

        {/* Nhân vật thám hiểm */}
        {explorerPosition && (
          <g
            transform={`translate(${explorerPosition[0]}, ${
              explorerPosition[1] - 30
            })`}
            style={{ pointerEvents: "none" }}
          >
            <circle
              cx="0"
              cy="0"
              r="19"
              fill="rgba(255,255,255,0.9)"
              stroke="#ffffff"
              strokeWidth="3"
              style={{
                filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.3))",
              }}
            />
            <text
              x="0"
              y="7"
              fontSize="23"
              textAnchor="middle"
            >
              {explorerEmoji}
            </text>
          </g>
        )}

        {/* Kho báu ở cuối hành trình */}
        {positions.length > 0 && (
          <g
            transform={`translate(${positions[positions.length - 1][0]}, ${
              positions[positions.length - 1][1] - 34
            })`}
            style={{ pointerEvents: "none" }}
          >
            <text
              x="0"
              y="0"
              fontSize="30"
              textAnchor="middle"
              style={{
                filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
              }}
            >
              {goalEmoji}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
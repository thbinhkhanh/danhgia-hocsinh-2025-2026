// src/DangCau/questions/QuestionCard.jsx
import React from "react";
import { Paper, Box, IconButton, Tooltip } from "@mui/material";

import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";

import QuestionHeader from "./QuestionHeader";
import QuestionOptions from "./QuestionOptions";
import QuestionFooter from "./QuestionFooter";

const QuestionCard = ({
  q,
  qi,
  updateQuestionAt,
  handleDeleteQuestion,
  handleSaveAll,
  moveQuestionUp,
  moveQuestionDown,
  moveQuestionTop,
  moveQuestionBottom,
  totalQuestions,
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        position: "relative",
        borderRadius: 3,
        overflow: "visible", // ⭐ quan trọng để không bị cắt toolbar
        "&:hover": {
          boxShadow: 6,
        },
      }}
    >
      {/* ===== MODERN TOOLBAR ===== */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 12,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,

          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 3,
          padding: "6px 4px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          zIndex: 10,
        }}
      >
        {/* UP */}
        <Tooltip title="Di chuyển lên" placement="left" arrow>
          <IconButton
            size="small"
            onClick={() => moveQuestionUp(qi)}
            disabled={qi === 0}
            sx={{
              borderRadius: 2,
              color: qi === 0 ? "#bbb" : "#1976d2",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "rgba(25,118,210,0.12)",
              },
            }}
          >
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* DOWN */}
        <Tooltip title="Di chuyển xuống" placement="left" arrow>
          <IconButton
            size="small"
            onClick={() => moveQuestionDown(qi)}
            disabled={qi === totalQuestions - 1}
            sx={{
              borderRadius: 2,
              color: qi === totalQuestions - 1 ? "#bbb" : "#1976d2",
              "&:hover": {
                backgroundColor: "rgba(25,118,210,0.12)",
              },
            }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* TOP */}
        <Tooltip title="Đưa lên đầu" placement="left" arrow>
          <IconButton
            size="small"
            onClick={() => moveQuestionTop(qi)}
            disabled={qi === 0}
            sx={{
              borderRadius: 2,
              color: "#2e7d32",
              "&:hover": {
                backgroundColor: "rgba(46,125,50,0.12)",
              },
            }}
          >
            <VerticalAlignTopIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* BOTTOM */}
        <Tooltip title="Đưa xuống cuối" placement="left" arrow>
          <IconButton
            size="small"
            onClick={() => moveQuestionBottom(qi)}
            disabled={qi === totalQuestions - 1}
            sx={{
              borderRadius: 2,
              color: "#d32f2f",
              "&:hover": {
                backgroundColor: "rgba(211,47,47,0.12)",
              },
            }}
          >
            <VerticalAlignBottomIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ===== CONTENT ===== */}
      <Box sx={{ pr: 6 }}>
        <QuestionHeader q={q} qi={qi} update={updateQuestionAt} />

        <QuestionOptions q={q} qi={qi} update={updateQuestionAt} />

        <QuestionFooter
          q={q}
          qi={qi}
          update={updateQuestionAt}
          handleDelete={handleDeleteQuestion}
          saveAllQuestions={handleSaveAll}
        />
      </Box>
    </Paper>
  );
};

export default QuestionCard;
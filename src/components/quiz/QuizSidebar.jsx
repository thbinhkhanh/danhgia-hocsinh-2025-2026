import React from "react";
import { Box, Card, Typography, Divider, IconButton, Button } from "@mui/material";
import { getQuestionStatus } from "../../utils/questionStatus";

export default function QuizSidebar({
  questions,
  answers,
  currentIndex,
  setCurrentIndex,
  submitted,
  handleSubmit,
  navigate,
  setOpenExitConfirm,
  sidebarConfig,
}) {
  return (
    <Box
      sx={{
        width: sidebarConfig.width,
        flexShrink: 0,
      }}
    >
      <Card
        sx={{
          p: 2,
          borderRadius: 2,
          position: sidebarConfig.width === 260 ? "sticky" : "static",
          top: 24,
        }}
      >
        <Typography
          fontWeight="bold"
          textAlign="center"
          mb={2}
          fontSize="1.1rem"
          color="#0d47a1"
          sx={{
            userSelect: "none",
            cursor: "default",
          }}
        >
          Câu hỏi
        </Typography>

        <Divider sx={{ mt: -1, mb: 3, bgcolor: "#e0e0e0" }} />

        {/* ===== GRID Ô SỐ ===== */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${sidebarConfig.cols}, 1fr)`,
            gap: 1.2,
            justifyItems: "center",
            mb: !submitted ? 8 : 0,
          }}
        >
          {questions.map((q, index) => {
            const status = getQuestionStatus({
              question: q,
              userAnswer: answers[q.id],
              submitted,
            });

            const active = currentIndex === index;

            let bgcolor = "#eeeeee";
            let border = "1px solid transparent";
            let textColor = "#0d47a1";

            if (!submitted && status === "answered") bgcolor = "#bbdefb";

            if (submitted) {
              if (status === "correct") bgcolor = "#c8e6c9";
              else if (status === "wrong") bgcolor = "#ffcdd2";
              else {
                bgcolor = "#fafafa";
                border = "1px dashed #bdbdbd";
              }
            }

            if (active) {
              border = "2px solid #9e9e9e";
              textColor = "#616161";
            }

            return (
              <IconButton
                key={q.id}
                onClick={() => setCurrentIndex(index)}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  bgcolor,
                  color: textColor,
                  border,
                  boxShadow: "none",
                }}
              >
                {index + 1}
              </IconButton>
            );
          })}
        </Box>

        {!submitted && (
          <Button fullWidth variant="contained" onClick={handleSubmit}>
            Nộp bài
          </Button>
        )}

        <Button
          fullWidth
          variant="outlined"
          color="error"
          sx={{ mt: submitted ? 8 : 1.5 }}
          onClick={() => {
            if (submitted) navigate(-1);
            else setOpenExitConfirm(true);
          }}
        >
          Thoát
        </Button>
      </Card>
    </Box>
  );
}
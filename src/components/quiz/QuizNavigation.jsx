import React from "react";
import { Stack, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function QuizNavigation({
  started,
  loading,
  currentIndex,
  questionsLength,
  handlePrev,
  handleNext,
  handleSubmit,
  submitted,
  isEmptyQuestion,
  isSidebarVisible,
}) {
  if (!started || loading) return null;

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{
        mt: 2,
        pt: 2,
        mb: { xs: "20px", sm: "5px" },
        borderTop: "1px solid #e0e0e0",
      }}
    >
      {/* ===== CÂU TRƯỚC ===== */}
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={handlePrev}
        disabled={currentIndex === 0}
        sx={{
          width: 150,
          bgcolor: currentIndex === 0 ? "#e0e0e0" : "#bbdefb",
          borderRadius: 1,
          color: "#0d47a1",
          "&:hover": {
            bgcolor: currentIndex === 0 ? "#e0e0e0" : "#90caf9",
          },
        }}
      >
        Câu trước
      </Button>

      {/* ===== CÂU SAU / NỘP BÀI ===== */}
      {currentIndex < questionsLength - 1 ? (
        <Button
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          onClick={handleNext}
          sx={{
            width: 150,
            bgcolor: "#bbdefb",
            borderRadius: 1,
            color: "#0d47a1",
            "&:hover": { bgcolor: "#90caf9" },
          }}
        >
          Câu sau
        </Button>
      ) : (
        !isSidebarVisible && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={submitted || isEmptyQuestion}
            sx={{
              width: 150,
              borderRadius: 1,
            }}
          >
            Nộp bài
          </Button>
        )
      )}
    </Stack>
  );
}
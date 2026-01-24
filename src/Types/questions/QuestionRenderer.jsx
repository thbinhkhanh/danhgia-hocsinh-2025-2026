import React from "react";
import {
  Box,
  Divider,
  Typography,
  Stack,
  Paper,
  Radio,
  Checkbox,
  FormControl,
  Select,
  MenuItem
} from "@mui/material";

/**
 * Component render 1 câu hỏi
 */
const QuestionRenderer = ({
  DragDropContext,
  Droppable,
  Draggable,

  loading,
  currentQuestion,
  currentIndex,
  answers,
  setAnswers,
  started,
  submitted,
  choXemDapAn,
  handleSingleSelect,
  handleMultipleSelect,
  handleDragEnd,
  reorder,
  normalizeValue,
  setZoomImage,
}) => {
  if (loading || !currentQuestion) return null;

  const getImageFromOption = (opt) => {
    if (!opt) return null;
    if (typeof opt === "string") return opt;
    if (opt.image) return opt.image;
    if (typeof opt.text === "string" && opt.text.startsWith("http")) {
      return opt.text;
    }
    return null;
  };

  /* =================== DROPDOWN RENDER =================== */
  const renderDropdownQuestion = () => {
    const content = currentQuestion.content || "";
    const userAnswers = answers[currentQuestion.id] || {};

    return (
      <span>
        {content.split(/\[\[(\d+)\]\]/g).map((part, idx) => {
          // text
          if (idx % 2 === 0) {
            return (
              <span
                key={idx}
                dangerouslySetInnerHTML={{ __html: part }}
              />
            );
          }

          // dropdown
          const blankIndex = Number(part);
          const blank = currentQuestion.blanks?.[blankIndex];
          if (!blank) return "___";

          const selected = userAnswers[blankIndex] || "";

          const isCorrect =
            submitted &&
            choXemDapAn &&
            selected === blank.answer;

          const isWrong =
            submitted &&
            choXemDapAn &&
            selected &&
            selected !== blank.answer;

          return (
            <FormControl
              key={idx}
              size="small"
              sx={{
                mx: 1,
                minWidth: 110,
                bgcolor: submitted
                  ? isCorrect
                    ? "#c8e6c9"
                    : isWrong
                    ? "#ffcdd2"
                    : "transparent"
                  : "transparent"
              }}
            >
              <Select
                value={selected}
                disabled={submitted || !started}
                onChange={(e) => {
                  const val = e.target.value;
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: {
                      ...(prev[currentQuestion.id] || {}),
                      [blankIndex]: val
                    }
                  }));
                }}
              >
                <MenuItem value="">
                  <em>-- chọn --</em>
                </MenuItem>
                {blank.options.map((opt, i) => (
                  <MenuItem key={i} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })}
      </span>
    );
  };

  return (
    <Box key={currentQuestion.id || currentIndex}>
      <Divider sx={{ my: 2 }} />

      {/* =================== TITLE =================== */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        <strong>Câu {currentIndex + 1}:</strong>{" "}
        <span
          dangerouslySetInnerHTML={{
            __html: (currentQuestion.question || "").replace(
              /^<p>|<\/p>$/g,
              ""
            )
          }}
        />
      </Typography>

      {/* =================== IMAGE =================== */}
      {currentQuestion.image && (
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <img
            src={currentQuestion.image}
            alt="question"
            style={{
              maxWidth: "100%",
              maxHeight: 120,
              objectFit: "contain",
              borderRadius: 8
            }}
          />
        </Box>
      )}

      {/* =================== DROPDOWN =================== */}
      {currentQuestion.type === "dropdown" && (
        <Stack spacing={2}>
          <Typography component="div">
            {renderDropdownQuestion()}
          </Typography>
        </Stack>
      )}

      {/* =================== SINGLE =================== */}
      {currentQuestion.type === "single" && (
        <Stack spacing={2}>
          {currentQuestion.displayOrder.map((optIdx) => {
            const selected = answers[currentQuestion.id] === optIdx;
            const optionData = currentQuestion.options[optIdx];
            const optionText =
              typeof optionData === "object"
                ? optionData.text ?? ""
                : optionData;

            return (
              <Paper
                key={optIdx}
                onClick={() =>
                  !submitted &&
                  started &&
                  handleSingleSelect(currentQuestion.id, optIdx)
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1,
                  py: 0.5,
                  border: "1px solid #90caf9",
                  cursor:
                    submitted || !started ? "default" : "pointer"
                }}
              >
                <Radio checked={selected} />
                <Typography
                  component="div"
                  dangerouslySetInnerHTML={{ __html: optionText }}
                />
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* =================== MULTIPLE =================== */}
      {currentQuestion.type === "multiple" && (
        <Stack spacing={2}>
          {currentQuestion.displayOrder.map((optIdx) => {
            const userAns = answers[currentQuestion.id] || [];
            const checked = userAns.includes(optIdx);
            const option = currentQuestion.options[optIdx];

            return (
              <Paper
                key={optIdx}
                onClick={() =>
                  !submitted &&
                  started &&
                  handleMultipleSelect(
                    currentQuestion.id,
                    optIdx,
                    !checked
                  )
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1,
                  py: 0.5,
                  border: "1px solid #90caf9"
                }}
              >
                <Checkbox checked={checked} />
                <Typography
                  component="div"
                  dangerouslySetInnerHTML={{
                    __html: option.text ?? option
                  }}
                />
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* =================== TRUE / FALSE =================== */}
      {currentQuestion.type === "truefalse" && (
        <Stack spacing={2}>
          {currentQuestion.options.map((opt, i) => {
            const userAns = answers[currentQuestion.id] || [];
            const selected = userAns[i] ?? "";

            return (
              <Paper
                key={i}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1,
                  py: 0.5,
                  border: "1px solid #90caf9"
                }}
              >
                <Typography
                  component="div"
                  dangerouslySetInnerHTML={{ __html: opt }}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ width: 90 }}>
                  <Select
                    value={selected}
                    disabled={submitted || !started}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnswers((prev) => {
                        const arr = Array.isArray(prev[currentQuestion.id])
                          ? [...prev[currentQuestion.id]]
                          : [];
                        arr[i] = val;
                        return {
                          ...prev,
                          [currentQuestion.id]: arr
                        };
                      });
                    }}
                  >
                    <MenuItem value="Đ">Đúng</MenuItem>
                    <MenuItem value="S">Sai</MenuItem>
                  </Select>
                </FormControl>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default QuestionRenderer;

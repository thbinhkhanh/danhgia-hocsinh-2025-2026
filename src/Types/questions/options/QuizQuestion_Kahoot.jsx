import React from "react";
import { Box, Divider, Typography, Stack, Paper, Radio, Checkbox, FormControl, Select, MenuItem } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function QuizQuestion({
  loading,
  currentQuestion,
  currentIndex,
  answers,
  setAnswers,
  submitted,
  started,
  choXemDapAn,
  setZoomImage,
  handleSingleSelect,
  handleMultipleSelect,
  handleDragEnd,
  reorder,
  normalizeValue,
  ratio,
  kahootMode = false,
}) {
  if (loading || !currentQuestion) return null;

  /* ===================== RENDER CHUNG ===================== */

  const renderHeader = () => (
    <Typography
      variant="h6"
      sx={{
        mb: 2,
        ...(kahootMode && {
          textAlign: "left",
          fontWeight: 500,
          fontSize: { xs: "1.1rem", sm: "1.35rem" },
          bgcolor: "#fff",
          borderRadius: 2,
          p: { xs: 1.5, sm: 2 },
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }),
      }}
    >
      <strong>Câu {currentIndex + 1}:</strong>{" "}
      <span
        dangerouslySetInnerHTML={{
          __html: (currentQuestion.question || "").replace(
            /^<p>|<\/p>$/g,
            ""
          ),
        }}
      />
    </Typography>
  );

  const renderQuestionImage = () => {
    const image =
      currentQuestion.image || currentQuestion.questionImage;

    return image ? (
      <Box
        sx={{
          width: "100%",
          textAlign: "center",
          mb: 2,
        }}
      >
        <img
          src={image}
          alt="question"
          style={{
            maxWidth: "100%",
            maxHeight: 150,
            objectFit: "contain",
            borderRadius: 8,
            cursor: "zoom-in",
          }}
          onClick={() => setZoomImage(image)}
        />
      </Box>
    ) : null;
  };

  /* ===================== SORT ===================== */
  const renderSort = () => {
    const kahootColors = [
      "#e21b3c", // Đỏ
      "#1368ce", // Xanh dương
      "#d89e00", // Vàng
      "#26890c", // Xanh lá
    ];

    return (
      <Box sx={{ width: "100%" }}>
        <DragDropContext
          onDragEnd={(result) => {
            if (!result.destination || submitted || !started) return;

            const currentOrder =
              answers[currentQuestion.id] ??
              currentQuestion.options.map((_, idx) => idx);

            const newOrder = reorder(
              currentOrder,
              result.source.index,
              result.destination.index
            );

            setAnswers((prev) => ({
              ...prev,
              [currentQuestion.id]: newOrder,
            }));
          }}
        >
          <Droppable
            droppableId="sort-options"
            direction="vertical"
          >
            {(provided) => {
              const orderIdx =
                answers[currentQuestion.id] ??
                currentQuestion.options.map((_, idx) => idx);

              return (
                <Box
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: {
                      xs: 1.2,
                      sm: 1.5,
                    },
                    width: "100%",
                    maxWidth: 1000,
                    mx: "auto",
                  }}
                >
                  {orderIdx.map((optIdx, pos) => {
                    const optionData =
                      currentQuestion.options[optIdx];

                    const optionText =
                      typeof optionData === "string"
                        ? optionData
                        : optionData?.text ?? "";

                    const optionImage =
                      typeof optionData === "object"
                        ? optionData?.image ?? null
                        : null;

                    // So sánh với đáp án đúng theo vị trí
                    const correctData =
                      currentQuestion.correctTexts[pos];

                    const isCorrectPos =
                      submitted &&
                      choXemDapAn &&
                      normalizeValue(optionData) ===
                        normalizeValue(correctData);

                    let bgcolor =
                      kahootColors[pos % kahootColors.length];

                    // Khi hiển thị kết quả
                    if (submitted && choXemDapAn) {
                      bgcolor = isCorrectPos
                        ? "#26890c"
                        : "#e21b3c";
                    }

                    return (
                      <Draggable
                        key={optIdx}
                        draggableId={String(optIdx)}
                        index={pos}
                        isDragDisabled={
                          submitted || !started
                        }
                      >
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              position: "relative",

                              minHeight: {
                                xs: 80,
                                sm: 100,
                              },

                              p: {
                                xs: 1.5,
                                sm: 2,
                              },

                              bgcolor,
                              color: "#fff",
                              borderRadius: 2,

                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start",

                              textAlign: "left",

                              gap: 1.5,

                              cursor:
                                submitted || !started
                                  ? "default"
                                  : snapshot.isDragging
                                  ? "grabbing"
                                  : "grab",

                              border: snapshot.isDragging
                                ? "5px solid #fff"
                                : "5px solid transparent",

                              boxSizing: "border-box",

                              boxShadow:
                                snapshot.isDragging
                                  ? "0 0 0 3px rgba(0,0,0,0.35)"
                                  : "0 3px 8px rgba(0,0,0,0.2)",

                              transition:
                                "transform 0.15s ease, box-shadow 0.15s ease",

                              "&:hover": {
                                transform:
                                  submitted || !started
                                    ? "none"
                                    : "scale(1.02)",

                                boxShadow:
                                  submitted || !started
                                    ? "0 3px 8px rgba(0,0,0,0.2)"
                                    : "0 7px 15px rgba(0,0,0,0.3)",
                              },
                            }}
                          >
                            {/* ================= VỊ TRÍ ================= */}
                            <Box
                              sx={{
                                flexShrink: 0,

                                width: 32,
                                height: 32,

                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",

                                borderRadius: 1,
                                bgcolor: "#fff",
                                color: "#333",

                                fontSize: "1.15rem",
                                fontWeight: 800,
                              }}
                            >
                              {pos + 1}
                            </Box>

                            {/* ================= ẢNH ĐÁP ÁN ================= */}
                            {optionImage && (
                              <Box
                                component="img"
                                src={optionImage}
                                alt={`option-${optIdx}`}
                                sx={{
                                  maxWidth: {
                                    xs: 80,
                                    sm: 120,
                                  },

                                  maxHeight: {
                                    xs: 70,
                                    sm: 100,
                                  },

                                  objectFit: "contain",
                                  borderRadius: 1,
                                  bgcolor: "#fff",
                                  p: 0.5,

                                  mr: optionText ? 1 : 0,
                                }}
                              />
                            )}

                            {/* ================= TEXT ================= */}
                            <Typography
                              component="div"
                              sx={{
                                fontSize: {
                                  xs: "1rem",
                                  sm: "1.25rem",
                                },

                                fontWeight: 400,
                                lineHeight: 1.35,

                                userSelect: "none",
                                maxWidth: "90%",
                                whiteSpace: "pre-wrap",

                                "& p": {
                                  margin: 0,
                                },
                              }}
                              dangerouslySetInnerHTML={{
                                __html: optionText,
                              }}
                            />
                          </Box>
                        )}
                      </Draggable>
                    );
                  })}

                  {provided.placeholder}
                </Box>
              );
            }}
          </Droppable>
        </DragDropContext>
      </Box>
    );
  };

  /* ===================== MATCHING ===================== */

  const renderMatching = () => {
  const kahootColors = [
    "#e21b3c", // Đỏ
    "#1368ce", // Xanh dương
    "#d89e00", // Vàng
    "#26890c", // Xanh lá
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <DragDropContext
        onDragEnd={(result) => {
          if (
            !result.destination ||
            submitted ||
            !started
          ) {
            return;
          }

          const currentOrder =
            answers[currentQuestion.id] ??
            currentQuestion.rightOptions.map(
              (_, idx) => idx
            );

          const newOrder = reorder(
            currentOrder,
            result.source.index,
            result.destination.index
          );

          setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: newOrder,
          }));
        }}
      >
        <Stack
          spacing={{
            xs: 1,
            sm: 1.5,
          }}
          sx={{
            width: "100%",
            maxWidth: 1000,
            mx: "auto",
            px: {
              xs: 0.5,
              sm: 1,
            },
          }}
        >
          {currentQuestion.pairs.map(
            (pair, i) => {
              const optionText =
                pair.left || "";

              const optionImage =
                pair.leftImage?.url ||
                pair.leftIconImage?.url ||
                null;

              /* ================= ORDER HIỆN TẠI ================= */
              const userOrder =
                answers[currentQuestion.id] ??
                currentQuestion.rightOptions.map(
                  (_, idx) => idx
                );

              const rightIdx =
                userOrder[i];

              /* ================= RIGHT DATA ================= */
              const rightVal =
                currentQuestion.rightOptions?.[
                  rightIdx
                ] ??
                currentQuestion.rightOptions?.[i];

              const rightText =
                typeof rightVal === "string"
                  ? rightVal
                  : rightVal?.text ?? "";

              const rightImage =
                typeof rightVal === "object"
                  ? rightVal?.url ??
                    rightVal?.image ??
                    null
                  : null;

              /* ================= KIỂM TRA ================= */
              const isCorrect =
                submitted &&
                choXemDapAn &&
                userOrder[i] ===
                  currentQuestion.correct[i];

              /* ================= MÀU KAHOOT ================= */
              let bgcolor =
                kahootColors[
                  i % kahootColors.length
                ];

              if (
                submitted &&
                choXemDapAn
              ) {
                bgcolor = isCorrect
                  ? "#26890c"
                  : "#e21b3c";
              }

              return (
                <Stack
                  key={i}
                  direction="row"
                  spacing={{
                    xs: 1,
                    sm: 1.5,
                  }}
                  alignItems="stretch"
                  sx={{
                    minHeight: {
                      xs: 70,
                      sm: 90,
                    },
                  }}
                >
                  {/* ================= LEFT ================= */}
                  <Paper
                    elevation={2}
                    sx={{
                      flexGrow: ratio.left,
                      flexBasis: 0,

                      display: "flex",
                      alignItems: "center",

                      gap: {
                        xs: 0.8,
                        sm: 1.5,
                      },

                      px: {
                        xs: 1,
                        sm: 1.5,
                      },

                      py: {
                        xs: 0.8,
                        sm: 1,
                      },

                      bgcolor: "#fff",

                      color: "#222",

                      border:
                        "2px solid #90caf9",

                      borderRadius: 2,

                      boxShadow:
                        "0 2px 6px rgba(0,0,0,0.12)",

                      boxSizing:
                        "border-box",

                      overflow: "hidden",
                    }}
                  >
                    {/* ================= ẢNH LEFT ================= */}
                    {optionImage && (
                      <Box
                        component="img"
                        src={optionImage}
                        alt={`left-${i}`}
                        sx={{
                          maxWidth: {
                            xs: 60,
                            sm: 90,
                          },

                          maxHeight: {
                            xs: 45,
                            sm: 60,
                          },

                          width: "auto",
                          height: "auto",

                          objectFit:
                            "contain",

                          borderRadius: 1,

                          flexShrink: 0,

                          display: "block",
                        }}
                      />
                    )}

                    {/* ================= TEXT LEFT ================= */}
                    {optionText && (
                      <Typography
                        component="div"
                        sx={{
                          flex: 1,

                          fontSize: {
                            xs: "0.9rem",
                            sm: "1.05rem",
                          },

                          fontWeight: 600,

                          lineHeight: 1.4,

                          wordBreak:
                            "break-word",

                          whiteSpace:
                            "pre-wrap",

                          "& p": {
                            margin: 0,
                          },
                        }}
                        dangerouslySetInnerHTML={{
                          __html:
                            optionText,
                        }}
                      />
                    )}
                  </Paper>

                  {/* ================= RIGHT ================= */}
                  <Droppable
                    droppableId={`right-${i}`}
                    direction="vertical"
                  >
                    {(provided) => (
                      <Stack
                        ref={
                          provided.innerRef
                        }
                        {...provided.droppableProps}
                        sx={{
                          flexGrow:
                            ratio.right,
                          flexBasis: 0,
                        }}
                      >
                        <Draggable
                          key={rightIdx}
                          draggableId={String(
                            rightIdx
                          )}
                          index={i}
                          isDragDisabled={
                            submitted ||
                            !started
                          }
                        >
                          {(provided, snapshot) => (
                            <Paper
                              ref={
                                provided.innerRef
                              }
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              elevation={3}
                              sx={{
                                flex: 1,

                                minHeight: {
                                  xs: 70,
                                  sm: 90,
                                },

                                display: "flex",
                                alignItems:
                                  "center",

                                gap: {
                                  xs: 0.8,
                                  sm: 1.5,
                                },

                                px: {
                                  xs: 1,
                                  sm: 1.5,
                                },

                                py: {
                                  xs: 0.8,
                                  sm: 1,
                                },

                                bgcolor,

                                color: "#fff",

                                borderRadius: 2,

                                border:
                                  snapshot.isDragging
                                    ? "4px solid #fff"
                                    : "4px solid transparent",

                                boxSizing:
                                  "border-box",

                                cursor:
                                  submitted ||
                                  !started
                                    ? "default"
                                    : snapshot.isDragging
                                    ? "grabbing"
                                    : "grab",

                                boxShadow:
                                  snapshot.isDragging
                                    ? "0 0 0 3px rgba(0,0,0,0.3)"
                                    : "0 3px 8px rgba(0,0,0,0.2)",

                                transition:
                                  "transform 0.15s ease, box-shadow 0.15s ease",

                                "&:hover": {
                                  transform:
                                    submitted ||
                                    !started
                                      ? "none"
                                      : "scale(1.02)",

                                  boxShadow:
                                    submitted ||
                                    !started
                                      ? "0 3px 8px rgba(0,0,0,0.2)"
                                      : "0 7px 15px rgba(0,0,0,0.3)",
                                },
                              }}
                            >
                              
                              {/* ================= ẢNH RIGHT ================= */}
                              {rightImage && (
                                <Box
                                  component="img"
                                  src={rightImage}
                                  alt={`right-${rightIdx}`}
                                  sx={{
                                    maxWidth: {
                                      xs: 60,
                                      sm: 90,
                                    },

                                    maxHeight: {
                                      xs: 45,
                                      sm: 60,
                                    },

                                    width: "auto",
                                    height: "auto",

                                    objectFit:
                                      "contain",

                                    borderRadius: 1,

                                    flexShrink: 0,

                                    display:
                                      "block",

                                    bgcolor:
                                      "#fff",

                                    p: 0.3,
                                  }}
                                />
                              )}

                              {/* ================= TEXT RIGHT ================= */}
                              {rightText && (
                                <Typography
                                  component="div"
                                  sx={{
                                    flex: 1,

                                    fontSize: {
                                      xs: "0.9rem",
                                      sm: "1.05rem",
                                    },

                                    fontWeight: 700,

                                    lineHeight:
                                      1.4,

                                    wordBreak:
                                      "break-word",

                                    whiteSpace:
                                      "pre-wrap",

                                    "& p": {
                                      margin: 0,
                                    },
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      rightText,
                                  }}
                                />
                              )}
                            </Paper>
                          )}
                        </Draggable>

                        {provided.placeholder}
                      </Stack>
                    )}
                  </Droppable>
                </Stack>
              );
            }
          )}
        </Stack>
      </DragDropContext>
    </Box>
  );
};

  /* ===================== SINGLE ===================== */
  const renderSingle = () => {
    const kahootColors = [
      "#e21b3c", // Đỏ
      "#1368ce", // Xanh dương
      "#d89e00", // Vàng
      "#26890c", // Xanh lá
    ];

    return (
      <Box sx={{ width: "100%" }}>
        {/* ================= 4 ĐÁP ÁN ================= */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: {
              xs: 1.2,
              sm: 1.5,
            },
            width: "100%",
            maxWidth: 1000,
            mx: "auto",
          }}
        >
          {currentQuestion.displayOrder.map((optIdx, answerIndex) => {
            const selected =
              answers[currentQuestion.id] === optIdx;

            const correctArray = Array.isArray(currentQuestion.correct)
              ? currentQuestion.correct
              : [currentQuestion.correct];

            const isCorrect =
              submitted &&
              choXemDapAn &&
              correctArray.includes(optIdx);

            const isWrong =
              submitted &&
              choXemDapAn &&
              selected &&
              !correctArray.includes(optIdx);

            const handleSelect = () => {
              if (submitted || !started) return;

              handleSingleSelect(
                currentQuestion.id,
                optIdx
              );
            };

            // Dữ liệu đáp án
            const optionData =
              currentQuestion.options[optIdx];

            const optionText =
              typeof optionData === "object"
                ? optionData?.text ?? ""
                : typeof optionData === "string"
                ? optionData
                : "";

            const optionImage =
              typeof optionData === "object"
                ? optionData?.image ?? null
                : null;

            // Màu Kahoot
            let bgcolor =
              kahootColors[
                answerIndex % kahootColors.length
              ];

            // Khi hiển thị kết quả
            if (submitted && choXemDapAn) {
              if (isCorrect) {
                bgcolor = "#26890c";
              } else if (isWrong) {
                bgcolor = "#e21b3c";
              } else {
                bgcolor = "#777";
              }
            }

            return (
              <Paper
                key={optIdx}
                onClick={handleSelect}
                elevation={3}
                sx={{
                  position: "relative",

                  minHeight: {
                    xs: 100,
                    sm: 120,
                  },

                  p: {
                    xs: 1.5,
                    sm: 2,
                  },

                  bgcolor,
                  color: "#fff",
                  borderRadius: 2,

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",

                  textAlign: "left",

                  gap: 1.5,

                  cursor:
                    submitted || !started
                      ? "default"
                      : "pointer",

                  border: selected
                    ? "5px solid #fff"
                    : "5px solid transparent",

                  boxSizing: "border-box",

                  transition:
                    "transform 0.15s ease, box-shadow 0.15s ease",

                  boxShadow: selected
                    ? "0 0 0 3px rgba(0,0,0,0.35)"
                    : "0 3px 8px rgba(0,0,0,0.2)",

                  "&:hover": {
                    transform:
                      submitted || !started
                        ? "none"
                        : "scale(1.02)",

                    boxShadow:
                      submitted || !started
                        ? "0 3px 8px rgba(0,0,0,0.2)"
                        : "0 7px 15px rgba(0,0,0,0.3)",
                  },
                }}
              >
                {/* ================= RADIO ================= */}
                <Radio
                  checked={selected}
                  disabled={submitted || !started}
                  onChange={handleSelect}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    flexShrink: 0,
                    p: 0.5,
                    mr: 0.5,

                    color: "#fff",

                    "& .MuiSvgIcon-root": {
                      fontSize: 32,
                    },

                    "&.Mui-checked": {
                      color: "#fff",
                    },
                  }}
                />

                {/* ================= ẢNH ĐÁP ÁN ================= */}
                {optionImage && (
                  <Box
                    component="img"
                    src={optionImage}
                    alt={`option-${optIdx}`}
                    sx={{
                      flexShrink: 0,

                      maxWidth: {
                        xs: 80,
                        sm: 120,
                      },
                      maxHeight: {
                        xs: 70,
                        sm: 100,
                      },

                      objectFit: "contain",
                      borderRadius: 1,
                      bgcolor: "#fff",
                      p: 0.5,
                      mr: optionText ? 1 : 0,
                    }}
                  />
                )}

                {/* ================= TEXT ĐÁP ÁN ================= */}
                <Typography
                  component="div"
                  sx={{
                    fontSize: {
                      xs: "1rem",
                      sm: "1.25rem",
                    },
                    fontWeight: 400,
                    lineHeight: 1.35,
                    userSelect: "none",
                    maxWidth: "90%",
                    whiteSpace: "pre-wrap",

                    textAlign: "left",

                    "& p": {
                      margin: 0,
                    },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: optionText,
                  }}
                />
              </Paper>
            );
          })}
        </Box>
      </Box>
    );
  };

  /* ===================== MULTIPLE ===================== */
  const renderMultiple = () => {
    const kahootColors = [
      "#e21b3c", // đỏ (A)
      "#1368ce", // xanh dương (B)
      "#d89e00", // vàng (C)
      "#26890c", // xanh lá (D)
    ];

    return (
      <Box sx={{ width: "100%" }}>
        {/* Hình minh họa câu hỏi nếu có */}
        {currentQuestion.questionImage && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Box
              sx={{
                maxWidth: "100%",
                maxHeight: { xs: 180, sm: 260 },
                overflow: "hidden",
                borderRadius: 2,
                bgcolor: "#fff",
                boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src={currentQuestion.questionImage}
                alt="Hình minh họa"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: 260,
                  objectFit: "contain",
                  cursor: "zoom-in",
                }}
                onClick={() =>
                  setZoomImage(currentQuestion.questionImage)
                }
              />
            </Box>
          </Box>
        )}

        {/* ================= LƯỚI 4 Ô KAHOOT CHO MULTIPLE ================= */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              sm: "1fr 1fr",
            },
            gap: { xs: 1, sm: 1.5 },
            width: "100%",
            maxWidth: 900,
            mx: "auto",
          }}
        >
          {currentQuestion.displayOrder.map((optIdx, answerIndex) => {
            const optionData = currentQuestion.options[optIdx];
            const optionText = optionData.text ?? "";
            const optionImage = optionData.image ?? null;

            const userAns = answers[currentQuestion.id] || [];
            const checked = userAns.includes(optIdx);

            const correctArray = Array.isArray(currentQuestion.correct)
              ? currentQuestion.correct
              : [];

            const isCorrect =
              submitted &&
              choXemDapAn &&
              correctArray.includes(optIdx);

            const isWrong =
              submitted &&
              choXemDapAn &&
              checked &&
              !correctArray.includes(optIdx);

            const handleSelect = () => {
              if (submitted || !started) return;
              handleMultipleSelect(
                currentQuestion.id,
                optIdx,
                !checked
              );
            };

            let bgcolor =
              kahootColors[answerIndex % kahootColors.length];

            if (submitted && choXemDapAn) {
              if (isCorrect) {
                bgcolor = "#26890c";
              } else if (isWrong) {
                bgcolor = "#e21b3c";
              } else {
                bgcolor = "#777";
              }
            }

            return (
              <Box
                key={optIdx}
                onClick={handleSelect}
                sx={{
                  position: "relative",

                  height: {
                    xs: 100,
                    sm: 120,
                  },

                  bgcolor,
                  borderRadius: 2,

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",

                  p: { xs: 1.5, sm: 2 },

                  color: "#fff",

                  cursor:
                    submitted || !started
                      ? "default"
                      : "pointer",

                  boxSizing: "border-box",

                  border: checked
                    ? "5px solid #fff"
                    : "5px solid transparent",

                  boxShadow: checked
                    ? "0 0 0 3px rgba(0,0,0,0.35)"
                    : "0 3px 8px rgba(0,0,0,0.2)",

                  transition:
                    "transform 0.15s ease, box-shadow 0.15s ease",

                  "&:hover": {
                    transform:
                      submitted || !started
                        ? "none"
                        : "scale(1.02)",

                    boxShadow:
                      submitted || !started
                        ? "0 3px 8px rgba(0,0,0,0.2)"
                        : "0 7px 16px rgba(0,0,0,0.3)",
                  },
                }}
              >
                {/* ================= CHECKBOX ================= */}
                <Checkbox
                  checked={checked}
                  disabled={submitted || !started}
                  onChange={handleSelect}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    flexShrink: 0,
                    p: 0.5,
                    mr: 1,

                    color: "#fff",

                    "& .MuiSvgIcon-root": {
                      fontSize: 32,
                    },

                    "&.Mui-checked": {
                      color: "#fff",
                    },
                  }}
                />

                {/* ================= HÌNH OPTION ================= */}
                {optionImage && (
                  <Box
                    component="img"
                    src={optionImage}
                    alt={`option-${optIdx}`}
                    sx={{
                      flexShrink: 0,

                      maxWidth: {
                        xs: 90,
                        sm: 120,
                      },

                      maxHeight: {
                        xs: 70,
                        sm: 95,
                      },

                      objectFit: "contain",
                      borderRadius: 1,
                      bgcolor: "#fff",
                      p: 0.5,

                      mr: optionText ? 1 : 0,
                    }}
                  />
                )}

                {/* ================= TEXT OPTION ================= */}
                {optionText && (
                  <Typography
                    component="div"
                    sx={{
                      fontSize: {
                        xs: "1rem",
                        sm: "1.25rem",
                      },

                      fontWeight: 400,
                      lineHeight: 1.3,

                      textAlign: "left",

                      userSelect: "none",

                      maxWidth: "90%",

                      whiteSpace: "pre-wrap",

                      "& p": {
                        margin: 0,
                      },
                    }}
                    dangerouslySetInnerHTML={{
                      __html: optionText,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  /* ===================== TRUE / FALSE ===================== */
  const renderTrueFalse = () => {
    const kahootColors = [
      "#e21b3c", // Đỏ
      "#1368ce", // Xanh dương
      "#d89e00", // Vàng
      "#26890c", // Xanh lá
    ];

    return (
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: {
              xs: 1.2,
              sm: 1.5,
            },
            width: "100%",
            maxWidth: 1000,
            mx: "auto",
          }}
        >
          {currentQuestion.options.map((opt, i) => {
            const userAns =
              answers[currentQuestion.id] || [];

            const selected = userAns[i] ?? "";

            const originalIdx =
              Array.isArray(currentQuestion.initialOrder)
                ? currentQuestion.initialOrder[i]
                : i;

            const correctArray =
              Array.isArray(currentQuestion.correct)
                ? currentQuestion.correct
                : [];

            const correctVal =
              correctArray[originalIdx] ?? "";

            const showResult =
              submitted && choXemDapAn;

            const isCorrect =
              showResult &&
              selected === correctVal;

            const isWrong =
              showResult &&
              selected !== "" &&
              selected !== correctVal;

            const optionText =
              typeof opt === "string"
                ? opt
                : opt?.text ?? "";

            const optionImage =
              typeof opt === "object"
                ? opt?.image ?? null
                : null;

            /* ================= MÀU KAHOOT ================= */
            let bgcolor =
              kahootColors[
                i % kahootColors.length
              ];

            /* ================= KẾT QUẢ ================= */
            if (showResult) {
              if (isCorrect) {
                bgcolor = "#26890c";
              } else if (isWrong) {
                bgcolor = "#e21b3c";
              } else {
                bgcolor = "#777";
              }
            }

            return (
              <Paper
                key={i}
                elevation={3}
                sx={{
                  position: "relative",

                  minHeight: {
                    xs: 90,
                    sm: 100,
                  },

                  p: {
                    xs: 1.5,
                    sm: 2,
                  },

                  bgcolor,
                  color: "#fff",

                  borderRadius: 2,

                  display: "flex",
                  alignItems: "center",

                  gap: {
                    xs: 1,
                    sm: 1.5,
                  },

                  boxSizing: "border-box",

                  boxShadow:
                    "0 3px 8px rgba(0,0,0,0.2)",

                  transition:
                    "transform 0.15s ease, box-shadow 0.15s ease",

                  "&:hover": {
                    transform:
                      submitted || !started
                        ? "none"
                        : "scale(1.01)",

                    boxShadow:
                      submitted || !started
                        ? "0 3px 8px rgba(0,0,0,0.2)"
                        : "0 6px 14px rgba(0,0,0,0.3)",
                  },
                }}
              >

                {/* ================= ẢNH ĐÁP ÁN ================= */}
                {optionImage && (
                  <Box
                    component="img"
                    src={optionImage}
                    alt={`truefalse-${i}`}
                    sx={{
                      maxWidth: {
                        xs: 70,
                        sm: 100,
                      },

                      maxHeight: {
                        xs: 60,
                        sm: 80,
                      },

                      objectFit: "contain",

                      borderRadius: 1,

                      bgcolor: "#fff",
                      p: 0.5,

                      flexShrink: 0,
                    }}
                  />
                )}

                {/* ================= NỘI DUNG ================= */}
                <Typography
                  component="div"
                  sx={{
                    flex: 1,

                    userSelect: "none",

                    fontSize: {
                      xs: "0.95rem",
                      sm: "1.1rem",
                    },

                    fontWeight: 400,

                    lineHeight: 1.4,

                    whiteSpace: "pre-wrap",

                    "& p": {
                      margin: 0,
                    },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: optionText,
                  }}
                />

                {/* ================= CHỌN ĐÚNG / SAI ================= */}
                <FormControl
                  size="small"
                  sx={{
                    width: {
                      xs: 105,
                      sm: 130,
                    },

                    flexShrink: 0,
                  }}
                >
                  <Select
                    value={selected}
                    disabled={
                      submitted || !started
                    }
                    onChange={(e) => {
                      if (
                        submitted ||
                        !started
                      )
                        return;

                      const val =
                        e.target.value;

                      setAnswers((prev) => {
                        const arr =
                          Array.isArray(
                            prev[
                              currentQuestion.id
                            ]
                          )
                            ? [
                                ...prev[
                                  currentQuestion.id
                                ],
                              ]
                            : Array(
                                currentQuestion
                                  .options
                                  .length
                              ).fill("");

                        arr[i] = val;

                        return {
                          ...prev,
                          [currentQuestion.id]:
                            arr,
                        };
                      });
                    }}
                    sx={{
                      height: 38,

                      bgcolor: "#fff",

                      borderRadius: 1.5,

                      fontSize: {
                        xs: "0.85rem",
                        sm: "0.95rem",
                      },

                      fontWeight: 400,

                      "& .MuiSelect-select": {
                        py: 0.5,
                      },
                    }}
                  >
                    {/* ================= ĐÚNG ================= */}
                    <MenuItem value="Đ">
                      {currentQuestion.trueLabel ||
                        "Đúng"}
                    </MenuItem>

                    {/* ================= SAI ================= */}
                    <MenuItem value="S">
                      {currentQuestion.falseLabel ||
                        "Sai"}
                    </MenuItem>
                  </Select>
                </FormControl>
              </Paper>
            );
          })}
        </Box>
      </Box>
    );
  };


  /* ===================== IMAGE ===================== */

  const renderImage = () => {
    const kahootColors = [
      "#e21b3c", // Đỏ
      "#1368ce", // Xanh dương
      "#d89e00", // Vàng
      "#26890c", // Xanh lá
    ];

    return (
      <Box sx={{ width: "100%" }}>
        {/* ================= 4 ĐÁP ÁN HÌNH ẢNH ================= */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: {
              xs: 1.2,
              sm: 1.5,
            },
            width: "100%",
            maxWidth: 1000,
            mx: "auto",
          }}
        >
          {currentQuestion.displayOrder.map(
            (optIdx, answerIndex) => {
              const option =
                currentQuestion.options[optIdx];

              // ẢNH = option.text
              const imageUrl =
                typeof option === "string"
                  ? option
                  : option?.text ?? "";

              if (!imageUrl) return null;

              const userAns =
                answers[currentQuestion.id] || [];

              const checked =
                userAns.includes(optIdx);

              const correctArray = Array.isArray(
                currentQuestion.correct
              )
                ? currentQuestion.correct
                : [currentQuestion.correct];

              const isCorrect =
                submitted &&
                choXemDapAn &&
                correctArray.includes(optIdx);

              const isWrong =
                submitted &&
                choXemDapAn &&
                checked &&
                !correctArray.includes(optIdx);

              const handleSelect = () => {
                if (submitted || !started) return;

                handleMultipleSelect(
                  currentQuestion.id,
                  optIdx,
                  !checked
                );
              };

              // ================= MÀU KAHOOT =================
              let bgcolor =
                kahootColors[
                  answerIndex % kahootColors.length
                ];

              if (submitted && choXemDapAn) {
                if (isCorrect) {
                  bgcolor = "#26890c";
                } else if (isWrong) {
                  bgcolor = "#e21b3c";
                } else {
                  bgcolor = "#777";
                }
              }

              return (
                <Paper
                  key={optIdx}
                  onClick={handleSelect}
                  elevation={3}
                  sx={{
                    position: "relative",

                    minHeight: {
                      xs: 150,
                      sm: 180,
                    },

                    p: {
                      xs: 1.5,
                      sm: 2,
                    },

                    bgcolor,
                    color: "#fff",
                    borderRadius: 2,

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    cursor:
                      submitted || !started
                        ? "default"
                        : "pointer",

                    boxSizing: "border-box",

                    border: checked
                      ? "5px solid #fff"
                      : "5px solid transparent",

                    boxShadow: checked
                      ? "0 0 0 3px rgba(0,0,0,0.35)"
                      : "0 3px 8px rgba(0,0,0,0.2)",

                    transition:
                      "transform 0.15s ease, box-shadow 0.15s ease",

                    "&:hover": {
                      transform:
                        submitted || !started
                          ? "none"
                          : "scale(1.02)",

                      boxShadow:
                        submitted || !started
                          ? "0 3px 8px rgba(0,0,0,0.2)"
                          : "0 7px 15px rgba(0,0,0,0.3)",
                    },
                  }}
                >
                  {/* ================= CHECKBOX ================= */}
                  <Checkbox
                    checked={checked}
                    disabled={submitted || !started}
                    onChange={handleSelect}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      position: "absolute",
                      top: 5,
                      left: 5,
                      zIndex: 2,
                      p: 0.5,
                      color: "#fff",

                      "& .MuiSvgIcon-root": {
                        fontSize: 32,
                      },

                      "&.Mui-checked": {
                        color: "#fff",
                      },
                    }}
                  />

                  {/* ================= ẢNH ================= */}
                  <Box
                    component="img"
                    src={imageUrl}
                    alt={`option-${optIdx}`}
                    sx={{
                      width: {
                        xs: "65%",
                        sm: "60%",
                      },

                      maxWidth: 220,

                      maxHeight: {
                        xs: 120,
                        sm: 145,
                      },

                      objectFit: "contain",

                      borderRadius: 1,

                      bgcolor: "#fff",
                      p: 0.5,

                      display: "block",
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display =
                        "none";
                    }}
                  />
                </Paper>
              );
            }
          )}
        </Box>
      </Box>
    );
  };

  /* ===================== FILL BLANK ===================== */

  const renderFillBlank = () => {
    const kahootColors = [
      "#e21b3c", // Đỏ
      "#1368ce", // Xanh dương
      "#d89e00", // Vàng
      "#26890c", // Xanh lá
    ];

    return (
      <Box sx={{ width: "100%" }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Stack spacing={2}>

            {/* ======================= CÂU HỎI + CHỖ TRỐNG ======================= */}
            <Box
              sx={{
                width: "100%",
                boxSizing: "border-box",
                lineHeight: 1.8,
                fontSize: {
                  xs: "1rem",
                  sm: "1.15rem",
                },
                fontFamily: "Roboto, Arial, sans-serif",
                textAlign: "left",
                bgcolor: "#fff",
                borderRadius: 2,
                p: {
                  xs: 1.5,
                  sm: 2,
                },
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            >
              {currentQuestion.option.split("[...]").map(
                (part, idx) => (
                  <span key={idx}>

                    {/* ================= TEXT ================= */}
                    <Typography
                      component="span"
                      variant="body1"
                      sx={{
                        mr: 0.5,
                        fontSize: {
                          xs: "1rem",
                          sm: "1.15rem",
                        },
                        "& p, & div": {
                          display: "inline",
                          margin: 0,
                        },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: part.replace(
                          /<\/p>\s*<p>/g,
                          "</p><p><br></p><p><br></p><p>"
                        ),
                      }}
                    />

                    {/* ================= CHỖ TRỐNG ================= */}
                    {idx <
                      currentQuestion.option.split("[...]").length -
                        1 && (
                      <Droppable
                        droppableId={`blank-${idx}`}
                        direction="horizontal"
                      >
                        {(provided) => {
                          const userWord =
                            currentQuestion.filled?.[idx] ?? "";

                          const correctObj =
                            currentQuestion.options?.[idx];

                          const correctWord =
                            typeof correctObj === "string"
                              ? correctObj
                              : correctObj?.text ?? "";

                          const isCorrect =
                            submitted &&
                            userWord &&
                            userWord.trim().toLowerCase() ===
                              correctWord.trim().toLowerCase();

                          /* ================= MÀU ĐÚNG / SAI ================= */
                          const resultColor =
                            submitted && userWord
                              ? isCorrect
                                ? "#26890c"
                                : "#e21b3c"
                              : null;

                          /* ================= TÌM MÀU CỦA TỪ ================= */
                          const wordList =
                            currentQuestion.shuffledOptions ||
                            currentQuestion.options ||
                            [];

                          const wordIndex = wordList.findIndex(
                            (o) => {
                              const text =
                                typeof o === "string"
                                  ? o
                                  : o?.text ?? "";

                              return (
                                text.trim() ===
                                userWord.trim()
                              );
                            }
                          );

                          const kahootColor =
                            wordIndex >= 0
                              ? kahootColors[
                                  wordIndex %
                                    kahootColors.length
                                ]
                              : kahootColors[
                                  idx %
                                    kahootColors.length
                                ];

                          /* ================= MÀU HIỂN THỊ ================= */
                          const displayColor =
                            resultColor ||
                            (userWord
                              ? kahootColor
                              : "#aaa");

                          return (
                            <Box
                              component="span"
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              sx={{
                                display: "inline-flex",
                                verticalAlign: "middle",
                                alignItems: "center",
                                justifyContent: "center",

                                minWidth: {
                                  xs: 80,
                                  sm: 100,
                                },

                                minHeight: {
                                  xs: 42,
                                  sm: 48,
                                },

                                mx: 0.5,
                                px: 0.5,

                                /* ================= MÀU CHỖ TRỐNG ================= */
                                bgcolor: userWord
                                  ? displayColor
                                  : "#f5f5f5",

                                border:
                                  userWord
                                    ? `3px solid ${displayColor}`
                                    : "3px dashed #aaa",

                                borderRadius: 2,

                                color: "#fff",

                                fontWeight: 400,

                                fontSize: {
                                  xs: "0.9rem",
                                  sm: "1rem",
                                },

                                transition:
                                  "background-color 0.2s ease",
                              }}
                            >
                              {userWord && (
                                <Draggable
                                  draggableId={`filled-${idx}`}
                                  index={0}
                                  isDragDisabled={
                                    submitted || !started
                                  }
                                >
                                  {(prov) => (
                                    <Paper
                                      ref={prov.innerRef}
                                      {...prov.draggableProps}
                                      {...prov.dragHandleProps}
                                      sx={{
                                        px: 1.5,
                                        py: 0.5,

                                        /* ================= GIỮ MÀU TỪ ================= */
                                        bgcolor: displayColor,

                                        color: "#fff",

                                        borderRadius: 1.5,

                                        cursor:
                                          submitted || !started
                                            ? "default"
                                            : "grab",

                                        minHeight: 32,

                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",

                                        fontWeight: 400,

                                        fontSize: {
                                          xs: "0.9rem",
                                          sm: "1rem",
                                        },

                                        boxShadow:
                                          "0 2px 5px rgba(0,0,0,0.2)",
                                      }}
                                    >
                                      {userWord}
                                    </Paper>
                                  )}
                                </Draggable>
                              )}

                              {provided.placeholder}
                            </Box>
                          );
                        }}
                      </Droppable>
                    )}
                  </span>
                )
              )}
            </Box>

            {/* ======================= WORD POOL ======================= */}
            <Box sx={{ width: "100%" }}>
              <Typography
                sx={{
                  mb: 1,
                  fontWeight: 400,
                  fontSize: {
                    xs: "1rem",
                    sm: "1.05rem",
                  },
                  textAlign: "center",
                }}
              >
                Các từ cần điền:
              </Typography>

              <Droppable
                droppableId="words"
                direction="horizontal"
              >
                {(provided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      width: "100%",
                      maxWidth: 1000,
                      mx: "auto",
                      p: 1,
                      justifyContent: "center",
                      minHeight: 50,
                    }}
                  >
                    {(
                      currentQuestion.shuffledOptions ||
                      currentQuestion.options
                    )
                      .filter(
                        (o) =>
                          !(
                            currentQuestion.filled ?? []
                          ).includes(o.text)
                      )
                      .map((word, idx) => {
                        const wordText =
                          typeof word === "string"
                            ? word
                            : word?.text ?? "";

                        return (
                          <Draggable
                            key={wordText}
                            draggableId={`word-${wordText}`}
                            index={idx}
                            isDragDisabled={
                              submitted || !started
                            }
                          >
                            {(prov, snapshot) => (
                              <Paper
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                elevation={2}
                                sx={{
                                  minHeight: 42,
                                  px: 1.5,
                                  py: 0.5,

                                  bgcolor:
                                    kahootColors[
                                      idx %
                                        kahootColors.length
                                    ],

                                  color: "#fff",

                                  borderRadius: 1.5,

                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",

                                  textAlign: "center",

                                  fontFamily:
                                    "Roboto, Arial, sans-serif",

                                  fontSize: {
                                    xs: "0.9rem",
                                    sm: "1rem",
                                  },

                                  fontWeight: 400,

                                  lineHeight: 1.2,

                                  whiteSpace: "normal",
                                  wordBreak: "break-word",

                                  cursor:
                                    submitted || !started
                                      ? "default"
                                      : snapshot.isDragging
                                      ? "grabbing"
                                      : "grab",

                                  userSelect: "none",

                                  boxSizing: "border-box",

                                  boxShadow:
                                    snapshot.isDragging
                                      ? "0 0 0 3px rgba(0,0,0,0.25)"
                                      : "0 2px 5px rgba(0,0,0,0.2)",

                                  transform:
                                    snapshot.isDragging
                                      ? "scale(1.03)"
                                      : "none",

                                  transition:
                                    "transform 0.15s ease, box-shadow 0.15s ease",

                                  "&:hover": {
                                    transform:
                                      submitted || !started
                                        ? "none"
                                        : "scale(1.03)",

                                    boxShadow:
                                      submitted || !started
                                        ? "0 2px 5px rgba(0,0,0,0.2)"
                                        : "0 5px 10px rgba(0,0,0,0.25)",
                                  },
                                }}
                              >
                                {wordText}
                              </Paper>
                            )}
                          </Draggable>
                        );
                      })}

                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Box>
          </Stack>
        </DragDropContext>
      </Box>
    );
  };

  /* ===================== SWITCH THEO TYPE ===================== */
  const renderByType = () => {
    switch (currentQuestion.type) {
      case "sort":
        return renderSort();
      case "matching":
        return renderMatching();
      case "single":
        return renderSingle();
      case "multiple":
        return renderMultiple();
      case "truefalse":
        return renderTrueFalse();
      case "image":
        return renderImage();
      case "fillblank":
        return renderFillBlank();
      default:
        return null;
    }
  };

  /* ===================== RETURN ===================== */
  return (
    <Box
      key={currentQuestion.id || currentIndex}
      sx={{
        width: "100%",
        boxSizing: "border-box",
        ...(kahootMode && {
          bgcolor: "#f5f5f5",
          borderRadius: 2,
          p: { xs: 1, sm: 2 },
          boxSizing: "border-box",
          width: "100%",
        }),
      }}
    >
      {renderHeader()}
      {renderQuestionImage()}
      {renderByType()}
    </Box>
  );
}

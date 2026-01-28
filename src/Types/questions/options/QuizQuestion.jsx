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
  MenuItem,
} from "@mui/material";

import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

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
}) {
  if (loading || !currentQuestion) return null;

  /* ===================== RENDER CHUNG ===================== */

  const renderHeader = () => (
    <>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>
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
    </>
  );

  const renderQuestionImage = () =>
    currentQuestion.image ? (
      <Box sx={{ width: "100%", textAlign: "center", mb: 2 }}>
        <img
          src={currentQuestion.image}
          alt="question"
          style={{
            maxWidth: "100%",
            maxHeight: 150,
            objectFit: "contain",
            borderRadius: 8,
          }}
        />
      </Box>
    ) : null;

  /* ===================== SORT ===================== */

  const renderSort = () => (
    <Box sx={{ mt: 0 }}>
              {currentQuestion.questionImage && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <Box
                    sx={{
                      maxHeight: 150,          // 🔥 chỉnh khung nhỏ ở đây
                      maxWidth: "100%",
                      overflow: "hidden",
                      borderRadius: 2,
                      border: "1px solid #ddd", // 🔥 khung hiện rõ
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 150,        // 🔥 trùng với Box
                        maxWidth: "100%",
                        objectFit: "contain",
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />
                  </Box>
                </Box>
              )}

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

                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newOrder }));
                }}
              >
                <Droppable droppableId="sort-options">
                  {(provided) => {
                    const orderIdx =
                      answers[currentQuestion.id] ??
                      currentQuestion.options.map((_, idx) => idx);

                    return (
                      <Stack {...provided.droppableProps} ref={provided.innerRef} spacing={2}>
                        {orderIdx.map((optIdx, pos) => {
                          const optionData = currentQuestion.options[optIdx];
                          const optionText =
                            typeof optionData === "string" ? optionData : optionData.text ?? "";
                          const optionImage =
                            typeof optionData === "object" ? optionData.image ?? null : null;

                          // ✅ So sánh với correctTexts thay vì correct index
                          const correctData = currentQuestion.correctTexts[pos];
                          const isCorrectPos =
                            submitted &&
                            choXemDapAn &&
                            normalizeValue(optionData) === normalizeValue(correctData);

                          return (
                            <Draggable
                              key={optIdx}
                              draggableId={String(optIdx)}
                              index={pos}
                              isDragDisabled={submitted || !started}
                            >
                              {(provided, snapshot) => (
                                <Box
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  sx={{
                                    borderRadius: 1,
                                    bgcolor:
                                      submitted && choXemDapAn
                                        ? isCorrectPos
                                          ? "#c8e6c9" // xanh lá nhạt = đúng
                                          : "#ffcdd2" // đỏ nhạt = sai
                                        : "transparent",
                                    border: "1px solid #90caf9",
                                    cursor: submitted || !started ? "default" : "grab",
                                    boxShadow: "none",
                                    transition: "background-color 0.2s ease, border-color 0.2s ease",
                                    minHeight: 40,
                                    py: 0.5,
                                    px: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    "&:hover": {
                                      borderColor: "#1976d2",
                                      bgcolor: "#f5f5f5",
                                    },
                                  }}
                                >
                                  {optionImage && (
                                    <Box
                                      component="img"
                                      src={optionImage}
                                      alt={`option-${optIdx}`}
                                      sx={{
                                        maxHeight: 40,
                                        width: "auto",
                                        objectFit: "contain",
                                        borderRadius: 2,
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}

                                  <Typography
                                    variant="body1"
                                    fontWeight="400"
                                    sx={{
                                      userSelect: "none",
                                      fontSize: "1.1rem",
                                      lineHeight: 1.5,
                                      flex: 1,
                                      whiteSpace: "pre-wrap",
                                      "& p": { margin: 0 },
                                    }}
                                    component="div"
                                    dangerouslySetInnerHTML={{ __html: optionText }}
                                  />
                                </Box>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </Stack>
                    );
                  }}
                </Droppable>
              </DragDropContext>
            </Box>
  );

  /* ===================== MATCHING ===================== */

  const renderMatching = () => (
    <Box sx={{ width: "100%" }}>
              {/* ================= HÌNH MINH HỌA DƯỚI CÂU HỎI ================= */}
              {currentQuestion.questionImage && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      maxHeight: 150, // 🔥 đổi 100 nếu bạn muốn
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 150,
                        maxWidth: "100%",
                        height: "auto",
                        objectFit: "contain",
                        borderRadius: 8,
                        display: "block",
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />

                  </Box>
                </Box>
              )}

              {/* ================= MATCHING ================= */}
              <DragDropContext
                onDragEnd={(result) => {
                  if (!result.destination || submitted || !started) return;

                  const currentOrder =
                    answers[currentQuestion.id] ??
                    currentQuestion.pairs.map((_, idx) => idx);

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
                <Stack spacing={1.5} sx={{ width: "100%", px: 1 }}>
                  {currentQuestion.pairs.map((pair, i) => {
                    const optionText = pair.left || "";
                    const optionImage =
                      pair.leftImage?.url || pair.leftIconImage?.url || null;

                    const userOrder =
                      answers[currentQuestion.id] ??
                      currentQuestion.rightOptions.map((_, idx) => idx);

                    const rightIdx = userOrder[i];
                    const rightVal = currentQuestion.rightOptions[rightIdx];
                    const rightText = typeof rightVal === "string" ? rightVal : "";
                    const rightImage =
                      typeof rightVal === "object" ? rightVal?.url : null;

                    const isCorrect =
                      submitted && userOrder[i] === currentQuestion.correct[i];

                    return (
                      <Stack
                        key={i}
                        direction="row"
                        spacing={2}
                        alignItems="stretch"
                        sx={{ minHeight: 50 }}
                      >
                        {/* ================= LEFT ================= */}
                        <Paper
                          sx={{
                            //flex: 1,
                            flexGrow: ratio.left,
                            flexBasis: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            px: 1,
                            py: 0.5,
                            border: "1px solid #64b5f6",
                            borderRadius: 1,
                            boxShadow: "none",
                          }}
                        >
                          {optionImage && (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                maxHeight: 40,      // khung tối đa 40
                                mr: 1,
                                flexShrink: 0,
                                overflow: "hidden",
                              }}
                            >
                              <img
                                src={optionImage}
                                alt={`left-${i}`}
                                style={{
                                  maxHeight: 40,    // ⭐ QUAN TRỌNG: trùng với Box
                                  width: "auto",
                                  height: "auto",
                                  objectFit: "contain",
                                  borderRadius: 2,
                                  display: "block",
                                }}
                              />
                            </Box>
                          )}

                          {optionText && (
                            <Typography
                              component="div"
                              sx={{
                                fontSize: "1.1rem",
                                flex: 1,
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.5,
                                "& p": { margin: 0 },
                              }}
                              dangerouslySetInnerHTML={{ __html: optionText }}
                            />
                          )}
                        </Paper>

                        {/* ================= RIGHT ================= */}
                        <Droppable droppableId={`right-${i}`} direction="vertical">
                          {(provided) => (
                            <Stack
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              sx={{ flexGrow: ratio.right, flexBasis: 0, }}
                            >
                              <Draggable
                                key={rightIdx}
                                draggableId={String(rightIdx)}
                                index={i}
                                isDragDisabled={submitted || !started}
                              >
                                {(provided) => (
                                  <Paper
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    sx={{
                                      flex: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1.5,
                                      px: 1,
                                      py: 0.5,
                                      border: "1px solid #90caf9",
                                      borderRadius: 1,
                                      boxShadow: "none",
                                      cursor:
                                        submitted || !started ? "default" : "grab",
                                      bgcolor:
                                        submitted && choXemDapAn
                                          ? isCorrect
                                            ? "#c8e6c9"
                                            : "#ffcdd2"
                                          : "transparent",
                                      transition:
                                        "background-color 0.2s ease, border-color 0.2s ease",
                                      "&:hover": {
                                        borderColor: "#1976d2",
                                        bgcolor: "#f5f5f5",
                                      },
                                    }}
                                  >
                                    {rightImage && (
                                      <Box
                                        sx={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          maxHeight: 40,
                                          mr: 1,
                                          flexShrink: 0,
                                        }}
                                      >
                                        <img
                                          src={rightImage}
                                          alt={`right-${rightIdx}`}
                                          style={{
                                            maxHeight: 40,
                                            width: "auto",
                                            height: "auto",
                                            objectFit: "contain",
                                            borderRadius: 2,
                                            display: "block",
                                          }}
                                        />
                                      </Box>
                                    )}

                                    {rightText && (
                                      <Typography
                                        component="div"
                                        sx={{
                                          fontSize: "1.1rem",
                                          flex: 1,
                                          wordBreak: "break-word",
                                          whiteSpace: "pre-wrap",
                                          lineHeight: 1.5,
                                          "& p": { margin: 0 },
                                        }}
                                        dangerouslySetInnerHTML={{
                                          __html: rightText,
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
                  })}
                </Stack>
              </DragDropContext>
            </Box>
  );

  /* ===================== SINGLE ===================== */

  const renderSingle = () => (
    <Stack spacing={2}>
              {/* Hình minh họa câu hỏi nếu có */}
              {currentQuestion.questionImage && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  {/* 🔲 KHUNG ẢNH */}
                  <Box
                    sx={{
                      maxHeight: 150,          // 🔥 chỉnh nhỏ khung tại đây
                      maxWidth: "100%",
                      overflow: "hidden",
                      borderRadius: 1,
                      border: "1px solid #ddd",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 150,        // 🔥 trùng với khung
                        maxWidth: "100%",
                        height: "auto",
                        objectFit: "contain",
                        borderRadius: 4,
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />
                  </Box>
                </Box>
              )}
              {currentQuestion.displayOrder.map((optIdx) => {
                const selected = answers[currentQuestion.id] === optIdx;

                const correctArray = Array.isArray(currentQuestion.correct)
                  ? currentQuestion.correct
                  : [currentQuestion.correct];

                const isCorrect = submitted && correctArray.includes(optIdx);
                const isWrong = submitted && selected && !correctArray.includes(optIdx);

                const handleSelect = () => {
                  if (submitted || !started) return;
                  handleSingleSelect(currentQuestion.id, optIdx);
                };

                // Lấy dữ liệu option
                const optionData = currentQuestion.options[optIdx];
                const optionText =
                  typeof optionData === "object" && optionData.text
                    ? optionData.text
                    : typeof optionData === "string"
                    ? optionData
                    : "";
                const optionImage =
                  typeof optionData === "object" && optionData.image
                    ? optionData.image
                    : null;

                return (
                  <Paper
                    key={optIdx}
                    onClick={handleSelect}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      borderRadius: 1,
                      cursor: submitted || !started ? "default" : "pointer",
                      bgcolor:
                        submitted && choXemDapAn
                          ? isCorrect
                            ? "#c8e6c9"
                            : isWrong
                            ? "#ffcdd2"
                            : "transparent"   // 👈 nền mặc định trong suốt
                          : "transparent",
                      border: "1px solid #90caf9",
                      minHeight: 40,
                      py: 0.5,
                      px: 1,
                      boxShadow: "none",          // 👈 bỏ đổ bóng
                      transition: "background-color 0.2s ease, border-color 0.2s ease",
                      "&:hover": {
                        borderColor: "#1976d2",
                        bgcolor: "#f5f5f5",       // 👈 highlight khi hover
                      },
                    }}
                  >
                    {/* Radio button */}
                    <Radio checked={selected} onChange={handleSelect} sx={{ mr: 1 }} />

                    {/* Hình option nếu có */}
                    {optionImage && (
                      <Box
                        component="img"
                        src={optionImage}
                        alt={`option-${optIdx}`}
                        sx={{
                          maxHeight: 40,
                          maxWidth: "auto",
                          objectFit: "contain",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Text option */}
                    <Typography
                      variant="body1"
                      sx={{
                        userSelect: "none",
                        fontSize: "1.1rem",
                        lineHeight: 1.5,
                        flex: 1,
                        whiteSpace: "pre-wrap",
                        "& p": { margin: 0 },
                      }}
                      component="div"
                      dangerouslySetInnerHTML={{ __html: optionText }}
                    />
                  </Paper>
                );
              })}
            </Stack>
  );

  /* ===================== MULTIPLE ===================== */

  const renderMultiple = () => (
    <Stack spacing={2}>
              {/* Hình minh họa câu hỏi nếu có */}
              {currentQuestion.questionImage && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  {/* 🔲 KHUNG ẢNH */}
                  <Box
                    sx={{
                      maxHeight: 150,        // 🔥 khung nhỏ lại
                      maxWidth: "100%",
                      overflow: "hidden",
                      borderRadius: 1,
                      border: "1px solid #ddd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <img
                      src={currentQuestion.questionImage}
                      alt="Hình minh họa"
                      style={{
                        maxHeight: 150,      // 🔥 ảnh co theo khung
                        maxWidth: "100%",
                        height: "auto",
                        objectFit: "contain",
                        borderRadius: 8,
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImage(currentQuestion.questionImage)}
                    />
                  </Box>
                </Box>
              )}

              {currentQuestion.displayOrder.map((optIdx) => {
                const optionData = currentQuestion.options[optIdx];
                const optionText = optionData.text ?? "";
                const optionImage = optionData.image ?? null;

                const userAns = answers[currentQuestion.id] || [];
                const checked = userAns.includes(optIdx);

                const isCorrect =
                  submitted && currentQuestion.correct.includes(optIdx);
                const isWrong =
                  submitted && checked && !currentQuestion.correct.includes(optIdx);

                const handleSelect = () => {
                  if (submitted || !started) return;
                  handleMultipleSelect(currentQuestion.id, optIdx, !checked);
                };

                return (
                  <Paper
                    key={optIdx}
                    onClick={handleSelect}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 1,
                      cursor: submitted || !started ? "default" : "pointer",
                      bgcolor:
                        submitted && choXemDapAn
                          ? isCorrect
                            ? "#c8e6c9"
                            : isWrong
                            ? "#ffcdd2"
                            : "transparent"   // 👈 nền mặc định trong suốt
                          : "transparent",
                      border: "1px solid #90caf9",
                      minHeight: 40,
                      py: 0.5,
                      px: 1,
                      gap: 1,
                      boxShadow: "none",          // 👈 bỏ đổ bóng
                      transition: "background-color 0.2s ease, border-color 0.2s ease",
                      "&:hover": {
                        borderColor: "#1976d2",
                        bgcolor: "#f5f5f5",       // 👈 highlight khi hover
                      },
                    }}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={checked}
                      onChange={handleSelect}
                      sx={{ mr: 1 }}
                    />

                    {/* Hình option nếu có */}
                    {optionImage && (
                      <Box
                        component="img"
                        src={optionImage}
                        alt={`option-${optIdx}`}
                        sx={{
                          maxHeight: 40,
                          maxWidth: 40,
                          objectFit: "contain",
                          borderRadius: 2,
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Text option */}
                    <Typography
                      variant="body1"
                      sx={{
                        userSelect: "none",
                        fontSize: "1.1rem",
                        lineHeight: 1.5,
                        flex: 1,
                        whiteSpace: "pre-wrap",
                        "& p": { margin: 0 },
                      }}
                      component="div"
                      dangerouslySetInnerHTML={{ __html: optionText }}
                    />
                  </Paper>
                );
              })}
            </Stack>
  );

  /* ===================== TRUE / FALSE ===================== */

  const renderTrueFalse = () => (
  <Stack spacing={2}>
    {/* 🖼️ ẢNH MINH HỌA CÂU HỎI */}
    {currentQuestion.questionImage && (
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Box
          sx={{
            maxHeight: 150,
            maxWidth: "100%",
            overflow: "hidden",
            borderRadius: 1,
            border: "1px solid #ddd",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "#fafafa",
          }}
        >
          <img
            src={currentQuestion.questionImage}
            alt="Hình minh họa"
            style={{
              maxHeight: 150,
              maxWidth: "100%",
              objectFit: "contain",
              cursor: "zoom-in",
            }}
            onClick={() => setZoomImage(currentQuestion.questionImage)}
          />
        </Box>
      </Box>
    )}

    {/* ✅ OPTIONS – GIỮ NGUYÊN CHIỀU CAO GỐC */}
    {currentQuestion.options.map((opt, i) => {
      const userAns = answers[currentQuestion.id] || [];
      const selected = userAns[i] ?? "";

      const originalIdx = Array.isArray(currentQuestion.initialOrder)
        ? currentQuestion.initialOrder[i]
        : i;

      const correctArray = Array.isArray(currentQuestion.correct)
        ? currentQuestion.correct
        : [];

      const correctVal = correctArray[originalIdx] ?? "";

      const showResult = submitted && choXemDapAn;
      const isCorrect = showResult && selected === correctVal;
      const isWrong =
        showResult && selected !== "" && selected !== correctVal;

      const optionText =
        typeof opt === "string" ? opt : opt?.text ?? "";

      const optionImage =
        typeof opt === "object" ? opt?.image ?? null : null;

      return (
        <Paper
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderRadius: 1,
            minHeight: 40,
            py: 0.5,
            px: 1,
            bgcolor: isCorrect
              ? "#c8e6c9"
              : isWrong
              ? "#ffcdd2"
              : "transparent",
            border: "1px solid #90caf9",
            boxShadow: "none",
          }}
        >
          {optionImage && (
            <Box
              component="img"
              src={optionImage}
              alt={`truefalse-${i}`}
              sx={{
                maxHeight: 40,
                objectFit: "contain",
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
          )}

          <Typography
            component="div"
            sx={{
              userSelect: "none",
              fontSize: "1.1rem",
              lineHeight: 1.5,
              flex: 1,
              whiteSpace: "pre-wrap",
              "& p": { margin: 0 },
            }}
            dangerouslySetInnerHTML={{ __html: optionText }}
          />

          <FormControl size="small" sx={{ width: 90 }}>
            <Select
              value={selected}
              onChange={(e) => {
                if (submitted || !started) return;
                const val = e.target.value;
                setAnswers((prev) => {
                  const arr = Array.isArray(prev[currentQuestion.id])
                    ? [...prev[currentQuestion.id]]
                    : Array(currentQuestion.options.length).fill("");
                  arr[i] = val;
                  return { ...prev, [currentQuestion.id]: arr };
                });
              }}
              sx={{
                height: 32,
                fontSize: "0.95rem",
                "& .MuiSelect-select": { py: 0.5 },
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
);


  /* ===================== IMAGE ===================== */

  const renderImage = () => (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      gap={2}
      flexWrap="wrap"
      justifyContent="center"
      alignItems="center"
    >
      {currentQuestion.displayOrder.map((optIdx) => {
                const option = currentQuestion.options[optIdx];

                // ✅ ẢNH = option.text
                const imageUrl =
                  typeof option === "string"
                    ? option
                    : option?.text ?? "";

                if (!imageUrl) return null;

                const userAns = answers[currentQuestion.id] || [];
                const checked = userAns.includes(optIdx);

                const isCorrect =
                  submitted && currentQuestion.correct.includes(optIdx);
                const isWrong =
                  submitted && checked && !currentQuestion.correct.includes(optIdx);

                return (
                  <Paper
                    key={optIdx}
                    onClick={() => {
                      if (submitted || !started) return;
                      handleMultipleSelect(
                        currentQuestion.id,
                        optIdx,
                        !checked
                      );
                    }}
                    sx={{
                      width: 150,
                      height: 180,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1,
                      border: "1px solid #90caf9",
                      cursor: submitted || !started ? "default" : "pointer",
                      bgcolor:
                        submitted && choXemDapAn
                          ? isCorrect
                            ? "#c8e6c9"
                            : isWrong
                            ? "#ffcdd2"
                            : "transparent"
                          : "transparent",
                    }}
                  >
                    {/* ✅ IMAGE */}
                    <img
                      src={imageUrl}
                      alt={`option-${optIdx}`}
                      style={{
                        width: "50%",          // 🔥 chiếm 75% chiều rộng khung
                        height: "auto",        // 🔥 giữ tỉ lệ ảnh
                        maxHeight: "100%",     // không tràn khung
                        objectFit: "contain",
                        marginBottom: 6,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />

                    {/* ✅ CHECKBOX */}
                    <Checkbox
                      checked={checked}
                      disabled={submitted || !started}
                    />
                  </Paper>
                );
              })}
    </Stack>
  );

  /* ===================== FILL BLANK ===================== */

  const renderFillBlank = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Stack spacing={2}>
                {/* ======================= HÌNH MINH HỌA ======================= */}
                {currentQuestion.questionImage && (
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <Box
                      sx={{
                        maxHeight: 150,
                        maxWidth: "100%",
                        overflow: "hidden",
                        borderRadius: 2,
                        border: "1px solid #ddd",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        bgcolor: "#fafafa",
                      }}
                    >
                      <img
                        src={currentQuestion.questionImage}
                        alt="Hình minh họa"
                        style={{
                          maxHeight: 150,
                          maxWidth: "100%",
                          objectFit: "contain",
                          cursor: "zoom-in",
                        }}
                        onClick={() => setZoomImage(currentQuestion.questionImage)}
                      />
                    </Box>
                  </Box>
                )}

                {/* ======================= CÂU HỎI + CHỖ TRỐNG ======================= */}
                <Box
                  sx={{
                    width: "100%",
                    lineHeight: 1.6,
                    fontSize: "1.1rem",
                    fontFamily: "Roboto, Arial, sans-serif",
                  }}
                >
                  {currentQuestion.option.split("[...]").map((part, idx) => (
                    <span key={idx}>

                      {/* Text */}
                      <Typography
                        component="span"
                        variant="body1"
                        sx={{
                          mr: 0.5,
                          fontSize: "1.1rem",
                          "& p, & div": { display: "inline", margin: 0 },
                        }}
                        dangerouslySetInnerHTML={{ __html: part }}
                      />

                      {/* Blank */}
                      {idx < currentQuestion.option.split("[...]").length - 1 && (
                        <Droppable droppableId={`blank-${idx}`} direction="horizontal">
                          {(provided) => {
                            const userWord = currentQuestion.filled?.[idx] ?? "";
                            // ✅ đáp án đúng nằm trong options[idx].text
                            const correctObj = currentQuestion.options?.[idx];
                            const correctWord =
                              typeof correctObj === "string"
                                ? correctObj
                                : correctObj?.text ?? "";

                            const color =
                              submitted && userWord
                                ? userWord.trim().toLowerCase() ===
                                  correctWord.trim().toLowerCase()
                                  ? "green"
                                  : "red"
                                : "#000";
                            return (
                              <Box
                                component="span"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: 80,
                                  px: 1,
                                  border: "1px dashed #90caf9",
                                  borderRadius: 1,
                                  fontSize: "1.1rem",
                                  color,
                                }}
                              >
                                {userWord && (
                                  <Draggable
                                    draggableId={`filled-${idx}`}
                                    index={0}
                                    isDragDisabled={submitted || !started}
                                  >
                                    {(prov) => (
                                      <Paper
                                        ref={prov.innerRef}
                                        {...prov.draggableProps}
                                        {...prov.dragHandleProps}
                                        sx={{
                                          px: 2,
                                          py: 0.5,
                                          bgcolor: "#e3f2fd",
                                          cursor: "grab",
                                          minHeight: 30,
                                          border: "1px solid #90caf9",
                                          boxShadow: "none",
                                          color,
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
                  ))}
                </Box>

                {/* ======================= WORD POOL ======================= */}
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ mb: 1, fontWeight: "bold", fontSize: "1.1rem" }}>
                    Các từ cần điền:
                  </Typography>

                  <Droppable droppableId="words" direction="horizontal">
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          p: 1,
                          minHeight: 50,
                          border: "1px solid #90caf9",
                          borderRadius: 2,
                          bgcolor: "#fff",
                        }}
                      >
                        {(currentQuestion.shuffledOptions || currentQuestion.options)
                          .filter(o => !(currentQuestion.filled ?? []).includes(o.text))
                          .map((word, idx) => (
                            <Draggable
                              key={word.text}
                              draggableId={`word-${word.text}`}
                              index={idx}
                              isDragDisabled={submitted || !started}
                            >
                              {(prov) => (
                                <Paper
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  elevation={0}
                                  sx={{
                                    px: 2,
                                    py: 0.5,
                                    bgcolor: "#e3f2fd",
                                    cursor: "grab",

                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",

                                    minHeight: 30,
                                    fontFamily: "Roboto, Arial, sans-serif",
                                    fontSize: "1.1rem",
                                    lineHeight: "normal",

                                    border: "1px solid #90caf9",
                                    boxShadow: "none",

                                    "&:hover": {
                                      bgcolor: "#bbdefb",
                                    },
                                  }}
                                >
                                  {word.text}
                                </Paper>

                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                </Box>

              </Stack>
    </DragDropContext>
  );

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
    <Box key={currentQuestion.id || currentIndex}>
      {renderHeader()}
      {renderQuestionImage()}
      {renderByType()}
    </Box>
  );
}

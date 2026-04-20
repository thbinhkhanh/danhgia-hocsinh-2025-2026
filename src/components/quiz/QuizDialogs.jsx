import React from "react";
import IncompleteAnswersDialog from "../../dialog/IncompleteAnswersDialog";
import ExitConfirmDialog from "../../dialog/ExitConfirmDialog";
import ResultDialog from "../../dialog/ResultDialog";
import ImageZoomDialog from "../../dialog/ImageZoomDialog";

export default function QuizDialogs({
  openAlertDialog,
  setOpenAlertDialog,
  unansweredQuestions,
  openExitConfirm,
  setOpenExitConfirm,
  openResultDialog,
  setOpenResultDialog,
  dialogMode,
  dialogMessage,
  studentResult,
  choXemDiem,
  configData,
  convertPercentToScore,
  zoomImage,
  setZoomImage,
}) {
  return (
    <>
      <IncompleteAnswersDialog
        open={openAlertDialog}
        onClose={() => setOpenAlertDialog(false)}
        unansweredQuestions={unansweredQuestions}
      />

      <ExitConfirmDialog
        open={openExitConfirm}
        onClose={() => setOpenExitConfirm(false)}
      />

      <ResultDialog
        open={openResultDialog}
        onClose={() => setOpenResultDialog(false)}
        dialogMode={dialogMode}
        dialogMessage={dialogMessage}
        studentResult={studentResult}
        choXemDiem={choXemDiem}
        configData={configData}
        convertPercentToScore={convertPercentToScore}
      />

      <ImageZoomDialog
        open={Boolean(zoomImage)}
        imageSrc={zoomImage}
        onClose={() => setZoomImage(null)}
      />
    </>
  );
}
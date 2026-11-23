// src/utils/treasureMapStyles.js

export const TREASURE_MAP_STYLES = `
  .tmg-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 1300;
    overflow-y: auto;
  }

  .tmg-modal {
    width: 100%;
    max-width: 780px;
    max-height: 92vh;
    background: #ffffff;
    border-radius: 22px;
    overflow: hidden;
    box-shadow: 0 25px 70px rgba(15, 23, 42, 0.35);
    display: flex;
    flex-direction: column;
    position: relative;
    animation: tmgPopIn 0.24s ease-out;
  }

  .tmg-dialog-confetti {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 25;
  }

  .tmg-dialog-confetti-piece {
    position: absolute;
    top: -18px;
    border-radius: 2px;
    opacity: 0.95;
    animation: tmgDialogConfettiFall linear infinite;
  }

  @keyframes tmgDialogConfettiFall {
    0% {
      transform: translateY(-16px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(820px) rotate(720deg);
      opacity: 0.15;
    }
  }

  @keyframes tmgPopIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .tmg-header {
    padding: 14px 22px;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
    transition: background 0.3s ease;
  }

  .tmg-header.completed {
    background: linear-gradient(135deg, #f59e0b, #ea580c) !important;
  }

  .tmg-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.4px;
    line-height: 1.25;
    color: #ffffff;
  }

  .tmg-header p {
    margin: 4px 0 0;
    font-size: 12px;
    font-weight: 500;
    color: rgba(219, 234, 254, 0.9);
    line-height: 1.4;
  }

  .tmg-close {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.2);
    width: 34px;
    height: 34px;
    border-radius: 999px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.18s ease, transform 0.15s ease;
  }

  .tmg-close:hover {
    background: rgba(255, 255, 255, 0.24);
  }

  .tmg-close:active {
    transform: scale(0.94);
  }

  .tmg-body {
    padding: 18px 22px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    z-index: 2;
  }

  .tmg-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 10px 14px;
  }

  .tmg-toolbar-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .tmg-toolbar-label {
    font-size: 12px;
    font-weight: 800;
    color: #475569;
    margin-right: 4px;
  }

  .tmg-pill {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
    border-radius: 999px;
    padding: 5px 11px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tmg-pill:hover {
    background: #f1f5f9;
  }

  .tmg-pill.active {
    background: #2563eb;
    border-color: #2563eb;
    color: #ffffff;
  }

  .tmg-step-ctrl {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    padding: 2px 8px;
  }

  .tmg-step-btn {
    border: none;
    background: transparent;
    font-size: 15px;
    font-weight: 800;
    color: #1e293b;
    cursor: pointer;
    padding: 2px 6px;
  }

  .tmg-step-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .tmg-step-val {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    min-width: 56px;
    text-align: center;
  }

  .tmg-progress-top {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 800;
    color: #475569;
    margin-bottom: 6px;
  }

  .tmg-progress-bg {
    height: 10px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
  }

  .tmg-progress-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.35s ease;
  }

  .tmg-map-card {
    border: 1px solid #cbd5e1;
    border-radius: 16px;
    overflow: hidden;
    background: #e0f2fe;
    position: relative;
  }

  .tmg-map-svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .tmg-explorer {
    transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .tmg-stage-node {
    cursor: pointer;
  }

  .tmg-map-hint {
    font-size: 11px;
    color: #475569;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.85);
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tmg-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 18px;
  }

  .tmg-panel-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tmg-landmark {
    font-size: 12px;
    font-weight: 800;
    color: #0284c7;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .tmg-edit-link {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .tmg-edit-link:hover {
    background: #f1f5f9;
  }

  .tmg-clue {
    font-size: 13px;
    color: #64748b;
    margin-top: 4px;
  }

  .tmg-title-main {
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 10px;
    line-height: 1.45;
  }

  .tmg-edit-row {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .tmg-input {
    flex: 1;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1.5px solid #94a3b8;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
  }

  .tmg-btn {
    border: none;
    border-radius: 12px;
    padding: 12px 18px;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: transform 0.14s ease, opacity 0.15s ease;
  }

  .tmg-btn:active {
    transform: scale(0.98);
  }

  .tmg-btn-advance {
    width: 100%;
    margin-top: 14px;
    background: linear-gradient(135deg, #16a34a, #059669);
    color: #ffffff;
    box-shadow: 0 8px 18px rgba(22, 163, 74, 0.24);
  }

  .tmg-btn-small {
    padding: 8px 14px;
    border-radius: 10px;
    background: #2563eb;
    color: #ffffff;
    font-size: 13px;
  }

  .tmg-btn-gold {
    flex: 1;
    background: linear-gradient(135deg, #f59e0b, #ea580c);
    color: #ffffff;
  }

  .tmg-btn-outline {
    flex: 1;
    background: #ffffff;
    color: #0f172a;
    border: 1.5px solid #cbd5e1;
  }

  .tmg-options {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-top: 12px;
  }

  .tmg-option {
    width: 100%;
    text-align: left;
    padding: 12px 15px;
    border-radius: 12px;
    border: 1.5px solid #cbd5e1;
    background: #ffffff;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    cursor: pointer;
  }

  .tmg-option:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #94a3b8;
  }

  .tmg-option.correct {
    background: #dcfce7;
    border-color: #22c55e;
    color: #166534;
  }

  .tmg-option.wrong {
    background: #fee2e2;
    border-color: #ef4444;
    color: #991b1b;
  }

  .tmg-feedback-err {
    margin-top: 10px;
    font-size: 13px;
    font-weight: 800;
    color: #dc2626;
  }

  .tmg-feedback-ok {
    margin-top: 12px;
    font-size: 13px;
    font-weight: 800;
    color: #15803d;
  }

  .tmg-celebration {
    text-align: center;
    padding: 26px 20px;
    border-radius: 18px;
    background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid #fde68a;
    position: relative;
    overflow: hidden;
    animation: tmgCelebratePop 0.4s ease-out;
  }

  .tmg-celebration-inner {
    position: relative;
    z-index: 2;
  }

  @keyframes tmgCelebratePop {
    0% { opacity: 0; transform: scale(0.88); }
    65% { opacity: 1; transform: scale(1.03); }
    100% { opacity: 1; transform: scale(1); }
  }

  .tmg-trophy {
    font-size: 54px;
    display: inline-block;
    animation: tmgFloat 2s ease-in-out infinite;
  }

  @keyframes tmgFloat {
    0%, 100% { transform: translateY(0) rotate(-3deg); }
    50% { transform: translateY(-8px) rotate(3deg); }
  }

  .tmg-celebration h4 {
    margin: 10px 0 6px;
    font-size: 22px;
    font-weight: 900;
    color: #92400e;
  }

  .tmg-celebration p {
    margin: 0;
    font-size: 14px;
    color: #78350f;
    line-height: 1.5;
  }

  .tmg-rewards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
  }

  .tmg-reward-tag {
    background: #ffffff;
    border: 1px solid #fcd34d;
    color: #92400e;
    font-size: 12px;
    font-weight: 800;
    padding: 5px 12px;
    border-radius: 999px;
  }

  .tmg-celebration-actions {
    display: flex;
    gap: 12px;
    margin-top: 22px;
  }

  @media (max-width: 600px) {
    .tmg-header h3 {
      font-size: 15px;
      letter-spacing: 0;
    }

    .tmg-header p {
      font-size: 10.5px;
    }
  }
`;

export function injectTreasureMapStyles() {
  if (typeof document === "undefined") return null;
  const styleId = "tmg-styles";
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = TREASURE_MAP_STYLES;
    document.head.appendChild(styleEl);
  }
  return styleEl;
}
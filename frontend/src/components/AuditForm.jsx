import { useState } from "react";

const styles = {
  card: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 16,
    padding: "1.75rem",
    background: "var(--bg-surface)",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
    transition: "transform 0.2s ease, border-color 0.2s ease",
  },
  workflowRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "0.85rem",
    marginBottom: "1.5rem",
  },
  workflowTab: {
    padding: "0.95rem 1rem",
    borderRadius: 14,
    border: "1px solid var(--border-color)",
    background: "var(--bg-app)",
    color: "var(--text-primary)",
    fontWeight: 700,
    letterSpacing: "0.01em",
    cursor: "pointer",
    transition:
      "transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
  },
  workflowTabActive: {
    background: "rgba(99, 102, 241, 0.15)",
    border: "1px solid var(--color-purple, #6366f1)",
    boxShadow:
      "0 0 0 1px rgba(99, 102, 241, 0.1) inset, 0 10px 24px rgba(99, 102, 241, 0.05)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1rem",
    alignItems: "end",
  },
  input: {
    padding: "0.85rem 1rem",
    borderRadius: 12,
    border: "1px solid var(--border-color)",
    background: "var(--bg-app)",
    color: "var(--text-primary)",
    fontSize: "1rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  button: {
    minHeight: 44,
    padding: "0 1.25rem",
    borderRadius: 6,
    border: "none",
    background: "var(--color-purple, #6366f1)",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease, transform 0.2s ease",
  },
  buttonDisabled: {
    background: "var(--border-color)",
    color: "var(--text-secondary)",
    cursor: "not-allowed",
    opacity: 0.65,
  },
  hint: {
    marginTop: "1rem",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  fieldLabel: {
    color: "var(--text-primary)",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  optionalBadge: {
    display: "inline-block",
    marginLeft: "0.4rem",
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    background: "var(--bg-app)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    padding: "0.1rem 0.4rem",
    verticalAlign: "middle",
  },
};

function AuditForm({
  handleAudit,
  auditLoading,
  fileId,
  auditMode,
  setAuditMode,
  textColumn,
  setTextColumn,
}) {
  const [labelColumn, setLabelColumn] = useState("");

  const isTextMode = auditMode === "text";
  const isFullMode = auditMode === "full";
  const showTextField = auditMode !== "tabular";

  // Text column is only strictly required in pure text NLP mode.
  // In full audit mode it is optional — the backend accepts null.
  const isDisabled =
    !fileId ||
    auditLoading ||
    !labelColumn.trim() ||
    (isTextMode && !textColumn.trim());

  const onSubmit = (event) => {
    event.preventDefault();
    if (isDisabled) return;

    // For full audit, send textColumn only when the user actually filled it in.
    // For text mode, always send it (already validated above).
    // For tabular, send null.
    let targetTextColumn = null;
    if (isTextMode) {
      targetTextColumn = textColumn.trim();
    } else if (isFullMode) {
      targetTextColumn = textColumn.trim() || null;
    }

    handleAudit(labelColumn.trim(), targetTextColumn);
  };

  const getButtonLabel = () => {
    if (auditLoading) return "Running audit...";
    if (isFullMode) return "Run Full Dataset Audit";
    if (isTextMode) return "Run Text NLP Audit";
    return "Run Tabular Audit";
  };

  const getHintText = () => {
    if (!fileId) return "Upload a dataset first to enable auditing.";
    if (isFullMode)
      return "Enter the label column name. Text column is optional — leave blank if your dataset has no text column.";
    if (isTextMode)
      return "Enter both the label column and text column names to run the NLP audit.";
    return "Enter the label column name and run the audit.";
  };

  return (
    <div style={styles.card}>
      <h3
        style={{ marginTop: 0, marginBottom: "1rem", color: "var(--text-primary)" }}
      >
        Run dataset audit
      </h3>

      {/* Audit mode selector */}
      <div style={styles.workflowRow}>
        {[
          { key: "tabular", label: "Tabular Auditor" },
          { key: "text", label: "Text NLP Auditor" },
          { key: "full", label: "Full Dataset Audit" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setAuditMode(key)}
            style={{
              ...styles.workflowTab,
              ...(auditMode === key ? styles.workflowTabActive : {}),
            }}
            aria-pressed={auditMode === key}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit}>
        <div style={styles.formGrid}>
          {/* Label column — always required */}
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Label column</span>
            <input
              type="text"
              value={labelColumn}
              onChange={(e) => setLabelColumn(e.target.value)}
              placeholder="e.g. label"
              style={styles.input}
              aria-label="Label column name"
              autoComplete="off"
            />
          </label>

          {/* Text column — required for text mode, optional for full mode */}
          {showTextField && (
            <label style={styles.field}>
              <span style={styles.fieldLabel}>
                Text column
                {isFullMode && (
                  <span style={styles.optionalBadge} aria-label="optional">
                    optional
                  </span>
                )}
              </span>
              <input
                type="text"
                value={textColumn}
                onChange={(e) => setTextColumn(e.target.value)}
                placeholder={
                  isFullMode
                    ? "e.g. review_text (leave blank if none)"
                    : "e.g. review_text"
                }
                style={styles.input}
                aria-label={
                  isFullMode
                    ? "Text column name (optional)"
                    : "Text column name"
                }
                autoComplete="off"
              />
            </label>
          )}

          {/* Submit button */}
          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isDisabled ? styles.buttonDisabled : {}),
              minWidth: 180,
            }}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            {getButtonLabel()}
          </button>
        </div>
      </form>

      <p style={styles.hint}>{getHintText()}</p>
    </div>
  );
}

export default AuditForm;
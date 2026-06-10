import { useState } from "react";

const styles = {
  card: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 16,
    padding: "1.75rem",
    background: "var(--bg-surface)",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
    transition: "transform 0.2s ease, border-color 0.2s ease",
  },
  workflowRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.85rem",
    marginBottom: "1.5rem",
  },
  workflowTab: {
    padding: "0.95rem 1rem",
    borderRadius: 14,
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontWeight: 700,
    letterSpacing: "0.01em",
    cursor: "pointer",
    transition: "transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
  },
  workflowTabActive: {
    background: "rgba(124, 58, 237, 0.22)",
    border: "1px solid rgba(124, 58, 237, 0.55)",
    boxShadow: "0 0 0 1px rgba(124, 58, 237, 0.18) inset, 0 10px 24px rgba(124, 58, 237, 0.12)",
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
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  button: {
    minHeight: 44,
    padding: "0 1.25rem",
    borderRadius: 6,
    border: "none",
    background: "var(--color-purple)",
    color: "var(--text-primary)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease, transform 0.2s ease",
  },
  buttonDisabled: {
    background: "var(--border-subtle)",
    color: "var(--text-secondary)",
    cursor: "not-allowed",
    opacity: 0.75,
  },
  hint: {
    marginTop: "1rem",
    color: "var(--text-secondary)",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  fieldLabel: {
    color: "#f3f4f6",
    fontWeight: 600,
  },
};

function AuditForm({
  handleAudit,
  auditLoading,
  fileId,
  auditType,
  setAuditType,
  textColumn,
  setTextColumn,
}) {
  const [labelColumn, setLabelColumn] = useState("");

  const onSubmit = (event) => {
    event.preventDefault();
    if (!labelColumn.trim() || !fileId || auditLoading) {
      return;
    }
    
    // Pass labelColumn first. If it's a text audit, pass textColumn as the second parameter.
    handleAudit(labelColumn.trim(), auditType === "text" ? textColumn.trim() : null);
  };

  const isTextAudit = auditType === "text";
  const isDisabled =
    !fileId ||
    auditLoading ||
    (auditType === "tabular" && !labelColumn.trim()) ||
    (auditType === "text" && (!labelColumn.trim() || !textColumn.trim()));

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Run dataset audit</h3>
      <div style={styles.workflowRow}>
        <button
          type="button"
          onClick={() => setAuditType("tabular")}
          style={{
            ...styles.workflowTab,
            ...(auditType === "tabular" ? styles.workflowTabActive : {}),
          }}
        >
          Tabular Auditor
        </button>
        <button
          type="button"
          onClick={() => setAuditType("text")}
          style={{
            ...styles.workflowTab,
            ...(auditType === "text" ? styles.workflowTabActive : {}),
          }}
        >
          Text NLP Auditor
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div style={styles.formGrid}>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Label column</span>
            <input
              type="text"
              value={labelColumn}
              onChange={(event) => setLabelColumn(event.target.value)}
              placeholder="e.g. label"
              style={styles.input}
            />
          </label>

          {isTextAudit ? (
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Text column</span>
              <input
                type="text"
                value={textColumn}
                onChange={(event) => setTextColumn(event.target.value)}
                placeholder="e.g. review_text"
                style={styles.input}
              />
            </label>
          ) : null}

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isDisabled ? styles.buttonDisabled : {}),
              minWidth: 180,
            }}
            disabled={isDisabled}
          >
            {auditLoading
              ? "Running audit..."
              : isTextAudit
              ? "Run Text NLP Audit"
              : "Run Tabular Audit"}
          </button>
        </div>
      </form>

      <p style={styles.hint}>
        {fileId
          ? isTextAudit
            ? "Enter the label and text column names, then run the text NLP audit."
            : "Enter the label column name and run the audit."
          : "Upload a dataset first to enable auditing."}
      </p>
    </div>
  );
}

export default AuditForm;
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
  row: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  input: {
    flex: "1 1 240px",
    minWidth: 240,
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
};

function AuditForm({ handleAudit, auditLoading, fileId }) {
  const [labelColumn, setLabelColumn] = useState("");

  const onSubmit = (event) => {
    event.preventDefault();
    if (!labelColumn || !fileId || auditLoading) {
      return;
    }
    handleAudit(labelColumn.trim());
  };

  const isDisabled = !fileId || !labelColumn.trim() || auditLoading;

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Run dataset audit</h3>
      <form onSubmit={onSubmit}>
        <div style={styles.row}>
          <label style={{ flex: "1 1 240px", minWidth: 240 }}>
            <span style={{ display: "block", marginBottom: "0.5rem", color: "#f3f4f6" }}>
              Label column
            </span>
            <input
              type="text"
              value={labelColumn}
              onChange={(event) => setLabelColumn(event.target.value)}
              placeholder="e.g. label"
              style={styles.input}
            />
          </label>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isDisabled ? styles.buttonDisabled : {}),
              minWidth: 180,
            }}
            disabled={isDisabled}
          >
            {auditLoading ? "Running audit..." : "Run Dataset Audit"}
          </button>
        </div>
      </form>

      <p style={styles.hint}>
        {fileId
          ? "Enter the label column name and run the audit."
          : "Upload a dataset first to enable auditing."}
      </p>
    </div>
  );
}

export default AuditForm;
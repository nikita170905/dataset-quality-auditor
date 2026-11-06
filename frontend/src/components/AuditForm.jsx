const styles = {
  card: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    padding: "1.75rem",
    background: "var(--bg-surface)",
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
    borderRadius: 6,
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
    background: "var(--text-primary)",
    border: "1px solid var(--text-primary)",
    color: "#000000",
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
    background: "var(--text-primary)",
    color: "#000000",
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
};

function AuditForm({
  handleAudit,
  auditLoading,
  auditMode,
  setAuditMode,
  projectIntent,
  setProjectIntent,
  columns = [],
  labelColumn = "",
  setLabelColumn,
  textColumn = "",
  setTextColumn,
}) {
  const isTextMode = auditMode === "text";
  const isDisabled = auditLoading;

  const onSubmit = (event) => {
    event.preventDefault();
    if (isDisabled) return;
    handleAudit(projectIntent.trim());
  };

  const getButtonLabel = () => {
    if (auditLoading) return "Running audit...";
    if (auditMode === "full") return "Run Full Dataset Audit";
    if (isTextMode) return "Run Text NLP Audit";
    return "Run Tabular Audit";
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
          {columns.length > 0 && setLabelColumn && (
            <>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Label column (what to predict)</span>
                <select value={labelColumn} onChange={(e) => setLabelColumn(e.target.value)}
                        style={styles.input} aria-label="Label column">
                  <option value="">Select a column...</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Text column (optional)</span>
                <select value={textColumn} onChange={(e) => setTextColumn(e.target.value)}
                        style={styles.input} aria-label="Text column">
                  <option value="">None - build text from all columns</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </>
          )}
          
          {/* Project intent — always optional. Fed to the backend domain
              relevance check, which compares the stated goal against the
              semantics of the text column. */}
          <label style={styles.field}>
            <span style={styles.fieldLabel}>
              Project Intent (What are you building?)
              <span style={styles.optionalBadge} aria-label="optional">
                optional
              </span>
            </span>
            <input
              type="text"
              value={projectIntent}
              onChange={(e) => setProjectIntent(e.target.value)}
              placeholder='e.g., "Predicting financial fraud" or "Sentiment analysis on movie reviews"'
              style={styles.input}
              aria-label="Project intent"
              autoComplete="off"
            />
          </label>

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

    </div>
  );
}

export default AuditForm;
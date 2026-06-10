const badgeStyles = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "0.35rem 0.85rem",
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.01em",
    marginTop: "0.5rem",
  },
  success: {
    backgroundColor: "rgba(244, 114, 182, 0.18)",
    color: "var(--color-pink)",
  },
  warning: {
    backgroundColor: "rgba(251, 191, 36, 0.18)",
    color: "var(--color-yellow)",
  },
  danger: {
    backgroundColor: "rgba(225, 29, 72, 0.18)",
    color: "var(--color-red)",
  },
};

const styles = {
  card: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 16,
    padding: "1.75rem",
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    marginTop: "1.5rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    gap: "1rem",
  },
  title: {
    margin: 0,
    fontSize: "1.35rem",
    color: "var(--text-primary)",
  },
  description: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
  },
  grid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    marginBottom: "1.5rem",
  },
  summaryCard: {
    borderRadius: 14,
    padding: "1rem",
    background: "var(--bg-input)",
    border: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  summaryLabel: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  },
  summaryValue: {
    margin: "0.5rem 0 0",
    color: "var(--text-primary)",
    fontSize: "1.65rem",
    fontWeight: 700,
  },
  section: {
    marginBottom: "1.5rem",
  },
  sectionTitle: {
    margin: "0 0 1rem 0",
    fontSize: "1.05rem",
    color: "var(--text-primary)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "var(--bg-input)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  th: {
    borderBottom: "1px solid var(--border-subtle)",
    padding: "0.85rem 1rem",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    fontWeight: 600,
    textAlign: "left",
  },
  td: {
    borderBottom: "1px solid var(--border-subtle)",
    padding: "0.85rem 1rem",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    transition: "background-color 0.2s ease",
  },
  emptyState: {
    padding: "2rem",
    borderRadius: 14,
    background: "var(--bg-input)",
    color: "var(--text-secondary)",
    textAlign: "center",
  },
  textLayout: {
    display: "grid",
    gap: "1.5rem",
  },
  textSummaryGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  metricCard: {
    borderRadius: 14,
    padding: "1rem",
    background: "var(--bg-input)",
    border: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  metricLabel: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  },
  metricValue: {
    margin: "0.5rem 0 0",
    color: "var(--text-primary)",
    fontSize: "1.65rem",
    fontWeight: 700,
  },
  textSection: {
    display: "grid",
    gap: "0.9rem",
  },
  textSectionTitle: {
    margin: 0,
    fontSize: "1.05rem",
    fontWeight: 700,
  },
  conflictStack: {
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
  },
  conflictCard: {
    borderRadius: 14,
    padding: "1rem",
    background: "rgba(15, 23, 42, 0.72)",
    border: "1px solid var(--border-subtle)",
    display: "grid",
    gap: "0.75rem",
  },
  conflictGrid: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  conflictBlock: {
    padding: "0.85rem 1rem",
    borderRadius: 12,
    background: "var(--bg-input)",
    border: "1px solid var(--border-subtle)",
  },
  conflictMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
  },
  textTableWrap: {
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid var(--border-subtle)",
    background: "rgba(15, 23, 42, 0.72)",
  },
  darkTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  darkTh: {
    padding: "0.9rem 1rem",
    borderBottom: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    textAlign: "left",
    background: "rgba(15, 23, 42, 0.9)",
  },
  darkTd: {
    padding: "0.9rem 1rem",
    borderBottom: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: "0.92rem",
    verticalAlign: "top",
  },
  suggestionText: {
    color: "#4ade80",
    fontWeight: 700,
  },
  mutedText: {
    color: "var(--text-secondary)",
  },
  correlationGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  correlationCard: {
    borderRadius: 14,
    padding: "1rem",
    background: "rgba(15, 23, 42, 0.72)",
    border: "1px solid var(--border-subtle)",
    display: "grid",
    gap: "0.75rem",
  },
  correlationTitle: {
    margin: 0,
    color: "var(--color-blue)",
    fontSize: "0.98rem",
    fontWeight: 700,
  },
  badgeCloud: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  badgeTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.45rem 0.75rem",
    borderRadius: 999,
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
};

const getStatusBadge = (value, type) => {
  if (type === "missing") {
    if (value === 0) return badgeStyles.success;
    if (value <= 20) return badgeStyles.warning;
    return badgeStyles.danger;
  }
  if (type === "duplicate") {
    if (value === 0) return badgeStyles.success;
    if (value <= 5) return badgeStyles.warning;
    return badgeStyles.danger;
  }
  if (type === "imbalance") {
    if (value <= 1.5) return badgeStyles.success;
    if (value <= 4.0) return badgeStyles.warning;
    return badgeStyles.danger;
  }
  return badgeStyles.warning;
};

function ResultsPanel({ result }) {
  if (!result) {
    return (
      <div style={styles.card}>
        <div style={styles.emptyState}>No results yet.</div>
      </div>
    );
  }

  const isTextResult = result && ("semantic_inconsistencies" in result || "label_noise_issues" in result);

  if (!isTextResult) {
    const duplicateCount = result.duplicate_rows?.count ?? 0;
    const classEntries = Object.entries(result.class_distribution ?? {});
    const missingEntries = Object.entries(result.missing_values ?? {});
    const totalClassCount = classEntries.reduce((sum, [, count]) => sum + count, 0);

    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Dataset Audit Results</h2>
            <p style={styles.description}>Review the latest audit metrics and status indicators.</p>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={{ ...styles.summaryCard, borderTop: "3px solid var(--color-blue)" }}>
            <p style={styles.summaryLabel}>Rows</p>
            <p style={{ ...styles.summaryValue, color: "var(--color-blue)" }}>{result.row_count.toLocaleString()}</p>
          </div>
          <div style={{ ...styles.summaryCard, borderTop: "3px solid var(--color-purple)" }}>
            <p style={styles.summaryLabel}>Columns</p>
            <p style={{ ...styles.summaryValue, color: "var(--color-purple)" }}>{result.column_count}</p>
          </div>
          <div
            style={{
              ...styles.summaryCard,
              borderTop: `3px solid ${result.imbalance_ratio > 1.5 ? "var(--color-yellow)" : "var(--color-blue)"}`,
            }}
          >
            <p style={styles.summaryLabel}>Imbalance Ratio</p>
            <p style={styles.summaryValue}>{result.imbalance_ratio}</p>
            <span style={{ ...badgeStyles.base, ...getStatusBadge(result.imbalance_ratio, "imbalance") }}>
              {result.imbalance_ratio <= 1.5 ? "Healthy" : result.imbalance_ratio <= 4.0 ? "Warning" : "Risk"}
            </span>
          </div>
          <div
            style={{
              ...styles.summaryCard,
              borderTop: `3px solid ${duplicateCount === 0 ? "var(--color-pink)" : duplicateCount <= 5 ? "var(--color-yellow)" : "var(--color-red)"}`,
            }}
          >
            <p style={styles.summaryLabel}>Duplicate Rows</p>
            <p style={styles.summaryValue}>{duplicateCount}</p>
            <span
              style={{
                ...badgeStyles.base,
                ...(duplicateCount === 0
                  ? badgeStyles.success
                  : duplicateCount <= 5
                  ? badgeStyles.warning
                  : badgeStyles.danger),
              }}
            >
              {duplicateCount === 0 ? "Clean" : duplicateCount <= 5 ? "Review" : "Action"}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Class distribution</h3>
            {classEntries.length === 0 ? (
              <div style={styles.emptyState}>No class distribution data available.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Class</th>
                    <th style={styles.th}>Count</th>
                    <th style={styles.th}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {classEntries.map(([key, value]) => (
                    <tr key={key}>
                      <td style={styles.td}>{key}</td>
                      <td style={styles.td}>{value}</td>
                      <td style={styles.td}>{totalClassCount ? ((value / totalClassCount) * 100).toFixed(1) : "0.0"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Missing values</h3>
            {missingEntries.length === 0 ? (
              <div style={styles.emptyState}>No missing value metrics available.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Column</th>
                    <th style={styles.th}>Missing %</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {missingEntries.map(([name, percent]) => (
                    <tr key={name}>
                      <td style={styles.td}>{name}</td>
                      <td style={styles.td}>{percent.toFixed(2)}%</td>
                      <td style={styles.td}>
                        <span style={{ ...badgeStyles.base, ...getStatusBadge(percent, "missing") }}>
                          {percent === 0 ? "Healthy" : percent <= 20 ? "Warning" : "Risk"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  const semanticInconsistencies = Array.isArray(result.semantic_inconsistencies) ? result.semantic_inconsistencies : [];
  const labelNoiseIssues = Array.isArray(result.label_noise_issues) ? result.label_noise_issues : [];
  const spuriousCorrelations = result.spurious_correlations ?? {};

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Text Dataset Auditor Results</h2>
          <p style={styles.description}>Review semantic conflicts, label quality, and shortcut correlation signals.</p>
        </div>
      </div>

      <div style={styles.textLayout}>
        <div style={styles.textSummaryGrid}>
          <div style={{ ...styles.metricCard, borderTop: "3px solid var(--color-blue)" }}>
            <p style={styles.metricLabel}>Total Analyzed Rows</p>
            <p style={{ ...styles.metricValue, color: "var(--color-blue)" }}>{Number(result.row_count ?? 0).toLocaleString()}</p>
          </div>
          <div style={{ ...styles.metricCard, borderTop: "3px solid var(--color-pink)" }}>
            <p style={styles.metricLabel}>Annotation Inconsistencies</p>
            <p style={{ ...styles.metricValue, color: "var(--color-pink)" }}>{result.inconsistency_count ?? 0}</p>
          </div>
          <div style={{ ...styles.metricCard, borderTop: "3px solid var(--color-yellow)" }}>
            <p style={styles.metricLabel}>Suspected Label Noise Issues</p>
            <p style={{ ...styles.metricValue, color: "var(--color-yellow)" }}>{result.noise_issue_count ?? 0}</p>
          </div>
        </div>

        <div style={styles.textSection}>
          <h3 style={{ ...styles.textSectionTitle, color: "var(--color-pink)" }}>Annotation Inconsistencies</h3>
          {semanticInconsistencies.length === 0 ? (
            <div style={styles.emptyState}>No text annotation conflicts discovered.</div>
          ) : (
            <div style={styles.conflictStack}>
              {semanticInconsistencies.map((item, index) => (
                <div key={`${item.idx_1}-${item.idx_2}-${index}`} style={styles.conflictCard}>
                  <div style={styles.conflictMeta}>
                    <span>Row {item.idx_1}</span>
                    <span>vs</span>
                    <span>Row {item.idx_2}</span>
                    <span>Similarity {(Number(item.similarity ?? 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div style={styles.conflictGrid}>
                    <div style={styles.conflictBlock}>
                      <div style={{ color: "var(--text-secondary)" }}>Text 1</div>
                      <div>{item.text_1}</div>
                      <div style={{ marginTop: "0.5rem", color: "var(--color-pink)", fontWeight: 700 }}>
                        Label: {item.label_1}
                      </div>
                    </div>
                    <div style={styles.conflictBlock}>
                      <div style={{ color: "var(--text-secondary)" }}>Text 2</div>
                      <div>{item.text_2}</div>
                      <div style={{ marginTop: "0.5rem", color: "var(--color-pink)", fontWeight: 700 }}>
                        Label: {item.label_2}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.textSection}>
          <h3 style={{ ...styles.textSectionTitle, color: "var(--color-yellow)" }}>Cleanlab Algorithmic Label Noise</h3>
          {labelNoiseIssues.length === 0 ? (
            <div style={styles.emptyState}>No label noise issues detected.</div>
          ) : (
            <div style={styles.textTableWrap}>
              <table style={styles.darkTable}>
                <thead>
                  <tr>
                    <th style={styles.darkTh}>Text Sample</th>
                    <th style={styles.darkTh}>Assigned Dataset Label</th>
                    <th style={styles.darkTh}>Algorithmic Suggestion</th>
                    <th style={styles.darkTh}>Quality Score</th>
                  </tr>
                </thead>
                <tbody>
                  {labelNoiseIssues.map((item, index) => (
                    <tr key={`${item.idx}-${index}`}>
                      <td style={styles.darkTd}>{item.text}</td>
                      <td style={{ ...styles.darkTd, ...styles.mutedText }}>{item.given_label}</td>
                      <td style={{ ...styles.darkTd, ...styles.suggestionText }}>{item.suggested_label}</td>
                      <td style={styles.darkTd}>{Number(item.label_quality ?? 0).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={styles.textSection}>
          <h3 style={{ ...styles.textSectionTitle, color: "var(--color-blue)" }}>Spurious Shortcut Correlations</h3>
          {Object.keys(spuriousCorrelations).length === 0 ? (
            <div style={styles.emptyState}>No shortcut correlation signals available.</div>
          ) : (
            <div style={styles.correlationGrid}>
              {Object.entries(spuriousCorrelations).map(([className, tokens]) => (
                <div key={className} style={styles.correlationCard}>
                  <h4 style={styles.correlationTitle}>{className}</h4>
                  <div style={styles.badgeCloud}>
                    {tokens.map((tokenItem, index) => (
                      <span key={`${className}-${tokenItem.token}-${index}`} style={styles.badgeTag}>
                        [ {tokenItem.token} | {Number(tokenItem.correlation_score ?? 0).toFixed(4)} ]
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsPanel;

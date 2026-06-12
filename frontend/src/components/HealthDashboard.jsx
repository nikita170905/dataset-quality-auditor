import { PieChart, Pie, Cell } from "recharts";

const statusColors = {
  excellent: "var(--color-green, #22c55e)",
  strong: "var(--color-purple, #a855f7)",
  warning: "#f59e0b",
  critical: "#ef4444",
};

const cardStyles = {
  wrapper: {
    borderRadius: 24,
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    padding: "1.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    color: "var(--text-primary)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    width: "100%",
  },
  metricCard: {
    borderRadius: 18,
    padding: "1rem",
    backgroundColor: "var(--bg-input)",
    border: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  label: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "12px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  statusText: {
    fontSize: "11px",
    fontWeight: 600,
    display: "block",
    marginTop: "4px",
  },
  value: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: "1.55rem",
    fontWeight: 700,
  },
  progressOuter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "var(--border-subtle)",
    overflow: "hidden",
  },
  progressInner: (score) => ({
    width: `${score}%`,
    height: "100%",
    borderRadius: 999,
    backgroundColor:
      score > 80 ? statusColors.excellent : score > 60 ? statusColors.warning : statusColors.critical,
    transition: "width 0.35s ease",
  }),
  sectionTitle: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  issueCard: {
    borderRadius: 18,
    padding: "1rem",
    border: "1px solid var(--border-subtle)",
    backgroundColor: "var(--bg-input)",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  issueHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  badge: {
    padding: "0.35rem 0.75rem",
    borderRadius: 999,
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  jsonCard: {
    borderRadius: 18,
    backgroundColor: "var(--bg-input)",
    border: "1px solid var(--border-subtle)",
    padding: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "1rem",
  },
  downloadButton: {
    backgroundColor: "var(--color-purple)",
    color: "var(--text-primary)",
    border: "none",
    borderRadius: 12,
    padding: "0.85rem 1.2rem",
    cursor: "pointer",
    fontWeight: 700,
  },
};

const badgeStyles = {
  CRITICAL: {
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderLeft: "4px solid #ef4444",
  },
  WARNING: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderLeft: "4px solid #f59e0b",
  },
  INFO: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderLeft: "4px solid #3b82f6",
  },
};

function selectRingColor(score) {
  if (score >= 90) return statusColors.excellent;
  if (score >= 75) return statusColors.strong;
  if (score >= 60) return statusColors.warning;
  return statusColors.critical;
}

function HealthDashboard({ result }) {
  const overallScore = Number(result.overall_score ?? 0);
  const ringColor = selectRingColor(overallScore);

  const metrics = [
    { label: "Missing Values", score: result.score_breakdown?.missing_values ?? 0 },
    { label: "Class Balance", score: result.score_breakdown?.class_balance ?? 0 },
    { label: "Duplicates", score: result.score_breakdown?.duplicates ?? 0 },
    { label: "Label Noise", score: result.score_breakdown?.label_noise ?? 0 },
    { label: "Semantic Consistency", score: result.score_breakdown?.semantic_consistency ?? 0 },
  ];

  const issues = Array.isArray(result.issues) ? result.issues : [];
  const strategies = Array.isArray(result.augmentation_strategies) ? result.augmentation_strategies : [];

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "dataset_audit_report.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={cardStyles.wrapper}>
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div
          style={{
            position: "relative",
            width: "240px",
            height: "240px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
          }}
        >
          <PieChart width={240} height={240}>
            <Pie
              data={[
                { name: "score", value: overallScore },
                { name: "remaining", value: 100 - overallScore },
              ]}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              innerRadius={75}
              outerRadius={90}
              paddingAngle={0}
            >
              <Cell key="score" fill={ringColor} />
              <Cell key="remaining" fill="rgba(148, 163, 184, 0.18)" />
            </Pie>
          </PieChart>

          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: "44px", fontWeight: "bold", color: "var(--text-primary)", lineHeight: "1" }}>
              {result.grade}
            </span>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)", marginTop: "4px" }}>
              {result.overall_score.toFixed(2)} / 100
            </span>
            <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-secondary)", opacity: 0.8, marginTop: "2px" }}>
              Dataset Health Score
            </span>
          </div>
        </div>

        <div style={cardStyles.grid}>
          {metrics.map((metric) => {
            const statusLabel =
              metric.score > 80 ? "Healthy" : metric.score > 60 ? "Needs Attention" : "Critical";
            const statusColor =
              metric.score > 80 ? "#22c55e" : metric.score > 60 ? "#f59e0b" : "#ef4444";

            return (
              <div key={metric.label} style={cardStyles.metricCard}>
                <p style={cardStyles.label} title={metric.label}>
                  {metric.label}
                </p>
                <p style={cardStyles.value}>{Number(metric.score).toFixed(2)}</p>
                <span style={{ ...cardStyles.statusText, color: statusColor }}>{statusLabel}</span>
                <div style={cardStyles.progressOuter}>
                  <div style={cardStyles.progressInner(Number(metric.score))} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1.25fr 0.75fr" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={cardStyles.issueCard}>
            <div style={cardStyles.issueHeader}>
              <div>
                <p style={cardStyles.sectionTitle}>Prioritized Issues</p>
              </div>
            </div>
            {issues.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Dataset looks healthy! No issues found ✓
              </div>
            ) : (
              issues.map((issue, index) => (
                <div
                  key={`${issue.category}-${index}`}
                  style={{ ...cardStyles.issueCard, ...badgeStyles[issue.severity] }}
                >
                  <div style={cardStyles.issueHeader}>
                    <span style={{ fontWeight: 700 }}>{issue.category}</span>
                    <span
                      style={{
                        ...cardStyles.badge,
                        color: issue.severity === "CRITICAL" ? "#ef4444" : issue.severity === "WARNING" ? "#f59e0b" : "#2563eb",
                      }}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                    {issue.description}
                  </p>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {issue.fix_suggestion}
                  </p>
                </div>
              ))
            )}
          </div>

          <div style={cardStyles.issueCard}>
            <div style={cardStyles.issueHeader}>
              <div>
                <p style={cardStyles.sectionTitle}>Augmentation & Remediation Plans</p>
              </div>
            </div>
            {strategies.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                No augmentation needed based on current audit results.
              </div>
            ) : (
              strategies.map((strategy, index) => (
                <div
                  key={`${strategy.strategy_name}-${index}`}
                  style={{ marginBottom: index < strategies.length - 1 ? "0.9rem" : 0 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      marginBottom: "0.55rem",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700 }}>{strategy.strategy_name}</p>
                    <span
                      style={{
                        ...cardStyles.badge,
                        color: "var(--color-purple)",
                        backgroundColor: "rgba(168, 85, 247, 0.12)",
                      }}
                    >
                      Priority {strategy.priority}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {strategy.target_issue}
                  </p>
                  <p style={{ margin: "0.35rem 0 0", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                    {strategy.method}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.05))",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignSelf: "flex-start",
            width: "100%",
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>System Report</p>
            <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Download the full JSON payload for offline review and archival.
            </p>
          </div>
          <button style={cardStyles.downloadButton} onClick={handleDownload}>
            Download Full Report (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}

export default HealthDashboard;
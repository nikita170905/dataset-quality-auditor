import { PieChart, Pie, Cell } from "recharts";
import DatasetChat from "./DatasetChat";

const statusColors = {
  excellent: "var(--color-green, #22c55e)",
  strong: "var(--text-primary)",
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
    backgroundColor: "var(--text-primary)",
    color: "#000000",
    border: "none",
    borderRadius: 12,
    padding: "0.85rem 1.2rem",
    cursor: "pointer",
    fontWeight: 700,
  },
  domainAlert: {
    borderRadius: 18,
    padding: "1rem 1.25rem",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderLeft: "4px solid #f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    borderLeftWidth: "4px",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    lineHeight: 1.5,
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
  },
  domainAlertIcon: {
    fontSize: "1.1rem",
    lineHeight: 1.4,
  },
  intentLine: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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

function HealthDashboard({ result, projectIntent }) {
  const overallScore = Number(result.overall_score ?? 0);
  const ringColor = selectRingColor(overallScore);

  // Domain-aware relevance engine outputs (null when no intent was supplied)
  const domainScore =
    result.domain_suitability_score === null || result.domain_suitability_score === undefined
      ? null
      : Number(result.domain_suitability_score);
  const hasProjectIntent = Boolean(projectIntent?.trim());
  const domainWarning = result.domain_warning || null;
  const domainStatusLabel =
    domainScore === null
      ? ""
      : domainScore >= 60
      ? "Strong semantic match"
      : domainScore >= 40
      ? "Moderate semantic match"
      : "Weak semantic match";
  const domainStatusColor =
    domainScore === null ? "" : domainScore >= 60 ? "#22c55e" : domainScore >= 40 ? "#f59e0b" : "#ef4444";

  // True when no real text column existed and row text was synthesized from
  // numeric/categorical features: the text-based scores are low-confidence then.
  const textIsSynthetic = Boolean(result.text_summary?.text_is_synthetic);
  const lowConfidence = textIsSynthetic ? " (low confidence)" : "";

  const metrics = [
    { label: "Missing Values", score: result.score_breakdown?.missing_values ?? 0 },
    { label: "Class Balance", score: result.score_breakdown?.class_balance ?? 0 },
    { label: "Duplicates", score: result.score_breakdown?.duplicates ?? 0 },
    { label: `Label Noise${lowConfidence}`, score: result.score_breakdown?.label_noise ?? 0 },
    {
      label: `Semantic Consistency${lowConfidence}`,
      score: result.score_breakdown?.semantic_consistency ?? 0,
    },
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
        {/* Keep the domain card visible when intent was supplied but no text
            column was selected, so the missing prerequisite is explicit. */}
        {hasProjectIntent && (
          <div style={cardStyles.metricCard}>
            <p style={cardStyles.label}>Domain Suitability</p>
            {domainScore === null ? (
              <p style={{ ...cardStyles.statusText, color: "var(--text-secondary)", marginTop: 0 }}>
                Text column required to calculate domain suitability.
              </p>
            ) : (
              <>
                <p style={cardStyles.value}>{domainScore.toFixed(2)}</p>
                <span style={{ ...cardStyles.statusText, color: domainStatusColor }}>
                  {domainStatusLabel} — {domainScore} / 100
                </span>
                <div style={cardStyles.progressOuter}>
                  <div style={cardStyles.progressInner(domainScore)} />
                </div>
              </>
            )}
            {hasProjectIntent && (
              <p style={cardStyles.intentLine} title={projectIntent}>
                Intent: {projectIntent}
              </p>
            )}
          </div>
        )}
      </div>

      {textIsSynthetic && (
        <div style={cardStyles.domainAlert} role="note">
          <span style={cardStyles.domainAlertIcon} aria-hidden="true">
            ℹ
          </span>
          <span>
            No natural-language text column was found, so row text was built from the feature values.
            Label Noise, Semantic Consistency and Domain Suitability are low-confidence for this dataset
            and are excluded from the overall score. Rely on Missing Values, Class Balance and Duplicates.
          </span>
        </div>
      )}

      {domainWarning && (
        <div style={cardStyles.domainAlert} role="alert">
          <span style={cardStyles.domainAlertIcon} aria-hidden="true">
            ⚠
          </span>
          <span>{domainWarning}</span>
        </div>
      )}

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
                        color: "var(--text-primary)",
                        backgroundColor: "var(--bg-input)",
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

      {result.text_summary?.text_column && <DatasetChat fileId={result.file_id} />}
    </div>
  );
}

export default HealthDashboard;
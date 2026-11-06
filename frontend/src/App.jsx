import { useState, useEffect } from "react";
import { uploadFile, runAudit, runTextAudit, runFullAuditStreaming } from "./services/api";
import UploadBox from "./components/UploadBox";
import AuditForm from "./components/AuditForm";
import ResultsPanel from "./components/ResultsPanel";
import HealthDashboard from "./components/HealthDashboard";
import DynamicLoader from "./components/DynamicLoader";
import LandingPage from "./pages/LandingPage";

function Workspace() {
  const [fileId, setFileId] = useState("");
  const [auditResult, setAuditResult] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState("");
  const [auditMode, setAuditMode] = useState("tabular");
  // Column guesses returned by the backend schema auto-detection on upload;
  // AuditForm adopts them as its initial dropdown selections.
  const [inferredTextColumn, setInferredTextColumn] = useState("");
  const [inferredLabelColumn, setInferredLabelColumn] = useState("");
  const [columns, setColumns] = useState([]);
  // Optional free-text description of what the user is building; powers the
  // domain-aware relevance check on the backend.
  const [projectIntent, setProjectIntent] = useState("");

  const handleUpload = async (file) => {
    setError("");
    setUploadLoading(true);
    setAuditResult(null);
    setFileId("");
    try {
      const result = await uploadFile(file);
      if (!result || !result.fileId) {
        throw new Error("Upload failed. Backend did not return a file_id.");
      }
      setFileId(result.fileId);
      setColumns(result.columns ?? []);
      // Capture the schema guesses so AuditForm can pre-select the columns.
      setInferredTextColumn(result.inferredTextColumn ?? "");
      setInferredLabelColumn(result.inferredLabelColumn ?? "");
    } catch (err) {
      setError(err?.message || String(err) || "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAudit = async (intentDescription = "") => {
    setError("");

    const labelColumn = inferredLabelColumn?.trim();
    const textColumn = inferredTextColumn?.trim() || null;
    if (!labelColumn) {
      setError("Could not auto-detect a label column. Please check your dataset.");
      return;
    }

    if (auditMode === "text" && !textColumn) {
      setError("No text column detected. Choose one below, or use Full Dataset Audit.");
      return;
    }

    setAuditLoading(true);

    try {
      let result;
      if (auditMode === "full") {
        result = await runFullAuditStreaming(
          fileId,
          labelColumn,
          textColumn,
          () => {},
          intentDescription
        );
      } else if (auditMode === "text") {
        result = await runTextAudit(fileId, textColumn, labelColumn, intentDescription);
      } else {
        result = await runAudit(fileId, labelColumn);
      }
      setAuditResult(result);
    } catch (err) {
      setError(err.message || "Audit execution pass failed.");
    } finally {
      setAuditLoading(false);
    }
  };

  const steps = [
    { label: "Ingest Data", active: true },
    {
      label:
        auditMode === "text"
          ? "Configure Text & Label"
          : auditMode === "full"
          ? "Configure Full Audit"
          : "Configure Label",
      active: Boolean(fileId),
    },
    { label: "Compute Audit", active: auditLoading || Boolean(auditResult) },
    { label: "Metric Registry", active: Boolean(auditResult) },
  ];

  const isFullReport = auditResult && auditResult.overall_score !== undefined;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "var(--bg-app)",
        color: "var(--text-primary)",
        padding: "2rem 1rem",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            position: "relative",
            paddingBottom: "1rem",
          }}
        >
          {/* Universal Theme Mode Controller Segment Element */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
          </div>

          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <h1
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "2rem",
                lineHeight: 1.05,
                fontWeight: "800",
                color: "var(--text-primary)",
              }}
            >
              Dataset Quality Auditor
            </h1>
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "0.98rem",
                maxWidth: 640,
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.5",
              }}
            >
              Progress through the dataset audit pipeline with a focused, linear workflow. Each step unlocks as the previous stage completes.
            </p>
          </div>
        </header>

        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {steps.map((step, index) => (
            <div
              key={step.label}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 180 }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: step.active ? "var(--text-primary)" : "transparent",
                  border: `1px solid ${step.active ? "var(--text-primary)" : "var(--border-color)"}`,
                  color: step.active ? "#ffffff" : "var(--text-secondary)",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
                <span
                  style={{
                    color: step.active ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: "0.85rem",
                    fontWeight: step.active ? 600 : 500,
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </section>

        {error && (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid var(--color-red)",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              padding: "1rem 1.25rem",
              color: "var(--color-red)",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        <div
          style={{
            borderRadius: 24,
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <UploadBox
            handleUpload={handleUpload}
            uploadLoading={uploadLoading}
          />

          {fileId && (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid var(--border-color)",
                backgroundColor: "rgba(91, 43, 224, 0.08)",
                padding: "1rem 1.25rem",
                color: "var(--text-primary)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Active system token
              </p>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.95rem",
                  color: "var(--text-primary)",
                  wordBreak: "break-all",
                  fontWeight: "500",
                }}
              >
                {fileId}
              </p>
            </div>
          )}

          {fileId && !auditLoading && (
            <AuditForm
              key={fileId}
              handleAudit={handleAudit}
              auditLoading={auditLoading}
              auditMode={auditMode}
              setAuditMode={setAuditMode}
              projectIntent={projectIntent}
              setProjectIntent={setProjectIntent}
              columns={columns}
              labelColumn={inferredLabelColumn}
              setLabelColumn={setInferredLabelColumn}
              textColumn={inferredTextColumn}
              setTextColumn={setInferredTextColumn}
            />
          )}

          {auditLoading && (
            <DynamicLoader isLoading={auditLoading} />
          )}
        </div>

        {auditResult ? (
          isFullReport ? (
            <HealthDashboard result={auditResult} projectIntent={projectIntent} />
          ) : (
            <ResultsPanel result={auditResult} />
          )
        ) : null}
      </div>
    </div>
  );
}

function App() {
  return window.location.pathname === "/workspace" ? <Workspace /> : <LandingPage />;
}

export default App;
import { useState } from "react";
import { uploadFile, runAudit } from "./services/api";
import UploadBox from "./components/UploadBox";
import AuditForm from "./components/AuditForm";
import ResultsPanel from "./components/ResultsPanel";

function App() {
  const [fileId, setFileId] = useState("");
  const [auditResult, setAuditResult] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (file) => {
    setError("");
    setUploadLoading(true);
    setAuditResult(null);
    setFileId("");
    try {
      const result = await uploadFile(file);
      setFileId(result.file_id);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAudit = async (labelColumn) => {
    setError("");
    setAuditLoading(true);
    try {
      const result = await runAudit(fileId, labelColumn);
      setAuditResult(result);
    } catch (err) {
      setError(err.message || "Audit failed.");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleReset = () => {
    setFileId("");
    setAuditResult(null);
    setError("");
  };

  const steps = [
    { label: "Ingest Data", active: true },
    { label: "Configure Label", active: Boolean(fileId) },
    { label: "Compute Audit", active: auditLoading || Boolean(auditResult) },
    { label: "Metric Registry", active: Boolean(auditResult) },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "var(--bg-canvas)",
        color: "var(--text-primary)",
        padding: "2rem 1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 800,
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
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
            }}
          >
            Step-by-Step Workflow
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "2rem",
              lineHeight: 1.05,
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
            }}
          >
            Progress through the dataset audit pipeline with a focused, linear workflow. Each step unlocks as the previous stage completes.
          </p>
        </header>

        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          {steps.map((step, index) => (
            <div
              key={step.label}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: step.active ? "var(--color-purple)" : "transparent",
                  border: `1px solid ${step.active ? "var(--color-purple)" : "var(--border-subtle)"}`,
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
                {index < steps.length - 1 && (
                  <div
                    style={{
                      width: "100%",
                      height: 2,
                      backgroundColor: step.active ? "var(--color-purple)" : "var(--border-subtle)",
                      borderRadius: 999,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </section>

        {error && (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid var(--color-red)",
              backgroundColor: "rgba(225, 29, 72, 0.12)",
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
            border: "1px solid var(--border-subtle)",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <UploadBox handleUpload={handleUpload} uploadLoading={uploadLoading} />

          {fileId && (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid var(--border-subtle)",
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
                }}
              >
                {fileId}
              </p>
            </div>
          )}

          {fileId && <AuditForm handleAudit={handleAudit} auditLoading={auditLoading} fileId={fileId} />}
        </div>

        <ResultsPanel result={auditResult} />
      </div>
    </div>
  );
}

export default App;
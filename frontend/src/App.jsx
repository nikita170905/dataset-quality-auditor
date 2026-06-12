import { useState, useEffect } from "react";
import { uploadFile, runAudit, runTextAudit, runFullAuditStreaming } from "./services/api";
import UploadBox from "./components/UploadBox";
import AuditForm from "./components/AuditForm";
import ResultsPanel from "./components/ResultsPanel";
import HealthDashboard from "./components/HealthDashboard";

function App() {
  const [fileId, setFileId] = useState("");
  const [auditResult, setAuditResult] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState("");
  const [auditMode, setAuditMode] = useState("tabular");
  const [textColumn, setTextColumn] = useState("text");

  // FIX 7: Real-time telemetry tracking state variables
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditStage, setAuditStage] = useState("");

  // State hook for theme management - defaulting to dark mode cleanly
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  // Effect sync engine to dynamically append attributes onto the DOM root window
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleUpload = async (file) => {
    setError("");
    setUploadLoading(true);
    setAuditResult(null);
    setFileId("");
    try {
      const result = await uploadFile(file);
      if (!result || !result.file_id) {
        throw new Error("Upload failed. Backend did not return a file_id.");
      }
      setFileId(result.file_id);
    } catch (err) {
      setError(err?.message || String(err) || "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAudit = async (labelColumn, incomingTextCol = null) => {
    setError("");
    setAuditLoading(true);
    
    // Clear and initialize loading trackers cleanly before starting the event connection stream
    setAuditProgress(0);
    setAuditStage("Initializing audit session...");

    try {
      let result;
      if (auditMode === "full") {
        const targetTextCol = incomingTextCol || textColumn;
        // Utilize the real-time progress chunk consumer stream
        result = await runFullAuditStreaming(
          fileId,
          labelColumn,
          targetTextCol,
          (pct, msg) => {
            setAuditProgress(pct);
            setAuditStage(msg);
          }
        );
      } else if (auditMode === "text") {
        const targetTextCol = incomingTextCol || textColumn;
        result = await runTextAudit(fileId, targetTextCol, labelColumn);
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

  const handleReset = () => {
    setFileId("");
    setAuditResult(null);
    setError("");
    setAuditProgress(0);
    setAuditStage("");
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

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

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
            <button
              onClick={toggleTheme}
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease-in-out",
              }}
            >
              {theme === "dark" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </button>
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
                  backgroundColor: step.active ? "var(--color-purple, #6366f1)" : "transparent",
                  border: `1px solid ${step.active ? "var(--color-purple, #6366f1)" : "var(--border-color)"}`,
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
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <UploadBox handleUpload={handleUpload} uploadLoading={uploadLoading} />

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

          {fileId && (
            <AuditForm
              handleAudit={handleAudit}
              auditLoading={auditLoading}
              fileId={fileId}
              auditMode={auditMode}
              setAuditMode={setAuditMode}
              textColumn={textColumn}
              setTextColumn={setTextColumn}
            />
          )}

          {/* FIX 7: Incremental progress loader panel tracking active stream frames */}
          {auditLoading && (
            <div
              role="status"
              aria-live="polite"
              aria-label="Audit in progress"
              style={{ 
                padding: "24px", 
                textAlign: "center",
                borderTop: "1px solid var(--border-color)",
                marginTop: "0.5rem"
              }}
            >
              <p style={{ color: "var(--text-primary)", marginBottom: "12px", fontSize: "14px", fontWeight: "500" }}>
                {auditStage || "Initializing dataset audit analysis..."}
              </p>
              <div
                role="progressbar"
                aria-valuenow={auditProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ background: "var(--bg-app)", borderRadius: "8px", height: "8px", overflow: "hidden" }}
              >
                <div
                  style={{
                    width: `${auditProgress}%`,
                    height: "100%",
                    background: "var(--color-purple, #6366f1)",
                    transition: "width 0.4s ease",
                    borderRadius: "8px"
                  }}
                />
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "8px", fontWeight: "500" }}>
                {auditProgress}% complete
              </p>
            </div>
          )}
        </div>

        {auditResult ? (
          isFullReport ? (
            <HealthDashboard result={auditResult} />
          ) : (
            <ResultsPanel result={auditResult} />
          )
        ) : null}
      </div>
    </div>
  );
}

export default App;
import { useEffect, useState } from "react";

const statusMessages = [
  "Profiling tabular structures...",
  "Computing NLP embeddings...",
  "Detecting semantic anomalies...",
  "Calculating dataset health score...",
];

function DynamicLoader({ isLoading }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setMessageIndex((currentIndex) => (currentIndex + 1) % statusMessages.length);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Audit in progress"
      style={{
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        role="img"
        aria-label="Loading"
        style={{ color: "var(--text-primary)" }}
      >
        <circle
          cx="28"
          cy="28"
          r="21"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="6"
        />
        <circle
          cx="28"
          cy="28"
          r="21"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="6"
          strokeDasharray="80 132"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 28 28"
            to="360 28 28"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
        {statusMessages[messageIndex]}
      </p>
    </div>
  );
}

export default DynamicLoader;

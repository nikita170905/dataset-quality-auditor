import { useEffect, useRef, useState } from "react";
import { searchDataset } from "../services/api";

const styles = {
  card: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 18,
    padding: "1.25rem",
    background: "var(--bg-surface)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  history: {
    minHeight: 180,
    maxHeight: 320,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    padding: "0.25rem",
  },
  message: {
    maxWidth: "88%",
    padding: "0.75rem 0.9rem",
    borderRadius: 12,
    lineHeight: 1.45,
  },
  inputRow: {
    display: "flex",
    gap: "0.75rem",
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: "0.8rem 0.9rem",
    borderRadius: 10,
    border: "1px solid var(--border-color)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
  },
  button: {
    border: "none",
    borderRadius: 10,
    padding: "0 1rem",
    background: "var(--text-primary)",
    color: "#000000",
    fontWeight: 700,
  },
};

function DatasetChat({ fileId }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "system",
      text: "Ask a question about the indexed dataset rows.",
      matches: [],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const historyRef = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const submittedQuery = query.trim();
    if (!submittedQuery || isLoading) return;

    setQuery("");
    setMessages((current) => [...current, { role: "user", text: submittedQuery }]);
    setIsLoading(true);

    try {
      const response = await searchDataset(fileId, submittedQuery);
      setMessages((current) => [
        ...current,
        {
          role: "system",
          text: response.matches.length
            ? "Here are the most relevant dataset rows:"
            : "No matching rows yet. If the audit just finished, the search index may still be building (large files take a few minutes) - try again shortly.",
          matches: response.matches,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "system",
          text: error.message || "Dataset search failed.",
          matches: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section style={styles.card} aria-label="Dataset chat">
      <div>
        <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Ask your dataset</h3>
        <p style={{ margin: "0.35rem 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Search the indexed text rows with a natural-language question.
        </p>
      </div>

      <div ref={historyRef} style={styles.history}>
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              ...styles.message,
              alignSelf: message.role === "user" ? "flex-end" : "flex-start",
              background: message.role === "user" ? "rgba(99, 102, 241, 0.16)" : "var(--bg-input)",
              color: "var(--text-primary)",
            }}
          >
            <div>{message.text}</div>
            {message.matches?.map((match) => (
              <div
                key={`${match.row_index}-${match.text}`}
                style={{
                  marginTop: "0.65rem",
                  paddingTop: "0.65rem",
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: "0.9rem",
                }}
              >
                <div>{match.text}</div>
                <div style={{ marginTop: "0.25rem", color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                  Row {match.row_index} | Relative relevance {Number(match.score).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ))}
        {isLoading && (
          <div style={{ ...styles.message, background: "var(--bg-input)", color: "var(--text-secondary)" }}>
            Searching indexed rows...
          </div>
        )}
      </div>

      <form style={styles.inputRow} onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask about the dataset..."
          aria-label="Ask about the dataset"
          style={styles.input}
          disabled={isLoading || !fileId}
        />
        <button type="submit" style={styles.button} disabled={isLoading || !query.trim() || !fileId}>
          Ask
        </button>
      </form>
    </section>
  );
}

export default DatasetChat;
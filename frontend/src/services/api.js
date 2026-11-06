import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

/**
 * Validates network boundaries and unpacks structured server data records safely.
 *
 * @param {object} response - The returned Axios response object configuration.
 * @returns {object|array} Extracted payload metrics.
 */
async function handleResponse(response) {
  if (response.status >= 200 && response.status < 300) {
    return response.data;
  }

  const message = response.data?.detail || response.data || response.statusText;
  throw new Error(message);
}

/**
 * Streams local multi-part form data files to memory cache endpoints and
 * surfaces the backend schema auto-detection guesses.
 *
 * @param {File} file - Raw target document file object.
 * @returns {Promise<object>} { fileId, inferredTextColumn, inferredLabelColumn }
 *   where the inferred columns are null when no heuristic matched.
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const data = await handleResponse(response);
  return {
    fileId: data.file_id,
    inferredTextColumn: data.inferred_text_column ?? null,
    inferredLabelColumn: data.inferred_label_column ?? null,
    columns: Array.isArray(data.columns) ? data.columns : [],
  };
}

/**
 * Triggers synchronous localized baseline matrix sweeps for dataset columns.
 */
export async function runAudit(file_id, label_column) {
  const response = await axios.post(`${API_BASE_URL}/audit`, {
    file_id,
    label_column,
  });

  return handleResponse(response);
}

/**
 * Triggers synchronous semantic language sweeps for dataset columns.
 */
export async function runTextAudit(file_id, text_column, label_column, project_intent) {
  const response = await axios.post(`${API_BASE_URL}/audit/text`, {
    file_id,
    text_column,
    label_column,
    project_intent: project_intent || null,
  });

  return handleResponse(response);
}

/**
 * Triggers complete synchronous multi-tier sweeps across all available vectors.
 */
export async function runFullAudit(file_id, label_column, text_column, project_intent) {
  const response = await axios.post(`${API_BASE_URL}/audit/full`, {
    file_id,
    label_column,
    text_column: text_column || null,
    project_intent: project_intent || null,
  });

  return handleResponse(response);
}

/**
 * Searches the locally indexed dataset for rows relevant to a natural-language query.
 */
export async function searchDataset(file_id, query, top_k = 5) {
  const response = await axios.post(`${API_BASE_URL}/chat`, {
    file_id,
    query,
    top_k,
  });

  return handleResponse(response);
}

/**
 * FIX 6: SSE Progress Consumer
 * Establishes a persistent streaming reader connection to capture progressive 
 * calculation events and parse telemetry metrics dynamically.
 * * @param {string} file_id - Target data session token.
 * @param {string} label_column - Assigned data classification column.
 * @param {string|null} text_column - Target unstructured textual column string.
 * @param {function} onProgress - Callback monitoring step percent values and state logs.
 * @param {string|null} project_intent - Optional free-text project goal for domain relevance.
 * @returns {Promise<object|null>} The completed final HealthScoreReport payload payload.
 */
export async function runFullAuditStreaming(file_id, label_column, text_column, onProgress, project_intent) {
  const response = await fetch(`${API_BASE_URL}/audit/full/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id,
      label_column,
      text_column: text_column || null,
      project_intent: project_intent || null
    }),
  });

  if (!response.ok) {
    throw new Error(`Server execution handshake failed: status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult = null;

  // One SSE frame = one or more "data: ..." lines, terminated by a blank line.
  // Frames (especially the final report, which can be megabytes) are often split
  // across several network chunks, so we only parse a frame once it is complete.
  const handleFrame = (frame) => {
    const dataLines = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""));
    if (dataLines.length === 0) return;

    const payload = JSON.parse(dataLines.join("\n"));
    if (payload.stage === "error") {
      throw new Error(payload.message);
    }
    if (payload.stage === "complete") {
      finalResult = JSON.parse(payload.message);
      return;
    }
    if (typeof onProgress === "function") {
      onProgress(payload.progress, payload.message);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let separator;
    while ((separator = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      handleFrame(frame);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) handleFrame(buffer.trim());

  if (!finalResult) {
    throw new Error("The audit stream ended before a final report was received.");
  }
  return finalResult;
}

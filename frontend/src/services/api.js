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
 * Streams local multi-part form data files to memory cache endpoints.
 *
 * @param {File} file - Raw target document file object.
 * @returns {Promise<object>} Contains unique file_id system token mappings.
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return handleResponse(response);
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
export async function runTextAudit(file_id, text_column, label_column) {
  const response = await axios.post(`${API_BASE_URL}/audit/text`, {
    file_id,
    text_column,
    label_column,
  });

  return handleResponse(response);
}

/**
 * Triggers complete synchronous multi-tier sweeps across all available vectors.
 */
export async function runFullAudit(file_id, label_column, text_column) {
  const response = await axios.post(`${API_BASE_URL}/audit/full`, {
    file_id,
    label_column,
    text_column: text_column || null,
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
 * @returns {Promise<object|null>} The completed final HealthScoreReport payload payload.
 */
export async function runFullAuditStreaming(file_id, label_column, text_column, onProgress) {
  const response = await fetch(`${API_BASE_URL}/audit/full/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id,
      label_column,
      text_column: text_column || null
    }),
  });

  if (!response.ok) {
    throw new Error(`Server execution handshake failed: status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let finalResult = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const textChunk = decoder.decode(value, { stream: true });
    // Explode stream frames cleanly across safe newlines tracking active telemetry
    const lines = textChunk.split("\n").filter(line => line.trim().startsWith("data: "));

    for (const line of lines) {
      try {
        // Strip out the custom "data: " chunk signature safely
        const payload = JSON.parse(line.slice(6));

        if (payload.stage === "complete") {
          // Unpack the comprehensive report payload directly on complete phase frames
          finalResult = JSON.parse(payload.message);
        } else if (payload.stage === "error") {
          throw new Error(payload.message);
        } else {
          // Route tracking logs directly up to the user interface loaders
          onProgress(payload.progress, payload.message);
        }
      } catch (err) {
        // Intercept partial data fragmentations smoothly to allow streaming chunk alignment
        if (err.message !== "Unexpected end of JSON" && !err.message.includes("is not valid JSON")) {
          throw err;
        }
      }
    }
  }

  return finalResult;
}
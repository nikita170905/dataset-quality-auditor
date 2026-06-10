const API_BASE_URL = "http://localhost:8000";

async function handleResponse(response) {
  const contentType = response.headers.get("Content-Type") || "";

  let payload = null;
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const message = payload?.detail || payload || response.statusText;
    throw new Error(message);
  }

  return payload;
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
}

export async function runAudit(file_id, label_column) {
  const response = await fetch(`${API_BASE_URL}/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_id, label_column }),
  });

  return handleResponse(response);
}

export async function runTextAudit(file_id, text_column, label_column) {
  const response = await fetch(`${API_BASE_URL}/api/audit/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_id, text_column, label_column }),
  });

  return handleResponse(response);
}

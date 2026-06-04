import { useState, useRef } from "react";

const formatSize = (bytes) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
};

const styles = {
  card: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 16,
    padding: "1.75rem",
    background: "var(--bg-surface)",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
    transition: "transform 0.2s ease, border-color 0.2s ease",
  },
  dragArea: {
    border: "1px dashed var(--border-subtle)",
    borderRadius: 12,
    padding: "2rem",
    textAlign: "center",
    cursor: "pointer",
    color: "var(--text-primary)",
    background: "var(--bg-input)",
    marginBottom: "1rem",
    transition: "background-color 0.2s ease, border-color 0.2s ease",
  },
  dragAreaHover: {
    borderColor: "var(--color-yellow)",
    background: "rgba(251, 191, 36, 0.08)",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 1.25rem",
    borderRadius: 6,
    border: "none",
    background: "var(--color-purple)",
    color: "var(--text-primary)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease, transform 0.2s ease",
  },
  buttonDisabled: {
    background: "var(--border-subtle)",
    color: "var(--text-secondary)",
    cursor: "not-allowed",
    opacity: 0.75,
  },
  fileInfo: {
    marginTop: "1rem",
    color: "var(--text-secondary)",
  },
  errorText: {
    marginTop: "0.75rem",
    color: "var(--color-red)",
  },
};

function UploadBox({ handleUpload, uploadLoading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) {
      return "No file selected.";
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return "Only .csv files are supported.";
    }
    return "";
  };

  const handleFile = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setFileError(validationError);
      return;
    }

    setSelectedFile(file);
    setFileError("");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const onUploadClick = () => {
    if (!selectedFile || uploadLoading) {
      return;
    }
    handleUpload(selectedFile);
  };

  const dragAreaStyle = {
    ...styles.dragArea,
    ...(isDragging ? styles.dragAreaHover : {}),
  };

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Upload dataset</h3>
      <div
        style={dragAreaStyle}
        onClick={openFilePicker}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          Drag & drop a CSV file here
        </p>
        <p style={{ margin: "0.5rem 0 0", color: "var(--text-secondary)" }}>
          or click to select a .csv file from your computer
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />

      {selectedFile && (
        <div style={styles.fileInfo}>
          <p style={{ margin: "0.25rem 0", fontWeight: 600 }}>{selectedFile.name}</p>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>{formatSize(selectedFile.size)}</p>
        </div>
      )}

      {fileError && <p style={styles.errorText}>{fileError}</p>}

      <button
        type="button"
        style={{
          ...styles.button,
          ...(uploadLoading || !selectedFile ? styles.buttonDisabled : {}),
          marginTop: "1.25rem",
          width: "100%",
        }}
        onClick={onUploadClick}
        disabled={!selectedFile || uploadLoading}
      >
        {uploadLoading ? "Uploading..." : "Upload Dataset"}
      </button>
    </div>
  );
}

export default UploadBox;
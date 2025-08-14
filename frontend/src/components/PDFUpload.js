import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import "./PDFUpload.css";

const PDFUpload = ({ onUpload, loading }) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file.type === "application/pdf") {
          onUpload(file);
        } else {
          alert("Please upload a PDF file.");
        }
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  return (
    <div className="pdf-upload card">
      <h3>Upload PDF</h3>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""}`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div className="upload-loading">
            <div className="spinner"></div>
            <p>Uploading...</p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📄</div>
            {isDragActive ? (
              <p>Drop the PDF here...</p>
            ) : (
              <div>
                <p>Drag & drop a PDF file here, or click to select</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: "10px" }}
                >
                  Choose File
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFUpload;

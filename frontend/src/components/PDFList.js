import React from "react";
import "./PDFList.css";

const PDFList = ({ pdfs, selectedPDF, onSelectPDF, onDeletePDF, loading }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDelete = (e, pdfId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this PDF?")) {
      onDeletePDF(pdfId);
    }
  };

  if (loading && pdfs.length === 0) {
    return (
      <div className="pdf-list card">
        <h3>PDF Documents</h3>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pdf-list card">
      <h3>PDF Documents ({pdfs.length})</h3>
      {pdfs.length === 0 ? (
        <div className="empty-state">
          <p>No PDFs uploaded yet</p>
        </div>
      ) : (
        <div className="pdf-items">
          {pdfs.map((pdf) => (
            <div
              key={pdf.id}
              className={`pdf-item ${
                selectedPDF?.id === pdf.id ? "selected" : ""
              }`}
              onClick={() => onSelectPDF(pdf)}
            >
              <div className="pdf-info">
                <div className="pdf-icon">📄</div>
                <div className="pdf-details">
                  <h4>{pdf.title}</h4>
                  <p>Uploaded: {formatDate(pdf.uploaded_at)}</p>
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(e, pdf.id)}
                title="Delete PDF"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PDFList;

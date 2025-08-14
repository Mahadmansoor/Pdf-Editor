// PDFViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "./PDFEditor.css"; // reuse styles for overlay positioning if needed

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFViewer({ pdf, textData }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const pageContainerRef = useRef(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onPageLoadSuccess = (pdfPage) => {
    // used if you need page dimensions later
  };

  const previousPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const nextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  // Render non-editable overlays from textData (must match PDF extraction coordinates)
  const renderOverlays = () => {
    if (!textData || !textData[pageNumber]) return null;
    return textData[pageNumber].map((t, idx) => {
      const left = t.x * scale;
      const top = t.y * scale;
      const fontSize = (t.fontSize || 12) * scale;
      return (
        <div
          key={idx}
          className="text-annotation"
          style={{
            position: "absolute",
            left,
            top,
            fontSize,
            pointerEvents: "none",
            background: "transparent",
            color: "#000",
            zIndex: 10,
            whiteSpace: "pre-wrap",
          }}
        >
          {t.text}
        </div>
      );
    });
  };

  return (
    <div className="pdf-editor">
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <button className="tool-btn" onClick={handleZoomOut}>
            🔍-
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="tool-btn" onClick={handleZoomIn}>
            🔍+
          </button>
        </div>

        <div className="toolbar-section">
          <button
            className="tool-btn"
            onClick={previousPage}
            disabled={pageNumber <= 1}
          >
            ⬅️
          </button>
          <span className="page-info">
            {pageNumber} / {numPages || "-"}
          </span>
          <button
            className="tool-btn"
            onClick={nextPage}
            disabled={!numPages || pageNumber >= numPages}
          >
            ➡️
          </button>
        </div>
      </div>

      <div
        className="editor-content"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <div
          ref={pageContainerRef}
          style={{ position: "relative", display: "inline-block" }}
        >
          <Document file={pdf.file_url} onLoadSuccess={onDocumentLoadSuccess}>
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadSuccess={onPageLoadSuccess}
            />
          </Document>

          {/* Overlays */}
          {renderOverlays()}
        </div>
      </div>
    </div>
  );
}

// PDFEditor.jsx
import React, { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import axios from "axios";
import "./PDFEditor.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function PDFEditor({ pdf, onSave }) {
  const [selectedTool, setSelectedTool] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [annotations, setAnnotations] = useState({});
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const pageContainerRef = useRef(null);
  const [pageDims, setPageDims] = useState({ width: 0, height: 0 }); // store scaled page size

  // fetch extracted text
  useEffect(() => {
  if (!pdf?.id) return;
  axios
    .get(`${API_BASE_URL}/pdf-documents/${pdf.id}/extract-text/`) // Assuming this is your new endpoint
    .then((res) => {
      console.log('API Response:', res.data.pages);
      const extractedPages = {};
      
      // The new, correct way to process the data
      res.data.pages.forEach((pageData) => {
        extractedPages[pageData.page] = pageData.blocks.map((block, blockIdx) => ({
          id: `${Date.now()}-block-${blockIdx}`,
          type: 'block',
          bbox: block.bbox,
          lines: block.lines.map((line, lineIdx) => ({
            id: `${Date.now()}-line-${lineIdx}`,
            bbox: line.bbox,
            spans: line.spans.map((span, spanIdx) => ({
              id: `${Date.now()}-span-${spanIdx}`,
              bbox: span.bbox,
              text: span.text,
              originalText: span.text,
              font: span.font,
              size: span.size,
              color: span.color,
            }))
          }))
        }));
      });
      setAnnotations(extractedPages);
    })
    .catch((e) => {
      console.error("Text extraction failed:", e);
      setAnnotations({});
    });
}, [pdf?.id]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onPageLoadSuccess = (pdfPage) => {
    const viewport = pdfPage.getViewport({ scale });
    setPageDims({ width: viewport.width, height: viewport.height });
  };

  const changePage = (offset) => setPageNumber((p) => p + offset);
  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  const findAnnotationAtPosition = (page, x, y) => {
    const pageAnnotations = annotations[page] || [];
    const tolerance = 10 / scale;
    return (
      pageAnnotations.find((a) => {
        const ax = a.position.x;
        const ay = a.position.y;
        return (
          x >= ax - tolerance &&
          x <= ax + 50 &&
          y >= ay - tolerance &&
          y <= ay + 20
        );
      }) || null
    );
  };

  const handleCanvasClick = (e) => {
    if (!pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const xCss = e.clientX - rect.left;
    const yCss = e.clientY - rect.top;
    const x = xCss / scale;
    const y = yCss / scale;

    if (selectedAnnotation?.id) {
      setSelectedAnnotation(null);
      return;
    }

    const clicked = findAnnotationAtPosition(pageNumber, x, y);
    setSelectedAnnotation(clicked);
  };

  const handleAnnotationMouseDown = (e, annotation) => {
    e.stopPropagation();
    const rect = pageContainerRef.current.getBoundingClientRect();
    const xCss = e.clientX - rect.left;
    const yCss = e.clientY - rect.top;
    setDragOffset({
      x: xCss - annotation.position.x * scale,
      y: yCss - annotation.position.y * scale,
    });
    setIsDragging(true);
    setSelectedAnnotation(annotation);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedAnnotation) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const xCss = e.clientX - rect.left;
    const yCss = e.clientY - rect.top;
    const newX = (xCss - dragOffset.x) / scale;
    const newY = (yCss - dragOffset.y) / scale;

    setAnnotations((prev) => ({
      ...prev,
      [pageNumber]: (prev[pageNumber] || []).map((a) =>
        a.id === selectedAnnotation.id
          ? { ...a, position: { x: newX, y: newY } }
          : a
      ),
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTextInput = (id, value) => {
    setAnnotations((prev) => ({
      ...prev,
      [pageNumber]: (prev[pageNumber] || []).map((a) =>
        a.id === id ? { ...a, content: value } : a
      ),
    }));
  };

  const handleAddTextAt = (xCss, yCss) => {
    const x = xCss / scale;
    const y = yCss / scale;
    const newAnnotation = {
      id: `new-${Date.now()}`,
      content: "",
      originalContent: "",
      position: { x, y },
      page: pageNumber,
      style: { fontSize: 14, color: "#000", fontFamily: "Arial" },
      isNew: true,
    };
    setAnnotations((prev) => ({
      ...prev,
      [pageNumber]: [...(prev[pageNumber] || []), newAnnotation],
    }));
    setSelectedAnnotation(newAnnotation);
  };

  const handleAddTextTool = (e) => {
    if (!pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const xCss = e.clientX - rect.left;
    const yCss = e.clientY - rect.top;
    handleAddTextAt(xCss, yCss);
  };

  const handleSave = async () => {
    try {
      const edits = [];
      Object.values(annotations).forEach((pageArray) => {
        pageArray.forEach((a) => {
          if (!a.isNew && a.content !== a.originalContent) {
            edits.push({
              page: a.page,
              old_text: a.originalContent,
              new_text: a.content,
            });
          } else if (a.isNew && a.content?.trim()) {
            edits.push({
              page: a.page,
              add_text: a.content,
              x: a.position.x,
              y: a.position.y,
            });
          }
        });
      });

      await axios.post(`${API_BASE_URL}/pdf-documents/${pdf.id}/update-text/`, {
        edits,
      });
      alert("Saved");
      if (onSave) onSave();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const toHexColor = (c) => {
  if (c === undefined) return '#000000';
  return '#' + ('000000' + c.toString(16)).slice(-6);
};

const renderAnnotations = () => {
  const pageBlocks = annotations[pageNumber] || [];
  
  return pageBlocks.map((block) => {
    const left = block.bbox[0] * scale;
    const top = block.bbox[1] * scale;
    const width = (block.bbox[2] - block.bbox[0]) * scale;
    const height = (block.bbox[3] - block.bbox[1]) * scale;
    
    // Each block is a single contentEditable div
    return (
      <div
        key={block.id}
        contentEditable
        suppressContentEditableWarning
        className="editable-block" // A new CSS class for blocks
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          border: '1px solid rgba(255, 0, 0, 0.4)', // Red border for debugging
          zIndex: 20,
        }}
        // You will need to add event handlers here for saving, etc.
      >
        {block.lines.map(line => (
          <p key={line.id} style={{ margin: 0, padding: 0 }}>
            {line.spans.map(span => (
              <span
                key={span.id}
                style={{
                  fontFamily: `"${span.font}", sans-serif`,
                  fontSize: `${span.size * scale}px`,
                  color: toHexColor(span.color),
                  whiteSpace: 'pre', // Preserve whitespace within spans
                }}
              >
                {span.text}
              </span>
            ))}
          </p>
        ))}
      </div>
    );
  });
};

  const handleContainerClick = (e) => {
    if (selectedAnnotation) {
      setSelectedAnnotation(null);
      return;
    }
    if (selectedTool === "text") {
      handleAddTextTool(e.nativeEvent);
    } else {
      handleCanvasClick(e.nativeEvent);
    }
  };

  return (
    <div className="pdf-editor">
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <button className="tool-btn save-btn" onClick={handleSave}>
            💾 Save
          </button>
        </div>

        <div className="toolbar-section">
          <span className="tool-group-label">Tools:</span>
          <button
            className={`tool-btn ${selectedTool === "select" ? "active" : ""}`}
            onClick={() => setSelectedTool("select")}
          >
            👆 Select
          </button>
          <button
            className={`tool-btn ${selectedTool === "text" ? "active" : ""}`}
            onClick={() => setSelectedTool("text")}
          >
            ✏️ Add Text
          </button>
        </div>

        <div className="toolbar-section">
          <span className="tool-group-label">Navigation:</span>
          <button
            className="tool-btn"
            onClick={previousPage}
            disabled={pageNumber <= 1}
          >
            ⬅️
          </button>
          <span className="page-info">
            {pageNumber} / {numPages}
          </span>
          <button
            className="tool-btn"
            onClick={nextPage}
            disabled={pageNumber >= numPages}
          >
            ➡️
          </button>
        </div>

        <div className="toolbar-section">
          <span className="tool-group-label">Zoom:</span>
          <button className="tool-btn" onClick={handleZoomOut}>
            🔍-
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="tool-btn" onClick={handleZoomIn}>
            🔍+
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div
          className={`pdf-container ${
            selectedTool === "text" ? "text-mode" : ""
          }`}
          ref={pageContainerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleContainerClick}
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

          {/* Editable overlay perfectly aligned */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: pageDims.width,
              height: pageDims.height,
              pointerEvents: "none",
            }}
          >
            {renderAnnotations()}
          </div>
        </div>
      </div>
    </div>
  );
}

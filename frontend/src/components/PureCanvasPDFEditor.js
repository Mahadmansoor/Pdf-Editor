import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./PureCanvasPDFEditor.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function PureCanvasPDFEditor({ pdf, onSave }) {
  const canvasRef = useRef(null);
  const [selectedTool, setSelectedTool] = useState("select");
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [textData, setTextData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTextIndex, setSelectedTextIndex] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [pdfDoc, setPdfDoc] = useState(null);
  const [page, setPage] = useState(null);
  const [viewport, setViewport] = useState(null);

  // Initialize PDF.js
  useEffect(() => {
    loadPDFJS();
  }, []);

  // Load PDF and text data when PDF changes
  useEffect(() => {
    if (pdf?.id) {
      loadPDFDocument();
    }
  }, [pdf?.id]);

  // Re-render when page, scale, or text data changes
  useEffect(() => {
    if (page && textData[currentPage]) {
      renderPage();
    }
  }, [currentPage, scale, textData, page]);

  const loadPDFJS = () => {
    if (window.pdfjsLib) return;

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    };
    document.head.appendChild(script);
  };

  const loadPDFDocument = async () => {
    if (!window.pdfjsLib) {
      setTimeout(loadPDFDocument, 100);
      return;
    }

    setIsLoading(true);
    try {
      const pdfUrl = `${API_BASE_URL}${pdf.file_url}`;
      const doc = await window.pdfjsLib.getDocument(pdfUrl).promise;

      setPdfDoc(doc);
      setNumPages(doc.numPages);

      // Load first page
      const firstPage = await doc.getPage(1);
      setPage(firstPage);

      // Load text data
      await loadTextData();
    } catch (error) {
      console.error("Error loading PDF:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTextData = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/pdf-documents/${pdf.id}/extract-text/`
      );
      setTextData(
        response.data.pages.reduce((acc, pageData) => {
          acc[pageData.page] = pageData;
          return acc;
        }, {})
      );
    } catch (error) {
      console.error("Error loading text data:", error);
    }
  };

  const changePage = async (newPageNumber) => {
    if (newPageNumber < 1 || newPageNumber > numPages || !pdfDoc) return;

    setIsLoading(true);
    try {
      const newPage = await pdfDoc.getPage(newPageNumber);
      setPage(newPage);
      setCurrentPage(newPageNumber);
      setSelectedTextIndex(null);
      setEditingText("");
    } catch (error) {
      console.error("Error loading page:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = async () => {
    if (!page || !textData[currentPage]) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Create viewport with current scale
    const newViewport = page.getViewport({ scale });
    setViewport(newViewport);

    // Set canvas size
    canvas.width = newViewport.width;
    canvas.height = newViewport.height;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Render PDF page
    const renderContext = {
      canvasContext: context,
      viewport: newViewport,
    };

    await page.render(renderContext).promise;

    // Render text overlays
    renderTextOverlays(context, newViewport);
  };

  const renderTextOverlays = (context, viewport) => {
    const pageData = textData[currentPage];
    if (!pageData) return;

    context.save();

    pageData.blocks.forEach((block, blockIndex) => {
      block.lines.forEach((line, lineIndex) => {
        line.spans.forEach((span, spanIndex) => {
          const textIndex = `${blockIndex}-${lineIndex}-${spanIndex}`;
          const isSelected = selectedTextIndex === textIndex;

          // Draw text background if selected
          if (isSelected) {
            context.fillStyle = "rgba(255, 255, 0, 0.3)";
            context.fillRect(
              span.bbox[0] * scale,
              span.bbox[1] * scale,
              (span.bbox[2] - span.bbox[0]) * scale,
              (span.bbox[3] - span.bbox[1]) * scale
            );
          }

          // Draw text
          context.font = `${span.size * scale}px ${span.font || "Arial"}`;
          context.fillStyle = isSelected
            ? "#000000"
            : `#${span.color.toString(16).padStart(6, "0")}`;
          context.fillText(
            span.text,
            span.bbox[0] * scale,
            span.bbox[3] * scale // Use bottom of bbox for baseline
          );
        });
      });
    });

    context.restore();
  };

  const handleCanvasClick = (e) => {
    if (!viewport) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Find clicked text
    const pageData = textData[currentPage];
    if (!pageData) return;

    let clickedTextIndex = null;

    pageData.blocks.forEach((block, blockIndex) => {
      block.lines.forEach((line, lineIndex) => {
        line.spans.forEach((span, spanIndex) => {
          if (
            x >= span.bbox[0] &&
            x <= span.bbox[2] &&
            y >= span.bbox[1] &&
            y <= span.bbox[3]
          ) {
            clickedTextIndex = `${blockIndex}-${lineIndex}-${spanIndex}`;
          }
        });
      });
    });

    setSelectedTextIndex(clickedTextIndex);

    if (clickedTextIndex) {
      // Start editing
      const [blockIndex, lineIndex, spanIndex] = clickedTextIndex
        .split("-")
        .map(Number);
      const span =
        pageData.blocks[blockIndex].lines[lineIndex].spans[spanIndex];
      setEditingText(span.text);
    } else {
      setEditingText("");
    }
  };

  const handleTextEdit = (newText) => {
    if (selectedTextIndex === null) return;

    setEditingText(newText);

    // Update text data
    const [blockIndex, lineIndex, spanIndex] = selectedTextIndex
      .split("-")
      .map(Number);
    setTextData((prev) => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        blocks: prev[currentPage].blocks.map((block, bIndex) =>
          bIndex === blockIndex
            ? {
                ...block,
                lines: block.lines.map((line, lIndex) =>
                  lIndex === lineIndex
                    ? {
                        ...line,
                        spans: line.spans.map((span, sIndex) =>
                          sIndex === spanIndex
                            ? { ...span, text: newText }
                            : span
                        ),
                      }
                    : line
                ),
              }
            : block
        ),
      },
    }));

    // Re-render
    setTimeout(() => {
      if (page) renderPage();
    }, 0);
  };

  const saveChanges = async () => {
    try {
      const edits = [];

      // Collect all text changes
      Object.keys(textData).forEach((pageNum) => {
        const pageData = textData[pageNum];
        pageData.blocks.forEach((block, blockIndex) => {
          block.lines.forEach((line, lineIndex) => {
            line.spans.forEach((span, spanIndex) => {
              if (span.text !== span.originalText) {
                edits.push({
                  page: parseInt(pageNum),
                  oldText: span.originalText,
                  newText: span.text,
                  bbox: span.bbox,
                });
              }
            });
          });
        });
      });

      const payload = { edits, newTexts: [] };
      await axios.post(
        `${API_BASE_URL}/pdf-documents/${pdf.id}/update-text/`,
        payload
      );

      alert("Changes saved successfully!");
      if (onSave) onSave();
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes");
    }
  };

  const zoomIn = () => setScale(Math.min(scale + 0.25, 3));
  const zoomOut = () => setScale(Math.max(scale - 0.25, 0.5));

  return (
    <div className="pure-canvas-pdf-editor">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <button
            className={`tool-btn ${selectedTool === "select" ? "active" : ""}`}
            onClick={() => setSelectedTool("select")}
          >
            👆 Select
          </button>
        </div>

        <div className="toolbar-section">
          <button
            className="tool-btn"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ⬅️
          </button>
          <span className="page-info">
            {currentPage} / {numPages || "-"}
          </span>
          <button
            className="tool-btn"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            ➡️
          </button>
        </div>

        <div className="toolbar-section">
          <button className="tool-btn" onClick={zoomOut}>
            🔍-
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="tool-btn" onClick={zoomIn}>
            🔍+
          </button>
        </div>

        <div className="toolbar-section">
          <button className="tool-btn save-btn" onClick={saveChanges}>
            💾 Save
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="canvas-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">Loading...</div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="pure-canvas"
        />

        {/* Text Editor */}
        {selectedTextIndex && (
          <div className="text-editor">
            <input
              type="text"
              value={editingText}
              onChange={(e) => handleTextEdit(e.target.value)}
              className="text-input"
              autoFocus
            />
            <button
              onClick={() => setSelectedTextIndex(null)}
              className="close-btn"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import axios from "axios";
import "./CanvasPDFEditor.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function CanvasPDFEditor({ pdf, onSave }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [selectedTool, setSelectedTool] = useState("select");
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [textData, setTextData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Prevent double initialization
    if (fabricCanvasRef.current) {
      return;
    }

    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 1000,
        selection: true,
        preserveObjectStacking: true,
      });

      fabricCanvasRef.current = canvas;

      // Canvas event handlers
      canvas.on("selection:created", handleSelection);
      canvas.on("selection:updated", handleSelection);
      canvas.on("selection:cleared", () => setSelectedTool("select"));
      canvas.on("object:modified", saveToHistory);
      canvas.on("object:added", saveToHistory);
      canvas.on("object:removed", saveToHistory);
    } catch (error) {
      console.error("Error initializing Fabric.js canvas:", error);
    }

    return () => {
      try {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
      } catch (error) {
        // Silently ignore disposal errors during cleanup
      }
    };
  }, []); // Only initialize once on mount

  // Load PDF page and text data
  useEffect(() => {
    if (pdf?.id) {
      loadPageData(currentPage);
    }
  }, [pdf?.id, currentPage]);

  // Load text data from backend
  const loadPageData = async (pageNumber) => {
    if (!pdf?.id) return;

    setIsLoading(true);
    try {
      // Load PDF page as background image
      const pdfUrl = `${API_BASE_URL}${pdf.file_url}`;
      const pdfImage = await loadPDFAsImage(pdfUrl, pageNumber);

      // Load text data
      const response = await axios.get(
        `${API_BASE_URL}/pdf-documents/${pdf.id}/extract-text/`
      );
      const pageData = response.data.pages.find((p) => p.page === pageNumber);

      // Set total pages from response
      if (response.data.totalPages) {
        setNumPages(response.data.totalPages);
      }

      if (pageData) {
        setTextData((prev) => ({
          ...prev,
          [pageNumber]: pageData,
        }));
        renderTextElements(pageData, pdfImage);
      }
    } catch (error) {
      console.error("Error loading page data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load PDF page as image using PDF.js
  const loadPDFAsImage = async (pdfUrl, pageNumber) => {
    return new Promise((resolve, reject) => {
      // Check if PDF.js is already loaded
      if (window.pdfjsLib) {
        renderPDFPage(pdfUrl, pageNumber, resolve, reject);
      } else {
        // Check if script is already in the document to prevent duplicates
        let script = document.querySelector('script[src*="pdf.min.js"]');

        if (script) {
          // Script exists, just wait for it to load
          if (window.pdfjsLib) {
            renderPDFPage(pdfUrl, pageNumber, resolve, reject);
          } else {
            script.addEventListener("load", () =>
              renderPDFPage(pdfUrl, pageNumber, resolve, reject)
            );
          }
        } else {
          // Create new script
          script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            renderPDFPage(pdfUrl, pageNumber, resolve, reject);
          };
          script.onerror = () => reject(new Error("Failed to load PDF.js"));
          document.head.appendChild(script);
        }
      }
    });
  };

  const renderPDFPage = async (pdfUrl, pageNumber, resolve, reject) => {
    try {
      const pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      const imageData = canvas.toDataURL();
      resolve(imageData);
    } catch (error) {
      reject(error);
    }
  };

  // Render text elements on canvas
  const renderTextElements = (pageData, backgroundImage) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();

    // Add background image
    fabric.Image.fromURL(backgroundImage, (img) => {
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });
      canvas.add(img);
      canvas.sendToBack(img);

      // Add text elements
      pageData.blocks.forEach((block, blockIndex) => {
        block.lines.forEach((line, lineIndex) => {
          line.spans.forEach((span, spanIndex) => {
            const textObj = new fabric.Textbox(span.text, {
              left: span.bbox[0] * scale,
              top: span.bbox[1] * scale,
              width: (span.bbox[2] - span.bbox[0]) * scale,
              height: (span.bbox[3] - span.bbox[1]) * scale,
              fontSize: span.size * scale,
              fontFamily: span.font || "Arial",
              fill: `#${span.color.toString(16).padStart(6, "0")}`,
              editable: true,
              selectable: true,
              hasControls: true,
              hasBorders: true,
              lockMovementX: false,
              lockMovementY: false,
              lockScalingX: false,
              lockScalingY: false,
              lockRotation: false,
              data: {
                originalText: span.text,
                originalBbox: span.bbox,
                blockIndex,
                lineIndex,
                spanIndex,
                pageNumber: currentPage,
              },
            });

            canvas.add(textObj);
          });
        });
      });

      canvas.renderAll();
      saveToHistory();
    });
  };

  // Handle text selection
  const handleSelection = (e) => {
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length > 0) {
      setSelectedTool("text");
    }
  };

  // Add new text element
  const addTextElement = (x, y) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const textObj = new fabric.Textbox("New Text", {
      left: x,
      top: y,
      fontSize: 14 * scale,
      fontFamily: "Arial",
      fill: "#000000",
      editable: true,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      data: {
        originalText: "",
        isNew: true,
        pageNumber: currentPage,
      },
    });

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
  };

  // Handle canvas click for adding text
  const handleCanvasClick = (e) => {
    if (
      selectedTool === "text" &&
      e.target === fabricCanvasRef.current.lowerCanvasEl
    ) {
      const pointer = fabricCanvasRef.current.getPointer(e.e);
      addTextElement(pointer.x, pointer.y);
    }
  };

  // Save to history for undo/redo
  const saveToHistory = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const state = JSON.stringify(canvas.toJSON());
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo functionality
  const undo = () => {
    if (historyIndex > 0) {
      const canvas = fabricCanvasRef.current;
      canvas.loadFromJSON(history[historyIndex - 1], () => {
        canvas.renderAll();
        setHistoryIndex(historyIndex - 1);
      });
    }
  };

  // Redo functionality
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = fabricCanvasRef.current;
      canvas.loadFromJSON(history[historyIndex + 1], () => {
        canvas.renderAll();
        setHistoryIndex(historyIndex + 1);
      });
    }
  };

  // Save changes to backend
  const saveChanges = async () => {
    try {
      const canvas = fabricCanvasRef.current;
      const objects = canvas.getObjects();

      const edits = [];
      const newTexts = [];

      objects.forEach((obj) => {
        if (obj.type === "textbox" && obj.data) {
          if (obj.data.isNew && obj.text.trim()) {
            newTexts.push({
              page: currentPage,
              text: obj.text,
              x: obj.left / scale,
              y: obj.top / scale,
              fontSize: obj.fontSize / scale,
              fontFamily: obj.fontFamily,
              color: obj.fill,
            });
          } else if (!obj.data.isNew && obj.text !== obj.data.originalText) {
            edits.push({
              page: currentPage,
              oldText: obj.data.originalText,
              newText: obj.text,
              bbox: obj.data.originalBbox,
            });
          }
        }
      });

      const payload = { edits, newTexts };
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

  // Navigation
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= numPages) {
      setCurrentPage(pageNumber);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // Zoom functionality
  const zoomIn = () => {
    const newScale = Math.min(scale + 0.25, 3);
    setScale(newScale);
    loadPageData(currentPage);
  };

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5);
    setScale(newScale);
    loadPageData(currentPage);
  };

  return (
    <div className="canvas-pdf-editor">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-section">
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
          <button
            className="tool-btn"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            ↶ Undo
          </button>
          <button
            className="tool-btn"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            ↷ Redo
          </button>
        </div>

        <div className="toolbar-section">
          <button
            className="tool-btn"
            onClick={prevPage}
            disabled={currentPage <= 1}
          >
            ⬅️
          </button>
          <span className="page-info">
            {currentPage} / {numPages || "-"}
          </span>
          <button
            className="tool-btn"
            onClick={nextPage}
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
          className="fabric-canvas"
        />
      </div>
    </div>
  );
}

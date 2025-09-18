// // PDFEditor.jsx
// import React, { useEffect, useRef, useState } from "react";
// import { Document, Page, pdfjs } from "react-pdf";
// import axios from "axios";
// import "./PDFEditor.css";

// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
// const API_BASE_URL = "http://127.0.0.1:8000";

// export default function PDFEditor({ pdf, onSave }) {
//   const [selectedTool, setSelectedTool] = useState(null);
//   const [numPages, setNumPages] = useState(null);
//   const [pageNumber, setPageNumber] = useState(1);
//   const [scale, setScale] = useState(1.0);
//   const [annotations, setAnnotations] = useState({}); // { pageNum: [annotation,...] }
//   const [selectedAnnotation, setSelectedAnnotation] = useState(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
//   const pageContainerRef = useRef(null);
//   const pageDimsRef = useRef({ width: 0, height: 0 }); // actual page size at scale

//   // fetch extracted text and convert to annotations state
//   useEffect(() => {
//     if (!pdf?.id) return;
//     axios
//       .get(`${API_BASE_URL}/pdf-documents/${pdf.id}/extract-text/`)
//       .then((res) => {
//         const extracted = {};
//         res.data.pages.forEach((pageData) => {
//           extracted[pageData.page] = pageData.words.map((w, idx) => ({
//             id: `${Date.now()}-${pageData.page}-${idx}`,
//             content: w.text || "",
//             originalContent: w.text || "",
//             position: { x: w.x || 0, y: w.y || 0 },
//             page: pageData.page,
//             style: { fontSize: 12, color: "#000", fontFamily: "Arial" },
//             isNew: false,
//           }));
//         });
//         setAnnotations(extracted);
//       })
//       .catch((e) => {
//         console.error("extract-text failed:", e);
//         setAnnotations({});
//       });
//   }, [pdf?.id]);

//   const onDocumentLoadSuccess = ({ numPages }) => {
//     setNumPages(numPages);
//     setPageNumber(1);
//   };

//   // Page onLoadSuccess gives PDF page object; use it to get original page dimensions so we can scale overlays
//   const onPageLoadSuccess = (pdfPage) => {
//     const viewport = pdfPage.getViewport({ scale });
//     pageDimsRef.current = { width: viewport.width, height: viewport.height };
//     // Force a re-render to ensure overlay uses new dims (not always necessary)
//   };

//   const changePage = (offset) => setPageNumber((p) => p + offset);
//   const previousPage = () => changePage(-1);
//   const nextPage = () => changePage(1);
//   const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
//   const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

//   const findAnnotationAtPosition = (page, x, y) => {
//     const pageAnnotations = annotations[page] || [];
//     const tolerance = 10 / scale; // consider scale when using tolerance
//     return (
//       pageAnnotations.find((a) => {
//         const ax = a.position.x;
//         const ay = a.position.y;
//         // approximate width/height area; you can refine using measured element sizes
//         return (
//           x >= ax - tolerance &&
//           x <= ax + 50 &&
//           y >= ay - tolerance &&
//           y <= ay + 20
//         );
//       }) || null
//     );
//   };

//   const handleCanvasClick = (e) => {
//     if (!pageContainerRef.current) return;
//     const rect = pageContainerRef.current.getBoundingClientRect();
//     // coordinates relative to top-left of page DIV, in CSS pixels
//     const xCss = e.clientX - rect.left;
//     const yCss = e.clientY - rect.top;
//     // Convert CSS pixels to PDF coordinates by dividing by scale
//     const x = xCss / scale;
//     const y = yCss / scale;

//     if (selectedAnnotation && selectedAnnotation.id) {
//       // If something is selected and click outside, deselect
//       setSelectedAnnotation(null);
//       return;
//     }

//     const clicked = findAnnotationAtPosition(pageNumber, x, y);
//     setSelectedAnnotation(clicked);
//   };

//   const handleAnnotationMouseDown = (e, annotation) => {
//     e.stopPropagation();
//     const rect = pageContainerRef.current.getBoundingClientRect();
//     const xCss = e.clientX - rect.left;
//     const yCss = e.clientY - rect.top;
//     setDragOffset({
//       x: xCss - annotation.position.x * scale,
//       y: yCss - annotation.position.y * scale,
//     });
//     setIsDragging(true);
//     setSelectedAnnotation(annotation);
//   };

//   const handleMouseMove = (e) => {
//     if (!isDragging || !selectedAnnotation) return;
//     const rect = pageContainerRef.current.getBoundingClientRect();
//     const xCss = e.clientX - rect.left;
//     const yCss = e.clientY - rect.top;
//     const newX = (xCss - dragOffset.x) / scale;
//     const newY = (yCss - dragOffset.y) / scale;

//     setAnnotations((prev) => ({
//       ...prev,
//       [pageNumber]: (prev[pageNumber] || []).map((a) =>
//         a.id === selectedAnnotation.id
//           ? { ...a, position: { x: newX, y: newY } }
//           : a
//       ),
//     }));
//   };

//   const handleMouseUp = () => {
//     setIsDragging(false);
//   };

//   const handleTextInput = (id, value) => {
//     setAnnotations((prev) => ({
//       ...prev,
//       [pageNumber]: (prev[pageNumber] || []).map((a) =>
//         a.id === id ? { ...a, content: value } : a
//       ),
//     }));
//   };

//   const handleAddTextAt = (xCss, yCss) => {
//     const x = xCss / scale;
//     const y = yCss / scale;
//     const newAnnotation = {
//       id: `new-${Date.now()}`,
//       content: "",
//       originalContent: "",
//       position: { x, y },
//       page: pageNumber,
//       style: { fontSize: 14, color: "#000", fontFamily: "Arial" },
//       isNew: true,
//     };
//     setAnnotations((prev) => ({
//       ...prev,
//       [pageNumber]: [...(prev[pageNumber] || []), newAnnotation],
//     }));
//     setSelectedAnnotation(newAnnotation);
//   };

//   const handleAddTextTool = (e) => {
//     if (!pageContainerRef.current) return;
//     const rect = pageContainerRef.current.getBoundingClientRect();
//     const xCss = e.clientX - rect.left;
//     const yCss = e.clientY - rect.top;
//     handleAddTextAt(xCss, yCss);
//   };

//   const handleSave = async () => {
//     try {
//       const edits = [];
//       Object.values(annotations).forEach((pageArray) => {
//         pageArray.forEach((a) => {
//           if (!a.isNew && a.content !== a.originalContent) {
//             edits.push({
//               page: a.page,
//               old_text: a.originalContent,
//               new_text: a.content,
//             });
//           } else if (a.isNew && a.content?.trim()) {
//             edits.push({
//               page: a.page,
//               add_text: a.content,
//               x: a.position.x,
//               y: a.position.y,
//             });
//           }
//         });
//       });

//       await axios.post(`${API_BASE_URL}/pdf-documents/${pdf.id}/update-text/`, {
//         edits,
//       });
//       alert("Saved");
//       if (onSave) onSave();
//     } catch (err) {
//       console.error(err);
//       alert("Save failed");
//     }
//   };

//   // Render annotation overlays as React elements (so React controls them)
//   const renderAnnotations = () => {
//     const pageAnnotations = annotations[pageNumber] || [];
//     return pageAnnotations.map((a) => {
//       const left = a.position.x * scale;
//       const top = a.position.y * scale;
//       const fontSize = (a.style?.fontSize || 12) * scale;
//       const isSelected = selectedAnnotation?.id === a.id;
//       return (
//         <div
//           key={a.id}
//           className={`text-annotation ${isSelected ? "selected" : ""} ${
//             a.isNew ? "editing" : ""
//           }`}
//           style={{
//             position: "absolute",
//             left,
//             top,
//             fontSize,
//             color: a.style?.color,
//             fontFamily: a.style?.fontFamily,
//             zIndex: 20,
//             cursor: "text",
//             transformOrigin: "top left",
//             whiteSpace: "pre-wrap",
//             minWidth: 10,
//           }}
//           onMouseDown={(e) => handleAnnotationMouseDown(e, a)}
//         >
//           <div
//             contentEditable
//             suppressContentEditableWarning
//             onInput={(e) => handleTextInput(a.id, e.currentTarget.innerText)}
//             onBlur={() => {
//               // unset isNew flag if empty or keep as is
//               setAnnotations((prev) => ({
//                 ...prev,
//                 [pageNumber]: (prev[pageNumber] || []).map((it) =>
//                   it.id === a.id ? { ...it, isNew: false } : it
//                 ),
//               }));
//             }}
//             style={{
//               outline: "none",
//               background: "transparent",
//               minWidth: 20,
//             }}
//           >
//             {a.content}
//           </div>

//           {isSelected && (
//             <div
//               className="annotation-controls"
//               style={{ position: "absolute", top: -30, right: -10 }}
//             >
//               <button
//                 className="delete-btn"
//                 onClick={(ev) => {
//                   ev.stopPropagation();
//                   setAnnotations((prev) => ({
//                     ...prev,
//                     [pageNumber]: (prev[pageNumber] || []).filter(
//                       (it) => it.id !== a.id
//                     ),
//                   }));
//                   setSelectedAnnotation(null);
//                 }}
//               >
//                 🗑️
//               </button>
//             </div>
//           )}
//         </div>
//       );
//     });
//   };

//   // Add-text vs select tool handler
//   const handleContainerClick = (e) => {
//     if (selectedAnnotation) {
//       setSelectedAnnotation(null);
//       return;
//     }
//     if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
//       // nothing
//     }
//     if (
//       selectedAnnotation === null &&
//       e.target === pageContainerRef.current &&
//       selectedAnnotation !== null
//     ) {
//       setSelectedAnnotation(null);
//     }
//     if (selectedTool === "text") {
//       handleAddTextTool(e.nativeEvent);
//     } else {
//       handleCanvasClick(e.nativeEvent);
//     }
//   };

//   // Component UI
//   return (
//     <div className="pdf-editor">
//       <div className="editor-toolbar">
//         <div className="toolbar-section">
//           <button className="tool-btn save-btn" onClick={handleSave}>
//             💾 Save
//           </button>
//         </div>

//         <div className="toolbar-section">
//           <span className="tool-group-label">Tools:</span>
//           <button
//             className={`tool-btn ${selectedTool === "select" ? "active" : ""}`}
//             onClick={() => setSelectedTool("select")}
//           >
//             👆 Select
//           </button>
//           <button
//             className={`tool-btn ${selectedTool === "text" ? "active" : ""}`}
//             onClick={() => setSelectedTool("text")}
//           >
//             ✏️ Add Text
//           </button>
//         </div>

//         <div className="toolbar-section">
//           <span className="tool-group-label">Navigation:</span>
//           <button
//             className="tool-btn"
//             onClick={previousPage}
//             disabled={pageNumber <= 1}
//           >
//             ⬅️
//           </button>
//           <span className="page-info">
//             {pageNumber} / {numPages}
//           </span>
//           <button
//             className="tool-btn"
//             onClick={nextPage}
//             disabled={pageNumber >= numPages}
//           >
//             ➡️
//           </button>
//         </div>

//         <div className="toolbar-section">
//           <span className="tool-group-label">Zoom:</span>
//           <button className="tool-btn" onClick={handleZoomOut}>
//             🔍-
//           </button>
//           <span className="zoom-level">{Math.round(scale * 100)}%</span>
//           <button className="tool-btn" onClick={handleZoomIn}>
//             🔍+
//           </button>
//         </div>
//       </div>

//       <div className="editor-content">
//         <div
//           className={`pdf-container ${
//             selectedTool === "text" ? "text-mode" : ""
//           }`}
//           ref={pageContainerRef}
//           onMouseMove={handleMouseMove}
//           onMouseUp={handleMouseUp}
//           onClick={handleContainerClick}
//           style={{ position: "relative", display: "inline-block" }}
//         >
//           <Document file={pdf.file_url} onLoadSuccess={onDocumentLoadSuccess}>
//             <Page
//               pageNumber={pageNumber}
//               scale={scale}
//               renderTextLayer={false}
//               renderAnnotationLayer={false}
//               onLoadSuccess={onPageLoadSuccess}
//             />
//           </Document>

//           {/* React overlays for annotations */}
//           {renderAnnotations()}
//         </div>
//       </div>
//     </div>
//   );
// }

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
      .get(`${API_BASE_URL}/pdf-documents/${pdf.id}/extract-text/`)
      .then((res) => {
        const extracted = {};
        res.data.pages.forEach((pageData) => {
          extracted[pageData.page] = pageData.words.map((w, idx) => ({
            id: `${Date.now()}-${pageData.page}-${idx}`,
            content: w.text || "",
            originalContent: w.text || "",
            position: { x: w.x || 0, y: w.y || 0 },
            page: pageData.page,
            style: { fontSize: 12, color: "#000", fontFamily: "Arial" },
            isNew: false,
          }));
        });
        setAnnotations(extracted);
      })
      .catch((e) => {
        console.error("extract-text failed:", e);
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

  const renderAnnotations = () => {
    const pageAnnotations = annotations[pageNumber] || [];
    return pageAnnotations.map((a) => {
      const left = a.position.x * scale;
      const top = a.position.y * scale;
      const fontSize = (a.style?.fontSize || 12) * scale;
      const isSelected = selectedAnnotation?.id === a.id;
      return (
        <div
          key={a.id}
          className={`text-annotation ${isSelected ? "selected" : ""} ${
            a.isNew ? "editing" : ""
          }`}
          style={{
            position: "absolute",
            left,
            top,
            fontSize,
            color: a.style?.color,
            fontFamily: a.style?.fontFamily,
            zIndex: 20,
            cursor: "text",
            transformOrigin: "top left",
            whiteSpace: "pre-wrap",
            minWidth: 10,
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, a)}
        >
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleTextInput(a.id, e.currentTarget.innerText)}
            onBlur={() => {
              setAnnotations((prev) => ({
                ...prev,
                [pageNumber]: (prev[pageNumber] || []).map((it) =>
                  it.id === a.id ? { ...it, isNew: false } : it
                ),
              }));
            }}
            style={{
              outline: "none",
              background: "transparent",
              minWidth: 20,
            }}
          >
            {a.content}
          </div>

          {isSelected && (
            <div
              className="annotation-controls"
              style={{ position: "absolute", top: -30, right: -10 }}
            >
              <button
                className="delete-btn"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setAnnotations((prev) => ({
                    ...prev,
                    [pageNumber]: (prev[pageNumber] || []).filter(
                      (it) => it.id !== a.id
                    ),
                  }));
                  setSelectedAnnotation(null);
                }}
              >
                🗑️
              </button>
            </div>
          )}
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

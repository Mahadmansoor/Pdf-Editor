import React, { useState, useEffect } from "react";
import axios from "axios";
import PDFUpload from "./components/PDFUpload";
import PDFList from "./components/PDFList";
import PDFEditor from "./components/PDFEditor";
import "./App.css";

function App() {
  const [pdfs, setPdfs] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL

  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/pdf-documents/`);
      setPdfs(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching PDFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePDFUpload = async (file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      const response = await axios.post(
        `${API_BASE_URL}/pdf-documents/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const pdfData = response.data.data || response.data;
      setPdfs([pdfData, ...pdfs]);
      setSelectedPDF(pdfData);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("Error uploading PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePDFDelete = async (pdfId) => {
    try {
      await axios.delete(`${API_BASE_URL}/pdf-documents/${pdfId}/`);
      setPdfs(pdfs.filter((pdf) => pdf.id !== pdfId));
      if (selectedPDF && selectedPDF.id === pdfId) {
        setSelectedPDF(null);
      }
    } catch (error) {
      console.error("Error deleting PDF:", error);
      alert("Error deleting PDF. Please try again.");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>PDF Editor</h1>
        <p>A minimal PDF editing tool</p>
      </header>

      <div className="container">
        <div className="main-content">
          <div className="sidebar">
            <PDFUpload onUpload={handlePDFUpload} loading={loading} />
            <PDFList
              pdfs={pdfs}
              selectedPDF={selectedPDF}
              onSelectPDF={setSelectedPDF}
              onDeletePDF={handlePDFDelete}
              loading={loading}
            />
          </div>

          
          <div className="content">
            {selectedPDF ? (
              <PDFEditor
                pdf={selectedPDF}
                onSave={(data) => {
                  console.log("PDF saved:", data);
                  // You can update the PDF list here if needed
                }}
              />
            ) : (
              <div className="welcome-message">
                <h2>Welcome to PDF Editor</h2>
                <p>Upload a PDF file to get started with editing.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

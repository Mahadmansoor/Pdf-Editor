import React, { useState, useEffect } from "react";
import axios from "axios";
import PDFUpload from "./components/PDFUpload";
import PDFList from "./components/PDFList";
import CanvasPDFEditor from "./components/CanvasPDFEditor";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";

function App() {
  const [pdfs, setPdfs] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL;

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
      console.log("inside handlePDFUpload");
      setLoading(true);
      const formData = new FormData();
      console.log("form data is: ", formData);
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
      console.log("response is: ", response);
      const { document_id, task_id } = response.data;
      const pdfData = response.data.data || response.data;
      pollTaskStatus(task_id, document_id);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error("Error uploading PDF. Please try again.");
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
      toast.error("Error deleting PDF. Please try again.");
    }
  };

  const pollTaskStatus = async (taskId, documentId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/pdf-documents/${taskId}/get_task_status/`
        );
        const { status } = response.data;
        if (status === "SUCCESS") {
          clearInterval(pollInterval);
          console.log("before calling document id");
          const pdfResponse = await axios.get(
            `${API_BASE_URL}/pdf-documents/${documentId}/`
          );
          const pdfData = pdfResponse.data;
          console.log("response of pdf data is: ", pdfData);
          setPdfs([pdfData, ...pdfs]);
          setSelectedPDF(pdfData);
        } else if (status === "FAILURE") {
          clearInterval(pollInterval);
          console.error("Task Failed", response.data);
          toast.error("PDF processing failed");
        }
      } catch (error) {
        console.error("Error polling task");
        clearInterval(pollInterval);
      }
    }, 2000);
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
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
              <CanvasPDFEditor
                pdf={selectedPDF}
                onSave={(data) => {
                  console.log("PDF saved:", data);
                  // Refresh the PDF list to show updated files
                  fetchPDFs();
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
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;

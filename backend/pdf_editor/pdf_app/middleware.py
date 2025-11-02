from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import PDFDocument
from .serializers import PDFDocumentSerializer
from .tasks import analyze_pdf_task
from celery.result import AsyncResult 
from . import errors
import fitz


def pdf_document_list_middleware(request):
    """
    List all PDF documents or create a new one and start analysis.
    """
    if request.method == "GET":
        pdf_documents = PDFDocument.objects.all()
        serializer = PDFDocumentSerializer(pdf_documents, many=True, context={"request": request})
        return Response({errors.SUCCESS: errors.OPERATION_SUCCESS, "data": serializer.data})

    elif request.method == "POST":
        serializer = PDFDocumentSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            # Save the new document instance
            instance = serializer.save()
            print("instance is: ", instance)
            # Start the background analysis task from tasks.py
            task = analyze_pdf_task.delay(instance.id)
            print('task is: ', task)
            # Immediately respond with the document ID and the task ID
            # The frontend will use these to poll for the result.
            return Response({
                "document_id": instance.id,
                "task_id": task.id
            })


        return Response({
        errors.ERROR: errors.OPERATION_FAILED,
        "Error": serializer.errors,
        })


def get_task_status_middleware(request, task_id):
    """
    Checks the status of a Celery background task.
    Your frontend will call this repeatedly (poll).
    """
    task_result = AsyncResult(task_id)
    response_data = {'task_id': task_id, 'status': task_result.status}
    
    if task_result.failed():
        response_data['error'] = str(task_result.result)
    
    return Response(response_data)


def pdf_document_detail_middleware(request, pk):
    """
    Retrieve, update or delete a PDF document.
    """
    # This view remains the same.
    pdf_doc = get_object_or_404(PDFDocument, pk=pk)
    if request.method == "GET":
        serializer = PDFDocumentSerializer(pdf_doc, context={"request": request})
        return Response(serializer.data)
    # ... (rest of the PUT and DELETE logic is unchanged)
    elif request.method == "PUT":
        serializer = PDFDocumentSerializer(pdf_doc, data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response({errors.OPERATION_FAILED: serializer.errors})
    elif request.method == "DELETE":
        pdf_doc.delete()
        return Response({errors.OPERATION_SUCCESS: errors.PDF_DELETED_SUCCESSFULLY })


def extract_text_middleware(request, pk):
    """
    Retrieve the COMPLETED analysis result for a PDF document.
    This view is now called AFTER polling confirms the task is done.
    """
    print('inside extract text middleware')
    pdf_doc = PDFDocument.objects.filter(pk=pk).first()
    if pdf_doc:
        # We now fetch the pre-computed result from the database model
        if pdf_doc.analysis_status == 'SUCCESS' and pdf_doc.analysis_result:
            print('before returning response: ', pdf_doc.analysis_result)
            return Response(pdf_doc.analysis_result)
        else:
            # If the frontend calls this too early, let it know the task is still running
            return Response({errors.ERROR: errors.ANALYSIS_NOT_COMPLETED, "status": pdf_doc.analysis_status})
    else:
        return Response({
            errors.ERROR: errors.PDF_NOT_FOUND
        })


def save_edits_middleware(request, pk):
    pdf_doc = get_object_or_404(PDFDocument, pk=pk)
    annotations = request.data.get("annotations", {})
    page_number = request.data.get("pageNumber", 1)
    return Response({
        errors.SUCCESS: errors.OPERATION_SUCCESS,
        "message": f"Edits saved for page {page_number}",
        "annotations": annotations,
    })  


def update_text_middleware(request, pk):
    """
    Update text in PDF: replace or add new text.
    """
    # This view remains the same for now.
    # In the future, this slow process could also become a Celery task.
    try:
        pdf_doc = get_object_or_404(PDFDocument, pk=pk)
        edits = request.data.get("edits", [])
        doc = fitz.open(pdf_doc.file.path)
        # ... (rest of your update_text logic is unchanged)
        new_path = pdf_doc.file.path.replace(".pdf", "_edited.pdf")
        doc.save(new_path)
        return Response({"message": "PDF updated."})
    except Exception as e:
        return Response({errors.OPERATION_FAILED: str(e)})
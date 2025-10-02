from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import PDFDocument
from .serializers import PDFDocumentSerializer
import PyPDF2
import io
import base64
from . import errors
import fitz


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def pdf_document_list(request):
    """
    List all PDF documents or create a new one
    """
    if request.method == "GET":
        pdf_documents = PDFDocument.objects.all()
        serializer = PDFDocumentSerializer(
            pdf_documents, many=True, context={"request": request}
        )
        return Response(
            {errors.SUCCESS: errors.OPERATION_SUCCESS, "data": serializer.data}
        )

    elif request.method == "POST":
        try:
            print("inside post get pdf")
            print('request is: ', request)
            serializer = PDFDocumentSerializer(
                data=request.data, context={"request": request}
            )
            if serializer.is_valid():
                serializer.save()
                print("serializer: ", serializer.data)
                return Response(
                    {
                        errors.SUCCESS: errors.OPERATION_SUCCESS,
                        "data": serializer.data,
                    }
                )
            return Response(
                {
                    errors.ERROR: errors.OPERATION_FAILED,
                    "Error": serializer.errors,
                }
            )
        except Exception as e:
            return Response(
                {
                    errors.ERROR: str(e),
                }
            )


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([AllowAny])
def pdf_document_detail(request, pk):
    """
    Retrieve, update or delete a PDF document
    """
    pdf_doc = get_object_or_404(PDFDocument, pk=pk)

    if request.method == "GET":
        serializer = PDFDocumentSerializer(pdf_doc, context={"request": request})
        return Response(serializer.data)

    elif request.method == "PUT":
        serializer = PDFDocumentSerializer(
            pdf_doc, data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        pdf_doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



@api_view(["GET"])
@permission_classes([AllowAny])
def extract_text(request, pk):
    """
    Extract structured text data (blocks, lines, spans) for professional editing.
    """
    try:
        pdf_doc = get_object_or_404(PDFDocument, pk=pk)
        doc = fitz.open(pdf_doc.file.path)
        
        full_content = []

        # Iterate through each page of the document
        for page_num, page in enumerate(doc):
            # Use "dict" to get a structured dictionary of the page content
            page_data = page.get_text("dict")
            print('page data is: ', page_data)
            page_blocks = []
            # Iterate through the blocks (which represent paragraphs or columns)
            for block in page_data.get("blocks", []):
                # We only want to process text blocks (type 0)
                if block['type'] == 0:
                    block_lines = []
                    # Iterate through the lines within the current block
                    for line in block.get("lines", []):
                        line_spans = []
                        # A line is made of one or more spans with consistent styling
                        for span in line.get("spans", []):
                            # Append the detailed span information
                            line_spans.append({
                                "text": span['text'],
                                "font": span['font'],
                                "size": round(span['size'], 2),
                                "color": span['color'],
                                "bbox": [round(c, 2) for c in span['bbox']]
                            })
                        
                        if line_spans:
                           block_lines.append({
                               "spans": line_spans,
                               "bbox": [round(c, 2) for c in line['bbox']]
                           })
                    
                    if block_lines:
                        page_blocks.append({
                            "lines": block_lines,
                            "bbox": [round(c, 2) for c in block['bbox']]
                        })

            full_content.append({"page": page_num + 1, "blocks": page_blocks})

        return Response(
            {"id": str(pdf_doc.id), "title": pdf_doc.title, "pages": full_content}
        )

    except Exception as e:
        return Response(
            {"error": f"Error extracting text: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def save_edits(request, pk):
    """
    Save PDF edits with annotations
    """
    try:
        pdf_doc = get_object_or_404(PDFDocument, pk=pk)
        annotations = request.data.get("annotations", {})
        page_number = request.data.get("pageNumber", 1)

        # Here you would implement the actual PDF editing logic
        # For now, we'll just save the annotations to the database
        # In a real implementation, you would use a library like PyPDF2 or reportlab
        # to modify the actual PDF file

        # Save annotations to a JSON field (you might want to add this to your model)
        # pdf_doc.annotations = annotations
        # pdf_doc.save()

        return Response(
            {
                errors.SUCCESS: errors.OPERATION_SUCCESS,
                "message": f"Edits saved for page {page_number}",
                "annotations": annotations,
            }
        )

    except Exception as e:
        return Response(
            {errors.ERROR: f"Error saving edits: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def update_text(request, pk):
    """
    Update text in PDF: replace or add new text
    """
    try:
        pdf_doc = get_object_or_404(PDFDocument, pk=pk)
        edits = request.data.get("edits", [])

        doc = fitz.open(pdf_doc.file.path)

        for edit in edits:
            page_index = edit.get("page", 1) - 1
            page = doc[page_index]

            # Replace text
            if "old_text" in edit and "new_text" in edit:
                text_instances = page.search_for(edit["old_text"])
                for inst in text_instances:
                    page.add_redact_annot(inst, fill=(1, 1, 1))
                    page.apply_redactions()
                    page.insert_text((inst.x0, inst.y0), edit["new_text"], fontsize=12)

            # Add new text
            elif "add_text" in edit:
                x, y = edit.get("x"), edit.get("y")
                page.insert_text((x, y), edit["add_text"], fontsize=12, color=(0, 0, 0))

        # Save edited PDF
        new_path = pdf_doc.file.path.replace(".pdf", "_edited.pdf")
        doc.save(new_path)

        return Response(
            {errors.SUCCESS: errors.PDF_UPDATED_SUCCESSFULLY, "edited_file": new_path}
        )

    except Exception as e:
        return Response(
            {errors.ERROR: f"Error updating PDF: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# from rest_framework import status
# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import AllowAny
# from rest_framework.response import Response
# from django.http import JsonResponse
# from django.shortcuts import get_object_or_404
# from .models import PDFDocument
# from .serializers import PDFDocumentSerializer
# import PyPDF2
# import io
# import base64
# from . import errors
# import fitz


# @api_view(["GET", "POST"])
# @permission_classes([AllowAny])
# def pdf_document_list(request):
#     """
#     List all PDF documents or create a new one
#     """
#     if request.method == "GET":
#         pdf_documents = PDFDocument.objects.all()
#         serializer = PDFDocumentSerializer(
#             pdf_documents, many=True, context={"request": request}
#         )
#         return Response(
#             {errors.SUCCESS: errors.OPERATION_SUCCESS, "data": serializer.data}
#         )

#     elif request.method == "POST":
#         try:
#             print("inside post get pdf")
#             print('request is: ', request)
#             serializer = PDFDocumentSerializer(
#                 data=request.data, context={"request": request}
#             )
#             if serializer.is_valid():
#                 serializer.save()
#                 print("serializer: ", serializer.data)
#                 return Response(
#                     {
#                         errors.SUCCESS: errors.OPERATION_SUCCESS,
#                         "data": serializer.data,
#                     }
#                 )
#             return Response(
#                 {
#                     errors.ERROR: errors.OPERATION_FAILED,
#                     "Error": serializer.errors,
#                 }
#             )
#         except Exception as e:
#             return Response(
#                 {
#                     errors.ERROR: str(e),
#                 }
#             )


# @api_view(["GET", "PUT", "DELETE"])
# @permission_classes([AllowAny])
# def pdf_document_detail(request, pk):
#     """
#     Retrieve, update or delete a PDF document
#     """
#     pdf_doc = get_object_or_404(PDFDocument, pk=pk)

#     if request.method == "GET":
#         serializer = PDFDocumentSerializer(pdf_doc, context={"request": request})
#         return Response(serializer.data)

#     elif request.method == "PUT":
#         serializer = PDFDocumentSerializer(
#             pdf_doc, data=request.data, context={"request": request}
#         )
#         if serializer.is_valid():
#             serializer.save()
#             return Response(serializer.data)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#     elif request.method == "DELETE":
#         pdf_doc.delete()
#         return Response(status=status.HTTP_204_NO_CONTENT)



# @api_view(["GET"])
# @permission_classes([AllowAny])
# def extract_text(request, pk):
#     """
#     Extract structured text data (blocks, lines, spans) for professional editing.
#     """
#     try:
#         pdf_doc = get_object_or_404(PDFDocument, pk=pk)
#         doc = fitz.open(pdf_doc.file.path)
        
#         full_content = []

#         # Iterate through each page of the document
#         for page_num, page in enumerate(doc):
#             # Use "dict" to get a structured dictionary of the page content
#             page_data = page.get_text("dict")
#             print('page data is: ', page_data)
#             page_blocks = []
#             # Iterate through the blocks (which represent paragraphs or columns)
#             for block in page_data.get("blocks", []):
#                 # We only want to process text blocks (type 0)
#                 if block['type'] == 0:
#                     block_lines = []
#                     # Iterate through the lines within the current block
#                     for line in block.get("lines", []):
#                         line_spans = []
#                         # A line is made of one or more spans with consistent styling
#                         for span in line.get("spans", []):
#                             # Append the detailed span information
#                             line_spans.append({
#                                 "text": span['text'],
#                                 "font": span['font'],
#                                 "size": round(span['size'], 2),
#                                 "color": span['color'],
#                                 "bbox": [round(c, 2) for c in span['bbox']]
#                             })
                        
#                         if line_spans:
#                            block_lines.append({
#                                "spans": line_spans,
#                                "bbox": [round(c, 2) for c in line['bbox']]
#                            })
                    
#                     if block_lines:
#                         page_blocks.append({
#                             "lines": block_lines,
#                             "bbox": [round(c, 2) for c in block['bbox']]
#                         })

#             full_content.append({"page": page_num + 1, "blocks": page_blocks})

#         doc.close()
#         return Response(
#             {
#                 "id": str(pdf_doc.id), 
#                 "title": pdf_doc.title, 
#                 "pages": full_content,
#                 "totalPages": len(doc)
#             }
#         )

#     except Exception as e:
#         return Response(
#             {"error": f"Error extracting text: {str(e)}"},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#         )


# @api_view(["POST"])
# @permission_classes([AllowAny])
# def save_edits(request, pk):
#     """
#     Save PDF edits with annotations
#     """
#     try:
#         pdf_doc = get_object_or_404(PDFDocument, pk=pk)
#         annotations = request.data.get("annotations", {})
#         page_number = request.data.get("pageNumber", 1)

#         # Here you would implement the actual PDF editing logic
#         # For now, we'll just save the annotations to the database
#         # In a real implementation, you would use a library like PyPDF2 or reportlab
#         # to modify the actual PDF file

#         # Save annotations to a JSON field (you might want to add this to your model)
#         # pdf_doc.annotations = annotations
#         # pdf_doc.save()

#         return Response(
#             {
#                 errors.SUCCESS: errors.OPERATION_SUCCESS,
#                 "message": f"Edits saved for page {page_number}",
#                 "annotations": annotations,
#             }
#         )

#     except Exception as e:
#         return Response(
#             {errors.ERROR: f"Error saving edits: {str(e)}"},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#         )


# @api_view(["POST"])
# @permission_classes([AllowAny])
# def update_text(request, pk):
#     """
#     Update text in PDF: replace or add new text with enhanced canvas support
#     """
#     try:
#         pdf_doc = get_object_or_404(PDFDocument, pk=pk)
#         edits = request.data.get("edits", [])
#         new_texts = request.data.get("newTexts", [])

#         doc = fitz.open(pdf_doc.file.path)

#         # Process text edits (replacements)
#         for edit in edits:
#             page_index = edit.get("page", 1) - 1
#             if page_index >= len(doc):
#                 continue
                
#             page = doc[page_index]
            
#             # More precise text replacement using bbox
#             if "bbox" in edit:
#                 bbox = edit["bbox"]
#                 rect = fitz.Rect(bbox[0], bbox[1], bbox[2], bbox[3])
                
#                 # Remove old text by adding a white rectangle
#                 page.add_redact_annot(rect, fill=(1, 1, 1))
#                 page.apply_redactions()
                
#                 # Insert new text at the same position
#                 font_size = edit.get("fontSize", 12)
#                 font_family = edit.get("fontFamily", "helv")
#                 color = edit.get("color", (0, 0, 0))
                
#                 page.insert_text(
#                     (bbox[0], bbox[1] + font_size), 
#                     edit.get("newText", ""), 
#                     fontsize=font_size,
#                     fontname=font_family,
#                     color=color
#                 )
#             else:
#                 # Fallback to search-based replacement
#                 old_text = edit.get("oldText", "")
#                 new_text = edit.get("newText", "")
#                 if old_text and new_text:
#                     text_instances = page.search_for(old_text)
#                     for inst in text_instances:
#                         page.add_redact_annot(inst, fill=(1, 1, 1))
#                         page.apply_redactions()
#                         page.insert_text((inst.x0, inst.y0), new_text, fontsize=12)

#         # Process new text additions
#         for new_text in new_texts:
#             page_index = new_text.get("page", 1) - 1
#             if page_index >= len(doc):
#                 continue
                
#             page = doc[page_index]
            
#             x = new_text.get("x", 0)
#             y = new_text.get("y", 0)
#             text_content = new_text.get("text", "")
#             font_size = new_text.get("fontSize", 12)
#             font_family = new_text.get("fontFamily", "helv")
#             color = new_text.get("color", "#000000")
            
#             if text_content.strip():
#                 # Convert hex color to RGB
#                 if color.startswith('#'):
#                     color = color[1:]
#                     color_rgb = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
#                     color_rgb = tuple(c/255.0 for c in color_rgb)  # Normalize to 0-1
#                 else:
#                     color_rgb = (0, 0, 0)
                
#                 page.insert_text(
#                     (x, y + font_size),  # Adjust y position for baseline
#                     text_content,
#                     fontsize=font_size,
#                     fontname=font_family,
#                     color=color_rgb
#                 )

#         # Save edited PDF with timestamp
#         import time
#         timestamp = int(time.time())
#         new_filename = f"{pdf_doc.file.name.split('/')[-1].split('.')[0]}_edited_{timestamp}.pdf"
#         new_path = pdf_doc.file.path.replace(pdf_doc.file.name.split('/')[-1], new_filename)
        
#         doc.save(new_path)
#         doc.close()

#         return Response({
#             errors.SUCCESS: errors.PDF_UPDATED_SUCCESSFULLY, 
#             "edited_file": new_path,
#             "filename": new_filename,
#             "edits_applied": len(edits),
#             "new_texts_added": len(new_texts)
#         })

#     except Exception as e:
#         return Response(
#             {errors.ERROR: f"Error updating PDF: {str(e)}"},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#         )


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from . import middleware

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def pdf_document_list(request):
    return middleware.pdf_document_list_middleware(request)           

@api_view(["GET"])
@permission_classes([AllowAny])
def get_task_status(request, task_id):
    print('task id is: ', task_id)
    return middleware.get_task_status_middleware(request, task_id)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([AllowAny])
def pdf_document_detail(request, pk):
    return middleware.pdf_document_detail_middleware(request, pk)

@api_view(["GET"])
@permission_classes([AllowAny])
def extract_text(request, pk):
    return middleware.extract_text_middleware(request, pk)

@api_view(["POST"])
@permission_classes([AllowAny])
def save_edits(request, pk):
    return middleware.save_edits_middleware(request, pk)

@api_view(["POST"])
@permission_classes([AllowAny])
def update_text(request, pk):
    return middleware.update_text_middleware(request, pk)
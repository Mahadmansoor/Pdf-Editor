from celery import shared_task
from .models import PDFDocument
import fitz
import time
from rest_framework.response import Response
from . import errors
@shared_task
def analyze_pdf_task(doc_id):
    try:
        pdf_doc = PDFDocument.objects.get(id=doc_id)
        doc=fitz.open(pdf_doc.file.path)
        analysis_data =[]
        for page_num, page in enumerate(doc):
            page_data = page.get_text("dict")
            page_blocks = []
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

            analysis_data.append({"page": page_num + 1, "blocks": page_blocks})
        pdf_doc.analysis_result = {
            "id": str(pdf_doc.id), 
            "title": pdf_doc.title, 
            "pages": analysis_data
        }
        pdf_doc.analysis_status = 'Success'
        pdf_doc.save()
        return Response({
            errors.SUCCESS: f'Analysis complete for document {pdf_doc.id}',
            "id": str(pdf_doc.id), 
            "title": pdf_doc.title, 
            "pages": analysis_data
        })
    except PDFDocument.DoesNotExist:
        return Response({
            errors.ERROR: f'Error with document id {pdf_doc.id}'
        })
    except Exception as e:
        return Response({
            errors.ERROR: str(e)
        })
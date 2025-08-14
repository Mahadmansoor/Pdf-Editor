from django.db import models
import os
import uuid


def pdf_upload_path(instance, filename):
    """Generate unique file path for PDF uploads"""
    ext = filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join("pdfs", filename)


class PDFDocument(models.Model):
    """Model for storing PDF documents"""

    title = models.CharField(max_length=255)
    file = models.FileField(upload_to=pdf_upload_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def filename(self):
        return os.path.basename(self.file.name)

    class Meta:
        ordering = ["-uploaded_at"]

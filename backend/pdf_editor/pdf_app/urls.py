from django.urls import path
from . import views

urlpatterns = [
    path("pdf-documents/", views.pdf_document_list, name="pdf-document-list"),
    path(
        "pdf-documents/<int:pk>/", views.pdf_document_detail, name="pdf-document-detail"
    ),
    path(
        "pdf-documents/<int:pk>/extract-text/", views.extract_text, name="extract-text"
    ),
    path("pdf-documents/<int:pk>/save-edits/", views.save_edits, name="save-edits"),
    path("pdf-documents/<int:pk>/update-text/", views.update_text, name="update-text"),
]

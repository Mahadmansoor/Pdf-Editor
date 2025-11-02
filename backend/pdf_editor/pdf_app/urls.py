from django.urls import path
from . import views

urlpatterns = [
    path("pdf-documents/", views.pdf_document_list, name="pdf-document-list"),
    path("pdf-documents/<int:pk>/", views.pdf_document_list, name="pdf-document-detail"),
    path("pdf-documents/<int:pk>/extract-text/", views.extract_text, name="extract-text"),
    path("pdf-documents/<int:pk>/save-edits/", views.save_edits, name="save-edits"),
    path("pdf-documents/<int:pk>/update-text/", views.update_text, name="update-text"),
    path("pdf-documents/<str:task_id>/get_task_status/", views.get_task_status, name="get_task_status"),
]

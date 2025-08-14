from rest_framework import serializers
from .models import PDFDocument


class PDFDocumentSerializer(serializers.ModelSerializer):
    """Serializer for PDFDocument model"""

    file_url = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()

    class Meta:
        model = PDFDocument
        fields = [
            "id",
            "title",
            "file",
            "file_url",
            "filename",
            "uploaded_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uploaded_at", "updated_at"]

    def get_file_url(self, obj):
        if obj.file:
            return self.context["request"].build_absolute_uri(obj.file.url)
        return None

    def get_filename(self, obj):
        return obj.filename()

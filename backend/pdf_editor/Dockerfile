
# FROM python:3.10-slim

# WORKDIR /app


# COPY requirements.txt .


# RUN pip install -r requirements.txt


# COPY . .


# EXPOSE 8000


# CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pdf_editor.wsgi:application"]


# located at /PDF-EDITOR-MASTER/backend/Dockerfile

FROM python:3.10-slim

# Set environment variables for best practices
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Copy only the requirements first to leverage Docker's cache
COPY backend/pdf_editor/requirements.txt .
RUN pip install -r requirements.txt

# Copy the rest of your backend application code
COPY backend/pdf_editor/ .

EXPOSE 8000

# This command should now work without any issues
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pdf_editor.wsgi:application"]
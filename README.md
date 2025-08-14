# PDF Editor

A minimal PDF editing application built with Django (backend) and React (frontend).

## Features

- 📄 Upload PDF files via drag-and-drop
- 👀 View PDFs in the browser
- 📝 Extract text from PDF documents
- 💾 Download PDF files
- 🗑️ Delete PDF documents
- 📱 Responsive design

## Tech Stack

### Backend

- Django 4.2.7
- Django REST Framework
- PyPDF2 for PDF processing
- SQLite database

### Frontend

- React 18.2.0
- Axios for API calls
- React Dropzone for file uploads
- Modern CSS with responsive design

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Run Django migrations:**

   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Create a superuser (optional):**

   ```bash
   python manage.py createsuperuser
   ```

4. **Start the Django development server:**
   ```bash
   python manage.py runserver
   ```

The Django backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**

   ```bash
   npm install
   ```

3. **Start the React development server:**
   ```bash
   npm start
   ```

The React frontend will be available at `http://localhost:3000`

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Upload a PDF file by dragging and dropping it onto the upload area or clicking to select a file
3. Click on a PDF in the list to view it
4. Use the "Extract Text" button to extract text from the PDF
5. Download or delete PDFs using the action buttons

## API Endpoints

- `GET /api/pdfs/` - List all PDF documents
- `POST /api/pdfs/` - Upload a new PDF document
- `GET /api/pdfs/{id}/` - Get a specific PDF document
- `DELETE /api/pdfs/{id}/` - Delete a PDF document
- `GET /api/pdfs/{id}/extract_text/` - Extract text from a PDF

## Project Structure

```
pdf-editor/
├── pdf_editor/              # Django project settings
├── pdf_editor_app/          # Django app
│   ├── models.py           # PDF document model
│   ├── views.py            # API views
│   ├── serializers.py      # DRF serializers
│   └── urls.py             # URL routing
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.js          # Main app component
│   │   └── index.js        # Entry point
│   └── package.json        # Node.js dependencies
├── media/                  # Uploaded files (created automatically)
├── requirements.txt        # Python dependencies
└── manage.py              # Django management script
```

## Development

### Adding New Features

1. **Backend**: Add new models, views, and serializers in the `pdf_editor_app` directory
2. **Frontend**: Create new components in `frontend/src/components/`

### Database Changes

After modifying models, run:

```bash
python manage.py makemigrations
python manage.py migrate
```

## Deployment

### Backend Deployment

- Use a production WSGI server like Gunicorn
- Set up a production database (PostgreSQL recommended)
- Configure environment variables for security
- Set `DEBUG = False` in settings

### Frontend Deployment

- Build the React app: `npm run build`
- Serve the build folder with a web server like Nginx

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

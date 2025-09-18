
FROM python:3.10-slim

# Set the working directory inside the container. This is where all
# subsequent commands will be executed.
WORKDIR /app

# The following section is for efficient caching.
# We copy only the requirements file first to install dependencies.
# This layer will be cached unless requirements.txt changes.
COPY requirements.txt .

# Install Python dependencies. Using --no-cache-dir helps keep the image size small.
RUN pip install -r requirements.txt

# Copy the rest of the application source code into the container
# This is a separate layer, so it won't trigger a re-install of dependencies
# if only the code changes.
COPY . .

# Expose the port the application will run on. This is for documentation
# and doesn't publish the port, but tells Docker what port is being used.
EXPOSE 8000


CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pdf_editor.wsgi:application"]
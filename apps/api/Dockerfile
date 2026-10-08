FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pdfplumber / ghostscript / build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api /app/apps/api
COPY prompts /app/prompts 2>/dev/null || true

ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

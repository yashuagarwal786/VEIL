FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/alembic.ini .
COPY backend/alembic ./alembic
COPY backend/app ./app
COPY backend/start.sh ./start.sh
COPY scripts ./scripts
COPY data ./data
RUN sed -i 's/\r$//' ./start.sh && chmod +x ./start.sh
CMD ["sh", "./start.sh"]

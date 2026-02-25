FROM python:3.12-slim

RUN groupadd -r worker && useradd -r -g worker -s /sbin/nologin worker

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai-worker.py .
COPY prompts.yaml .

USER worker

ENTRYPOINT ["python", "ai-worker.py"]

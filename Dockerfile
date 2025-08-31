FROM python:3.11-slim

ARG DEBUG=False

WORKDIR /app

COPY app/ .

RUN pip install --upgrade pip
RUN pip install -r ./requirements.txt

EXPOSE 8080

# if DEBUG=True, start under debugpy (single worker);
# otherwise spin up 4 UvicornWorker workers as normal
CMD ["sh", "-c", "\
  if [ \"$DEBUG\" = \"True\" ]; then \
    exec python -Xfrozen_modules=off \
      -m debugpy --listen 0.0.0.0:5678 --wait-for-client \
      -m gunicorn \
      -k uvicorn.workers.UvicornWorker \
      main:app \
      -b 0.0.0.0:8080 \
      --workers 1 \
      --timeout 0; \
  else \
    exec gunicorn \
      -k uvicorn.workers.UvicornWorker \
      main:app \
      -b 0.0.0.0:8080 \
      --workers 4; \
  fi\
"]

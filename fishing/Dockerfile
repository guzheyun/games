FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir websockets==12.0
COPY server.py .
EXPOSE 9001
CMD ["python", "-u", "server.py"]

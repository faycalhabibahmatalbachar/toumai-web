FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    ZENABA_MAX_TEXT_CHARS=600 \
    ZENABA_MAX_PENDING_GENERATIONS=2 \
    ZENABA_HARD_GENERATION_SECONDS=90 \
    ZENABA_VOICE_REFERENCE=/app/assets/1591_1028_000108-0004_enhanced.wav \
    HF_HOME=/home/zenaba/.cache/huggingface

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Pocket TTS tourne sur CPU. L'index CPU évite plusieurs Go de wheels CUDA
# inutiles dans l'image Linux, conformément à la recommandation officielle.
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

RUN mkdir -p /app/assets \
    && python - <<'PY'
import hashlib
import pathlib
import urllib.request

url = (
    "https://huggingface.co/kyutai/tts-voices/resolve/"
    "519207ec31386971c13631b9a177d63a1a5d05af/"
    "cml-tts/fr/1591_1028_000108-0004_enhanced.wav"
)
expected = "d8a8b161c37c0ce8c50345828c586c2d63ebeeb16dafdbe0ccb6011ccfaf3192"
out = pathlib.Path("/app/assets/1591_1028_000108-0004_enhanced.wav")

with urllib.request.urlopen(url, timeout=60) as response:
    data = response.read()

digest = hashlib.sha256(data).hexdigest()
if digest != expected:
    raise SystemExit(f"Zenaba reference checksum mismatch: {digest}")
if len(data) < 4096 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
    raise SystemExit("Zenaba reference is not a valid WAV")
out.write_bytes(data)
print(f"ZENABA_REFERENCE_OK bytes={len(data)} sha256={digest}")
PY

COPY app.py .

RUN useradd --create-home --uid 10001 zenaba \
    && mkdir -p /home/zenaba/.cache/huggingface \
    && chown -R zenaba:zenaba /app /home/zenaba

USER zenaba

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=300s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).read()" || exit 1

CMD ["python", "app.py"]

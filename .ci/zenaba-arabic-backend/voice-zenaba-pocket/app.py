"""Service CPU Zenaba — Pocket TTS, français uniquement.

Identité figée :
- moteur : Pocket TTS / french_24l
- référence : 1591_1028_000108-0004_enhanced.wav
- aucune sélection de voix par requête
- aucun texte utilisateur journalisé
"""

from __future__ import annotations

import hashlib
import hmac
import io
import logging
import os
import threading
import time
from pathlib import Path
from queue import Full, Queue
from typing import Annotated, BinaryIO, cast

import uvicorn
from fastapi import FastAPI, Form, Header, HTTPException
from fastapi.responses import StreamingResponse
from pocket_tts.data.audio import stream_audio_chunks
from pocket_tts.models.model_state import ModelState
from pocket_tts.models.tts_model import TTSModel

LANGUAGE = "french_24l"
VOICE_NAME = "Zenaba"
REFERENCE_FILENAME = "1591_1028_000108-0004_enhanced.wav"
REFERENCE_SHA256 = "d8a8b161c37c0ce8c50345828c586c2d63ebeeb16dafdbe0ccb6011ccfaf3192"
REFERENCE_AUDIO = Path(
    os.getenv(
        "ZENABA_VOICE_REFERENCE",
        f"/app/assets/{REFERENCE_FILENAME}",
    )
)
SERVICE_TOKEN = os.getenv("ZENABA_SERVICE_TOKEN", "").strip()
HF_TOKEN = os.getenv("HF_TOKEN", "").strip()
ALLOW_UNAUTHENTICATED = os.getenv(
    "ZENABA_ALLOW_UNAUTHENTICATED",
    "false",
).strip().lower() in {"1", "true", "yes", "on"}
QUANTIZE = os.getenv("POCKET_TTS_QUANTIZE", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
MAX_TEXT_CHARS = int(os.getenv("ZENABA_MAX_TEXT_CHARS", "600"))
MAX_PENDING_GENERATIONS = max(
    1,
    int(os.getenv("ZENABA_MAX_PENDING_GENERATIONS", "2")),
)
HARD_GENERATION_SECONDS = max(
    30.0,
    float(os.getenv("ZENABA_HARD_GENERATION_SECONDS", "90")),
)
PORT = int(os.getenv("PORT", "8000"))

# Pocket ne doit jamais écrire la conversation dans les logs.
logging.getLogger("pocket_tts").setLevel(logging.WARNING)


def _verify_reference(path: Path) -> Path:
    try:
        data = path.read_bytes()
    except OSError as exc:
        raise RuntimeError(
            f"Référence Zenaba absente: {path}"
        ) from exc

    digest = hashlib.sha256(data).hexdigest()
    if digest != REFERENCE_SHA256:
        raise RuntimeError(
            "Référence Zenaba refusée: empreinte SHA-256 inattendue"
        )
    if len(data) < 4096 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise RuntimeError("Référence Zenaba refusée: WAV invalide")
    return path


def _security_ready() -> bool:
    return ALLOW_UNAUTHENTICATED or len(SERVICE_TOKEN) >= 32


def _authorize(authorization: str | None) -> None:
    # Fail-closed : une instance exposée sans secret n'accepte aucune synthèse.
    if not _security_ready():
        raise HTTPException(
            status_code=503,
            detail="ZENABA_SERVICE_TOKEN manquant ou trop court",
        )
    if ALLOW_UNAUTHENTICATED and not SERVICE_TOKEN:
        return
    expected = f"Bearer {SERVICE_TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


app = FastAPI(
    title="Toumai Zenaba Voice",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# La voix ET le modèle sont chargés avant la première requête. Pocket TTS
# exige un accès Hugging Face accepté pour les poids qui autorisent le voice
# cloning. Un service sans ce prérequis doit échouer au démarrage, pas à la
# première conversation utilisateur.
if not HF_TOKEN:
    raise RuntimeError(
        "HF_TOKEN requis : acceptez d'abord les conditions de kyutai/pocket-tts "
        "avec le compte Hugging Face du déploiement, puis fournissez un token "
        "de lecture en secret d'environnement."
    )

_reference_path = _verify_reference(REFERENCE_AUDIO)

try:
    _model: TTSModel = TTSModel.load_model(language=LANGUAGE, quantize=QUANTIZE)
    _voice_state: ModelState = _model.get_state_for_audio_prompt(_reference_path)
except Exception as exc:  # noqa: BLE001
    raise RuntimeError(
        "Impossible de charger Pocket TTS avec voice cloning. Vérifiez que le "
        "compte associé à HF_TOKEN a accepté les conditions du dépôt "
        "kyutai/pocket-tts et que le token possède l'accès en lecture."
    ) from exc

# Pocket TTS n'est pas thread-safe. Une seule génération par processus.
_generation_lock = threading.Lock()
# Admission bornée : un calcul + au plus quelques requêtes en attente. Sans
# cela, une montée de charge remplirait le threadpool/RAM tout en restant
# incapable d'augmenter le débit réel du modèle.
_admission = threading.BoundedSemaphore(MAX_PENDING_GENERATIONS)
_generation_state_lock = threading.Lock()
_generation_started_at: float | None = None


def _write_wav(
    queue: Queue[bytes | Exception | None],
    text: str,
    cancelled: threading.Event,
) -> None:
    def put_interruptible(item: bytes | Exception | None) -> bool:
        # Une file bornée évite qu'un client lent transforme la RAM en buffer
        # audio. Le timeout permet surtout de RELIRE cancelled pendant que la
        # file est pleine : aucune déconnexion ne peut garder le verrou Pocket.
        while not cancelled.is_set():
            try:
                queue.put(item, timeout=0.25)
                return True
            except Full:
                continue
        return False

    class QueueWriter(io.IOBase):
        def write(self, data: bytes):
            # Stop, navigation ou barge-in : interrompre la génération au
            # prochain bloc au lieu de calculer le reste de la phrase.
            if cancelled.is_set() or not put_interruptible(data):
                raise BrokenPipeError("client disconnected")
            return len(data)

        def flush(self):
            return None

        def close(self):
            return super().close()

    global _generation_started_at

    acquired = False
    try:
        # Ne pas rester bloqué indéfiniment derrière une génération précédente
        # si le client a déjà fait Stop/navigation. On relit cancelled toutes
        # les 250 ms avant même d'entrer dans le moteur.
        while not cancelled.is_set():
            acquired = _generation_lock.acquire(timeout=0.25)
            if acquired:
                break
        if not acquired or cancelled.is_set():
            return

        with _generation_state_lock:
            _generation_started_at = time.monotonic()
        try:
            chunks = _model.generate_audio_stream(
                model_state=_voice_state,
                text_to_generate=text,
            )
            stream_audio_chunks(
                cast(BinaryIO, QueueWriter()),
                chunks,
                _model.config.mimi.sample_rate,
            )
        finally:
            with _generation_state_lock:
                _generation_started_at = None
    except BrokenPipeError:
        pass
    except Exception as exc:  # noqa: BLE001
        # Ne jamais inclure le texte utilisateur dans l'exception.
        put_interruptible(RuntimeError(f"Pocket generation failed: {type(exc).__name__}"))
    finally:
        if acquired:
            _generation_lock.release()
        # En cas d'abandon, il n'y a plus de consommateur : inutile de bloquer
        # pour pousser une sentinelle. Le générateur client a déjà été fermé.
        if not cancelled.is_set():
            put_interruptible(None)


def _generate(text: str):
    queue: Queue[bytes | Exception | None] = Queue(maxsize=16)
    cancelled = threading.Event()
    worker = threading.Thread(
        target=_write_wav,
        args=(queue, text, cancelled),
        name="zenaba-pocket-generation",
        daemon=True,
    )
    worker.start()
    try:
        while True:
            data = queue.get()
            if data is None:
                break
            if isinstance(data, Exception):
                raise data
            if data:
                yield data
    finally:
        cancelled.set()


def _admitted_generate(text: str):
    try:
        yield from _generate(text)
    finally:
        _admission.release()


@app.get("/health")
def health():
    # Les probes restent sans authentification, mais une instance sans secret
    # n'est PAS déclarée prête.
    if not _security_ready():
        raise HTTPException(
            status_code=503,
            detail="Zenaba security is not configured",
        )

    with _generation_state_lock:
        started_at = _generation_started_at
    generation_age = (
        time.monotonic() - started_at
        if started_at is not None
        else 0.0
    )
    if generation_age > HARD_GENERATION_SECONDS:
        raise HTTPException(
            status_code=503,
            detail="Zenaba generation watchdog exceeded",
        )

    return {
        "status": "healthy",
        "engine": "pocket-tts-french-24l",
        "voice": VOICE_NAME,
        "language": "fr",
        "reference": REFERENCE_FILENAME,
        "reference_sha256": REFERENCE_SHA256,
        "quantized": QUANTIZE,
        "streaming": True,
        "auth_required": not ALLOW_UNAUTHENTICATED,
        "hf_authenticated": True,
        "max_pending_generations": MAX_PENDING_GENERATIONS,
        "generation_active": started_at is not None,
    }


@app.post("/tts")
def tts(
    text: Annotated[str, Form(...)],
    authorization: Annotated[str | None, Header()] = None,
):
    _authorize(authorization)
    clean = (text or "").strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if len(clean) > MAX_TEXT_CHARS:
        raise HTTPException(
            status_code=422,
            detail=f"Text too long (maximum {MAX_TEXT_CHARS} characters)",
        )

    if not _admission.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="Zenaba est déjà au maximum de sa capacité.",
            headers={"Retry-After": "1"},
        )

    return StreamingResponse(
        _admitted_generate(clean),
        media_type="audio/wav",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
            "Content-Disposition": 'inline; filename="zenaba.wav"',
            "X-Toumai-Voice": VOICE_NAME,
        },
    )


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        access_log=False,
        log_level="warning",
    )

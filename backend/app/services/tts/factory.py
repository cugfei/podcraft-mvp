"""Provider registry with primary → fallback degradation."""

import logging
from typing import Optional

from .base import BaseTTSProvider
from .models import TTSRequest, TTSResponse

logger = logging.getLogger(__name__)

FALLBACK_CONSUECUTIVE_FAILURES = 3
PRIMARY_RECOVERY_WINDOW_SECONDS = 300


class TTSProviderRegistry:
    """Manages registered providers and degrades from primary to fallback."""

    def __init__(self) -> None:
        self._providers: dict[str, BaseTTSProvider] = {}
        self._primary: str = ""
        self._primary_failures: int = 0
        self._fallback_active: bool = False

    def register(self, provider: BaseTTSProvider, *, is_primary: bool = False) -> None:
        self._providers[provider.name] = provider
        if is_primary:
            self._primary = provider.name

    def get(self, name: str) -> Optional[BaseTTSProvider]:
        return self._providers.get(name)

    async def synthesize(self, request: TTSRequest) -> TTSResponse:
        """Synthesise with primary, falling back to alternatives on failure."""
        if self._primary and not self._fallback_active:
            primary = self._providers.get(self._primary)
            if primary is not None:
                try:
                    result = await primary.synthesize(request)
                    self._on_success()
                    return result
                except Exception as exc:
                    logger.warning("Primary TTS (%s) failed: %s", self._primary, exc)
                    self._on_primary_failure()

        for name, provider in self._providers.items():
            if name == self._primary and not self._fallback_active:
                continue  # already tried above
            try:
                result = await provider.synthesize(request)
                logger.info("TTS served by fallback: %s", name)
                return result
            except Exception as exc:
                logger.warning("Fallback TTS (%s) failed: %s", name, exc)

        raise RuntimeError("All TTS providers unavailable")

    # ------------------------------------------------------------------
    # Internal state management
    # ------------------------------------------------------------------

    def _on_success(self) -> None:
        if self._fallback_active:
            self._fallback_active = False
            self._primary_failures = 0
            logger.info("Primary TTS recovered, deactivated fallback")
        else:
            self._primary_failures = 0

    def _on_primary_failure(self) -> None:
        self._primary_failures += 1
        if self._primary_failures >= FALLBACK_CONSUECUTIVE_FAILURES:
            self._fallback_active = True
            logger.warning("Primary TTS entered fallback after %d consecutive failures", self._primary_failures)


# Module-level singleton — shared by the whole application
tts_registry = TTSProviderRegistry()

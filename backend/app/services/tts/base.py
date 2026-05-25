"""Abstract base class for TTS providers."""

from abc import ABC, abstractmethod

from .models import TTSRequest, TTSResponse, TTSProviderConfig


class BaseTTSProvider(ABC):
    """Every TTS provider must implement ``synthesize`` and ``health_check``."""

    def __init__(self, config: TTSProviderConfig) -> None:
        self.config = config

    @abstractmethod
    async def synthesize(self, request: TTSRequest) -> TTSResponse:
        """Convert the given text into speech audio.

        Args:
            request: Normalised synthesis parameters.

        Returns:
            A ``TTSResponse`` containing raw audio bytes and metadata.

        Raises:
            Exception: Subclasses should raise on unrecoverable provider errors.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return ``True`` if the provider is currently reachable."""
        ...

    @property
    def name(self) -> str:
        return self.config.name

from typing import Generic, TypeVar, cast

from cachetools import TTLCache

T = TypeVar("T")


class TTLCacheService(Generic[T]):
    """Thin wrapper around cachetools.TTLCache for caching values by string key."""

    def __init__(self, maxsize: int, ttl_seconds: int) -> None:
        self._cache: TTLCache[str, T] = TTLCache(maxsize=maxsize, ttl=ttl_seconds)

    def get(self, key: str) -> T | None:
        return cast("T | None", self._cache.get(key))

    def set(self, key: str, value: T) -> None:
        self._cache[key] = value

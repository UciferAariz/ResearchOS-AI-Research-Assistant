from pydantic import BaseModel


class DeviceInfo(BaseModel):
    device: str
    device_name: str
    is_rocm_or_cuda: bool
    torch_version: str
    vram_total_mb: float | None = None
    vram_used_mb: float | None = None


class BenchmarkResult(BaseModel):
    device: str
    device_name: str
    batch_size: int
    num_texts: int
    elapsed_ms: float
    texts_per_sec: float

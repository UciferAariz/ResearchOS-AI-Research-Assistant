import torch

from app.models.embedding import DeviceInfo


def select_device() -> str:
    """ROCm builds of PyTorch expose the HIP backend through the CUDA API
    namespace, so torch.cuda.is_available() is the correct check on an AMD
    GPU machine as well as an NVIDIA one."""
    return "cuda" if torch.cuda.is_available() else "cpu"


def get_device_info() -> DeviceInfo:
    device = select_device()

    if device == "cuda":
        device_name = torch.cuda.get_device_name(0)
        free_bytes, total_bytes = torch.cuda.mem_get_info(0)
        vram_total_mb = total_bytes / (1024 * 1024)
        vram_used_mb = (total_bytes - free_bytes) / (1024 * 1024)
    else:
        device_name = "CPU"
        vram_total_mb = None
        vram_used_mb = None

    return DeviceInfo(
        device=device,
        device_name=device_name,
        is_rocm_or_cuda=device == "cuda",
        torch_version=torch.__version__,
        vram_total_mb=vram_total_mb,
        vram_used_mb=vram_used_mb,
    )

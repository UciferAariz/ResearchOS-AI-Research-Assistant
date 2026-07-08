"""Import the FastAPI app with heavy native deps stubbed, forcing full route
registration.

The AMD ROCm notebook is the real deployment target, but chromadb / torch(ROCm)
don't install on the Windows dev machine, so `uvicorn app.main:app` can't be run
locally. This script stubs those modules so route-registration errors (bad
response_model unions, invalid signatures, Python-version-gated imports) surface
here in CI/local dev instead of only at server startup on the notebook.

Run from the backend/ directory:  python scripts/check_app_import.py
"""

import os
import sys
import types

# Ensure the backend root (parent of scripts/) is importable regardless of CWD.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _install_stubs() -> None:
    for name in ["chromadb", "sentence_transformers", "torch"]:
        sys.modules[name] = types.ModuleType(name)

    chromadb = sys.modules["chromadb"]
    chromadb.PersistentClient = object  # type: ignore[attr-defined]
    api = types.ModuleType("chromadb.api")
    models = types.ModuleType("chromadb.api.models")
    collection_mod = types.ModuleType("chromadb.api.models.Collection")
    collection_mod.Collection = object  # type: ignore[attr-defined]
    sys.modules["chromadb.api"] = api
    sys.modules["chromadb.api.models"] = models
    sys.modules["chromadb.api.models.Collection"] = collection_mod

    sys.modules["sentence_transformers"].SentenceTransformer = object  # type: ignore[attr-defined]
    sys.modules["torch"].cuda = types.SimpleNamespace(is_available=lambda: False)  # type: ignore[attr-defined]


def main() -> int:
    _install_stubs()
    from app.main import create_app

    app = create_app()
    routes = sorted(r.path for r in app.routes if hasattr(r, "path"))
    print("App imported OK. Routes registered:")
    for route in routes:
        print(" ", route)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/bin/bash
# Setup script for ARENA backend

# Install dependencies
echo "Installing dependencies with uv (forcing PyPI index in case of global overrides)..."
PIP_INDEX_URL=https://pypi.org/simple PIP_EXTRA_INDEX_URL= uv sync

echo "Setup complete!"

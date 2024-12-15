### Backend Stage ###
FROM continuumio/miniconda3 AS backend
WORKDIR /app/backend

# Install Conda Environment
COPY backend/ .
RUN conda create -n pandaetl python=3.9 -y

# Activate Conda and Install Poetry Using pip
SHELL ["conda", "run", "-n", "pandaetl", "/bin/bash", "-c"]
RUN pip install poetry

# Add Poetry's path to ensure it's accessible
ENV PATH="/root/.local/bin:$PATH"

# Install dependencies using Poetry
COPY pyproject.toml poetry.lock* ./
RUN poetry install --no-root --no-interaction

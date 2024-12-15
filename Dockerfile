### Backend Stage ###
FROM continuumio/miniconda3 AS backend
WORKDIR /app/backend

# Install Conda Environment
COPY backend/ .
RUN conda create -n pandaetl python=3.9 -y
SHELL ["conda", "run", "-n", "pandaetl", "/bin/bash", "-c"]

# Install Poetry via pip (inside Conda environment)
RUN pip install poetry

# Install project dependencies with Poetry
RUN poetry install

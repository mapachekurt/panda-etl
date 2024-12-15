FROM continuumio/miniconda3 AS backend
WORKDIR /app/backend

# Step 1: Copy project files
COPY backend/pyproject.toml backend/poetry.lock ./

# Step 2: Set up Conda and Poetry
RUN conda create -n pandaetl python=3.11 -y
SHELL ["conda", "run", "-n", "pandaetl", "/bin/bash", "-c"]

RUN pip install poetry
ENV PATH="/root/.local/bin:$PATH"

# Step 3: Install dependencies with Poetry
RUN poetry install --no-root --no-interaction

# Copy the backend code
COPY backend/ /app/backend/

# Run the application
CMD ["conda", "run", "-n", "pandaetl", "poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

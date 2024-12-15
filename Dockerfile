# Multi-Stage Build for Backend and Frontend

### Backend Stage ###
FROM continuumio/miniconda3 AS backend
WORKDIR /app/backend

# Install Conda Environment
COPY backend/ .
RUN conda create -n pandaetl python=3.9 -y
RUN echo "conda activate pandaetl" >> ~/.bashrc
RUN conda install poetry -y
RUN poetry install

### Frontend Stage ###
FROM node:16 AS frontend
WORKDIR /app/frontend

# Install Frontend Dependencies
COPY frontend/ .
RUN yarn install
RUN yarn build

### Final Stage ###
FROM python:3.9
WORKDIR /app

# Copy Backend
COPY --from=backend /app/backend /app/backend

# Copy Frontend Build
COPY --from=frontend /app/frontend/out /app/frontend/out

# Start Services (Backend and Serve Frontend)
CMD ["sh", "-c", "cd backend && poetry run make run & cd ../frontend && yarn start"]

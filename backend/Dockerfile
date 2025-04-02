# Use an official Python runtime as a parent image
FROM python:3.11-slim


# Set the user to snake
RUN useradd -m snake
USER snake

# Set the working directory to /app
WORKDIR /app

# Copy the requirements file
COPY --chown=snake:snake requirements.txt global_variables.py main.py ./

# Install the dependencies
RUN pip install -r requirements.txt

# Expose the port
EXPOSE 8000

# Set the maintainer
LABEL maintainer="Jenslee Dsouza <dsouzajenslee@gmail.com>"

# Run the command to start the application
# CMD ["python", "-u", "main.py"]
# gunicorn -w 1 -k gevent -b 0.0.0.0:8000 main:app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

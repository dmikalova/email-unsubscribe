# Build stage - type check with Deno
FROM denoland/deno:2.6.7 AS builder

WORKDIR /app

# Copy dependency files and source for caching
COPY deno.jsonc .
COPY src/ ./src/

# Cache dependencies
RUN deno cache --config deno.jsonc src/main.ts

# Copy remaining files
COPY . .

# Type check
RUN deno check src/**/*.ts

# Production stage - lightweight Deno image
FROM denoland/deno:2.6.7

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN groupadd -r app && useradd -r -g app app

# Copy from builder (includes cached dependencies)
COPY --from=builder /app .
COPY --from=builder /deno-dir /deno-dir

# Create data directories and set permissions on deno cache
RUN mkdir -p /app/data/screenshots /app/data/traces && \
  chown -R app:app /app /deno-dir

# Switch to non-root user
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "--allow-sys", "src/main.ts"]

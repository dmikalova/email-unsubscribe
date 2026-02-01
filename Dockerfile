# Build stage - install dependencies
FROM denoland/deno:2.0.0 as builder

WORKDIR /app

# Copy dependency files
COPY deno.json .

# Cache dependencies
RUN deno cache --reload deno.json

# Copy source code
COPY . .

# Type check
RUN deno check src/**/*.ts

# Production stage
FROM denoland/deno:2.0.0

# Install Chromium for Playwright and curl for healthcheck
RUN apt-get update && apt-get install -y \
    chromium \
    curl \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# Create non-root user
RUN groupadd -r app && useradd -r -g app app

# Copy from builder
COPY --from=builder /app .

# Create data directories
RUN mkdir -p /app/data/screenshots /app/data/traces && \
    chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "src/main.ts"]

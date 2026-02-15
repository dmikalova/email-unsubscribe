/**
 * Application deployment configuration for email-unsubscribe.
 *
 * This file defines runtime requirements consumed by the CI/CD pipeline.
 * Run directly to output JSON: deno run mklv.config.mts | jq .name
 */

import { defineConfig } from '@dmikalova/mklv-config';

export default defineConfig({
  name: 'email-unsubscribe',
  entrypoint: 'src/main.ts',
  runtime: {
    port: 8000,
    healthCheckPath: '/health',
  },
}, import.meta);

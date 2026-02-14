/**
 * Application deployment configuration for email-unsubscribe.
 *
 * This file defines runtime requirements consumed by the CI/CD pipeline.
 * The MklvConfig type is published to GitHub Packages from github-meta.
 */

import type { MklvConfig } from '@dmikalova/mklv-config';

export default {
  name: 'email-unsubscribe',
  entrypoint: 'src/main.ts',
  runtime: {
    port: 8000,
    healthCheckPath: '/health',
  },
} satisfies MklvConfig;

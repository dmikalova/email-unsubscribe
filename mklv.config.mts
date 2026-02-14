/**
 * Application deployment configuration for email-unsubscribe.
 *
 * This file defines runtime requirements consumed by the CI/CD pipeline.
 * The MklvConfig type is published from github-meta and ensures type safety.
 */

// TODO: Import type once published to JSR
// import type { MklvConfig } from "@dmikalova/mklv-config";

interface MklvConfig {
  name: string;
  entrypoint: string;
  runtime?: {
    port?: number;
    healthCheckPath?: string;
  };
}

export default {
  name: 'email-unsubscribe',
  entrypoint: 'src/main.ts',
  runtime: {
    port: 8000,
    healthCheckPath: '/health',
  },
} satisfies MklvConfig;

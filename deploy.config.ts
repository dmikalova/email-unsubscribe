/**
 * Deployment Contract for email-unsubscribe
 *
 * This file defines the runtime requirements for deploying this application.
 * It serves as a platform-agnostic contract that infrastructure tooling can
 * consume to provision the appropriate resources.
 *
 * The type definition comes from the infra repo - if this file doesn't compile,
 * the deployment contract is invalid.
 */

// TODO: Import type from infra repo once published
// import type { AppContract } from "@dmikalova/infra/contract";

/**
 * Application deployment contract.
 * Defines everything needed to run this application in any container platform.
 */
export const config = {
  /**
   * Application metadata
   */
  name: 'email-unsubscribe',
  description: 'Gmail inbox cleanup automation with unsubscribe link detection and execution',

  /**
   * Runtime environment configuration
   * Specifies the language runtime and entry point for the application.
   */
  runtime: {
    /** Language runtime - Deno with native TypeScript support */
    name: 'deno' as const,
    /** Minimum version required */
    version: '>=2.0.0',
    /** Application entry point */
    entrypoint: 'src/main.ts',
  },

  /**
   * Network configuration
   * The application listens on a configurable port via environment variable.
   */
  port: {
    /** Environment variable that provides the port number */
    envVar: 'PORT',
    /** Default port if environment variable is not set */
    default: 8000,
  },

  /**
   * Health check configuration
   * Used by the container platform to determine if the application is healthy.
   */
  healthCheck: {
    /** Path that returns health status */
    path: '/health',
    /** Expected HTTP status code when healthy */
    expectedStatus: 200,
    /** How often to check health (seconds) */
    intervalSeconds: 30,
    /** How long to wait for response (seconds) */
    timeoutSeconds: 5,
  },

  /**
   * Resource requirements
   * Minimum and recommended resource allocations for the application.
   */
  resources: {
    memory: {
      /** Minimum memory required for the application to run */
      minimum: '256Mi',
      /** Recommended memory for optimal performance */
      recommended: '512Mi',
    },
    cpu: {
      /** Minimum CPU allocation */
      minimum: '0.5',
      /** Recommended CPU for optimal performance */
      recommended: '1.0',
    },
  },

  /**
   * Startup timing configuration
   * Helps configure startup probes and timeouts.
   */
  startup: {
    /** Expected cold start time - Deno starts very fast */
    expectedColdStartSeconds: 2,
    /** Maximum time to wait for application to be ready */
    timeoutSeconds: 10,
  },

  /**
   * Required secrets
   * These must be provided via Secret Manager or equivalent.
   * Never commit actual values - these are injected at runtime.
   */
  secrets: [
    {
      name: 'DATABASE_URL',
      description: 'PostgreSQL connection string (Supabase pooler format)',
      required: true,
    },
    {
      name: 'GOOGLE_CLIENT_ID',
      description: 'Google OAuth 2.0 client ID for Gmail API access',
      required: true,
    },
    {
      name: 'GOOGLE_CLIENT_SECRET',
      description: 'Google OAuth 2.0 client secret',
      required: true,
    },
    {
      name: 'ENCRYPTION_KEY',
      description: '32-byte hex key for encrypting OAuth tokens at rest',
      required: true,
    },
  ],

  /**
   * Optional configuration
   * Environment variables with sensible defaults.
   */
  config: [
    {
      name: 'LOG_LEVEL',
      description: 'Logging verbosity (debug, info, warn, error)',
      default: 'info',
    },
    {
      name: 'DATABASE_SCHEMA',
      description: 'PostgreSQL schema name for table isolation',
      default: 'email_unsubscribe',
    },
    {
      name: 'DATABASE_POOL_MAX',
      description: 'Maximum database connections in pool',
      default: '10',
    },
  ],
} as const;

/** Export type for use in infra tooling */
export type AppContractConfig = typeof config;

// Shared types for Hono app

import type { SessionData } from './api/middleware.ts';

// Define the app environment types
export type AppEnv = {
  Variables: {
    user: SessionData | undefined;
  };
};

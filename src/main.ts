// Email Unsubscribe - Main Entry Point
// This file bootstraps the application

import { serve } from '@hono/hono';
import { app } from './app.ts';

const port = parseInt(Deno.env.get('PORT') || '3000');

console.log(`Starting Email Unsubscribe service on port ${port}`);

Deno.serve({ port }, app.fetch);

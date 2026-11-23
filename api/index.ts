import type { Request, Response } from 'express';
import { createPetClickApp } from '../src/server/app';

const app = createPetClickApp();

export default function handler(req: Request, res: Response) {
  // Normalize rewritten URL if Vercel strips the /api prefix on rewrite to /api
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }
  return app(req, res);
}

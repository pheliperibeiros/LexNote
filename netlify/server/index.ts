import { createApiApp } from '../../src/server/app.ts';

// Static frontend files are served from dist by Netlify.
export const config = { path: '/api/*' };

export default createApiApp();

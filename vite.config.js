import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// Helper to convert Node req/res to Netlify event/response format
async function handleApiRequest(handlerModule, req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const event = {
        httpMethod: req.method,
        headers: req.headers,
        queryStringParameters: req.query || {},
        body
      };

      const result = await handlerModule.handler(event);
      res.statusCode = result.statusCode || 200;
      if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) {
          res.setHeader(k, v);
        }
      }
      res.end(result.body || '');
    } catch (err) {
      console.error('API Error in dev middleware:', err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function cosmicPlugin() {
  return {
    name: 'cosmic-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0];

        // Clean URL routing in dev
        if (url === '/login' || url === '/login/') {
          req.url = '/src/login.html';
          return next();
        }
        if (url === '/play' || url === '/play/') {
          req.url = '/src/play.html';
          return next();
        }
        if (url === '/leaderboard' || url === '/leaderboard/') {
          req.url = '/src/leaderboard.html';
          return next();
        }
        if (url === '/ops-x7q' || url === '/ops-x7q/') {
          req.url = '/src/ops-x7q/index.html';
          return next();
        }
        if (url === '/ops-x7q/manage' || url === '/ops-x7q/manage/') {
          req.url = '/src/ops-x7q/manage.html';
          return next();
        }

        // API routing
        if (url === '/api/team-login') {
          const mod = await import('./netlify/functions/team-login.mjs');
          return handleApiRequest(mod, req, res);
        }
        if (url === '/api/team-state') {
          const mod = await import('./netlify/functions/team-state.mjs');
          return handleApiRequest(mod, req, res);
        }
        if (url === '/api/submit-code') {
          const mod = await import('./netlify/functions/submit-code.mjs');
          return handleApiRequest(mod, req, res);
        }
        if (url === '/api/leaderboard') {
          const mod = await import('./netlify/functions/leaderboard.mjs');
          return handleApiRequest(mod, req, res);
        }
        if (url === '/api/public-config') {
          const mod = await import('./netlify/functions/public-config.mjs');
          return handleApiRequest(mod, req, res);
        }
        if (url === '/api/admin-action') {
          const mod = await import('./netlify/functions/admin-action.mjs');
          return handleApiRequest(mod, req, res);
        }

        next();
      });
    },
    closeBundle() {
      // Copy nested html outputs to root dist for direct URL accessibility
      const dist = resolve(__dirname, 'dist');
      const distSrc = resolve(dist, 'src');
      if (fs.existsSync(distSrc)) {
        const files = ['login.html', 'play.html', 'leaderboard.html'];
        files.forEach(f => {
          const srcFile = resolve(distSrc, f);
          const destFile = resolve(dist, f);
          if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, destFile);
          }
        });

        // Copy ops-x7q directory
        const opsSrc = resolve(distSrc, 'ops-x7q');
        const opsDest = resolve(dist, 'ops-x7q');
        if (fs.existsSync(opsSrc)) {
          if (!fs.existsSync(opsDest)) fs.mkdirSync(opsDest, { recursive: true });
          fs.copyFileSync(resolve(opsSrc, 'index.html'), resolve(opsDest, 'index.html'));
          fs.copyFileSync(resolve(opsSrc, 'manage.html'), resolve(opsDest, 'manage.html'));
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [cosmicPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'src/login.html'),
        play: resolve(__dirname, 'src/play.html'),
        leaderboard: resolve(__dirname, 'src/leaderboard.html'),
        admin: resolve(__dirname, 'src/ops-x7q/index.html'),
        adminManage: resolve(__dirname, 'src/ops-x7q/manage.html')
      }
    }
  }
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 중에는 Vercel 서버 함수(/api/*)를 vite 서버가 대신 실행해 준다. (배포 후에는 Vercel 이 실행)
function apiDev(env) {
  return {
    name: 'api-dev',
    configureServer(server) {
      Object.assign(process.env, env); // .env.local 의 비밀 키를 서버 코드에서 쓸 수 있게 한다 (브라우저에는 VITE_ 로 시작하는 값만 들어간다)
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();
        const name = url.pathname.slice(5);
        if (!/^[a-z]+$/.test(name)) return next();
        req.query = Object.fromEntries(url.searchParams);
        if (req.method === 'POST') {
          const chunks = []; for await (const c of req) chunks.push(c);
          try { req.body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { req.body = {}; }
        }
        res.status = (c) => { res.statusCode = c; return res; };
        res.json = (o) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
        try { await (await server.ssrLoadModule(`/api/${name}.js`)).default(req, res); }
        catch (e) { console.error('[api]', name, e.message); if (!res.headersSent) res.status(500).json({ error: '서버 오류' }); else res.end(); }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), apiDev(loadEnv(mode, process.cwd(), ''))],
}));

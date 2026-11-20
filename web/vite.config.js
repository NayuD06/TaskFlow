import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Thẻ SEO cần đường dẫn tuyệt đối (ảnh xem trước khi chia sẻ link lên Facebook, Zalo...).
 * Lấy từ VITE_SITE_URL, hoặc tự lấy tên miền chính mà Vercel cung cấp lúc build.
 */
function seo(env) {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const site = (env.VITE_SITE_URL || (vercel ? `https://${vercel}` : '')).replace(/\/$/, '');
  const api = (env.VITE_API_URL || '').replace(/\/$/, '');
  return {
    name: 'taskflow-seo',
    transformIndexHtml(html) {
      const tags = [];
      if (site) {
        tags.push(
          { tag: 'link', attrs: { rel: 'canonical', href: `${site}/` }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: `${site}/` }, injectTo: 'head' },
        );
      }
      // Bắt tay sớm với máy chủ API để lần gọi đầu nhanh hơn
      if (api.startsWith('https://')) tags.push({ tag: 'link', attrs: { rel: 'preconnect', href: api, crossorigin: '' }, injectTo: 'head' });
      return { html: html.replaceAll('%SITE_URL%', site), tags };
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n${site ? `Sitemap: ${site}/sitemap.xml\n` : ''}` });
      if (!site) return;
      const urls = ['/', '/login', '/register'];
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${site}${u}</loc></url>`)
          .join('\n')}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), seo(env)],
    server: {
      port: 5173,
    },
    build: {
      rolldownOptions: {
        output: {
          // Tách thư viện ra file riêng: đổi code app không làm trình duyệt tải lại React, motion...
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/, priority: 20 },
              { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/, priority: 15 },
              { name: 'motion', test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/, priority: 15 },
              { name: 'dnd', test: /node_modules[\\/]@dnd-kit[\\/]/, priority: 15 },
              { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 10 },
            ],
          },
        },
      },
    },
  };
});

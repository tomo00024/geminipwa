import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// adapterをこちらで設定
		adapter: adapter({
			// SPA（シングルページアプリケーション）として動作させるための設定
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // index.htmlをフォールバックに指定
			precompress: false,
			strict: true
		})
	}
};

export default config;
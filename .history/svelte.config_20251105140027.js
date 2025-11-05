import adapter from '@sveltejs/kit/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
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

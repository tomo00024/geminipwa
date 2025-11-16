// svelte.config.js
import adapter from '@sveltejs/adapter-vercel'; // ← autoから変更
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto から adapter-vercel に変更します。
		adapter: adapter({
			// VercelのランタイムをNode.jsに指定します。
			runtime: 'nodejs22.x' // または 'nodejs20.x'
		})
	}
};

export default config;

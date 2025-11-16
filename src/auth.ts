// src/auth.ts

import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET, AUTH_URL } from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth(async (event) => {
	// Vercelのログで実行中の値を確認するためのログ出力
	console.log('--- Auth.js Initialization ---');
	console.log('Request URL Origin:', event.url.origin);
	console.log('AUTH_URL from env:', AUTH_URL); // $env/static/private から読み込んだ値
	console.log('--- End Auth.js Initialization ---');

	const authOptions = {
		providers: [
			Google({
				clientId: AUTH_GOOGLE_ID,
				clientSecret: AUTH_GOOGLE_SECRET
			})
		],
		secret: AUTH_SECRET,
		trustHost: true // ★★★ デバッグのために一時的に元に戻します ★★★
	};

	return authOptions;
});

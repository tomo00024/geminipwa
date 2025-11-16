// src/auth.ts

import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET } from '$env/static/private';

// 本番環境かどうかを判定
const isProduction = process.env.NODE_ENV === 'production';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: AUTH_GOOGLE_ID,
			clientSecret: AUTH_GOOGLE_SECRET
		})
	],
	secret: AUTH_SECRET,
	// trustHost: true は削除します。AUTH_URLを信頼の源泉とします。

	// Cookieの設定を明示的に行い、セッションが維持されるようにします。
	cookies: {
		sessionToken: {
			name: isProduction ? `__Secure-authjs.session-token` : `authjs.session-token`,
			options: {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				// Vercelの本番ドメインと、そのサブドメイン（例: www）でCookieを共有するためにドメインを指定
				domain: isProduction ? '.gemini-novel-tool.vercel.app' : 'localhost',
				secure: isProduction
			}
		}
	}
});

// src/auth.ts
import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET } from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: AUTH_GOOGLE_ID,
			clientSecret: AUTH_GOOGLE_SECRET
		})
	],
	secret: AUTH_SECRET,
	trustHost: true,
	callbacks: {
		async session({ session, token }) {
			console.log('[auth.ts] Session callback invoked. Token exists:', !!token);
			if (session.user) {
				console.log('[auth.ts] Returning session for user:', session.user.email);
			}
			return session;
		}
	},
	events: {
		// 'account' が null の可能性があるため、オプショナルチェイニング(?.)を使用します
		async signIn({ user, account }) {
			console.log(
				`[auth.ts] signIn event: User ${user.email} signed in with ${account?.provider}.`
			);
		},
		// signOutの引数は session または token のどちらかを持つオブジェクトのため、
		// 分割代入せず、中身をチェックしてログを出します
		async signOut(message) {
			if ('token' in message && message.token) {
				console.log('[auth.ts] signOut event for JWT:', message.token);
			}
			if ('session' in message && message.session) {
				console.log('[auth.ts] signOut event for session:', message.session);
			}
		}
	}
});

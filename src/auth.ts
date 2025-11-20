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
		// JWTが作成・更新されるたびに実行される
		async jwt({ token, user, account }) {
			// "account" を引数に追加
			// ログインフローの初回時のみ account オブジェクトが存在する
			if (account) {
				// Auth.jsが生成する一時的なIDではなく、
				// プロバイダー(Google)から提供される永続的なIDをtokenに格納する
				token.id = account.providerAccountId;
				token.accessToken = account.access_token;
				token.scope = account.scope;
			}
			return token;
		},
		// セッションが参照されるたびに実行される
		async session({ session, token }) {
			// tokenからIDを取り出して、セッションのuserオブジェクトに追加する
			if (token.id && session.user) {
				session.user.id = token.id as string;
				session.user.accessToken = token.accessToken as string;
				session.user.scope = token.scope as string;
			}
			return session;
		}
	}
});

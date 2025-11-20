//src/auth.ts

import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET } from '$env/static/private';

async function refreshAccessToken(token: any) {
	try {
		const url =
			'https://oauth2.googleapis.com/token?' +
			new URLSearchParams({
				client_id: AUTH_GOOGLE_ID,
				client_secret: AUTH_GOOGLE_SECRET,
				grant_type: 'refresh_token',
				refresh_token: token.refreshToken
			});

		const response = await fetch(url, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			method: 'POST'
		});

		const refreshedTokens = await response.json();

		if (!response.ok) {
			throw refreshedTokens;
		}

		return {
			...token,
			accessToken: refreshedTokens.access_token,
			accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
			refreshToken: refreshedTokens.refresh_token ?? token.refreshToken // Fall back to old refresh token
		};
	} catch (error) {
		console.log(error);

		return {
			...token,
			error: 'RefreshAccessTokenError'
		};
	}
}

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: AUTH_GOOGLE_ID,
			clientSecret: AUTH_GOOGLE_SECRET,
			authorization: {
				params: {
					prompt: 'consent',
					access_type: 'offline',
					response_type: 'code'
				}
			}
		})
	],
	secret: AUTH_SECRET,
	trustHost: true,

	callbacks: {
		async jwt({ token, user, account }) {
			// Initial sign in
			if (account && user) {
				return {
					accessToken: account.access_token,
					accessTokenExpires: Date.now() + (account.expires_in as number) * 1000,
					refreshToken: account.refresh_token,
					user,
					id: account.providerAccountId,
					scope: account.scope
				};
			}

			// Return previous token if the access token has not expired yet
			if (Date.now() < (token.accessTokenExpires as number)) {
				return token;
			}

			// Access token has expired, try to update it
			return refreshAccessToken(token);
		},
		async session({ session, token }) {
			if (token) {
				session.user.id = token.id as string;
				session.user.accessToken = token.accessToken as string;
				session.user.scope = token.scope as string;
				// @ts-ignore
				session.error = token.error;
			}
			return session;
		}
	}
});

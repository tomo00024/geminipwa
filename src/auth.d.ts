// src/auth.d.ts
import type { DefaultSession } from '@auth/sveltekit';

declare module '@auth/sveltekit' {
	interface Session {
		user?: DefaultSession['user'] & {
			id: string;
			accessToken?: string;
			scope?: string;
		};
	}

	interface User {
		accessToken?: string;
		scope?: string;
	}
}

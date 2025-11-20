// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { DefaultSession } from '@auth/sveltekit';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

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

declare module '$env/static/private' {
	export const AUTH_GOOGLE_ID: string;
	export const AUTH_GOOGLE_SECRET: string;
	export const AUTH_SECRET: string;
	export const BLOB_READ_WRITE_TOKEN: string;
}

export {};

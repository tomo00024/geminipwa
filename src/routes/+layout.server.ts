// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	console.log('--- [+layout.server.ts] Load function STARTED. ---'); // まずこれが表示されるか？
	const session = await event.locals.auth();
	// sessionオブジェクトがnullか、ユーザー情報を持つかをログに出力
	console.log(
		'[+layout.server.ts] Session object received:',
		session ? `User: ${session.user?.email}` : 'null'
	);
	return {
		session
	};
};

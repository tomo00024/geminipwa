//src/routes/api/files/[id]/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '@vercel/postgres';
import { del } from '@vercel/blob';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	// 1. 認証チェック：ログインしているか確認
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const currentUserId = session.user.id;
	const fileId = params.id;

	try {
		// 2. ファイル情報の取得：DBからuploaderIdとblobのpathnameを取得
		const { rows } = await sql`
			SELECT
				uploaderid AS "uploaderId",
				pathname
			FROM
				files
			WHERE id = ${fileId};
		`;

		const file = rows[0];
		if (!file) {
			throw error(404, 'Not Found: 指定されたファイルが見つかりません。');
		}

		// 3. 権限チェック：ログインユーザーがアップロード者本人か確認
		if (file.uploaderId !== currentUserId) {
			throw error(403, 'Forbidden: このファイルを削除する権限がありません。');
		}

		// 4. Blobストレージからファイルを削除
		if (file.pathname) {
			await del(file.pathname);
		}

		// 5. データベースからレコードを削除
		await sql`
			DELETE FROM files WHERE id = ${fileId};
		`;

		return json({ message: 'ファイルが正常に削除されました。' }, { status: 200 });
	} catch (e: any) {
		console.error('File Deletion Error:', e);
		// SvelteKitのerrorオブジェクトが投げられた場合はそのまま再スロー
		if (e.status) {
			throw e;
		}
		throw error(500, 'Internal Server Error: ファイルの削除中にエラーが発生しました。');
	}
};

import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { checkRateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, getClientAddress }) => {
	// `locals` を受け取る
	const fileId = params.id;
	const session = await locals.auth(); // ユーザーセッションを取得
	const currentUserId = session?.user?.id;

	// レート制限の適用
	// IPアドレスベースで制限: 1分間に10回まで
	const clientIp = getClientAddress();
	await checkRateLimit(`ip:${clientIp}`, 10, 60);

	try {
		// ファイル情報を取得する際に、権限チェックに必要なカラムも取得
		const { rows } = await db.sql`
            SELECT
                blob_url AS "blobUrl",
                visibility,
                uploader_id AS "uploaderId"
            FROM
                files
            WHERE
                id = ${fileId};
        `;

		const file = rows[0];
		if (!file) {
			throw error(404, 'Not Found: 指定されたファイルが見つかりません。');
		}

		// ファイルが 'private' の場合
		if (file.visibility === 'private') {
			// ログインしていない、またはファイルの所有者でない場合はアクセスを拒否
			if (!currentUserId || file.uploaderId !== currentUserId) {
				throw error(403, 'Forbidden: このファイルにアクセスする権限がありません。');
			}
		}
		// 'unlisted' の場合のロジックも必要であればここに追加

		// 先にファイル取得を試みる（ストレージエラー時にカウントアップしないため）
		const blobResponse = await fetch(file.blobUrl);
		if (!blobResponse.ok) {
			throw error(500, 'Failed to fetch file from storage.');
		}

		// 全てのチェックをパスした後で、ダウンロード数を更新
		await db.sql`
            UPDATE files
            SET download_count = download_count + 1
            WHERE id = ${fileId};
        `;

		const sessionData = await blobResponse.json();
		return json(sessionData, { status: 200 });
	} catch (e: any) {
		console.error('Import API Error:', e);
		if (e.status) {
			throw e;
		}
		throw error(500, 'Internal Server Error: ファイルの処理中にエラーが発生しました。');
	}
};

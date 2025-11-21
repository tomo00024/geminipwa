// src/routes/public/[id]/+page.server.ts

import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { POSTGRES_URL } from '$env/static/private';
import { checkRateLimit } from '$lib/server/rateLimit';

export const load: PageServerLoad = async ({ locals, getClientAddress }) => {
	const session = await locals.auth();
	const clientIp = getClientAddress();
	await checkRateLimit(`public_page:${clientIp}`, 60, 60);

	if (!POSTGRES_URL) {
		return {
			streamed: {
				files: Promise.resolve([])
			},
			error: 'データベース接続文字列が設定されていません。',
			session
		};
	}

	// データベースクエリをPromiseとして定義（awaitしない）
	const filesPromise = (async () => {
		try {
			// ▼ 修正: SELECT に model を追加
			const result = await db.sql`
            SELECT
                id,
                title,
                description,
                tags,
                image_url      AS "imageUrl",
                star_count     AS "starCount",
                download_count AS "downloadCount",
                uploaded_at    AS "uploadedAt",
                author_name    AS "authorName",
                uploader_id    AS "uploaderId",
                model          -- 追加
            FROM
                files
            WHERE
                visibility = 'public'
            ORDER BY
                uploaded_at DESC;
        `;
			return result.rows;
		} catch (error) {
			console.error('データベースからのデータ取得に失敗しました:', error);
			// エラー時は空配列を返すか、エラーをスローしてクライアントで処理する
			// ここでは空配列を返してクライアント側で空表示にする
			return [];
		}
	})();

	return {
		streamed: {
			files: filesPromise
		},
		session
	};
};

// src/routes/import/+page.server.ts

import { createPool } from '@vercel/postgres';
import type { PageServerLoad } from './$types';
import { POSTGRES_URL } from '$env/static/private';

export const load: PageServerLoad = async () => {
	// 環境変数がなければエラーを返す
	if (!POSTGRES_URL) {
		return {
			files: [],
			error: 'データベース接続文字列が設定されていません。'
		};
	}

	// 接続情報を使ってデータベースプールを作成
	const pool = createPool({
		connectionString: POSTGRES_URL
	});

	try {
		// 公開されているファイル情報を取得する
		const result = await pool.sql`
            SELECT
                id,
                title,
                description,
                tags,
                imageurl      AS "imageUrl",
                starcount     AS "starCount",
                downloadcount AS "downloadCount",
                uploadedat    AS "uploadedAt",
                authorname    AS "authorName"
            FROM
                files
            WHERE
                visibility = 'public'
            ORDER BY
                uploadedat DESC;
        `;

		return {
			files: result.rows
		};
	} catch (error) {
		console.error('データベースからのデータ取得に失敗しました:', error);
		return {
			files: [],
			error: 'データベースからのデータ取得に失敗しました。'
		};
	} finally {
		// 接続を閉じる
		await pool.end();
	}
};

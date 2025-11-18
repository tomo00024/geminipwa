import { createPool } from '@vercel/postgres';
import type { PageServerLoad } from './$types'; // PageServerLoadの型を直接インポート
import { POSTGRES_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ locals }) => {
	// localsを追加
	// localsからセッション情報を取得
	const session = await locals.auth();

	// 環境変数がなければエラーを返す
	if (!POSTGRES_URL) {
		return {
			files: [],
			error: 'データベース接続文字列が設定されていません。',
			session // セッション情報を返す
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
                authorname    AS "authorName",
                uploaderid    AS "uploaderId" -- uploaderId を追加
            FROM
                files
            WHERE
                visibility = 'public'
            ORDER BY
                uploadedat DESC;
        `;
		// ▼▼▼ ここにデバッグコードを追加 ▼▼▼
		console.log('--- Server-side Data ---');
		console.log('Session User ID:', session?.user?.id);
		console.log('First File Data:', result.rows[0]); // 最初のファイル情報を見てみる
		// ▲▲▲ ここまで ▲▲▲
		return {
			files: result.rows,
			session // セッション情報をページに渡す
		};
	} catch (error) {
		console.error('データベースからのデータ取得に失敗しました:', error);
		return {
			files: [],
			error: 'データベースからのデータ取得に失敗しました。',
			session // エラー時もセッション情報を返す
		};
	} finally {
		// 接続を閉じる
		await pool.end();
	}
};

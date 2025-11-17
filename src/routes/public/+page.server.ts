// src/routes/public/+page.server.ts
import { sql } from '@vercel/postgres';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		// filesテーブルとusersテーブルを結合(JOIN)して、
		// uploaderIdからアップロードしたユーザー名(name)を取得します。
		const { rows: files } = await sql`
			SELECT
				f.id,
				f.title,
				f.description,
				f.imageUrl,
				f.tags,
				f.starCount,
				f.downloadCount,
				f.uploadedAt,
				u.name AS "uploaderName" -- u.nameをuploaderNameという名前で取得
			FROM
				files f
			INNER JOIN
				users u ON f.uploaderId = u.id
			WHERE
				f.visibility = 'public' -- 公開されているファイルのみ
			ORDER BY
				f.uploadedAt DESC; -- 新しい順に並び替え
		`;

		// 取得したデータをfilesという名前でページに渡す
		return {
			files: files
		};
	} catch (error) {
		console.error('Failed to fetch public files:', error);
		// エラーが発生した場合は、空の配列を返す
		return {
			files: []
		};
	}
};

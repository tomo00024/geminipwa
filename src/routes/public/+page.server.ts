// src/routes/public/+page.server.ts
import { sql } from '@vercel/postgres';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	console.log('--- [SERVER LOG] /public page load function started ---'); // 1. 関数が実行されたか確認

	try {
		const query = sql`
			SELECT
				f.id, f.title, f.description, f.imageUrl, f.tags,
				f.starCount, f.downloadCount, f.uploadedAt,
				u.name AS "uploaderName"
			FROM
				files f
			INNER JOIN
				users u ON f.uploaderId = u.id
			WHERE
				f.visibility = 'public'
			ORDER BY
				f.uploadedAt DESC;
		`;

		const result = await query;
		console.log('--- [SERVER LOG] SQL Query Result ---'); // 2. クエリ結果を確認
		console.log('Total rows found:', result.rowCount); // 取得した行数を表示
		console.log('Rows data:', JSON.stringify(result.rows, null, 2)); // ★★★ 取得した実際のデータの中身を表示 ★★★

		return {
			files: result.rows
		};
	} catch (error) {
		console.error('--- [SERVER LOG] !!! ERROR while fetching data !!! ---'); // 3. エラーが発生したか確認
		console.error(error); // ★★★ エラーオブジェクトそのものを表示 ★★★

		return {
			files: [],
			error: 'データベースからのデータ取得に失敗しました。' // エラー情報をページに渡すことも可能
		};
	}
};

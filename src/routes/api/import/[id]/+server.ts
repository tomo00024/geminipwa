// src/routes/api/import/[id]/+server.ts
import { error, json } from '@sveltejs/kit';
import { createPool } from '@vercel/postgres';
import { POSTGRES_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

const pool = createPool({
	connectionString: POSTGRES_URL
});

export const GET: RequestHandler = async ({ params }) => {
	const fileId = params.id;

	try {
		const { rows } = await pool.sql`
            SELECT
                bloburl AS "blobUrl"
            FROM
                files
            WHERE
                id = ${fileId};
        `;

		const file = rows[0];
		if (!file) {
			throw error(404, 'Not Found: 指定されたファイルが見つかりません。');
		}

		await pool.sql`
            UPDATE files
            SET downloadcount = downloadcount + 1
            WHERE id = ${fileId};
        `;

		const blobResponse = await fetch(file.blobUrl);
		if (!blobResponse.ok) {
			throw error(500, 'Failed to fetch file from storage.');
		}

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

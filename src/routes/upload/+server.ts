// src/routes/upload/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const uploaderId = session.user.id;

	const body = await request.json();
	const { sessionData, publishScope, title, description, imageUrl, expiresAt } = body;

	if (!sessionData || !title || !publishScope) {
		throw error(400, 'Bad Request: 必須項目が不足しています。');
	}

	try {
		const fileContent = JSON.stringify(sessionData);
		const fileSize = Buffer.byteLength(fileContent, 'utf-8');

		const blobPathname = `${uploaderId}/${uuidv4()}.json`;
		const blob = await put(blobPathname, fileContent, {
			access: 'public',
			contentType: 'application/json'
		});

		// ★ 変更点: ファイル名をJavaScriptの変数として先に作成する
		const finalFileName = `${sessionData.title || 'untitled'}.json`;

		const fileId = uuidv4();
		await sql`
			INSERT INTO files (
				id, title, description, imageUrl,
				fileName, blobUrl, pathname, contentType, size,
				expiresAt, uploaderId, visibility
			) VALUES (
				${fileId}, ${title}, ${description}, ${imageUrl},
				${finalFileName}, -- ★ 変更点: 作成した変数を使う
                ${blob.url}, ${blob.pathname}, ${blob.contentType}, ${fileSize},
				${expiresAt}, ${uploaderId}, 'public'
			)
		`;

		return json(
			{
				message: 'アップロードが成功しました。',
				id: fileId,
				url: blob.url
			},
			{ status: 201 }
		);
	} catch (e: any) {
		console.error('Upload Error:', e);
		throw error(500, 'Internal Server Error: ファイルの処理中にエラーが発生しました。');
	}
};

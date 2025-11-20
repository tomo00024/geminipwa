import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { del } from '@vercel/blob';
import { BLOB_READ_WRITE_TOKEN } from '$env/static/private';

export const DELETE: RequestHandler = async ({ locals }) => {
    const session = await locals.auth();
    if (!session?.user?.id) {
        throw error(401, 'Unauthorized: ログインが必要です。');
    }
    const userId = session.user.id;

    try {
        // 1. ユーザーがアップロードしたファイルを全て取得
        const { rows: files } = await db.sql`
			SELECT pathname FROM files WHERE uploader_id = ${userId};
		`;

        // 2. Vercel Blobからファイルを削除
        // 並列で削除を実行して効率化
        const deletePromises = files
            .filter((file) => file.pathname)
            .map((file) => del(file.pathname, { token: BLOB_READ_WRITE_TOKEN }));

        await Promise.all(deletePromises);

        // 3. データベースからファイルレコードを削除
        // ユーザーIDに紐づくファイルを全て削除
        await db.sql`
			DELETE FROM files WHERE uploader_id = ${userId};
		`;

        // NOTE: ユーザーテーブル自体はAuth.js (Google Provider) 管理のため、
        // ここではアプリケーション固有のデータ（files）のみを削除する。
        // ユーザーのログインセッションはクライアント側で signOut() を呼ぶことで破棄される。

        return json({ message: 'アカウントデータが削除されました。' }, { status: 200 });
    } catch (e: any) {
        console.error('Account Deletion Error:', e);
        throw error(500, 'Internal Server Error: アカウントの削除中にエラーが発生しました。');
    }
};

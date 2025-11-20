import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    const session = await locals.auth();
    // @ts-ignore: accessToken is added in auth.ts
    const accessToken = session?.user?.accessToken || session?.accessToken;

    if (!session || !accessToken) {
        throw error(401, 'Unauthorized: Googleアカウントでログインしてください。');
    }

    const { sessions } = await request.json();

    if (!sessions) {
        throw error(400, 'Bad Request: バックアップデータがありません。');
    }

    const fileName = 'gemini-sessions-backup.json';
    const fileContent = JSON.stringify(sessions, null, 2);
    const fileType = 'application/json';

    try {
        // 1. 既存のバックアップファイルを検索
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id, name)`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        if (!searchResponse.ok) {
            console.error('Drive Search Error:', await searchResponse.text());
            throw error(500, 'Google Driveへのアクセスに失敗しました。');
        }

        const searchData = await searchResponse.json();
        const existingFile = searchData.files?.[0];

        let fileId = existingFile?.id;
        const method = fileId ? 'PATCH' : 'POST';
        const url = fileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        // 2. マルチパートアップロードの準備
        const metadata = {
            name: fileName,
            mimeType: fileType
        };

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const body =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${fileType}\r\n\r\n` +
            fileContent +
            closeDelimiter;

        // 3. ファイルの作成または更新
        const uploadResponse = await fetch(url, {
            method: method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: body
        });

        if (!uploadResponse.ok) {
            const errText = await uploadResponse.text();
            console.error('Drive Upload Error:', errText);
            if (uploadResponse.status === 403) {
                throw error(403, 'Google Driveへの書き込み権限がありません。再ログインしてください。');
            }
            throw error(500, 'バックアップの保存に失敗しました。');
        }

        const result = await uploadResponse.json();

        return json({
            success: true,
            fileId: result.id,
            backupAt: new Date().toISOString()
        });
    } catch (e: any) {
        console.error('Backup API Error:', e);
        if (e.status) throw e;
        throw error(500, 'バックアップ処理中に予期せぬエラーが発生しました。');
    }
};

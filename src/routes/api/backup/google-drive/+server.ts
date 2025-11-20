import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const FOLDER_NAME = 'Gemini_App_Backups';

async function getOrCreateFolder(accessToken: string): Promise<string> {
    // 1. Search for folder
    const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    if (!searchRes.ok) {
        throw new Error('Failed to search for folder');
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // 2. Create folder if not exists
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });

    if (!createRes.ok) {
        throw new Error('Failed to create folder');
    }

    const createData = await createRes.json();
    return createData.id;
}

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

    // Generate filename for today: gemini-backup-YYYY-MM-DD.json
    const today = new Date().toISOString().split('T')[0];
    const fileName = `gemini-backup-${today}.json`;
    const fileContent = JSON.stringify(sessions, null, 2);
    const fileType = 'application/json';

    try {
        // 0. Ensure folder exists
        const folderId = await getOrCreateFolder(accessToken);

        // 1. Check if today's backup file exists IN THAT FOLDER
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false&fields=files(id, name)`,
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

        // 2. Prepare multipart upload
        const metadata: any = {
            name: fileName,
            mimeType: fileType
        };

        // Only add parents if creating a new file
        if (!fileId) {
            metadata.parents = [folderId];
        }

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

        // 3. Create or Update file
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
            backupAt: new Date().toISOString(),
            fileName: fileName,
            folderId: folderId
        });
    } catch (e: any) {
        console.error('Backup API Error:', e);
        if (e.status) throw e;
        throw error(500, 'バックアップ処理中に予期せぬエラーが発生しました。');
    }
};

export const GET: RequestHandler = async ({ url, locals }) => {
    const session = await locals.auth();
    // @ts-ignore
    const accessToken = session?.user?.accessToken || session?.accessToken;

    if (!session || !accessToken) {
        throw error(401, 'Unauthorized');
    }

    const listMode = url.searchParams.get('list') === 'true';
    const fileId = url.searchParams.get('fileId');

    try {
        // Mode 1: List Backup Files
        if (listMode) {
            // Get folder ID first to filter by parent
            const folderId = await getOrCreateFolder(accessToken);

            const query = `name contains 'gemini-backup-' and '${folderId}' in parents and trashed=false`;
            const fields = 'files(id, name, createdTime, modifiedTime, size)';
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=name desc`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );

            if (!response.ok) throw error(500, 'Failed to list backups');
            const data = await response.json();
            return json(data);
        }

        // Mode 2: Get File Content
        if (fileId) {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );

            if (!response.ok) throw error(500, 'Failed to download backup');
            const data = await response.json();
            return json(data);
        }

        throw error(400, 'Invalid request parameters');
    } catch (e: any) {
        console.error('Backup API Error:', e);
        if (e.status) throw e;
        throw error(500, 'Failed to process request');
    }
};

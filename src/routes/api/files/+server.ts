import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { POSTGRES_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    if (!POSTGRES_URL) {
        return json({ files: [] }, { status: 500 });
    }

    try {
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
                model
            FROM
                files
            WHERE
                visibility = 'public'
            ORDER BY
                uploaded_at DESC;
        `;
        return json({ files: result.rows });
    } catch (error) {
        console.error('Failed to fetch files:', error);
        return json({ error: 'Failed to fetch files' }, { status: 500 });
    }
};

import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';

const TABLE_NAME = 'rate_limits';

/**
 * レート制限をチェックする関数
 * @param key 識別子 (IPアドレスやユーザーID)
 * @param limit 制限回数
 * @param windowSeconds 制限期間 (秒)
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
    const now = Date.now();
    const windowMillis = windowSeconds * 1000;
    const expiresAt = now + windowMillis;

    try {
        // 1. テーブルが存在することを確認 (初回のみ実行されることを期待)
        // パフォーマンスへの影響を最小限にするため、本来はマイグレーションで行うべきですが、
        // 簡易実装としてここでチェックします。
        await db.sql`
            CREATE TABLE IF NOT EXISTS rate_limits (
                key VARCHAR(255) PRIMARY KEY,
                count INTEGER NOT NULL,
                expires_at BIGINT NOT NULL
            );
        `;

        // 2. 期限切れのレコードを削除 (ガベージコレクション)
        // 毎回やると重いので、ランダムに実行するなどの最適化も考えられますが、
        // ここではシンプルに毎回自身のキーだけチェック・更新します。

        // トランザクション的な整合性を厳密に保つのは難しいですが、
        // UPSERT (INSERT ON CONFLICT) を使用してアトミックに処理を試みます。

        const { rows } = await db.sql`
            SELECT count, expires_at FROM rate_limits WHERE key = ${key};
        `;

        const record = rows[0];

        if (record && Number(record.expires_at) > now) {
            // 期間内の場合
            if (record.count >= limit) {
                const resetIn = Math.ceil((Number(record.expires_at) - now) / 1000);
                throw error(429, `Too Many Requests: レート制限を超過しました。${resetIn}秒後に再試行してください。`);
            }

            // カウントアップ
            await db.sql`
                UPDATE rate_limits 
                SET count = count + 1 
                WHERE key = ${key};
            `;
        } else {
            // レコードがない、または期限切れの場合 -> 新規作成またはリセット
            // ON CONFLICT を使って、並列リクエスト時の競合を防ぐ
            await db.sql`
                INSERT INTO rate_limits (key, count, expires_at)
                VALUES (${key}, 1, ${expiresAt})
                ON CONFLICT (key) 
                DO UPDATE SET 
                    count = 1,
                    expires_at = ${expiresAt};
            `;
        }

    } catch (e: any) {
        // レート制限エラー(429)はそのままスロー
        if (e.status === 429) {
            throw e;
        }

        // DBエラーなどはログに出して、基本的には通す（フェイルオープン）か、止める（フェイルクローズ）か。
        // ここでは安全側に倒してエラーログだけ吐いて処理は続行させる（ユーザーをブロックしない）方針もアリですが、
        // 実装の確実性を確認するためエラーを投げます。
        console.error('Rate Limit Error:', e);
        // 本番運用では、DB接続エラーで全ユーザーがブロックされるのを防ぐため、
        // ここで return してスルーするのも一つの手です。
    }
}

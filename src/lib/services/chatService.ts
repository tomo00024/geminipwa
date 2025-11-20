import { get } from 'svelte/store';
import { sessions, appSettings, tokenUsageHistory } from '$lib/stores';
import { callGeminiApi } from '$lib/geminiService';
import { generateUUID } from '$lib/utils';
import { correctImageMarkdownInText } from '$lib/utils/imageUrlCorrector';
import type { Log, FeatureSettings, Trigger, AppSettings, Session } from '$lib/types';
import {
    generateDiceRollBlock,
    evaluateTriggers,
    buildFinalUserInput,
    buildConversationHistory
} from './sessionService';

export async function sendUserMessage(
    session: Session,
    userInput: string
): Promise<void> {
    const settings = get(appSettings);
    const activeApiKey = settings.apiKeys.find((k) => k.id === settings.activeApiKeyId)?.key;
    const model = settings.model;

    if (!activeApiKey || !model) {
        throw new Error('APIキーまたはモデルが設定されていません。');
    }

    // 1. 指示ブロック生成（ダイス & トリガー）
    const diceBlock = generateDiceRollBlock(session.diceRolls);
    const { triggerBlock, updatedTriggers, updatedStatuses } = evaluateTriggers(
        session.triggers,
        session.customStatuses
    );

    // 2. 最終プロンプト構築
    const finalUserInput = buildFinalUserInput(userInput, [diceBlock, triggerBlock]);

    // 3. ログ保存 & ステータス更新
    const now = new Date().toISOString();
    const allLogs = session.logs;
    const logMap = new Map(allLogs.map((log) => [log.id, log]));

    // 末尾のログ（親ID）を見つける
    let lastLog: Log | null = null;
    if (allLogs.length > 0) {
        let currentLog = allLogs.find((log) => log.parentId === null);
        if (currentLog) {
            lastLog = currentLog;
            while (currentLog.activeChildId) {
                const nextLog = logMap.get(currentLog.activeChildId);
                if (nextLog) {
                    currentLog = nextLog;
                    lastLog = nextLog;
                } else {
                    break;
                }
            }
        }
    }

    const parentId = lastLog ? lastLog.id : null;

    const newUserMessage: Log = {
        id: generateUUID(),
        speaker: 'user',
        text: userInput,
        timestamp: now,
        parentId: parentId,
        activeChildId: null
    };

    sessions.update((allSessions) => {
        const sessionToUpdate = allSessions.find((s) => s.id === session.id);
        if (sessionToUpdate) {
            if (sessionToUpdate.logs.length === 0) {
                sessionToUpdate.title = userInput.substring(0, 10);
            }
            sessionToUpdate.logs.push(newUserMessage);

            if (parentId) {
                const parentLog = sessionToUpdate.logs.find((log) => log.id === parentId);
                if (parentLog) {
                    parentLog.activeChildId = newUserMessage.id;
                }
            }

            // ステータス更新を適用
            if (updatedStatuses) {
                sessionToUpdate.customStatuses = updatedStatuses;
            }

            sessionToUpdate.lastUpdatedAt = now;
        }
        return allSessions;
    });

    // 4. AI応答要求
    // 更新されたセッションを取得しなおす
    const updatedSession = get(sessions).find((s) => s.id === session.id);
    if (!updatedSession) return;

    const history = buildConversationHistory(updatedSession.logs, newUserMessage.id);

    await getAiResponseAndUpdate(
        history,
        finalUserInput,
        newUserMessage.id,
        session.id,
        session.featureSettings,
        updatedTriggers
    );
}

export async function retryMessage(
    session: Session,
    userMessageId: string
): Promise<void> {
    const settings = get(appSettings);
    const activeApiKey = settings.apiKeys.find((k) => k.id === settings.activeApiKeyId)?.key;
    const model = settings.model;

    if (!activeApiKey || !model) {
        throw new Error('APIキーまたはモデルが設定されていません。');
    }

    const targetUserMessage = session.logs.find((log) => log.id === userMessageId);
    if (!targetUserMessage) return;

    const userInputForRetry = targetUserMessage.text;

    const diceBlock = generateDiceRollBlock(session.diceRolls);
    const { triggerBlock, updatedTriggers, updatedStatuses } = evaluateTriggers(
        session.triggers,
        session.customStatuses
    );

    const finalUserInput = buildFinalUserInput(userInputForRetry, [diceBlock, triggerBlock]);

    // リトライ時もステータス更新を反映させる
    if (updatedStatuses) {
        sessions.update((allSessions) => {
            const s = allSessions.find((x) => x.id === session.id);
            if (s) {
                s.customStatuses = updatedStatuses;
                s.lastUpdatedAt = new Date().toISOString();
            }
            return allSessions;
        });
    }

    const history = buildConversationHistory(session.logs, userMessageId);
    await getAiResponseAndUpdate(
        history,
        finalUserInput,
        userMessageId,
        session.id,
        session.featureSettings,
        updatedTriggers
    );
}

async function getAiResponseAndUpdate(
    contextLogs: Log[],
    finalUserInput: string,
    userMessageId: string,
    sessionId: string,
    featureSettings: FeatureSettings,
    triggersToUpdateAfterSuccess: Trigger[] | undefined
) {
    try {
        let currentAppSettings = get(appSettings);
        let currentActiveApiKey = currentAppSettings.apiKeys.find(
            (k) => k.id === currentAppSettings.activeApiKeyId
        )?.key;
        let currentModel = currentAppSettings.model;

        while (true) {
            if (!currentActiveApiKey || !currentModel) {
                throw new Error('APIキーまたはモデルが設定されていません。');
            }

            const conversationContext = {
                logs: contextLogs.map((log) => ({ speaker: log.speaker, text: log.text })),
                featureSettings: featureSettings
            };

            const result = await callGeminiApi(
                currentActiveApiKey,
                currentModel,
                currentAppSettings,
                conversationContext,
                finalUserInput
            );

            if (result.metadata?.requiresApiKeyLoop) {
                // APIキーローテーション処理
                const currentApiKeyInfo = currentAppSettings.apiKeys.find(
                    (k) => k.id === currentAppSettings.activeApiKeyId
                );
                const currentApiKeyName = currentApiKeyInfo ? currentApiKeyInfo.name : '現在のキー';

                if (
                    confirm(
                        `APIキー「${currentApiKeyName}」がレート制限(429)に達しました。次のAPIキーに切り替えて再試行しますか？`
                    )
                ) {
                    const currentIndex = currentAppSettings.apiKeys.findIndex(
                        (k) => k.id === currentAppSettings.activeApiKeyId
                    );
                    const nextIndex = (currentIndex + 1) % currentAppSettings.apiKeys.length;
                    const nextApiKey = currentAppSettings.apiKeys[nextIndex];

                    appSettings.update((settings) => {
                        settings.activeApiKeyId = nextApiKey.id;
                        return settings;
                    });

                    alert(`APIキーを「${nextApiKey.name}」に切り替えました。再試行します。`);

                    currentAppSettings = get(appSettings);
                    currentActiveApiKey = nextApiKey.key;
                    continue;
                } else {
                    const errorMessage = result.metadata.error?.error?.message || 'レート制限エラーです。';
                    throw new Error(`処理を中断しました: ${errorMessage}`);
                }
            } else {
                // 成功時
                let responseText = result.responseText;
                const settings = get(appSettings);

                if (settings.assist.autoCorrectUrl) {
                    console.log('[AI Response] URL auto-correction is enabled. Applying correction...');
                    responseText = correctImageMarkdownInText(responseText);
                }

                sessions.update((allSessions) => {
                    const sessionToUpdate = allSessions.find((s) => s.id === sessionId);
                    if (sessionToUpdate) {
                        const parentUserMessage = sessionToUpdate.logs.find(
                            (log) => log.id === userMessageId
                        );

                        if (parentUserMessage && 'requestBody' in result) {
                            parentUserMessage.metadata = (result as any).requestBody;
                        }

                        const newAiResponse: Log = {
                            id: generateUUID(),
                            speaker: 'ai',
                            text: responseText,
                            timestamp: new Date().toISOString(),
                            parentId: userMessageId,
                            activeChildId: null,
                            metadata: result.metadata,
                            tokenUsage: (result as any).usageMetadata
                                ? {
                                    input: (result as any).usageMetadata.promptTokenCount,
                                    output: (result as any).usageMetadata.candidatesTokenCount,
                                    thinking: (result as any).usageMetadata.thoughtsTokenCount,
                                    total: (result as any).usageMetadata.totalTokenCount
                                }
                                : undefined
                        };

                        // トークン使用履歴を更新
                        if (newAiResponse.tokenUsage) {
                            const usage = newAiResponse.tokenUsage;
                            const today = new Date().toISOString().split('T')[0];
                            tokenUsageHistory.update((history) => {
                                const existingEntry = history.find((h) => h.date === today);
                                if (existingEntry) {
                                    existingEntry.totalTokens += usage.total;
                                    existingEntry.inputTokens += usage.input;
                                    existingEntry.outputTokens += usage.output;
                                    if (usage.thinking) {
                                        existingEntry.thinkingTokens =
                                            (existingEntry.thinkingTokens || 0) + usage.thinking;
                                    }
                                    return history;
                                } else {
                                    return [
                                        ...history,
                                        {
                                            date: today,
                                            totalTokens: usage.total,
                                            inputTokens: usage.input,
                                            outputTokens: usage.output,
                                            thinkingTokens: usage.thinking || 0
                                        }
                                    ];
                                }
                            });
                        }
                        sessionToUpdate.logs.push(newAiResponse);

                        if (parentUserMessage) {
                            parentUserMessage.activeChildId = newAiResponse.id;
                        }

                        if (triggersToUpdateAfterSuccess) {
                            sessionToUpdate.triggers = triggersToUpdateAfterSuccess;
                        }

                        sessionToUpdate.lastUpdatedAt = new Date().toISOString();
                    }
                    return allSessions;
                });
                break;
            }
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

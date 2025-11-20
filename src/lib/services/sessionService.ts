import type { DiceRoll, Trigger, CustomStatus, Log } from '$lib/types';

/**
 * ダイスロール設定に基づき、ダイスロールを実行し、指示ブロック文字列を生成する関数
 */
export function generateDiceRollBlock(diceRolls: DiceRoll[] | undefined): string {
    if (!diceRolls || diceRolls.length === 0) {
        return '';
    }

    const instructions: string[] = [];
    for (const diceRoll of diceRolls) {
        if (!diceRoll.isEnabled) continue;

        const results: number[] = [];
        for (let i = 0; i < diceRoll.diceCount; i++) {
            const result = Math.floor(Math.random() * diceRoll.diceType) + 1;
            results.push(result);
        }

        if (results.length > 0) {
            const formattedString = `｛${diceRoll.instructionText}:${results.join(',')}｝`;
            instructions.push(formattedString);
        }
    }

    if (instructions.length === 0) {
        return '';
    }

    return `[ダイスロールStart]\n${instructions.join('\n')}\n[ダイスロールEnd]`;
}

/**
 * トリガーを評価し、指示ブロックと「更新後のステータス配列」「更新後のトリガー配列」を返す
 * シーケンシャル（上から順）に実行し、ステータス変更はその場で後続の判定に反映される
 */
export function evaluateTriggers(
    triggers: Trigger[] | undefined,
    initialCustomStatuses: CustomStatus[] | undefined
): {
    triggerBlock: string;
    updatedTriggers: Trigger[] | undefined;
    updatedStatuses: CustomStatus[] | undefined;
} {
    if (!triggers || triggers.length === 0 || !initialCustomStatuses) {
        return {
            triggerBlock: '',
            updatedTriggers: triggers,
            updatedStatuses: initialCustomStatuses
        };
    }

    const instructions: string[] = [];
    const evaluatedTriggers: Trigger[] = [];

    // 計算用にステータスのディープコピーを作成（これを次々と書き換えていく）
    let currentStatuses = JSON.parse(JSON.stringify(initialCustomStatuses)) as CustomStatus[];

    for (const trigger of triggers) {
        const hasBeenExecuted = trigger.hasBeenExecuted ?? false;
        const lastEvaluationResult = trigger.lastEvaluationResult ?? false;

        // 1. 条件判定 (currentStatuses の値を使う)
        let isConditionMet = false;
        if (trigger.conditions && trigger.conditions.length > 0) {
            const conditionResults = trigger.conditions.map((condition) => {
                const status = currentStatuses.find((s) => s.id === condition.statusId);
                if (!status) return false;
                const currentValue = parseFloat(status.currentValue);
                if (isNaN(currentValue)) return false;

                switch (condition.operator) {
                    case '>=':
                        return currentValue >= condition.value;
                    case '>':
                        return currentValue > condition.value;
                    case '<=':
                        return currentValue <= condition.value;
                    case '<':
                        return currentValue < condition.value;
                    case '==':
                        return currentValue === condition.value;
                    default:
                        return false;
                }
            });

            isConditionMet = conditionResults.reduce((acc, current, index) => {
                if (index === 0) return current;
                const conjunction = trigger.conjunctions[index - 1];
                return conjunction === 'AND' ? acc && current : acc || current;
            }, conditionResults[0] ?? false);
        }

        // 2. 実行判定
        let shouldExecute = false;
        switch (trigger.executionType) {
            case 'persistent':
                shouldExecute = isConditionMet;
                break;
            case 'once':
                shouldExecute = isConditionMet && !hasBeenExecuted;
                break;
            case 'on-threshold-cross':
                shouldExecute = isConditionMet && !lastEvaluationResult;
                break;
        }

        // 3. 実行 (テキスト収集 & ステータス更新)
        if (shouldExecute) {
            // A. テキスト追加
            if (trigger.responseText) {
                instructions.push(trigger.responseText);
            }

            // B. ステータス即時更新 (バッファを書き換え、次のトリガー判定に影響させる)
            if (trigger.statusUpdates && trigger.statusUpdates.length > 0) {
                for (const update of trigger.statusUpdates) {
                    const targetStatus = currentStatuses.find((s) => s.id === update.targetStatusId);
                    if (targetStatus) {
                        let val = parseFloat(targetStatus.currentValue);
                        if (isNaN(val)) val = 0;

                        if (update.operation === 'set') {
                            val = update.value;
                        } else if (update.operation === 'add') {
                            val += update.value;
                        } else if (update.operation === 'sub') {
                            val -= update.value;
                        }

                        targetStatus.currentValue = String(val); // 文字列として保存
                    }
                }
            }
        }

        evaluatedTriggers.push({
            ...trigger,
            hasBeenExecuted: hasBeenExecuted || (shouldExecute && trigger.executionType === 'once'),
            lastEvaluationResult: isConditionMet
        });
    }

    const triggerBlock =
        instructions.length > 0 ? `[トリガーStart]\n${instructions.join('\n')}\n[トリガーEnd]` : '';

    return {
        triggerBlock,
        updatedTriggers: evaluatedTriggers,
        updatedStatuses: currentStatuses
    };
}

export function buildFinalUserInput(currentUserInput: string, blocks: string[]): string {
    const validBlocks = blocks.filter((block) => block);
    const finalParts: string[] = [];

    if (validBlocks.length > 0) {
        const internalInstructions = `[内部指示Start]\n${validBlocks.join('\n')}\n[内部指示End]`;
        finalParts.push(internalInstructions);
    }

    const userMessageBlock = `[ユーザー文章Start]\n${currentUserInput}\n[ユーザー文章End]`;
    finalParts.push(userMessageBlock);

    return finalParts.join('\n');
}

export function buildConversationHistory(allLogs: Log[], targetLogId: string): Log[] {
    const history: Log[] = [];
    const logMap = new Map(allLogs.map((log) => [log.id, log]));
    const targetLog = logMap.get(targetLogId);
    if (!targetLog) return [];

    let currentParentId = targetLog.parentId;
    while (currentParentId) {
        const parentLog = logMap.get(currentParentId);
        if (!parentLog) break;
        history.unshift(parentLog);
        currentParentId = parentLog.parentId;
    }
    return history;
}

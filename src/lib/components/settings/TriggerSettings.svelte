<!-- src/lib/components/settings/TriggerSettings.svelte -->

<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import type { Trigger } from '$lib/types';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	// ストアを直接更新するためのヘルパー関数群
	function updateSession(updater: (session: NonNullable<typeof $currentSession>) => void) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				updater(sessionToUpdate);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	// トリガー自体のプロパティ（実行タイプ、応答テキスト）を更新する関数
	function handleTriggerChange(
		triggerId: string,
		field: 'executionType' | 'responseText',
		value: string
	) {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			if (trigger) {
				(trigger[field] as string) = value;
			}
		});
	}

	// 条件のプロパティ（ステータスID、演算子、値）を更新する関数
	function handleConditionChange(
		triggerId: string,
		conditionId: string,
		field: 'statusId' | 'operator' | 'value',
		value: string | number
	) {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			const condition = trigger?.conditions.find((c) => c.id === conditionId);
			if (condition) {
				if (field === 'value') {
					condition[field] = Number(value);
				} else {
					(condition[field] as string) = value as string;
				}
			}
		});
	}

	// AND/OR 結合子を更新する関数
	function handleConjunctionChange(triggerId: string, index: number, value: 'AND' | 'OR') {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			if (trigger && typeof trigger.conjunctions[index] !== 'undefined') {
				trigger.conjunctions[index] = value;
			}
		});
	}

	function addTrigger() {
		updateSession((session) => {
			// triggersが未定義の場合を考慮して初期化
			if (!session.triggers) {
				session.triggers = [];
			}
			session.triggers?.push({
				id: crypto.randomUUID(),
				conditions: [
					{
						id: crypto.randomUUID(),
						statusId: '', // 初期値は空
						operator: '>=',
						value: 0
					}
				],
				conjunctions: [],
				executionType: 'once',
				responseText: '',
				hasBeenExecuted: false,
				lastEvaluationResult: false
			});
		});
	}

	function removeTrigger(id: string) {
		updateSession((session) => {
			if (session.triggers) {
				session.triggers = session.triggers.filter((t) => t.id !== id);
			}
		});
	}

	function addCondition(trigger: Trigger) {
		updateSession((session) => {
			const targetTrigger = session.triggers?.find((t) => t.id === trigger.id);
			if (targetTrigger) {
				targetTrigger.conditions.push({
					id: crypto.randomUUID(),
					statusId: '',
					operator: '>=',
					value: 0
				});
				if (targetTrigger.conditions.length > 1) {
					targetTrigger.conjunctions.push('AND');
				}
			}
		});
	}

	function removeCondition(trigger: Trigger, conditionId: string) {
		updateSession((session) => {
			const targetTrigger = session.triggers?.find((t) => t.id === trigger.id);
			if (targetTrigger) {
				const indexToRemove = targetTrigger.conditions.findIndex((c) => c.id === conditionId);
				if (indexToRemove === -1) return;

				targetTrigger.conditions.splice(indexToRemove, 1);

				if (targetTrigger.conditions.length < 2) {
					targetTrigger.conjunctions = [];
				} else if (targetTrigger.conjunctions.length > 0) {
					const conjunctionIndexToRemove = Math.max(0, indexToRemove - 1);
					targetTrigger.conjunctions.splice(conjunctionIndexToRemove, 1);
				}
			}
		});
	}
</script>

<div class="space-y-4">
	<h3 class="font-medium">トリガー設定</h3>
	<p class="mb-3 text-xs text-gray-600">
		特定のステータスが条件を満した時に、追加のテキストをAIの応答に含めることができます。
		[内部指示Start]｛トリガー文章｝[内部指示End]ユーザー文章: ｛入力文章｝
	</p>

	<!-- トリガーのリスト -->
	<div class="space-y-4">
		{#if $currentSession?.triggers}
			{#each $currentSession.triggers as trigger (trigger.id)}
				<div class="space-y-3 rounded-lg border bg-gray-50 p-3">
					<div class="flex items-center justify-between">
						<h4 class="font-semibold">トリガー</h4>
						<button
							class="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-300"
							on:click={() => removeTrigger(trigger.id)}
							aria-label="Remove trigger"
						>
							✕
						</button>
					</div>

					<!-- 条件 (IF) -->
					<div class="space-y-2 rounded-md border p-2">
						<p class="text-sm font-semibold">If (もし)</p>
						<div class="space-y-3">
							{#each trigger.conditions as condition, j (condition.id)}
								<div class="space-y-2">
									<!-- 条件の行 -->
									<div class="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
										<select
											class="select select-bordered select-sm w-full"
											value={condition.statusId}
											on:change={(e) =>
												handleConditionChange(
													trigger.id,
													condition.id,
													'statusId',
													e.currentTarget.value
												)}
										>
											<option disabled value="">ステータスを選択</option>
											{#if $currentSession.customStatuses && $currentSession.customStatuses.length > 0}
												{#each $currentSession.customStatuses as status (status.id)}
													<option value={status.id}>{status.name}</option>
												{/each}
											{:else}
												<option disabled>カスタムステータスがありません</option>
											{/if}
										</select>

										<select
											class="select select-bordered select-sm"
											value={condition.operator}
											on:change={(e) =>
												handleConditionChange(
													trigger.id,
													condition.id,
													'operator',
													e.currentTarget.value
												)}
										>
											<option value="==">== (等しい)</option>
											<option value=">=">&gt;= (以上)</option>
											<option value=">">&gt; (超える)</option>
											<option value="<=">&lt;= (以下)</option>
											<option value="<">&lt; (未満)</option>
										</select>

										<input
											type="number"
											placeholder="数値"
											class="input input-bordered input-sm w-full"
											value={condition.value}
											on:input={(e) =>
												handleConditionChange(
													trigger.id,
													condition.id,
													'value',
													e.currentTarget.value
												)}
										/>
										<!-- 条件削除ボタン (修正箇所) -->
										{#if trigger.conditions.length > 1}
											<button
												class="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-300"
												on:click={() => removeCondition(trigger, condition.id)}
												aria-label="Remove condition"
											>
												✕
											</button>
										{/if}
									</div>

									<!-- AND/OR 結合子 -->
									{#if j < trigger.conditions.length - 1}
										<div class="flex items-center justify-center">
											<select
												class="select select-bordered select-xs"
												value={trigger.conjunctions[j]}
												on:change={(e) =>
													handleConjunctionChange(
														trigger.id,
														j,
														e.currentTarget.value as 'AND' | 'OR'
													)}
											>
												<option value="AND">AND (かつ)</option>
												<option value="OR">OR (または)</option>
											</select>
										</div>
									{/if}
								</div>
							{/each}
						</div>
						<button
							class="mt-2 rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-300"
							on:click={() => addCondition(trigger)}
						>
							+ 条件を追加
						</button>
					</div>

					<!-- 実行内容 (THEN) -->
					<div class="space-y-2 rounded-md border p-2">
						<div class="flex items-center justify-between">
							<p class="text-sm font-semibold">Then (ならば)</p>
							<select
								class="select select-bordered select-xs"
								value={trigger.executionType}
								on:change={(e) =>
									handleTriggerChange(trigger.id, 'executionType', e.currentTarget.value)}
							>
								<option value="once">ワンショット（一度だけ実行）</option>
								<option value="persistent">永続（条件を満たしている間）</option>
								<option value="on-threshold-cross">閾値をまたぐたび（毎回実行）</option>
							</select>
						</div>
						<textarea
							class="textarea textarea-bordered w-full"
							placeholder="条件を満した時にAIの応答に追加されるテキスト"
							value={trigger.responseText}
							on:input={(e) =>
								handleTriggerChange(trigger.id, 'responseText', e.currentTarget.value)}
						></textarea>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<button
		class="mt-3 rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		on:click={addTrigger}
	>
		+ トリガーを追加
	</button>
</div>

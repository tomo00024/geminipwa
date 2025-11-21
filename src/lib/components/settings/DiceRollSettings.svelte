<!-- src/lib/components/settings/DiceRollSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { generateUUID } from '$lib/utils';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

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

	// 新しいダイスロール設定を追加する関数
	function addDiceRoll() {
		updateSession((session) => {
			if (!session.diceRolls) {
				session.diceRolls = [];
			}
			session.diceRolls.push({
				id: generateUUID(),
				isEnabled: true,
				instructionText: '',
				diceCount: 1,
				diceType: 100
			});
		});
	}

	// ダイスロール設定を削除する関数
	function removeDiceRoll(id: string) {
		updateSession((session) => {
			if (session.diceRolls) {
				session.diceRolls = session.diceRolls.filter((d) => d.id !== id);
			}
		});
	}

	// 特定のダイスロール設定のプロパティを更新する関数
	function handleDiceRollChange(
		diceRollId: string,
		field: 'isEnabled' | 'instructionText' | 'diceCount' | 'diceType',
		value: boolean | string | number
	) {
		updateSession((session) => {
			const diceRollToUpdate = session.diceRolls?.find((d) => d.id === diceRollId);
			if (!diceRollToUpdate) return;

			if (field === 'diceCount' || field === 'diceType') {
				diceRollToUpdate[field] = Math.max(1, Number(value));
			} else {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				diceRollToUpdate[field] = value;
			}
		});
	}
</script>

<Section title="ダイスロール設定">
	<p class="mb-3 text-xs text-text-off">常時ダイスロールを同時に送信します。</p>

	<!-- ダイスロール設定のリスト -->
	<div class="space-y-4">
		{#if $currentSession?.diceRolls}
			{#each $currentSession.diceRolls as diceRoll (diceRoll.id)}
				<div class="space-y-3 rounded-lg border border-stone-600 bg-transparent p-4">
					<div class="flex items-center justify-between">
						<h4 class="font-semibold text-text-main">ダイスロール</h4>
						<button
							type="button"
							class="rounded-md p-1 text-text-off hover:bg-bg-hover hover:text-text-main focus:ring-2 focus:ring-stone-500 focus:outline-none"
							on:click={() => removeDiceRoll(diceRoll.id)}
							aria-label="Remove dice roll"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<!-- 指示文章 -->
					<div>
						<Textarea
							id="instructionText-{diceRoll.id}"
							label="指示文章"
							class="w-full"
							placeholder="例: 必要時に値を使用してください"
							rows={1}
							value={diceRoll.instructionText}
							on:input={(e) =>
								handleDiceRollChange(
									diceRoll.id,
									'instructionText',
									(e.target as HTMLTextAreaElement).value
								)}
						/>
					</div>

					<div class="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
						<div class="flex items-center gap-2">
							<Input
								type="number"
								id="diceCount-{diceRoll.id}"
								label="ダイスの数"
								min="1"
								class="w-24"
								value={diceRoll.diceCount}
								on:input={(e) =>
									handleDiceRollChange(
										diceRoll.id,
										'diceCount',
										(e.target as HTMLInputElement).value
									)}
							/>
						</div>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								id="diceType-{diceRoll.id}"
								label="ダイスの面"
								min="1"
								placeholder="例: 6, 100"
								class="w-24"
								value={diceRoll.diceType}
								on:input={(e) =>
									handleDiceRollChange(
										diceRoll.id,
										'diceType',
										(e.target as HTMLInputElement).value
									)}
							/>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<Button class="mt-4" on:click={addDiceRoll}>+ ダイスロールを追加</Button>
</Section>

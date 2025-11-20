<!-- src/lib/components/settings/StructuredOutputSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	export let currentSession: Readable<Session | undefined>;

	const sessionId = derived(page, ($page) => $page.params.id);
	const session = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);
	const goodwill = derived(session, ($session) => $session?.featureSettings.goodwill);
	const apiMode = derived(
		currentSession,
		($currentSession) => $currentSession?.featureSettings.apiMode
	);

	function handleDescriptionChange(event: Event) {
		const newDescription = (event.target as HTMLTextAreaElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.descriptionForAI = newDescription;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function handleThresholdChange(index: number, field: 'level' | 'prompt_addon', event: Event) {
		const newValue = (event.target as HTMLInputElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				const threshold = sessionToUpdate.featureSettings.goodwill.thresholds[index];
				if (field === 'level') {
					threshold.level = Number(newValue);
				} else {
					threshold.prompt_addon = newValue;
				}
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function addThreshold() {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.push({ level: 0, prompt_addon: '' });
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function removeThreshold(index: number) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.splice(index, 1);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

<Section title="構造化出力モード（非推奨・試験版）">
	{#if $apiMode === 'oneStepFC'}
		<div class="mt-4 space-y-4 border-t border-gray-600 pt-4">
			<div>
				<Textarea
					id="goodwill-desc"
					label="AIへの指示 (description)"
					placeholder="例: キャラクターの好感度の増減を2から-2までの5段階評価"
					value={$goodwill?.descriptionForAI || ''}
					on:input={handleDescriptionChange}
				/>
			</div>
			<div>
				<h3 class="mb-2 font-medium text-gray-200">好感度によるAIの応答変化ルール</h3>
				<div class="space-y-3">
					{#if $goodwill}
						{#each $goodwill.thresholds as threshold, i (i)}
							<div class="flex items-start gap-2 rounded-md border border-gray-600 bg-gray-800 p-2">
								<div class="flex-none">
									<Input
										id="level-{i}"
										type="number"
										label="Level"
										class="w-24"
										value={threshold.level}
										on:input={(e) => handleThresholdChange(i, 'level', e)}
									/>
								</div>
								<div class="flex-grow">
									<Textarea
										id="prompt-{i}"
										label="追加プロンプト"
										class="h-20 w-full"
										placeholder="このレベルの時にAIに追加される指示"
										value={threshold.prompt_addon}
										on:input={(e) => handleThresholdChange(i, 'prompt_addon', e)}
									/>
								</div>
								<Button
									variant="danger"
									class="mt-8 rounded-full px-2 py-1 text-xs"
									on:click={() => removeThreshold(i)}
									title="Remove threshold {i}">✕</Button
								>
							</div>
						{/each}
					{/if}
					<Button variant="primary" on:click={addThreshold}>+ ルールを追加</Button>
				</div>
			</div>
		</div>
	{/if}
</Section>

<!-- src/lib/components/settings/StatusSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { generateUUID } from '$lib/utils';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';

	const sessionId = derived(page, ($page) => $page.params.id);
	const session = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	function addCustomStatus() {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				// customStatusesがなければ初期化
				if (!sessionToUpdate.customStatuses) {
					sessionToUpdate.customStatuses = [];
				}
				sessionToUpdate.customStatuses.push({
					id: generateUUID(),
					name: '',
					currentValue: '0',
					mode: 'set',
					isVisible: true
				});
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function removeCustomStatus(id: string) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.customStatuses) {
				sessionToUpdate.customStatuses = sessionToUpdate.customStatuses.filter((s) => s.id !== id);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function handleCustomStatusChange(id: string, field: 'name' | 'currentValue', event: Event) {
		const newValue = (event.target as HTMLInputElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			const statusToUpdate = sessionToUpdate?.customStatuses?.find((s) => s.id === id);
			if (statusToUpdate) {
				statusToUpdate[field] = newValue;
				if (sessionToUpdate) {
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
			}
			return allSessions;
		});
	}

	function handleCustomStatusModeChange(id: string, newMode: 'add' | 'set') {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			const statusToUpdate = sessionToUpdate?.customStatuses?.find((s) => s.id === id);
			if (statusToUpdate) {
				statusToUpdate.mode = newMode;
				if (sessionToUpdate) {
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
			}
			return allSessions;
		});
	}

	function handleCustomStatusVisibilityChange(id: string, isVisible: boolean) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			const statusToUpdate = sessionToUpdate?.customStatuses?.find((s) => s.id === id);
			if (statusToUpdate) {
				statusToUpdate.isVisible = isVisible;
				if (sessionToUpdate) {
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
			}
			return allSessions;
		});
	}
</script>

<Section title="ステータス設定">
	<p class="mb-3 text-xs text-text-off">
		AIに `&#123;&#123;ステータス名: 値&#125;&#125;`
		のように指示すると、各ステータスで設定された計算方法で値が変動します。
	</p>
	<div class="space-y-4">
		{#if $session?.customStatuses}
			{#each $session.customStatuses as status (status.id)}
				<div class="rounded-lg border border-stone-700 bg-transparent p-4">
					<div class="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
						<!-- 行 1: 入力欄 -->
						<Input
							type="text"
							class="w-full"
							placeholder="ステータス名"
							value={status.name}
							on:input={(e) => handleCustomStatusChange(status.id, 'name', e)}
						/>
						<Input
							type="text"
							class="w-full"
							placeholder="現在の値"
							value={status.currentValue}
							on:input={(e) => handleCustomStatusChange(status.id, 'currentValue', e)}
						/>
						<button
							type="button"
							class="rounded-md p-1 text-text-off hover:bg-bg-hover hover:text-text-main focus:ring-2 focus:ring-stone-500 focus:outline-none"
							on:click={() => removeCustomStatus(status.id)}
							aria-label="Remove status {status.name}"
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

					<!-- 行 2: オプション -->
					<div
						class="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-stone-700 pt-3"
					>
						<Toggle
							id="mode-{status.id}"
							label="計算方法"
							offText="加算"
							onText="上書き"
							checked={status.mode === 'set'}
							on:change={(e) =>
								handleCustomStatusModeChange(status.id, e.detail.checked ? 'set' : 'add')}
						/>
						<Toggle
							label="画面に表示する"
							checked={status.isVisible}
							on:change={(e) => handleCustomStatusVisibilityChange(status.id, e.detail.checked)}
						/>
					</div>
				</div>
			{/each}
		{/if}
	</div>
	<Button class="mt-4" on:click={addCustomStatus}>+ ステータスを追加</Button>
</Section>

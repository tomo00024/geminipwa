<!-- src/lib/components/settings/StatusSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';

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
					id: crypto.randomUUID(),
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

<div class="space-y-4">
	<h3 class="font-medium">ステータス設定</h3>
	<div>
		<p class="mb-3 text-xs text-gray-600">
			AIに `&#123;&#123;ステータス名: 値&#125;&#125;`
			のように指示すると、各ステータスで設定された計算方法で値が変動します。
		</p>
		<div class="space-y-3">
			{#if $session?.customStatuses}
				{#each $session.customStatuses as status (status.id)}
					<div
						class="grid grid-cols-[1fr_1fr_auto] items-center gap-x-3 gap-y-1 rounded-md border bg-gray-50 p-2"
					>
						<!-- 行 1: 入力欄 -->
						<input
							type="text"
							class="input input-bordered w-full"
							placeholder="ステータス名"
							value={status.name}
							on:input={(e) => handleCustomStatusChange(status.id, 'name', e)}
						/>
						<input
							type="text"
							class="input input-bordered w-full"
							placeholder="現在の値"
							value={status.currentValue}
							on:input={(e) => handleCustomStatusChange(status.id, 'currentValue', e)}
						/>
						<button
							class="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-300"
							on:click={() => removeCustomStatus(status.id)}
							aria-label="Remove status {status.name}"
						>
							✕
						</button>

						<!-- 行 2: オプション -->
						<div
							class="col-span-full mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pl-1"
						>
							<div class="flex items-center gap-4">
								<span class="text-xs text-gray-600">計算:</span>
								<label class="flex cursor-pointer items-center gap-1.5">
									<input
										type="radio"
										name="mode-{status.id}"
										value="add"
										checked={status.mode === 'add'}
										on:change={() => handleCustomStatusModeChange(status.id, 'add')}
									/>
									<span class="text-sm">加算</span>
								</label>
								<label class="flex cursor-pointer items-center gap-1.5">
									<input
										type="radio"
										name="mode-{status.id}"
										value="set"
										checked={status.mode === 'set'}
										on:change={() => handleCustomStatusModeChange(status.id, 'set')}
									/>
									<span class="text-sm">上書き</span>
								</label>
							</div>
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									class="checkbox checkbox-sm"
									checked={status.isVisible}
									on:change={(e) =>
										handleCustomStatusVisibilityChange(status.id, e.currentTarget.checked)}
								/>
								<span class="text-sm">画面に表示する</span>
							</label>
						</div>
					</div>
				{/each}
			{/if}
		</div>
		<button
			class="mt-3 rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
			on:click={addCustomStatus}
		>
			+ ステータスを追加
		</button>
	</div>
</div>

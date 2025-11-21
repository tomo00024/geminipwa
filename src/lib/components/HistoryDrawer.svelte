<!-- src/lib/components/HistoryDrawer.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { sessions } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createNewSession } from '$lib/utils';
	import Button from '$lib/components/ui/Button.svelte';

	const dispatch = createEventDispatcher();

	function close() {
		dispatch('close');
	}

	function handleNewSession(): void {
		const newSession = createNewSession();
		sessions.update((currentSessions) => [...currentSessions, newSession]);
		goto(`${base}/session/${newSession.id}`);
		close();
	}

	function handleDeleteSession(id: string, event: Event): void {
		event.stopPropagation();
		if (!confirm('このセッションを削除しますか？この操作は取り消せません。')) {
			return;
		}
		sessions.update((currentSessions) => currentSessions.filter((session) => session.id !== id));
	}

	function handleSessionClick(id: string): void {
		goto(`${base}/session/${id}`);
		close();
	}
</script>

<div class="flex h-full flex-col text-gray-200">
	<!-- 新規セッションボタン -->
	<div class="mb-4">
		<Button variant="primary" class="w-full justify-center" on:click={handleNewSession}>
			新規セッション
		</Button>
	</div>

	<!-- セッションリスト -->
	<div class="flex-1">
		{#if $sessions.length === 0}
			<p class="mt-4 text-center text-gray-500">履歴はありません。</p>
		{:else}
			<ul class="space-y-2">
				{#each [...$sessions].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()) as session (session.id)}
					<li>
						<div
							class="group flex cursor-pointer items-center justify-between rounded-lg border border-gray-700 bg-transparent p-3 transition hover:bg-gray-800/50"
							on:click={() => handleSessionClick(session.id)}
							on:keydown={(e) => e.key === 'Enter' && handleSessionClick(session.id)}
							role="button"
							tabindex="0"
						>
							<div class="flex-grow overflow-hidden">
								<div class="truncate font-semibold text-gray-200">{session.title}</div>
								<div class="mt-0.5 text-xs text-gray-400">
									{new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
								</div>
							</div>
							<div class="ml-2">
								<button
									class="rounded p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
									on:click={(e) => handleDeleteSession(session.id, e)}
									title="削除"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

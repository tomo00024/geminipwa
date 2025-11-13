<!-- src/routes/+page.svelte -->

<script lang="ts">
	import { sessions } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createNewSession } from '$lib/utils';

	/**
	 * 「新しいセッションを開始」ボタンがクリックされたときに実行される関数
	 */
	function handleNewSession(): void {
		const newSession = createNewSession();
		sessions.update((currentSessions) => [...currentSessions, newSession]);
		goto(`${base}/session/${newSession.id}`);
	}

	/**
	 * 指定されたIDのセッションを削除する関数
	 * @param id 削除するセッションのID
	 */
	function handleDeleteSession(id: string): void {
		if (!confirm('このセッションを削除しますか？この操作は取り消せません。')) {
			return;
		}
		sessions.update((currentSessions) => currentSessions.filter((session) => session.id !== id));
	}
</script>

<div class="flex h-screen flex-col p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">履歴画面</h1>
		<div class="flex items-center gap-4">
			<a
				href="{base}/settings"
				class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
			>
				アプリ設定
			</a>
			<button
				on:click={handleNewSession}
				class="rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
			>
				新しいセッションを開始
			</button>
		</div>
	</div>

	{#if $sessions.length === 0}
		<p class="text-gray-500">
			まだセッションがありません。「新しいセッションを開始」ボタンから始めましょう。
		</p>
	{:else}
		<ul class="space-y-3">
			<!-- ▼▼▼【変更】ここから下の #each ブロック内を修正 ▼▼▼ -->
			{#each [...$sessions].reverse() as session (session.id)}
				<li class="flex items-center justify-between rounded-lg bg-white p-4 shadow">
					<a href="{base}/session/{session.id}" class="flex-grow">
						<div class="text-sm text-gray-600">
							最終更新: {new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
						</div>
						<!-- (将来的にタイトルなどを表示する場合はここに追加) -->
					</a>
					<button
						on:click={() => handleDeleteSession(session.id)}
						class="flex-shrink-0 rounded bg-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-300"
						title="このセッションを削除"
					>
						削除
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

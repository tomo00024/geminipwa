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
		<h1 class="text-xl font-bold text-gray-700">履歴画面</h1>
		<div class="flex items-center gap-4">
			<a
				href="{base}/settings"
				class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
			>
				アプリ設定
			</a>
			<button
				on:click={handleNewSession}
				class="rounded bg-[#133a0e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0d2c0b]"
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
			{#each [...$sessions].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()) as session (session.id)}
				<li class="flex items-center justify-between rounded-lg bg-white p-4 shadow">
					<a href="{base}/session/{session.id}" class="flex-grow overflow-hidden">
						<div class="text-m truncate font-semibold text-gray-800">{session.title}</div>
						<div class="mt-1 text-sm text-gray-600">
							最終更新: {new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
						</div>
					</a>
					<button
						on:click|stopPropagation={(e) => {
							e.preventDefault(); // aタグの遷移を防ぐ
							handleDeleteSession(session.id);
						}}
						class="ml-4 flex-shrink-0 rounded bg-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-300"
						title="このセッションを削除"
					>
						削除
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

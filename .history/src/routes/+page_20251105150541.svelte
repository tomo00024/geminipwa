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
		// ★★★ 複雑なオブジェクト作成ロジックを、ヘルパー関数の呼び出しに置き換え ★★★
		const newSession = createNewSession();

		// sessionsストアを更新する
		sessions.update((currentSessions) => [...currentSessions, newSession]);

		// 新しく作成したセッションの対話画面へ遷移
		goto(`${base}/session/${newSession.id}`);
	}
</script>

<div class="container mx-auto p-4 max-w-2xl">
	<!-- ▼▼▼ ここからヘッダーの修正 ▼▼▼ -->
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">対話セッション履歴</h1>
		<div class="flex items-center gap-4">
			<a
				href="{base}/settings"
				class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
			>
				アプリ設定 <!-- ← テキストを変更 -->
			</a>
			<button
				on:click={handleNewSession}
				class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
			>
				新しいセッションを開始
			</button>
		</div>
	</div>
	<!-- ▲▲▲ ここまでヘッダーの修正 ▲▲▲ -->

	{#if $sessions.length === 0}
		<p class="text-gray-500">まだセッションがありません。「新しいセッションを開始」ボタンから始めましょう。</p>
	{:else}
		<ul class="space-y-3">
			{#each [...$sessions].reverse() as session (session.id)}
				<li>
					<a
						href="{base}/session/{session.id}"
						class="block p-4 bg-white rounded-lg shadow hover:bg-gray-100 transition-colors"
					>
						<div class="text-sm text-gray-600">
							最終更新: {new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
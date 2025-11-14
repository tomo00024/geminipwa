<!-- src/lib/components/ChatLayout.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { createEventDispatcher, tick } from 'svelte';

	export let userInput: string;
	export let isLoading: boolean;
	export let handleSubmit: () => Promise<void>;
	export let sessionTitle: string;

	const sessionId = $page.params.id;
	const dispatch = createEventDispatcher();

	let isEditing = false;
	let editingTitle = '';
	let inputElement: HTMLInputElement;

	/**
	 * 編集モードを開始する
	 */
	async function startEditing() {
		isEditing = true;
		editingTitle = sessionTitle;
		await tick();
		inputElement?.focus();
		inputElement?.select();
	}

	/**
	 * タイトルの変更を保存する
	 */
	function saveTitle() {
		if (editingTitle.trim() && editingTitle !== sessionTitle) {
			dispatch('updateTitle', { title: editingTitle.trim() });
		}
		isEditing = false;
	}

	/**
	 * キーボード操作をハンドルする
	 */
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveTitle();
		} else if (event.key === 'Escape') {
			isEditing = false;
		}
	}
</script>

<div class="flex h-[100dvh] flex-col overflow-hidden p-4">
	<div class="flex-shrink-0">
		<!-- ▼▼▼【変更】ここから下のヘッダーブロック全体を変更 ▼▼▼ -->
		<div class="mb-4 flex items-center gap-4">
			<!-- 履歴に戻るボタン (縮まないようにする) -->
			<a
				href="{base}/"
				class="flex-shrink-0 rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
			>
				履歴に戻る
			</a>

			<!-- タイトル（可変幅で、伸び縮みするエリア） -->
			<div class="min-w-0 flex-1">
				{#if isEditing}
					<input
						bind:this={inputElement}
						type="text"
						bind:value={editingTitle}
						on:keydown={handleKeyDown}
						on:blur={saveTitle}
						class="text-m w-full rounded-md border border-gray-400 bg-white px-2 py-1 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					/>
				{:else}
					<button
						type="button"
						on:click={startEditing}
						class="text-m w-full truncate rounded-md px-2 py-1 text-left font-bold text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
						title={sessionTitle}
					>
						{sessionTitle}
					</button>
				{/if}
			</div>

			<!-- 右寄せのアイテム (縮まないようにする) -->
			<div class="flex flex-shrink-0 items-center gap-4">
				<a
					href="{base}/settings?from=session/{sessionId}"
					class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
				>
					アプリ設定
				</a>
				<a
					href="{base}/session/{sessionId}/settings"
					class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
				>
					セッション設定
				</a>
			</div>
		</div>
		<!-- ▲▲▲【変更】ここまで ▲▲▲ -->
	</div>

	<!-- コンテンツ表示エリア (変更なし) -->
	<div class="mb-4 flex-1 overflow-y-auto">
		<slot />
	</div>

	<!-- 入力フォーム (変更なし) -->
	<div class="flex-shrink-0 px-4">
		<form on:submit|preventDefault={handleSubmit} class="flex gap-2">
			<input
				type="text"
				bind:value={userInput}
				placeholder="メッセージを入力..."
				class="input flex-1 rounded-lg border border-gray-600 text-gray-200"
				disabled={isLoading}
			/>
			<button type="submit" class="btn btn-primary" disabled={isLoading || !userInput.trim()}>
				{#if isLoading}
					送信中...
				{:else}
					送信
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
	/* スタイルブロックは変更なし */
	.input {
		padding: 0.5rem;
	}
	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		/* アニメーションを滑らかにする */
		transition: background-color 0.2s;
	}
	.btn-primary {
		background-color: #133a0e;
		color: white;
	}

	/* 有効なボタンにマウスを重ねたときの色 */
	.btn-primary:not(:disabled):hover {
		background-color: #0d2c0b;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

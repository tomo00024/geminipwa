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

	// ▼▼▼【追加】textarea要素をバインドするための変数を宣言 ▼▼▼
	let textareaElement: HTMLTextAreaElement;
	// ▲▲▲【追加】ここまで ▲▲▲

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

	/**
	 * Textareaの高さを内容に応じて自動調整する
	 */
	function adjustTextareaHeight(e: Event) {
		const target = e.currentTarget as HTMLTextAreaElement;
		target.style.height = 'auto'; // 高さを一旦リセット
		target.style.height = `${target.scrollHeight}px`; // 内容に合わせた高さに再設定
	}

	// ▼▼▼【追加】userInputが空になったら、textareaの高さをリセットするリアクティブ処理 ▼▼▼
	$: if (userInput === '' && textareaElement) {
		textareaElement.style.height = 'auto';
	}
	// ▲▲▲【追加】ここまで ▲▲▲
</script>

<div class="flex h-[100dvh] flex-col overflow-hidden p-4">
	<div class="flex-shrink-0">
		<!-- ヘッダーブロック (変更なし) -->
		<div class="mb-4 flex items-center gap-4">
			<a
				href="{base}/"
				class="flex-shrink-0 rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
			>
				履歴に戻る
			</a>
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
	</div>

	<!-- コンテンツ表示エリア (変更なし) -->
	<div class="mb-4 flex-1 overflow-y-auto">
		<slot />
	</div>

	<div class="flex-shrink-0 px-4">
		<form on:submit|preventDefault class="flex items-end gap-2">
			<!-- ▼▼▼【変更】bind:this を追加 ▼▼▼ -->
			<textarea
				bind:this={textareaElement}
				rows="1"
				bind:value={userInput}
				on:input={adjustTextareaHeight}
				placeholder={isLoading ? '送信中...' : 'メッセージを入力...'}
				class="input flex-1 rounded-lg border border-gray-600 text-gray-200"
			></textarea>
			<!-- ▲▲▲【変更】ここまで ▲▲▲ -->
			<button
				type="button"
				on:click={handleSubmit}
				class="btn btn-primary"
				disabled={isLoading || !userInput.trim()}
			>
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
		transition: background-color 0.2s;
	}
	.btn-primary {
		background-color: #133a0e;
		color: white;
	}
	.btn-primary:not(:disabled):hover {
		background-color: #0d2c0b;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	textarea.input {
		resize: none;
		overflow-y: auto;
		line-height: 1.5;
		max-height: 25vh;
	}
</style>

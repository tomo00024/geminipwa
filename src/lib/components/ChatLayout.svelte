<!-- src/lib/components/ChatLayout.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { beforeNavigate } from '$app/navigation';
	import { createEventDispatcher, tick, onMount, onDestroy } from 'svelte';
	import { appSettings } from '$lib/stores';
	import { chatSessionStore } from '$lib/chatSessionStore';
	import { ui } from '$lib/stores/ui';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import SessionSettings from '$lib/components/session/SessionSettings.svelte';
	import PublishModal from '$lib/components/PublishModal.svelte';
	import FindModal from '$lib/components/FindModal.svelte';
	import HistoryDrawer from '$lib/components/HistoryDrawer.svelte';
	import { sessions } from '$lib/stores';

	export let userInput: string;
	export let isLoading: boolean;
	export let handleSubmit: () => Promise<void>;
	export let sessionTitle: string;
	export let loadPrevious: (() => Promise<void> | void) | undefined = undefined;

	$: currentSessionId = $page.params.id;

	const sessionId = $page.params.id;
	const dispatch = createEventDispatcher();

	let isEditing = false;
	let editingTitle = '';
	let inputElement: HTMLInputElement;
	let isSettingsOpen = false;

	let textareaElement: HTMLTextAreaElement;

	// スクロール制御用
	let scrollContainer: HTMLDivElement;
	let saveTimeout: any;
	let isLoadingPrevious = false;

	async function startEditing() {
		isEditing = true;
		editingTitle = sessionTitle;
		await tick();
		inputElement?.focus();
		inputElement?.select();
	}

	function saveTitle() {
		if (editingTitle.trim() && editingTitle !== sessionTitle) {
			dispatch('updateTitle', { title: editingTitle.trim() });
		}
		isEditing = false;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveTitle();
		} else if (event.key === 'Escape') {
			isEditing = false;
		}
	}

	function adjustTextareaHeight(e: Event) {
		const target = e.currentTarget as HTMLTextAreaElement;
		target.style.height = 'auto';
		target.style.height = `${target.scrollHeight}px`;
	}

	$: if (userInput === '' && textareaElement) {
		textareaElement.style.height = 'auto';
	}

	// =================================================================
	// スクロール位置保存・復元ロジック
	// =================================================================

	function getStorageKey(id: string) {
		return `chat_scroll_pos_${id}`;
	}

	function saveScrollPosition() {
		if (!scrollContainer || !currentSessionId) return;

		const key = getStorageKey(currentSessionId);
		const scrollTop = scrollContainer.scrollTop;

		try {
			sessionStorage.setItem(key, scrollTop.toString());
		} catch (e) {
			console.error(e);
		}
	}

	async function handleScroll() {
		if (saveTimeout) clearTimeout(saveTimeout);
		// 連打防止：スクロールが止まってから保存
		saveTimeout = setTimeout(() => {
			saveScrollPosition();
		}, 500);

		// 無限スクロール (ページネーション)
		if (scrollContainer && loadPrevious && !isLoadingPrevious) {
			if (scrollContainer.scrollTop < 50) {
				isLoadingPrevious = true;
				const oldHeight = scrollContainer.scrollHeight;
				const oldTop = scrollContainer.scrollTop; // 0に近いはずだが念のため

				await loadPrevious();
				await tick();

				// スクロール位置の補正
				const newHeight = scrollContainer.scrollHeight;
				scrollContainer.scrollTop = newHeight - oldHeight + oldTop;

				isLoadingPrevious = false;
			}
		}
	}

	// 画面遷移直前（DOMが消える前）に保存
	beforeNavigate(() => {
		if (saveTimeout) clearTimeout(saveTimeout);
		saveScrollPosition();
	});

	async function restoreScrollPosition() {
		if (!currentSessionId) return;
		await tick();

		const key = getStorageKey(currentSessionId);
		const savedPos = sessionStorage.getItem(key);

		if (savedPos === null || !scrollContainer) return;

		const targetPos = parseInt(savedPos, 10);
		if (targetPos >= 0) {
			scrollContainer.scrollTop = targetPos;
		}
	}

	onMount(() => {
		restoreScrollPosition();
		// 画像読み込み等によるレイアウトズレ対策（念のため）
		setTimeout(() => restoreScrollPosition(), 300);
	});

	onDestroy(() => {
		if (saveTimeout) clearTimeout(saveTimeout);
	});

	// リロード対策
	function handleBeforeUnload() {
		saveScrollPosition();
	}

	let isMenuOpen = false;
	let isPublishModalOpen = false;
	let isFindModalOpen = false;
	let isHistoryDrawerOpen = false;
	let isSubmitting = false;

	function openMenu() {
		isMenuOpen = true;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	function handleOpenSessionSettings() {
		closeMenu();
		isSettingsOpen = true;
	}

	function handleOpenAppSettings() {
		closeMenu();
		ui.openSettingsModal();
	}

	function handleOpenPublishModal() {
		closeMenu();
		isPublishModalOpen = true;
	}

	function handleOpenFindModal() {
		closeMenu();
		isFindModalOpen = true;
	}

	function handleOpenHistoryDrawer() {
		closeMenu();
		isHistoryDrawerOpen = true;
	}

	async function handleFinalPublish(event: CustomEvent) {
		const { contentScope } = event.detail;
		const sessionData = $chatSessionStore.session;

		if (!sessionData || !contentScope) return;

		appSettings.update((settings) => ({
			...settings,
			lastUsedAuthorName: event.detail.authorName || ''
		}));
		isSubmitting = true;

		try {
			const response = await fetch(`${base}/api/upload`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...event.detail,
					sessionId: sessionData.id,
					sessionData: sessionData
				})
			});

			if (!response.ok) {
				const errorResponse = await response.json();
				let errorMessage = errorResponse.message || 'アップロードに失敗しました。';

				if (errorResponse.errors) {
					const detailedErrors = Object.values(errorResponse.errors).flat().join('\n');
					if (detailedErrors) {
						errorMessage += `\n\n詳細:\n${detailedErrors}`;
					}
				}
				throw new Error(errorMessage);
			}

			sessions.update((currentSessions) =>
				currentSessions.map((session) => {
					if (session.id === sessionData.id) {
						return { ...session, title: event.detail.title };
					}
					return session;
				})
			);

			// 現在のセッションストアも更新
			const updatedSession = { ...sessionData, title: event.detail.title };
			chatSessionStore.init(updatedSession);

			const result = await response.json();
			alert(`公開が完了しました！`);
			isPublishModalOpen = false;
		} catch (error: any) {
			console.error(error);
			alert(`エラー: ${error.message}`);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:window on:beforeunload={handleBeforeUnload} />

<div class="flex h-[100dvh] flex-col overflow-hidden">
	<div class="flex-shrink-0 p-4">
		<!-- ヘッダーブロック  -->
		<div class="mb-4 flex items-center gap-4">
			<!-- 左側: 空白 (以前の履歴ボタンは削除) -->

			<!-- 中央: タイトル (編集可能) -->
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
				<!-- トークン数表示 (設定で有効な場合のみ) -->
				{#if $appSettings.ui.showTokenCount && $chatSessionStore.session}
					{@const logs = $chatSessionStore.session.logs}
					{@const sessionTotalTokens = logs.reduce(
						(acc, log) => acc + (log.tokenUsage?.total || 0),
						0
					)}
					{@const lastAiLog = [...logs].reverse().find((l) => l.speaker === 'ai' && l.tokenUsage)}
					{@const lastResponseTokens = lastAiLog?.tokenUsage?.total || 0}
					<div class="ml-2 flex flex-col gap-0.5 text-gray-400" title="Last / Total Tokens">
						<!-- Last Response -->
						<div class="flex items-center justify-end gap-1.5">
							<span class="text-[9px] font-bold tracking-wider text-gray-500 uppercase">Last</span>
							<span class="text-[10px] font-medium tabular-nums">
								{lastResponseTokens > 999
									? (lastResponseTokens / 1000).toFixed(1) + 'k'
									: lastResponseTokens}
							</span>
						</div>
						<!-- Total Session -->
						<div class="flex items-center justify-end gap-1.5">
							<span class="text-[9px] font-bold tracking-wider text-gray-500 uppercase">Total</span>
							<span class="text-[10px] font-medium tabular-nums">
								{sessionTotalTokens > 999
									? (sessionTotalTokens / 1000).toFixed(1) + 'k'
									: sessionTotalTokens}
							</span>
						</div>
					</div>
				{/if}
				<!-- ハンバーガーメニューアイコン -->
				<button
					type="button"
					on:click={openMenu}
					class="rounded p-2 text-gray-600 hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none"
					aria-label="Menu"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>

	<!-- コンテンツ表示エリア -->
	<div
		bind:this={scrollContainer}
		on:scroll={handleScroll}
		class="mb-4 flex-1 overflow-y-auto px-4"
	>
		<slot />
	</div>

	<div class="flex-shrink-0 px-4 pb-4">
		<form on:submit|preventDefault class="flex items-end gap-2">
			<textarea
				bind:this={textareaElement}
				rows="1"
				bind:value={userInput}
				on:input={adjustTextareaHeight}
				on:keydown={(e) => {
					if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
						e.preventDefault();
						handleSubmit();
					}
				}}
				placeholder={isLoading ? '送信中...' : 'メッセージを入力...'}
				class="flex-1 resize-none overflow-y-auto rounded-lg border border-gray-600 p-2 leading-normal text-gray-200"
				style="max-height: 25vh;"
			></textarea>
			<button
				type="button"
				on:click={handleSubmit}
				class="cursor-pointer rounded-lg border-none bg-btn-primary-bg px-4 py-2 text-btn-primary-text transition-colors duration-200 hover:bg-btn-primary-hover-bg disabled:cursor-not-allowed disabled:opacity-50"
				disabled={isLoading || !userInput.trim()}
			>
				{#if isLoading}
					<div class="flex h-6 w-8 items-center justify-center">
						<LoadingIndicator size="sm" color="bg-gray-400" />
					</div>
				{:else}
					送信
				{/if}
			</button>
		</form>
	</div>
</div>

<!-- メニュードロワー -->
<Drawer bind:isOpen={isMenuOpen} title="メニュー" width="max-w-[240px]">
	<div class="flex flex-col gap-2">
		<button
			type="button"
			on:click={handleOpenHistoryDrawer}
			class="block w-full rounded-md px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
		>
			履歴画面
		</button>
		<button
			type="button"
			on:click={handleOpenFindModal}
			class="block w-full rounded-md px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
		>
			探す
		</button>
		<button
			type="button"
			on:click={handleOpenPublishModal}
			class="block w-full rounded-md px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
		>
			投稿
		</button>
		<button
			type="button"
			on:click={handleOpenSessionSettings}
			class="block w-full rounded-md px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
		>
			セッション設定
		</button>
		<button
			type="button"
			on:click={handleOpenAppSettings}
			class="block w-full rounded-md px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
		>
			アプリ設定
		</button>
	</div>
</Drawer>

<!-- セッション設定ドロワー -->
<Drawer bind:isOpen={isSettingsOpen} title="セッション設定" width="max-w-2xl">
	{#if $chatSessionStore.session}
		<SessionSettings currentSession={$chatSessionStore.session} />
	{/if}
</Drawer>

{#if isPublishModalOpen && $chatSessionStore.session}
	<PublishModal
		busy={isSubmitting}
		initialTitle={$chatSessionStore.session.title}
		on:submit={handleFinalPublish}
		on:close={() => (isPublishModalOpen = false)}
	/>
{/if}

{#if isFindModalOpen}
	<FindModal on:close={() => (isFindModalOpen = false)} />
{/if}

<Drawer bind:isOpen={isHistoryDrawerOpen} title="履歴">
	<HistoryDrawer on:close={() => (isHistoryDrawerOpen = false)} />
</Drawer>

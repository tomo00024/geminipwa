<!-- src/routes/session/[id]/+page.svelte -->
<script lang="ts">
	// --- SvelteKitのコア機能とストアをインポート ---
	import { page } from '$app/stores';
	import { sessions, appSettings } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { chatSessionStore } from '$lib/chatSessionStore';

	// --- 外部サービスと型定義、ヘルパー関数をインポート ---
	import { initializeAndStoreImageRules } from '$lib/utils/imageUrlCorrector';
	import { sendUserMessage, retryMessage } from '$lib/services/chatService';

	// --- UIコンポーネントをインポート ---
	import StandardChatView from '$lib/components/StandardChatView.svelte';
	import GameChatView from '$lib/components/GameChatView.svelte';
	import ChatLayout from '$lib/components/ChatLayout.svelte';

	// --- リアクティブなストア定義 ---
	$: if ($currentSession) {
		chatSessionStore.init($currentSession);
	}
	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);
	const activeApiKey = derived(appSettings, ($appSettings) => {
		if (!$appSettings.activeApiKeyId || !$appSettings.apiKeys) {
			return null;
		}
		const activeKey = $appSettings.apiKeys.find((k) => k.id === $appSettings.activeApiKeyId);
		return activeKey ? activeKey.key : null;
	});
	const model = derived(appSettings, ($appSettings) => $appSettings.model);

	onMount(() => {
		const sessionExists = $sessions.some((s) => s.id === $page.params.id);
		if (!sessionExists) {
			alert('指定されたセッションが見つかりませんでした。');
			goto(base || '/');
		}
	});

	// --- コンポーネントの状態変数 ---
	let userInput = '';
	let isLoading = false;
	let lastProcessedSessionId: string | null = null;
	let lastProcessedLogCount: number = 0;
	let displayLimit = 20;

	async function handleLoadPrevious() {
		// 読み込むデータが残っている場合のみ増やす
		if ($chatSessionStore.displayableLogs.length > displayLimit) {
			displayLimit += 20;
		}
	}

	$: if ($currentSession) {
		const currentId = $currentSession.id;
		const currentLogCount = $currentSession.logs.length;
		const hasSessionChanged = currentId !== lastProcessedSessionId;
		const isFirstPost = lastProcessedLogCount === 0 && currentLogCount > 0;

		if (hasSessionChanged || isFirstPost) {
			chatSessionStore.init($currentSession);
			initializeAndStoreImageRules($currentSession);
			lastProcessedSessionId = currentId;
			lastProcessedLogCount = currentLogCount;
			displayLimit = 20;
		}
	}

	async function handleSubmit() {
		if (isLoading || !userInput.trim() || !$currentSession) return;
		if (!$activeApiKey || !$model) {
			alert('APIキーまたはモデルが設定されていません。');
			return;
		}

		const currentUserInput = userInput;
		userInput = '';
		isLoading = true;

		try {
			await sendUserMessage($currentSession, currentUserInput);
		} catch (error) {
			console.error('Error sending message:', error);
			alert(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
			// エラー時は入力を復元してもいいかもしれないが、今回はシンプルにする
		} finally {
			isLoading = false;
		}
	}

	async function handleRetry(userMessageId: string) {
		if (isLoading || !$currentSession) return;
		if (!$activeApiKey || !$model) {
			alert('APIキーまたはモデルが設定されていません。');
			return;
		}

		isLoading = true;
		try {
			await retryMessage($currentSession, userMessageId);
		} catch (error) {
			console.error('Error retrying message:', error);
			alert(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isLoading = false;
		}
	}

	function handleUpdateTitle(event: CustomEvent<{ title: string }>): void {
		const newTitle = event.detail.title;
		if (!$currentSession || !newTitle) return;

		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $currentSession!.id);
			if (sessionToUpdate) {
				sessionToUpdate.title = newTitle;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

{#if $currentSession}
	<ChatLayout
		bind:userInput
		{isLoading}
		{handleSubmit}
		sessionTitle={$currentSession.title}
		on:updateTitle={handleUpdateTitle}
		loadPrevious={handleLoadPrevious}
	>
		{#if $currentSession.viewMode === 'game'}
			<GameChatView currentSession={$currentSession} />
		{:else}
			<StandardChatView {handleRetry} limit={displayLimit} />
		{/if}
	</ChatLayout>
{:else}
	<div class="flex h-screen items-center justify-center">
		<p>セッションを読み込んでいます...</p>
	</div>
{/if}

<!-- src/routes/session/[id]/+page.svelte -->
<script lang="ts">
	// --- SvelteKitのコア機能とストアをインポート ---
	import { page } from '$app/stores';
	import { sessions, appSettings } from '$lib/stores';
	import { derived, get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { chatSessionStore } from '$lib/chatSessionStore';

	// --- 外部サービスと型定義、ヘルパー関数をインポート ---
	import { callGeminiApi } from '$lib/geminiService';
	import { processMessageIntoPages } from '$lib/utils/messageProcessor';
	import type { Trigger, Log, FeatureSettings, AppSettings } from '$lib/types';
	import { generateUUID } from '$lib/utils';

	// --- UIコンポーネントをインポート ---
	import StandardChatView from '$lib/components/StandardChatView.svelte';
	import GameChatView from '$lib/components/GameChatView.svelte';
	import ChatLayout from '$lib/components/ChatLayout.svelte';
	// --- リアクティブなストア定義 (変更なし) ---
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

	// --- コンポーネントの状態変数 (変更なし) ---
	let userInput = '';
	let isLoading = false;

	// --- ヘルパー関数 (変更なし) ---
	function buildConversationHistory(allLogs: Log[], targetLogId: string): Log[] {
		const history: Log[] = [];
		const logMap = new Map(allLogs.map((log) => [log.id, log]));
		const targetLog = logMap.get(targetLogId);
		if (!targetLog) return [];

		let currentParentId = targetLog.parentId;
		while (currentParentId) {
			const parentLog = logMap.get(currentParentId);
			if (!parentLog) break;
			history.unshift(parentLog);
			currentParentId = parentLog.parentId;
		}
		return history;
	}

	// --- API呼び出し関数 (変更なし) ---
	async function getAiResponseAndUpdate(
		contextLogs: Log[],
		finalUserInput: string,
		userMessageId: string, // 親となるユーザーメッセージのID
		isRetry: boolean,
		sessionId: string,
		featureSettings: FeatureSettings,
		activeApiKey: string,
		model: string,
		appSettings: AppSettings
	) {
		isLoading = true;
		try {
			const conversationContext = {
				logs: contextLogs.map((log) => ({ speaker: log.speaker, text: log.text })),
				featureSettings: featureSettings
			};
			const result = await callGeminiApi(
				activeApiKey,
				model,
				appSettings,
				conversationContext,
				finalUserInput
			);
			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === sessionId);
				if (sessionToUpdate) {
					const newAiResponse: Log = {
						id: generateUUID(),
						speaker: 'ai',
						text: result.responseText,
						timestamp: new Date().toISOString(),
						parentId: userMessageId,
						activeChildId: null
					};
					sessionToUpdate.logs.push(newAiResponse);
					const parentUserMessage = sessionToUpdate.logs.find((log) => log.id === userMessageId);
					if (parentUserMessage) {
						parentUserMessage.activeChildId = newAiResponse.id;
					}
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
				return allSessions;
			});
		} catch (error) {
			console.error('API Error:', error);
			alert(`エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isLoading = false;
		}
	}

	// --- メッセージ送信関数 (変更なし) ---
	async function handleSubmit() {
		if (isLoading || !userInput.trim() || !$currentSession) return;
		if (!$activeApiKey || !$model) {
			alert('APIキーまたはモデルが設定されていません。');
			return;
		}

		const currentUserInput = userInput;
		userInput = '';
		const now = new Date().toISOString();
		const allLogs = $currentSession.logs;
		const logMap = new Map(allLogs.map((log) => [log.id, log]));

		let lastLog: Log | null = null;
		if (allLogs.length > 0) {
			let currentLog = allLogs.find((log) => log.parentId === null);
			if (currentLog) {
				lastLog = currentLog;
				while (currentLog.activeChildId) {
					const nextLog = logMap.get(currentLog.activeChildId);
					if (nextLog) {
						currentLog = nextLog;
						lastLog = nextLog;
					} else {
						break;
					}
				}
			}
		}

		const parentId = lastLog ? lastLog.id : null;

		const newUserMessage: Log = {
			id: generateUUID(),
			speaker: 'user',
			text: currentUserInput,
			timestamp: now,
			parentId: parentId,
			activeChildId: null
		};

		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $currentSession.id);
			if (sessionToUpdate) {
				if (sessionToUpdate.logs.length === 0) {
					sessionToUpdate.title = currentUserInput.substring(0, 10);
				}
				sessionToUpdate.logs.push(newUserMessage);
				if (parentId) {
					const parentLog = sessionToUpdate.logs.find((log) => log.id === parentId);
					if (parentLog) {
						parentLog.activeChildId = newUserMessage.id;
					}
				}
				sessionToUpdate.lastUpdatedAt = now;
			}
			return allSessions;
		});

		const updatedLogs = get(sessions).find((s) => s.id === $currentSession.id)!.logs;
		const history = buildConversationHistory(updatedLogs, newUserMessage.id);
		await getAiResponseAndUpdate(
			history,
			currentUserInput,
			newUserMessage.id,
			false,
			$currentSession.id,
			$currentSession.featureSettings,
			$activeApiKey,
			$model,
			$appSettings
		);
	}

	// --- リトライ関数 (変更なし) ---
	async function handleRetry(userMessageId: string) {
		if (isLoading || !$currentSession) return;
		if (!$activeApiKey || !$model) {
			alert('APIキーまたはモデルが設定されていません。');
			return;
		}
		const targetUserMessage = $currentSession.logs.find((log) => log.id === userMessageId);
		if (!targetUserMessage) return;
		const history = buildConversationHistory($currentSession.logs, userMessageId);
		const userInputForRetry = targetUserMessage.text;
		await getAiResponseAndUpdate(
			history,
			userInputForRetry,
			userMessageId,
			true,
			$currentSession.id,
			$currentSession.featureSettings,
			$activeApiKey,
			$model,
			$appSettings
		);
	}

	/**
	 * ▼▼▼【追加】タイトル更新イベントを処理する関数 ▼▼▼
	 */
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
	<!-- ▼▼▼【変更】on:updateTitleイベントリスナーを追加 ▼▼▼ -->
	<ChatLayout
		bind:userInput
		{isLoading}
		{handleSubmit}
		sessionTitle={$currentSession.title}
		on:updateTitle={handleUpdateTitle}
	>
		{#if $currentSession.viewMode === 'game'}
			<GameChatView currentSession={$currentSession} />
		{:else}
			<StandardChatView {handleRetry} />
		{/if}
	</ChatLayout>
{:else}
	<div class="flex h-screen items-center justify-center">
		<p>セッションを読み込んでいます...</p>
	</div>
{/if}

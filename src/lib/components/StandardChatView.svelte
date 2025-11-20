<!-- src/lib/components/StandardChatView.svelte -->
<script lang="ts">
	import { chatSessionStore } from '$lib/chatSessionStore';
	import type { Log } from '$lib/types';
	import { appSettings } from '$lib/stores';
	import ChatBubble from './ChatBubble.svelte';

	export let handleRetry: (userMessageId: string) => Promise<void>;
	export let limit: number = 20;

	$: paginatedLogs = $chatSessionStore.displayableLogs
		? $chatSessionStore.displayableLogs.slice(-limit)
		: [];

	// イベントハンドラ
	function onStartEditing(event: CustomEvent) {
		chatSessionStore.startEditing(event.detail.id);
	}

	function onUpdateEditingText(event: CustomEvent) {
		chatSessionStore.updateEditingText(event.detail);
	}

	function onCancelEditing() {
		chatSessionStore.cancelEditing();
	}

	function onSaveEditing() {
		chatSessionStore.saveEditing();
	}

	function onDelete(event: CustomEvent) {
		chatSessionStore.deleteSingleMessage(event.detail.id);
	}

	function onRetry(event: CustomEvent) {
		// リトライ対象のメッセージIDを受け取る
		// 親メッセージIDが必要な場合はロジック内で解決するか、ChatBubbleから適切なIDを送る
		// ここでは単純化のため、受け取ったIDをそのまま渡す（handleRetry側で適切に処理されることを期待）
		// ※ 元の実装では、AIメッセージのリトライ時は parentId を渡していたので、そこを再現
		const logId = event.detail.id;
		const log = $chatSessionStore.session?.logs.find((l) => l.id === logId);
		if (log) {
			if (log.speaker === 'user') {
				handleRetry(logId);
			} else if (log.parentId) {
				handleRetry(log.parentId);
			}
		}
	}
</script>

{#if $chatSessionStore.session}
	<div
		class="flex flex-col gap-6 pt-4 pb-32"
		style="--chat-font-size: {$appSettings.ui.useCustomFontSize
			? `${$appSettings.ui.chatFontSize}px`
			: 'initial'}"
	>
		{#each paginatedLogs as log (log.id)}
			<ChatBubble
				{log}
				isEditing={$chatSessionStore.editingMessageId === log.id}
				editingText={$chatSessionStore.editingText}
				on:startEditing={onStartEditing}
				on:updateEditingText={onUpdateEditingText}
				on:cancelEditing={onCancelEditing}
				on:saveEditing={onSaveEditing}
				on:delete={onDelete}
				on:retry={onRetry}
			>
				<!-- 分岐ナビゲーション (Slot) -->
				<div slot="branch-nav" class="w-full">
					{#if log.speaker === 'ai' && log.parentId}
						{@const siblings = $chatSessionStore.session.logs.filter(
							(l) => l.parentId === log.parentId
						)}
						{#if siblings.length > 1}
							{@const currentIndex = siblings.findIndex((l) => l.id === log.id)}
							<div
								class="text-text-muted mt-2 flex w-full items-center justify-center gap-2 text-sm"
							>
								<button
									class="hover:bg-bg-surface-hover cursor-pointer rounded p-1 disabled:opacity-30"
									disabled={currentIndex <= 0}
									on:click={() =>
										chatSessionStore.switchActiveResponse(
											log.parentId!,
											siblings[currentIndex - 1].id
										)}
								>
									&lt;
								</button>
								<span>{currentIndex + 1} / {siblings.length}</span>
								<button
									class="hover:bg-bg-surface-hover cursor-pointer rounded p-1 disabled:opacity-30"
									disabled={currentIndex >= siblings.length - 1}
									on:click={() =>
										chatSessionStore.switchActiveResponse(
											log.parentId!,
											siblings[currentIndex + 1].id
										)}
								>
									&gt;
								</button>
							</div>
						{/if}
					{/if}
				</div>
			</ChatBubble>
		{/each}
	</div>
{/if}

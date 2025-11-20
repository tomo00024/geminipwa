<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/ui/Button.svelte';
	import { sessions } from '$lib/stores';
	import type { Session } from '$lib/types';

	export let isOpen = false;

	const dispatch = createEventDispatcher();

	let backups: any[] = [];
	let isLoadingList = false;
	let selectedBackupId: string | null = null;
	let selectedBackupSessions: Session[] = [];
	let isLoadingContent = false;
	let selectedSessionIds: Set<string> = new Set();
	let isRestoring = false;
	let dialogElement: HTMLElement;

	// Fetch backup list when modal opens
	$: if (isOpen) {
		fetchBackups();
		selectedBackupId = null;
		selectedBackupSessions = [];
		selectedSessionIds = new Set();
	}

	onMount(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
			if (dialogElement) dialogElement.focus();
		}
	});

	onDestroy(() => {
		document.body.style.overflow = '';
	});

	// Watch isOpen to toggle body overflow
	$: if (typeof document !== 'undefined') {
		document.body.style.overflow = isOpen ? 'hidden' : '';
	}

	async function fetchBackups() {
		isLoadingList = true;
		try {
			const res = await fetch('/api/backup/google-drive?list=true');
			if (res.ok) {
				const data = await res.json();
				backups = data.files || [];
			} else {
				console.error('Failed to list backups');
			}
		} catch (e) {
			console.error(e);
		} finally {
			isLoadingList = false;
		}
	}

	async function selectBackup(fileId: string) {
		selectedBackupId = fileId;
		isLoadingContent = true;
		selectedBackupSessions = [];
		selectedSessionIds = new Set();

		try {
			const res = await fetch(`/api/backup/google-drive?fileId=${fileId}`);
			if (res.ok) {
				const data = await res.json();
				// data is the array of sessions
				selectedBackupSessions = Array.isArray(data) ? data : [];
				// Default: Select all
				selectedBackupSessions.forEach((s) => selectedSessionIds.add(s.id));
				selectedSessionIds = selectedSessionIds; // trigger reactivity
			} else {
				alert('バックアップの読み込みに失敗しました。');
				selectedBackupId = null;
			}
		} catch (e) {
			console.error(e);
			alert('通信エラーが発生しました。');
			selectedBackupId = null;
		} finally {
			isLoadingContent = false;
		}
	}

	function toggleSession(id: string) {
		if (selectedSessionIds.has(id)) {
			selectedSessionIds.delete(id);
		} else {
			selectedSessionIds.add(id);
		}
		selectedSessionIds = selectedSessionIds;
	}

	function toggleAll() {
		if (selectedSessionIds.size === selectedBackupSessions.length) {
			selectedSessionIds.clear();
		} else {
			selectedBackupSessions.forEach((s) => selectedSessionIds.add(s.id));
		}
		selectedSessionIds = selectedSessionIds;
	}

	function handleRestore() {
		if (selectedSessionIds.size === 0) return;
		if (
			!confirm(
				`選択した ${selectedSessionIds.size} 件のセッションを復元しますか？\n既存の同IDのセッションは上書きされます。`
			)
		) {
			return;
		}

		isRestoring = true;
		try {
			const sessionsToRestore = selectedBackupSessions.filter((s) => selectedSessionIds.has(s.id));

			sessions.update((current) => {
				const newSessions = [...current];
				sessionsToRestore.forEach((restoredSession) => {
					const index = newSessions.findIndex((s) => s.id === restoredSession.id);
					if (index >= 0) {
						newSessions[index] = restoredSession; // Overwrite
					} else {
						newSessions.push(restoredSession); // Add
					}
				});
				// Sort by updated at desc
				return newSessions.sort(
					(a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
				);
			});

			alert('復元が完了しました。');
			close();
		} catch (e) {
			console.error(e);
			alert('復元中にエラーが発生しました。');
		} finally {
			isRestoring = false;
		}
	}

	function formatDate(isoString: string) {
		return new Date(isoString).toLocaleString();
	}

	function formatSize(bytes: string) {
		const b = parseInt(bytes);
		if (b < 1024) return b + ' B';
		if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
		return (b / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function close() {
		isOpen = false;
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		on:click={close}
		transition:fade={{ duration: 150 }}
	>
		<div
			bind:this={dialogElement}
			tabindex="-1"
			class="relative mx-4 flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-app-bg shadow-xl outline-none"
			role="dialog"
			aria-modal="true"
			on:click|stopPropagation
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
			>
				<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">バックアップから復元</h2>
				<!-- Close Button -->
				<button
					on:click={close}
					class="rounded-full bg-black/10 p-2 text-gray-500 transition hover:bg-black/20 hover:text-gray-700 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:text-white"
					aria-label="閉じる"
				>
					<svg
						class="h-5 w-5"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="flex flex-1 overflow-hidden">
				<!-- Sidebar: Backup List -->
				<div class="w-1/3 overflow-y-auto border-r border-gray-200 bg-gray-50 dark:border-gray-700">
					{#if isLoadingList}
						<div class="p-4 text-center text-gray-500">読み込み中...</div>
					{:else if backups.length === 0}
						<div class="p-4 text-center text-gray-500">バックアップが見つかりません</div>
					{:else}
						<div class="divide-y divide-gray-200 dark:divide-gray-700">
							{#each backups as file}
								<button
									class="w-full p-4 text-left transition hover:bg-gray-100 dark:hover:bg-gray-800 {selectedBackupId ===
									file.id
										? 'bg-blue-50 dark:bg-blue-900/20'
										: ''}"
									on:click={() => selectBackup(file.id)}
								>
									<div class="font-medium text-gray-900 dark:text-gray-100">
										{file.name.replace('gemini-backup-', '').replace('.json', '')}
									</div>
									<div class="mt-1 text-xs text-gray-500">
										{formatDate(file.modifiedTime)}
									</div>
									<div class="mt-1 text-xs text-gray-400">
										{formatSize(file.size)}
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Main: Session List -->
				<div class="flex-1 overflow-y-auto p-6">
					{#if !selectedBackupId}
						<div class="flex h-full items-center justify-center text-gray-500">
							左のリストからバックアップを選択してください
						</div>
					{:else if isLoadingContent}
						<div class="flex h-full items-center justify-center text-gray-500">
							バックアップをダウンロード中...
						</div>
					{:else}
						<div class="mb-4 flex items-center justify-between">
							<div class="text-sm text-gray-500">
								{selectedBackupSessions.length} 件のセッションが見つかりました
							</div>
							<Button size="sm" variant="secondary" on:click={toggleAll}>
								{selectedSessionIds.size === selectedBackupSessions.length ? '全解除' : '全選択'}
							</Button>
						</div>

						<div class="space-y-2">
							{#each selectedBackupSessions as session}
								<label
									class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
								>
									<input
										type="checkbox"
										class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
										checked={selectedSessionIds.has(session.id)}
										on:change={() => toggleSession(session.id)}
									/>
									<div class="min-w-0 flex-1">
										<div class="truncate font-medium text-gray-900 dark:text-gray-100">
											{session.title || '無題のセッション'}
										</div>
										<div class="text-xs text-gray-500">
											更新: {formatDate(session.lastUpdatedAt)} · メッセージ: {session.logs.length}
										</div>
									</div>
								</label>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div
				class="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-app-bg/95 p-4 backdrop-blur dark:border-gray-700"
			>
				<Button variant="secondary" on:click={close}>キャンセル</Button>
				<Button
					variant="primary"
					disabled={!selectedBackupId || selectedSessionIds.size === 0 || isRestoring}
					on:click={handleRestore}
				>
					{#if isRestoring}
						復元中...
					{:else}
						{selectedSessionIds.size} 件を復元
					{/if}
				</Button>
			</div>
		</div>
	</div>
{/if}

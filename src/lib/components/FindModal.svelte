<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { base } from '$app/paths';
	import FileDetailModal from '$lib/components/FileDetailModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import { chatSessionStore } from '$lib/chatSessionStore';
	import Modal from '$lib/components/ui/Modal.svelte';

	const dispatch = createEventDispatcher();

	// モーダル表示のための状態変数
	let selectedFile: any = null;
	let isDetailModalOpen = false;
	let searchQuery = '';
	let isLoading = true;
	let error: string | null = null;

	// 読み込んだファイルを格納するローカル変数
	let loadedFiles: any[] = [];

	onMount(async () => {
		await fetchFiles();
	});

	async function fetchFiles() {
		isLoading = true;
		error = null;
		try {
			const response = await fetch(`${base}/api/files`);
			if (!response.ok) {
				throw new Error('Failed to fetch files');
			}
			const data = await response.json();
			loadedFiles = data.files || [];
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	// カードがクリックされたときに詳細モーダルを開く関数
	function openDetailModal(file: any) {
		selectedFile = file;
		isDetailModalOpen = true;
	}

	// 詳細モーダルを閉じる関数
	function closeDetailModal() {
		isDetailModalOpen = false;
		selectedFile = null;
	}

	// 親モーダル（これ）を閉じる関数
	function close() {
		dispatch('close');
	}

	// 詳細モーダルから削除イベントを受け取ったとき
	function handleFileDeleted(event: CustomEvent<string>) {
		const deletedFileId = event.detail;
		loadedFiles = loadedFiles.filter((file) => file.id !== deletedFileId);
	}

	// 詳細モーダルから更新イベントを受け取ったとき
	function handleFileUpdated(event: CustomEvent<any>) {
		const updatedFile = event.detail;
		loadedFiles = loadedFiles.map((file) => {
			if (file.id === updatedFile.id) {
				return updatedFile;
			}
			return file;
		});
	}

	function extractImageUrl(urlString: string): string {
		if (typeof urlString !== 'string') {
			return '';
		}
		const match = urlString.match(/!\[.*?\]\((.*?)\)/);
		return match ? match[1] : urlString;
	}

	// 検索フィルタリング
	$: filteredFiles = loadedFiles.filter((file) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			file.title?.toLowerCase().includes(query) ||
			file.description?.toLowerCase().includes(query) ||
			file.tags?.some((tag: string) => tag.toLowerCase().includes(query)) ||
			file.authorName?.toLowerCase().includes(query)
		);
	});
</script>

<Modal isOpen={true} title="公開セッションを探す" size="xl" noPadding={true} on:close={close}>
	<div class="flex h-full flex-col">
		<!-- Search Bar (Fixed) -->
		<div class="border-b border-stone-700/50 bg-main-bg p-4">
			<Input
				type="search"
				bind:value={searchQuery}
				placeholder="キーワードで検索..."
				class="w-full"
			/>
		</div>

		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if isLoading}
				<div class="flex h-64 items-center justify-center">
					<LoadingIndicator size="lg" />
				</div>
			{:else if error}
				<div class="rounded-lg border border-red-800 bg-red-900/20 p-4 text-center text-red-400">
					<p>データの読み込みに失敗しました。</p>
					<p class="text-sm opacity-75">{error}</p>
					<Button variant="primary" class="mt-4" on:click={fetchFiles}>再試行</Button>
				</div>
			{:else if filteredFiles.length === 0}
				<div class="py-16 text-center text-text-off">
					{#if searchQuery}
						検索条件に一致するセッションが見つかりませんでした。
					{:else}
						まだ公開されているセッションがありません。
					{/if}
				</div>
			{:else}
				<div class="space-y-4">
					{#each filteredFiles as file (file.id)}
						<!-- カード全体をクリック可能にし、詳細モーダルを開く -->
						<div
							class="cursor-pointer rounded-lg border border-stone-700 bg-transparent p-4 transition hover:bg-bg-hover/50"
							on:click={() => openDetailModal(file)}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && openDetailModal(file)}
						>
							<div class="flex flex-row gap-4">
								{#if file.imageUrl}
									<div class="flex-shrink-0">
										<img
											src={extractImageUrl(file.imageUrl)}
											alt="{file.title}のサムネイル"
											class="h-24 w-24 rounded-md object-cover sm:h-28 sm:w-28"
										/>
									</div>
								{/if}

								<div class="flex flex-grow flex-col overflow-hidden">
									<h3 class="truncate text-lg font-semibold text-text-main">{file.title}</h3>

									{#if file.tags && file.tags.length > 0}
										<div class="mt-2 flex flex-wrap gap-2">
											{#each file.tags as tag}
												<span
													class="rounded-full bg-stone-700 px-2.5 py-0.5 text-xs font-medium text-text-main"
												>
													{tag}
												</span>
											{/each}
										</div>
									{/if}

									<p class="mt-2 line-clamp-2 flex-grow text-sm text-text-off">
										{file.description}
									</p>

									<!-- メタ情報 -->
									<div class="mt-3 flex items-center justify-between">
										<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-off">
											<span>👤 {file.authorName}</span>
											{#if file.model}
												<span class="flex items-center gap-1" title="使用モデル">
													🤖 {file.model.replace(/^models\//, '')}
												</span>
											{/if}
											<span>★ {file.starCount}</span>
											<span>↓ {file.downloadCount}</span>
											<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</Modal>

{#if isDetailModalOpen && selectedFile}
	<FileDetailModal
		file={selectedFile}
		session={$chatSessionStore.session as any}
		on:close={closeDetailModal}
		on:deleted={handleFileDeleted}
		on:updated={handleFileUpdated}
	/>
{/if}

{#if isDetailModalOpen && selectedFile}
	<FileDetailModal
		file={selectedFile}
		session={$chatSessionStore.session as any}
		on:close={closeDetailModal}
		on:deleted={handleFileDeleted}
		on:updated={handleFileUpdated}
	/>
{/if}

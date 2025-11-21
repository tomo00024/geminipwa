<!-- src/routes/public/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import FileDetailModal from '$lib/components/FileDetailModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	import type { PageData } from './$types';

	export let data: PageData;

	// モーダル表示のための状態変数
	let selectedFile: any = null;
	let isModalOpen = false;
	let searchQuery = '';

	// ストリーミングで読み込んだファイルを格納するローカル変数
	let loadedFiles: any[] = [];

	// カードがクリックされたときにモーダルを開く関数
	function openModal(file: any) {
		selectedFile = file;
		isModalOpen = true;
	}

	// モーダルを閉じる関数
	function closeModal() {
		isModalOpen = false;
		selectedFile = null;
	}

	// モーダルから削除イベントを受け取ったとき
	function handleFileDeleted(event: CustomEvent<string>) {
		const deletedFileId = event.detail;
		// 削除されたファイルをリストから除外してUIを更新
		loadedFiles = loadedFiles.filter((file) => file.id !== deletedFileId);
	}

	// --- 更新イベントを受け取るハンドラの追加 ---
	function handleFileUpdated(event: CustomEvent<any>) {
		const updatedFile = event.detail;
		// loadedFiles配列から更新されたファイルを見つけて置き換える
		loadedFiles = loadedFiles.map((file) => {
			if (file.id === updatedFile.id) {
				return updatedFile; // 新しいデータに置き換え
			}
			return file;
		});
	}

	/**
	 * Markdown形式の画像リンクからURLを抽出する関数。
	 * @param urlString - URLを含む可能性のある文字列
	 */
	function extractImageUrl(urlString: string): string {
		if (typeof urlString !== 'string') {
			return '';
		}
		const match = urlString.match(/!\[.*?\]\((.*?)\)/);
		return match ? match[1] : urlString;
	}
</script>

<div class="flex h-screen flex-col bg-main-bg p-4 text-text-main">
	<div class="mx-auto w-full max-w-3xl flex-1 overflow-y-auto pb-20">
		<!-- ヘッダー -->
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-xl font-bold text-text-main">公開セッション</h1>
			<a href="{base}/">
				<Button variant="primary">履歴画面</Button>
			</a>
		</div>
		<p class="mb-6 text-stone-400">他のユーザーが公開したセッションを読み込みます</p>

		<div class="mb-6">
			<Input
				type="search"
				bind:value={searchQuery}
				placeholder="キーワードで検索..."
				class="w-full"
			/>
		</div>

		<div class="space-y-4">
			{#await data.streamed.files}
				<!-- Skeleton Loading State -->
				{#each Array(5) as _}
					<div class="animate-pulse rounded-lg border border-stone-700 bg-stone-800/30 p-4">
						<div class="flex flex-row gap-4">
							<div class="h-24 w-24 flex-shrink-0 rounded-md bg-stone-700/50 sm:h-28 sm:w-28"></div>
							<div class="flex flex-grow flex-col gap-3">
								<div class="h-6 w-3/4 rounded bg-stone-700/50"></div>
								<div class="flex gap-2">
									<div class="h-5 w-16 rounded-full bg-stone-700/50"></div>
									<div class="h-5 w-16 rounded-full bg-stone-700/50"></div>
								</div>
								<div class="h-4 w-full rounded bg-stone-700/50"></div>
								<div class="mt-auto flex justify-between">
									<div class="h-4 w-32 rounded bg-stone-700/50"></div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			{:then files}
				<!-- データがロードされたらローカル変数にセットする（一度だけ） -->
				{#if loadedFiles.length === 0 && files.length > 0}
					<span class="hidden">{(loadedFiles = files) && ''}</span>
				{/if}

				<!-- 検索フィルタリング (簡易的) -->
				<!-- 注意: 本格的な検索はサーバーサイドで行うべきだが、ここでは既存の動作を維持しつつ表示 -->

				{#if loadedFiles.length === 0}
					<div class="py-16 text-center text-text-off">
						まだ公開されているセッションがありません。
					</div>
				{:else}
					{#each loadedFiles as file (file.id)}
						<!-- カード全体をクリック可能にし、モーダルを開くようにする -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<div
							class="cursor-pointer rounded-lg border border-stone-700 bg-transparent p-4 transition hover:bg-bg-hover/50"
							on:click={() => openModal(file)}
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
													class="rounded-full bg-stone-700 px-2.5 py-0.5 text-xs font-medium text-text-off"
												>
													{tag}
												</span>
											{/each}
										</div>
									{/if}

									<p class="mt-2 line-clamp-2 flex-grow text-sm text-stone-400">
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
				{/if}
			{:catch error}
				<div class="rounded-lg border border-red-800 bg-red-900/20 p-4 text-center text-red-400">
					<p>データの読み込みに失敗しました。</p>
					<p class="text-sm opacity-75">{error.message}</p>
				</div>
			{/await}
		</div>
	</div>
</div>

{#if isModalOpen && selectedFile}
	<FileDetailModal
		file={selectedFile}
		session={data.session}
		on:close={closeModal}
		on:deleted={handleFileDeleted}
		on:updated={handleFileUpdated}
	/>
{/if}

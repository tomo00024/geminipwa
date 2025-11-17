<!-- src/routes/import/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	// 作成したモーダルコンポーネントをインポート
	import FileDetailModal from '$lib/components/FileDetailModal.svelte';

	import type { PageData } from '../api/import/$types';

	// ★ 修正点 2: 正しい構文でdataプロパティを型付け
	export let data: PageData;

	// モーダル表示のための状態変数
	let selectedFile: any = null;
	let isModalOpen = false;

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

<div class="mx-auto max-w-4xl p-4 sm:p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-800">公開セッションを探す</h1>
			<p class="mt-1 text-gray-600">
				他のユーザーが公開したセッションをあなたのアプリに読み込みます
			</p>
		</div>
		<a
			href="{base}/"
			class="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			履歴画面に戻る
		</a>
	</div>

	<div class="mb-6">
		<input
			type="search"
			placeholder="キーワードで検索..."
			class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
		/>
	</div>

	<div class="space-y-4">
		{#if data.files.length === 0}
			<div class="py-16 text-center text-gray-500">まだ公開されているセッションがありません。</div>
		{:else}
			{#each data.files as file (file.id)}
				<!-- ★ 変更点: カード全体をクリック可能にし、モーダルを開くようにする -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<div
					class="cursor-pointer rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
					on:click={() => openModal(file)}
				>
					<div class="flex flex-row gap-4">
						{#if file.imageUrl}
							<div class="flex-shrink-0">
								<img
									src={extractImageUrl(file.imageUrl)}
									alt="{file.title}のサムネイル"
									class="h-32 w-full rounded-md object-cover sm:h-full sm:w-40"
								/>
							</div>
						{/if}

						<div class="flex flex-grow flex-col">
							<h3 class="text-lg font-semibold text-gray-800">{file.title}</h3>

							{#if file.tags && file.tags.length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each file.tags as tag}
										<span
											class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
										>
											{tag}
										</span>
									{/each}
								</div>
							{/if}

							<p class="mt-2 flex-grow text-sm text-gray-600">{file.description}</p>

							<!-- ★ 変更点: メタ情報とボタンのレイアウトを調整 -->
							<div class="mt-3 flex items-center justify-between">
								<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
									<span>👤 {file.authorName}</span>
									<span>★ {file.starCount}</span>
									<span>↓ {file.downloadCount}</span>
									<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
								</div>
								<!-- ★ 変更点: カード内のダウンロードボタンを削除 -->
							</div>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- ★ 追加: isModalOpenがtrueの時にモーダルコンポーネントを描画する -->
{#if isModalOpen && selectedFile}
	<FileDetailModal file={selectedFile} on:close={closeModal} />
{/if}

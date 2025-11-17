<!-- src/routes/public/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';

	/**
	 * +page.server.ts の load 関数から返されたデータは、
	 * この `data` プロパティを通じて自動的に受け取ることができます。
	 */
	export let data;
	console.log('--- [BROWSER LOG] Data received by the page component ---', data);

	function handleDownload(fileId: string) {
		alert(`ID: ${fileId} のファイルをダウンロードします。(機能は未実装です)`);
	}
</script>

<div class="mx-auto max-w-4xl p-4 sm:p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-800">公開セッションを探す</h1>
			<p class="mt-1 text-gray-600">
				他のユーザーが公開したセッションをあなたのアプリに読み込みます。 p>
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

	<!-- ★ ここからが大きな変更点 -->
	<div class="space-y-4">
		<!-- data.files にデータが1件もない場合の表示を追加 -->
		{#if data.files.length === 0}
			<div class="py-16 text-center text-gray-500">まだ公開されているセッションがありません。</div>
		{:else}
			<!-- ループの対象を mockFiles から `data.files` に変更 -->
			{#each data.files as file (file.id)}
				<div class="rounded-lg border bg-white p-4 transition-shadow hover:shadow-md">
					<!-- ... 以下のHTML構造は変更ありません ... -->
					<div class="flex flex-col gap-4 sm:flex-row">
						{#if file.imageUrl}
							<div class="flex-shrink-0">
								<img
									src={file.imageUrl}
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

							<div class="mt-3 flex items-center justify-between">
								<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
									<span>👤 {file.uploaderName}</span>
									<span>★ {file.starCount}</span>
									<span>↓ {file.downloadCount}</span>
									<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
								</div>
								<button
									on:click={() => handleDownload(file.id)}
									class="ml-2 flex-shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
								>
									ダウンロード
								</button>
							</div>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

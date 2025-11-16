<!-- src/routes/settings/+page.svelte -->

<script lang="ts">
	import { base } from '$app/paths';
	import { appSettings } from '$lib/stores';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
	import { availableModels } from '$lib/utils';
	import type { ApiKey } from '$lib/types';
	import { generateUUID } from '$lib/utils';

	// --- UIデモ用の仮の状態変数 ---
	// この値を true に変えると「ログイン後」、false にすると「ログイン前」の表示になります。
	let isLoggedIn = false;
	let userEmail = 'user@example.com';

	const returnPath = derived(page, ($page) => {
		const from = $page.url.searchParams.get('from');
		if (from && from.startsWith('session/')) {
			return {
				href: `${base}/${from}`,
				label: 'セッションに戻る'
			};
		}
		return {
			href: `${base}/`,
			label: '履歴に戻る'
		};
	});

	/**
	 * 新しいAPIキー項目をリストに追加します。
	 * デフォルトの名前として、現在のキー数に基づいた連番を振ります。
	 */
	function addApiKey() {
		appSettings.update((settings) => {
			const nextNumber = (settings.apiKeys?.length || 0) + 1;
			const newKey: ApiKey = {
				id: generateUUID(),
				name: nextNumber.toString(),
				key: ''
			};

			settings.apiKeys = [...(settings.apiKeys || []), newKey];

			if (settings.apiKeys.length === 1) {
				settings.activeApiKeyId = newKey.id;
			}
			return settings;
		});
	}

	/**
	 * 指定されたIDのAPIキーをリストから削除します。
	 */
	function deleteApiKey(id: string) {
		if (!confirm('このAPIキーを削除しますか？')) return;

		appSettings.update((settings) => {
			settings.apiKeys = settings.apiKeys.filter((key) => key.id !== id);
			// アクティブなキーが削除された場合、選択を解除するか、残りの最初のキーをアクティブにする
			if (settings.activeApiKeyId === id) {
				settings.activeApiKeyId = settings.apiKeys[0]?.id || null;
			}
			return settings;
		});
	}
</script>

<div class="flex h-screen flex-col p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-xl font-bold">アプリ設定</h1>
		<a
			href={$returnPath.href}
			class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			{$returnPath.label}
		</a>
	</div>

	<div class="space-y-6 overflow-y-auto pb-10">
		<!-- APIキー設定 -->
		<div class="space-y-3">
			<h2 class="block text-lg font-medium">API Key</h2>
			<div class="space-y-2">
				{#if $appSettings.apiKeys?.length > 0}
					{#each $appSettings.apiKeys as apiKey, index (apiKey.id)}
						<div class="grid grid-cols-[auto_1fr_2fr_auto] items-center gap-x-3 rounded border p-2">
							<input
								type="radio"
								id={`key-select-${apiKey.id}`}
								name="api-key-select"
								class="h-4 w-4"
								bind:group={$appSettings.activeApiKeyId}
								value={apiKey.id}
								title="このキーをチャットで使用する"
							/>
							<input
								type="text"
								bind:value={apiKey.name}
								class="w-full rounded border p-2 text-sm"
								placeholder={`キー ${index + 1} の名前`}
							/>
							<input
								type="password"
								bind:value={apiKey.key}
								class="w-full rounded border p-2 text-sm"
								placeholder="sk-..."
							/>
							<button
								on:click={() => deleteApiKey(apiKey.id)}
								class="flex-shrink-0 rounded bg-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-300"
								title="このキーを削除する"
							>
								削除
							</button>
						</div>
					{/each}
				{:else}
					<p class="px-2 text-sm text-gray-500">
						保存されているAPIキーはありません。「+ APIを追加」ボタンで追加してください。
					</p>
				{/if}
			</div>
			<button
				class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
				on:click={addApiKey}
			>
				+ APIを追加
			</button>
			<p class="text-sm text-gray-600">
				APIキーはブラウザ内にのみ保存されます。入力や変更は自動的に保存されます。
			</p>
		</div>
		<!-- AIモデル選択 -->
		<div class="space-y-2">
			<label for="model-select" class="block font-medium">AIモデル</label>
			<select
				id="model-select"
				bind:value={$appSettings.model}
				class="w-full max-w-md rounded border bg-white p-2"
			>
				{#each availableModels as model}
					<option value={model}>{model}</option>
				{/each}
			</select>
			<p class="text-sm text-gray-600">
				チャットで使用するAIモデルを選択します。選択は自動的に保存されます。
			</p>
		</div>
		<!-- システムプロンプト -->
		<div class="space-y-2">
			<label for="system-prompt" class="block font-medium">システムプロンプト</label>
			<div class="flex items-center space-x-2">
				<input
					id="system-prompt-enabled"
					type="checkbox"
					bind:checked={$appSettings.systemPrompt.isEnabled}
					class="h-4 w-4 rounded"
				/>
				<label for="system-prompt-enabled" class="text-sm">有効にする</label>
			</div>
			<textarea
				id="system-prompt"
				rows="4"
				bind:value={$appSettings.systemPrompt.text}
				class="w-full max-w-md rounded border p-2 disabled:bg-gray-100"
				placeholder="AIの役割や応答のトーンなどを設定します..."
				disabled={!$appSettings.systemPrompt.isEnabled}
			></textarea>
			<p class="text-sm text-gray-600">
				（未実装）AIへの基本的な指示を定義します。入力すると自動的に保存されます。
			</p>
		</div>
		<!-- ダミーユーザープロンプト -->
		<div class="space-y-2">
			<label for="dummy-user-prompt" class="block font-medium">ダミーユーザープロンプト</label>
			<div class="flex items-center space-x-2">
				<input
					id="dummy-user-prompt-enabled"
					type="checkbox"
					bind:checked={$appSettings.dummyUserPrompt.isEnabled}
					class="h-4 w-4 rounded"
				/>
				<label for="dummy-user-prompt-enabled" class="text-sm">有効にする</label>
			</div>
			<textarea
				id="dummy-user-prompt"
				rows="2"
				bind:value={$appSettings.dummyUserPrompt.text}
				class="w-full max-w-md rounded border p-2 disabled:bg-gray-100"
				placeholder="直近のダミー入力..."
				disabled={!$appSettings.dummyUserPrompt.isEnabled}
			></textarea>
			<p class="text-sm text-gray-600">
				ユーザー入力の直後に続く、ユーザー側の直近の発言としてダミーで入力します。入力すると自動的に保存されます。
			</p>
		</div>
		<!-- UI設定 -->
		<div class="space-y-2">
			<h2 class="block text-lg font-medium">UI設定</h2>
			<div class="flex items-center space-x-2">
				<input
					id="custom-font-size"
					type="checkbox"
					bind:checked={$appSettings.ui.useCustomFontSize}
					class="h-4 w-4 rounded"
				/>
				<label for="custom-font-size" class="text-sm">チャットの文字サイズを変更</label>
			</div>
			<div class="ml-6 space-x-2" class:opacity-50={!$appSettings.ui.useCustomFontSize}>
				<label for="font-size-input" class="text-sm">サイズ(px):</label>
				<input
					id="font-size-input"
					type="number"
					bind:value={$appSettings.ui.chatFontSize}
					class="w-20 rounded border p-1 text-sm"
					disabled={!$appSettings.ui.useCustomFontSize}
				/>
			</div>
		</div>
		<!-- APIキーエラー時の設定 -->
		<div class="space-y-2">
			<h2 class="block text-lg font-medium">APIエラー時の挙動</h2>
			<div class="flex items-center space-x-2">
				<input
					id="loop-keys"
					type="checkbox"
					bind:checked={$appSettings.apiErrorHandling.loopApiKeys}
					class="h-4 w-4 rounded"
				/>
				<label for="loop-keys" class="text-sm">429エラーのときにAPIキーをループする</label>
			</div>
			<div class="flex items-center space-x-2">
				<input
					id="exp-backoff"
					type="checkbox"
					bind:checked={$appSettings.apiErrorHandling.exponentialBackoff}
					class="h-4 w-4 rounded"
				/>
				<label for="exp-backoff" class="text-sm">指数関数的バックオフを行う</label>
			</div>
			<div
				class="ml-6 space-x-2"
				class:opacity-50={!$appSettings.apiErrorHandling.exponentialBackoff}
			>
				<label for="max-retries" class="text-sm">回数:</label>
				<input
					id="max-retries"
					type="number"
					bind:value={$appSettings.apiErrorHandling.maxRetries}
					class="w-20 rounded border p-1 text-sm"
					disabled={!$appSettings.apiErrorHandling.exponentialBackoff}
				/>
				<label for="initial-wait" class="text-sm">一回目の待機時間(ms):</label>
				<input
					id="initial-wait"
					type="number"
					bind:value={$appSettings.apiErrorHandling.initialWaitTime}
					class="w-24 rounded border p-1 text-sm"
					disabled={!$appSettings.apiErrorHandling.exponentialBackoff}
				/>
			</div>
		</div>

		<!-- 便利機能 -->
		<div class="space-y-2">
			<h2 class="block text-lg font-medium">アシスト機能</h2>
			<div class="flex items-center space-x-2">
				<input
					id="autocorrect-url"
					type="checkbox"
					bind:checked={$appSettings.assist.autoCorrectUrl}
					class="h-4 w-4 rounded"
				/>
				<label for="autocorrect-url" class="text-sm">URLの自動補正</label>
			</div>
			<div class="flex items-center space-x-2">
				<input
					id="summarize-tokens"
					type="checkbox"
					bind:checked={$appSettings.assist.summarizeOnTokenOverflow}
					class="h-4 w-4 rounded"
				/>
				<label for="summarize-tokens" class="text-sm">トークン数が大きくなったら要約</label>
			</div>
			<div class="ml-6 space-x-2" class:opacity-50={!$appSettings.assist.summarizeOnTokenOverflow}>
				<label for="token-threshold" class="text-sm">トークン数:</label>
				<input
					id="token-threshold"
					type="number"
					bind:value={$appSettings.assist.tokenThreshold}
					class="w-24 rounded border p-1 text-sm"
					disabled={!$appSettings.assist.summarizeOnTokenOverflow}
				/>
			</div>
		</div>

		<div class="space-y-3">
			<h2 class="block text-lg font-medium">生成パラメータ設定</h2>
			<div class="grid max-w-md grid-cols-[150px_1fr] items-center gap-x-4 gap-y-2">
				<!-- Temperature -->
				<label for="temperature-input" class="text-sm font-medium">Temperature</label>
				<input
					id="temperature-input"
					type="number"
					min="0"
					max="2"
					step="0.1"
					bind:value={$appSettings.generation.temperature}
					class="w-32 rounded border p-1 text-sm"
					placeholder="例：1"
				/>

				<!-- Top-P -->
				<label for="top-p-input" class="text-sm font-medium">Top-P</label>
				<input
					id="top-p-input"
					type="number"
					min="0"
					max="1"
					step="0.01"
					bind:value={$appSettings.generation.topP}
					class="w-32 rounded border p-1 text-sm"
					placeholder="例：0.95"
				/>

				<!-- Top-K -->
				<label for="top-k-input" class="text-sm font-medium">Top-K</label>
				<input
					id="top-k-input"
					type="number"
					min="1"
					step="1"
					bind:value={$appSettings.generation.topK}
					class="w-32 rounded border p-1 text-sm"
					placeholder="例：64"
				/>

				<!-- Max Output Tokens -->
				<label for="max-tokens-input" class="text-sm font-medium">Max Output Tokens</label>
				<input
					id="max-tokens-input"
					type="number"
					min="1"
					step="1"
					bind:value={$appSettings.generation.maxOutputTokens}
					class="w-32 rounded border p-1 text-sm"
					placeholder="例：65535"
				/>

				<!-- Thinking Budget -->
				<label for="thinking-budget-input" class="text-sm font-medium">Thinking Budget</label>
				<input
					id="thinking-budget-input"
					type="number"
					min="-1"
					step="1"
					bind:value={$appSettings.generation.thinkingBudget}
					class="w-32 rounded border p-1 text-sm"
					placeholder="例：-1"
				/>
			</div>
		</div>
		<!-- アカウント連携 -->
		<div class="space-y-3">
			<h2 class="block text-lg font-medium">アカウント連携</h2>
			{#if isLoggedIn}
				<div class="space-y-2 text-sm">
					<p>✓ <span class="font-medium">{userEmail}</span> としてログイン中</p>
					<button
						class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
					>
						ログアウト
					</button>
				</div>
				<div class="space-y-2 border-t pt-3">
					<h3 class="font-medium text-red-800">アカウントの削除 (退会)</h3>
					<p class="text-sm text-gray-600">
						アカウントを削除すると、サーバーにアップロードしたすべてのセッション履歴が完全に削除され、元に戻すことはできません。
					</p>
					<button
						class="rounded bg-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-300"
					>
						アカウントを完全に削除する
					</button>
				</div>
			{:else}
				<div class="space-y-2">
					<button
						class="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
					>
						Googleアカウントでログイン
					</button>
					<p class="text-sm text-gray-600">
						ログインすると、セッション履歴をWeb上に公開して共有したり、Google
						Driveへ自動でバックアップしたりできるようになります。
					</p>
				</div>
			{/if}
		</div>

		<!-- データ管理 -->
		<div class="space-y-3">
			<h2 class="block text-lg font-medium">データ管理</h2>

			<!-- Google Drive 連携 -->
			<div class="space-y-2">
				<h3 class="font-medium">Google Drive 連携</h3>
				<div class="flex items-center space-x-2">
					<input
						id="drive-sync-enabled"
						type="checkbox"
						class="h-4 w-4 rounded"
						disabled={!isLoggedIn}
					/>
					<label for="drive-sync-enabled" class="text-sm" class:text-gray-400={!isLoggedIn}>
						Google Driveへの自動バックアップを有効にする
					</label>
				</div>

				{#if !isLoggedIn}
					<p class="pl-6 text-sm text-gray-500">
						この機能を利用するには、まずGoogleアカウントでログインしてください。
					</p>
				{:else}
					<div class="pl-6">
						<!-- ログイン後に表示する同期ステータスやボタン -->
						<p class="text-sm text-gray-700">最終同期: 5分前</p>
						<button
							class="mt-1 rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
						>
							今すぐ同期
						</button>
					</div>
				{/if}
			</div>

			<!-- 手動バックアップ -->
			<div class="space-y-2 border-t pt-3">
				<h3 class="font-medium">手動バックアップ</h3>
				<div class="flex flex-wrap gap-2">
					<button
						class="rounded bg-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-300"
					>
						セッション履歴をJSON出力
					</button>
					<button
						class="rounded bg-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-300"
					>
						セッション履歴をJSON読込
					</button>
				</div>
				<p class="text-sm text-gray-600">
					セッション履歴をJSONファイルで手動でバックアップします。
				</p>
			</div>
		</div>

		<!-- 破壊的変更 -->
		<div class="space-y-3 border-t border-red-300 pt-4">
			<h2 class="block text-lg font-medium text-red-700">破壊的変更</h2>
			<div class="flex flex-wrap gap-2">
				<button
					class="rounded bg-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-300"
				>
					セッション履歴の破棄
				</button>
				<button
					class="rounded bg-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-300"
				>
					すべて破棄して初期化
				</button>
			</div>
		</div>
	</div>
</div>

<!-- src/routes/session/[id]/settings/+page.svelte -->

<script lang="ts">
	/**
	 * @file このファイルは、特定のセッション（:idで指定）に関する設定ページを定義します。
	 * @component SessionSettingsPage
	 * @description
	 * URLの動的パラメータからセッションIDを取得し、該当するセッションの設定値を表示・編集する責務を持ちます。
	 * 主に以下の設定項目を扱います。
	 * - 表示モード (viewMode): チャット画面のUI（標準/ゲーム風）
	 * - APIモード (apiMode): バックエンドAPIとの通信方式（通常/OneStepFC/TwoStepFC）
	 *
	 * また、古いデータ形式との後方互換性を保つためのデータマイグレーションロジックも内包しています。
	 * @see {@link ../[id]/+page.svelte | 対応するセッションページ}
	 */
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	/**
	 * @description URLの動的パラメータ `:id` から、現在のセッションIDをリアクティブに取得するderivedストア。
	 */
	const sessionId = derived(page, ($page) => $page.params.id);

	/**
	 * @description 全セッションリストと現在のセッションIDを元に、
	 *              編集対象となっているセッションオブジェクト全体をリアクティブに提供するderivedストア。
	 */
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	onMount(() => {
		// 存在しないセッションのページを開こうとした場合のエラーを防ぐためのガード節。
		// ユーザーをホームページにリダイレクトさせる。
		if (!$sessions.some((s) => s.id === $page.params.id)) {
			goto(base || '/');
		}

		// アプリケーションのバージョンアップに対応するためのデータマイグレーション処理。
		// 古い形式のセッションデータを開いた際に、新しいプロパティ(viewMode, apiMode)がなくても
		// 画面がエラーにならないよう、ここでデフォルト値を補完する。
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				if (typeof sessionToUpdate.viewMode === 'undefined') {
					sessionToUpdate.viewMode = 'standard';
				}
				if (typeof sessionToUpdate.featureSettings.apiMode === 'undefined') {
					sessionToUpdate.featureSettings.apiMode = (
						sessionToUpdate.featureSettings.goodwill as any
					)?.isEnabled
						? 'oneStepFC'
						: 'standard';
				}
				// ▼▼▼ [追加] gameViewSettingsのマイグレーション ▼▼▼
				if (typeof sessionToUpdate.gameViewSettings === 'undefined') {
					sessionToUpdate.gameViewSettings = {
						imageBaseUrl: 'https://dashing-fenglisu-4c8446.netlify.app',
						imageExtension: '.avif'
					};
				}
				// ▲▲▲ 追加ここまで ▲▲▲
			}
			return allSessions;
		});
	});

	// ▼▼▼ [追加] ゲーム風モード設定用の汎用イベントハンドラ ▼▼▼
	function handleGameViewSettingChange(field: 'imageBaseUrl' | 'imageExtension', event: Event) {
		const newValue = (event.target as HTMLInputElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				sessionToUpdate.gameViewSettings[field] = newValue;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	/**
	 * 表示モード（標準/ゲーム風）のラジオボタンが変更された時に呼び出されるイベントハンドラ。
	 * @param event - HTMLInputElementからのchangeイベント
	 */
	function handleViewModeChange(event: Event) {
		const newMode = (event.target as HTMLInputElement).value as 'standard' | 'game';
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				sessionToUpdate.viewMode = newMode;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	/**
	 * APIモード（通常/OneStepFC/TwoStepFC）のラジオボタンが変更された時に呼び出されるハンドラ。
	 * ブラウザのネイティブな挙動により、常にどれか1つが選択された状態が保証される。
	 * @param event - HTMLInputElementからのchangeイベント
	 */
	function handleApiModeChange(event: Event) {
		const newMode = (event.target as HTMLInputElement).value as
			| 'standard'
			| 'oneStepFC'
			| 'twoStepFC';
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				// 選択された値をストアに反映するだけ。複雑な条件分岐は不要。
				sessionToUpdate.featureSettings.apiMode = newMode;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	/**
	 * OneStepFCモードの「AIへの指示」テキストエリアが変更された際のイベントハンドラ。
	 * @param event - HTMLTextAreaElementからのinputイベント
	 */
	function handleDescriptionChange(event: Event) {
		const newDescription = (event.target as HTMLTextAreaElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.descriptionForAI = newDescription;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	/**
	 * OneStepFCモードの好感度ルールの「Level」または「追加プロンプト」が変更された際の汎用イベントハンドラ。
	 * @param index - 変更対象となったルールのインデックス番号
	 * @param field - 変更された項目 ('level' または 'prompt_addon')
	 * @param event - InputElementまたはTextAreaElementからのinputイベント
	 */
	function handleThresholdChange(index: number, field: 'level' | 'prompt_addon', event: Event) {
		const newValue = (event.target as HTMLInputElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				const threshold = sessionToUpdate.featureSettings.goodwill.thresholds[index];
				if (field === 'level') {
					threshold.level = Number(newValue);
				} else {
					threshold.prompt_addon = newValue;
				}
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	/**
	 * OneStepFCモードの新しい好感度ルールをリストの末尾に追加する。
	 */
	function addThreshold() {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.push({ level: 0, prompt_addon: '' });
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	/**
	 * OneStepFCモードの指定されたインデックスの好感度ルールを削除する。
	 * @param index - 削除対象のルールのインデックス番号
	 */
	function removeThreshold(index: number) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.splice(index, 1);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

<div class="flex h-screen flex-col p-4">
	<!-- ヘッダー部分 -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">セッション設定</h1>
		<a
			href="{base}/session/{$sessionId}"
			class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			セッションに戻る
		</a>
	</div>

	{#if $currentSession}
		{@const goodwill = $currentSession.featureSettings.goodwill}
		{@const apiMode = $currentSession.featureSettings.apiMode}

		<div class="space-y-6">
			<!-- 表示モード設定 -->
			<div class="rounded-lg border p-4">
				<h2 class="mb-3 text-lg font-semibold">表示設定</h2>
				<p class="mb-4 text-sm text-gray-600">チャット画面の見た目を切り替えます。</p>
				<div class="flex gap-4">
					<label
						class="flex cursor-pointer items-center gap-2 rounded-md border p-3 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
					>
						<input
							type="radio"
							name="view-mode"
							value="standard"
							checked={$currentSession.viewMode === 'standard' || !$currentSession.viewMode}
							on:change={handleViewModeChange}
						/>
						<span>標準モード</span>
					</label>
					<label
						class="flex cursor-pointer items-center gap-2 rounded-md border p-3 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
					>
						<input
							type="radio"
							name="view-mode"
							value="game"
							checked={$currentSession.viewMode === 'game'}
							on:change={handleViewModeChange}
						/>
						<span>ゲーム風モード</span>
					</label>
				</div>
				{#if $currentSession.viewMode === 'game' && $currentSession.gameViewSettings}
					<div class="mt-4 space-y-4 border-t pt-4">
						<h3 class="font-medium">ゲーム風モード設定</h3>
						<div>
							<label for="image-base-url" class="mb-1 block text-sm text-gray-700"
								>画像ベースURL</label
							>
							<input
								id="image-base-url"
								type="text"
								class="input input-bordered w-full"
								placeholder="https://..."
								value={$currentSession.gameViewSettings.imageBaseUrl}
								on:input={(e) => handleGameViewSettingChange('imageBaseUrl', e)}
							/>
						</div>
						<div>
							<label for="image-extension" class="mb-1 block text-sm text-gray-700"
								>画像拡張子</label
							>
							<input
								id="image-extension"
								type="text"
								class="input input-bordered w-full"
								placeholder=".avif, .webp, .png など"
								value={$currentSession.gameViewSettings.imageExtension}
								on:input={(e) => handleGameViewSettingChange('imageExtension', e)}
							/>
						</div>
					</div>
				{/if}
			</div>

			<!-- 通常モードの枠 -->
			<div class="rounded-lg border p-4">
				<label class="flex cursor-pointer items-center justify-between">
					<h2 class="text-lg font-semibold">通常モード</h2>
					<input
						type="radio"
						name="api-mode"
						value="standard"
						checked={apiMode === 'standard'}
						on:change={handleApiModeChange}
					/>
				</label>
			</div>

			<!-- OneStepFCモードの枠 -->
			<div class="rounded-lg border p-4">
				<label class="flex cursor-pointer items-center justify-between">
					<h2 class="text-lg font-semibold">構造化出力モード（非推奨・試験版）</h2>
					<input
						type="radio"
						name="api-mode"
						value="oneStepFC"
						checked={apiMode === 'oneStepFC'}
						on:change={handleApiModeChange}
					/>
				</label>

				<!-- OneStepFCモードが選択されている時だけ、詳細設定を表示するための条件分岐 -->
				{#if apiMode === 'oneStepFC'}
					<div class="space-y-4">
						<div>
							<label for="goodwill-desc" class="mb-2 block font-medium"
								>AIへの指示 (description)</label
							>
							<textarea
								id="goodwill-desc"
								class="textarea w-full rounded border p-2"
								placeholder="例: キャラクターの好感度の増減を2から-2までの5段階評価"
								value={goodwill?.descriptionForAI || ''}
								on:input={handleDescriptionChange}
							></textarea>
						</div>

						<div>
							<h3 class="mb-2 font-medium">好感度によるAIの応答変化ルール</h3>
							<div class="space-y-3">
								{#if goodwill}
									<!-- Svelteにリストの各項目を効率的に識別させるため、ユニークなキーとしてindex(i)を渡している -->
									{#each goodwill.thresholds as threshold, i (i)}
										<div class="flex items-start gap-2 rounded-md border bg-gray-50 p-2">
											<div class="flex-none">
												<label for="level-{i}" class="text-sm font-bold">Level</label>
												<input
													id="level-{i}"
													type="number"
													class="input input-bordered w-24"
													value={threshold.level}
													on:input={(e) => handleThresholdChange(i, 'level', e)}
												/>
											</div>
											<div class="flex-grow">
												<label for="prompt-{i}" class="text-sm font-bold">追加プロンプト</label>
												<textarea
													id="prompt-{i}"
													class="textarea textarea-bordered h-20 w-full"
													placeholder="このレベルの時にAIに追加される指示"
													value={threshold.prompt_addon}
													on:input={(e) => handleThresholdChange(i, 'prompt_addon', e)}
												></textarea>
											</div>
											<button
												class="btn btn-sm btn-circle btn-ghost mt-6"
												on:click={() => removeThreshold(i)}
												aria-label="Remove threshold {i}">✕</button
											>
										</div>
									{/each}
								{/if}
								<button class="btn btn-sm btn-outline btn-primary mt-2" on:click={addThreshold}
									>+ ルールを追加</button
								>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- TwoStepFCモードの枠 -->
			<div class="rounded-lg border p-4">
				<label class="flex cursor-pointer items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold">Function Callingモード（開発中）</h2>
						<p class="text-sm text-gray-600">より複雑な対話フローを実現するためのモードです。</p>
					</div>
					<input
						type="radio"
						name="api-mode"
						value="twoStepFC"
						checked={apiMode === 'twoStepFC'}
						on:change={handleApiModeChange}
					/>
				</label>
				{#if apiMode === 'twoStepFC'}
					<div class="mt-4 border-t pt-4">
						<!-- TODO: 将来的にTwoStepFC用の詳細な設定UIをここに実装する -->
						<p class="text-sm text-gray-500">TwoStepFC用の設定項目はまだありません。</p>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<p>セッション情報を読み込んでいます...</p>
	{/if}
</div>

<style>
	.btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}
</style>

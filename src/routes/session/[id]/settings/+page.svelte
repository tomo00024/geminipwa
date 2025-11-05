<!-- src/routes/session/[id]/settings/+page.svelte -->

<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	// --- ストアと変数の設定 ---
	const sessionId = derived(page, ($page) => $page.params.id);

	const currentSession = derived(
		[sessions, sessionId],
		([$sessions, $sessionId]) => $sessions.find((s) => s.id === $sessionId)
	);

	onMount(() => {
		if (!$sessions.some(s => s.id === $page.params.id)) {
			goto(base || '/');
		}
	});

	// --- ストア更新用の関数 ---
	function updateSession() {
		sessions.update(allSessions => {
			const sessionToUpdate = allSessions.find(s => s.id === $page.params.id);
			if (sessionToUpdate) {
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function toggleGoodwillEnabled() {
		// bind:checkedで値は更新されるので、ここでは最終更新日時だけを更新
		updateSession();
	}

	// ★★★ ここからがしきい値管理のための新しい関数 ★★★

	/**
	 * 新しいしきい値ルールをリストに追加する
	 */
	function addThreshold() {
		sessions.update(allSessions => {
			const sessionToUpdate = allSessions.find(s => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				// 新しい空のルールを追加
				sessionToUpdate.featureSettings.goodwill.thresholds.push({
					level: 0,
					prompt_addon: ''
				});
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	/**
	 * 指定されたインデックスのしきい値ルールを削除する
	 * @param index 削除するルールのインデックス
	 */
	function removeThreshold(index: number) {
		sessions.update(allSessions => {
			const sessionToUpdate = allSessions.find(s => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.splice(index, 1);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

<div class="p-4 md:p-8 max-w-3xl mx-auto">
	<h1 class="text-2xl font-bold mb-6">セッション設定</h1>

	{#if $currentSession?.featureSettings.goodwill}
		{@const goodwill = $currentSession.featureSettings.goodwill}
		<div class="space-y-6">
			<div class="p-4 border rounded-lg">
				<h2 class="text-lg font-semibold mb-3">好感度機能</h2>

				<!-- 機能の有効/無効トグル -->
				<label class="flex items-center justify-between cursor-pointer">
					<span>この機能を有効にする</span>
					<input
						type="checkbox"
						class="toggle"
						bind:checked={goodwill.isEnabled}
						on:change={toggleGoodwillEnabled}
					/>
				</label>
				
				{#if goodwill.isEnabled}
					<div class="mt-4 space-y-4">
						<!-- AIへの指示 (Description) -->
						<div>
							<label for="goodwill-desc" class="block mb-2 font-medium">
								AIへの指示 (description)
							</label>
							<textarea
								id="goodwill-desc"
								class="w-full p-2 border rounded textarea"
								placeholder="例: 主人公に対するヒロインの感情の変化量..."
								bind:value={goodwill.descriptionForAI}
								on:input={updateSession}
							></textarea>
						</div>

						<!-- ★★★ ここからがしきい値設定UI ★★★ -->
						<div>
							<h3 class="font-medium mb-2">好感度によるAIの応答変化ルール</h3>
							<div class="space-y-3">
								<!-- しきい値のリストをループで表示 -->
								{#each goodwill.thresholds as threshold, i (i)}
									<div class="flex items-start gap-2 p-2 border rounded-md bg-gray-50">
										<!-- しきい値(Level)の入力 -->
										<div class="flex-none">
											<label for="level-{i}" class="text-sm font-bold">Level</label>
											<input
												id="level-{i}"
												type="number"
												class="input input-bordered w-24"
												bind:value={threshold.level}
												on:input={updateSession}
											/>
										</div>
										<!-- プロンプト追記(Prompt Addon)の入力 -->
										<div class="flex-grow">
											<label for="prompt-{i}" class="text-sm font-bold">追加プロンプト</label>
											<textarea
												id="prompt-{i}"
												class="textarea textarea-bordered w-full h-20"
												placeholder="このレベルの時にAIに追加される指示"
												bind:value={threshold.prompt_addon}
												on:input={updateSession}
											></textarea>
										</div>
										<!-- 削除ボタン -->
										<button 
											class="btn btn-sm btn-circle btn-ghost mt-6" 
											on:click={() => removeThreshold(i)}
											aria-label="Remove threshold {i}"
										>
											✕
										</button>
									</div>
								{/each}

								<!-- ルール追加ボタン -->
								<button class="btn btn-sm btn-outline btn-primary mt-2" on:click={addThreshold}>
									+ ルールを追加
								</button>
							</div>
						</div>
						<!-- ★★★ ここまで ★★★ -->
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<p>セッション情報を読み込んでいます...</p>
	{/if}
	
	<div class="mt-8">
		<a href="{base}/session/{$sessionId}" class="btn btn-primary">チャットに戻る</a>
	</div>
</div>
<style>
	/* Tailwind CSSと共存可能なカスタムトグルスイッチのスタイル */
	.toggle {
		position: relative;
		display: inline-block;
		width: 50px;
		height: 28px;
		background-color: #ccc;
		border-radius: 9999px;
		transition: background-color 0.2s;
		appearance: none; /* ブラウザのデフォルトスタイルを消す */
		cursor: pointer;
	}

	.toggle::before {
		content: '';
		position: absolute;
		top: 4px;
		left: 4px;
		width: 20px;
		height: 20px;
		background-color: white;
		border-radius: 50%;
		transition: transform 0.2s;
	}

	.toggle:checked {
		background-color: #4ade80; /* ONの時の色 (例: a bright green) */
	}
	
	.toggle:checked::before {
		transform: translateX(22px);
	}

	/* daisyUI/Tailwindのクラスを一部だけ使用 */
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
<!-- src/routes/session/[id]/settings/+page.svelte -->

<script lang="ts">
	/**
	 * @file このファイルは、特定のセッション（:idで指定）に関する設定ページを定義します。
	 */
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	// UI Components
	import Section from '$lib/components/ui/Section.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import SelectionCard from '$lib/components/ui/SelectionCard.svelte';

	// 各モードの設定コンポーネントをインポート
	import StandardMode from '$lib/components/settings/StandardMode.svelte';
	import GameModeSettings from '$lib/components/settings/GameModeSettings.svelte';
	import StructuredOutputSettings from '$lib/components/settings/StructuredOutputSettings.svelte';
	import FunctionCallingSettings from '$lib/components/settings/FunctionCallingSettings.svelte';
	import StatusSettings from '$lib/components/settings/StatusSettings.svelte';
	import TriggerSettings from '$lib/components/settings/TriggerSettings.svelte';
	import ImportExportSettings from '$lib/components/settings/ImportExportSettings.svelte';
	import DiceRollSettings from '$lib/components/settings/DiceRollSettings.svelte';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	onMount(() => {
		if (!$sessions.some((s) => s.id === $page.params.id)) {
			goto(base || '/');
			return;
		}

		// データマイグレーション処理
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				// 1. 各種プロパティの初期化
				if (typeof sessionToUpdate.viewMode === 'undefined') {
					sessionToUpdate.viewMode = 'standard';
				}
				if (typeof sessionToUpdate.customStatuses === 'undefined') {
					sessionToUpdate.customStatuses = [];
				}
				if (typeof sessionToUpdate.triggers === 'undefined') {
					sessionToUpdate.triggers = [];
				} else {
					// 既存の各トリガーにプロパティが存在するかチェックし、なければ初期化
					sessionToUpdate.triggers.forEach((trigger) => {
						if (!trigger.conditions) {
							trigger.conditions = [
								{ id: crypto.randomUUID(), statusId: '', operator: '>=', value: 0 }
							];
						}
						if (!trigger.conjunctions) {
							trigger.conjunctions = [];
						}
						if (typeof trigger.hasBeenExecuted === 'undefined') {
							trigger.hasBeenExecuted = false;
						}
						if (typeof trigger.lastEvaluationResult === 'undefined') {
							trigger.lastEvaluationResult = false;
						}
					});
				}
				// 2. gameViewSettings の初期化と、古い status データの移行
				if (typeof sessionToUpdate.gameViewSettings === 'undefined') {
					sessionToUpdate.gameViewSettings = {
						imageBaseUrl: 'https://dashing-fenglisu-4c8446.netlify.app',
						imageExtension: '.avif'
					};
				} else {
					// 過去のバージョンで gameViewSettings に statuses があった場合の移行処理
					const oldSettings = sessionToUpdate.gameViewSettings as any;
					if (oldSettings.customStatuses) {
						sessionToUpdate.customStatuses.push(...oldSettings.customStatuses);
						delete oldSettings.customStatuses;
					}
					// 過去の showDate/showFavorability は移行対象外とし、削除
					delete oldSettings.showDate;
					delete oldSettings.showFavorability;
				}

				// 3. 全ステータスの整合性チェック (デフォルト値の設定)
				sessionToUpdate.customStatuses.forEach((status) => {
					if (typeof status.isVisible === 'undefined') {
						status.isVisible = true;
					}
					if (typeof status.mode === 'undefined') {
						status.mode = 'set';
					}
				});
				if (typeof sessionToUpdate.hideFirstUserMessage === 'undefined') {
					sessionToUpdate.hideFirstUserMessage = false;
				}
			}
			return allSessions;
		});
	});

	function handleModeSelect(newMode: 'standard' | 'game' | 'oneStepFC' | 'twoStepFC') {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				// Reset defaults first
				sessionToUpdate.viewMode = 'standard';
				sessionToUpdate.featureSettings.apiMode = 'standard';

				switch (newMode) {
					case 'game':
						sessionToUpdate.viewMode = 'game';
						break;
					case 'oneStepFC':
						sessionToUpdate.featureSettings.apiMode = 'oneStepFC';
						break;
					case 'twoStepFC':
						sessionToUpdate.featureSettings.apiMode = 'twoStepFC';
						break;
					case 'standard':
					default:
						break;
				}
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	// Toggleコンポーネント用のバインド変数
	let hideFirstUserMessage = false;
	$: if ($currentSession) {
		hideFirstUserMessage = $currentSession.hideFirstUserMessage || false;
	}

	function updateHideFirstUserMessage() {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				sessionToUpdate.hideFirstUserMessage = hideFirstUserMessage;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

<div class="flex h-screen flex-col bg-main-bg text-text-main">
	<!-- ヘッダー部分 -->
	<div class="flex items-center justify-between p-4">
		<h1 class="text-xl font-bold">セッション設定</h1>
		<a
			href="{base}/session/{$sessionId}"
			class="rounded bg-stone-200 px-3 py-2 text-sm font-semibold text-text-off hover:bg-bg-hover"
		>
			セッション画面
		</a>
	</div>

	{#if $currentSession}
		<div class="flex-1 overflow-y-auto px-4">
			<div class="mx-auto max-w-3xl space-y-8 pb-20">
				<Section title="メッセージ設定">
					<Toggle
						id="hide-first-user-message"
						label="最初のユーザーメッセージを隠す"
						bind:checked={hideFirstUserMessage}
						on:change={updateHideFirstUserMessage}
					/>
				</Section>

				<!-- モード選択 -->
				<Section title="セッションモード">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<SelectionCard
							title="通常モード"
							description="標準的なチャットモードです。"
							selected={$currentSession.viewMode === 'standard' &&
								$currentSession.featureSettings.apiMode === 'standard'}
							onClick={() => handleModeSelect('standard')}
						/>
						<SelectionCard
							title="ゲーム風モード"
							description="チャット画面の見た目をゲーム風に切り替えます。"
							selected={$currentSession.viewMode === 'game'}
							onClick={() => handleModeSelect('game')}
						/>
						<SelectionCard
							title="構造化出力モード"
							description="AIの応答に特定のデータ構造を含めるように指示します。（非推奨・試験版）"
							selected={$currentSession.featureSettings.apiMode === 'oneStepFC'}
							onClick={() => handleModeSelect('oneStepFC')}
						/>
						<SelectionCard
							title="Function Callingモード"
							description="より複雑な対話フローを実現するためのモードです。（開発中）"
							selected={$currentSession.featureSettings.apiMode === 'twoStepFC'}
							onClick={() => handleModeSelect('twoStepFC')}
						/>
					</div>
				</Section>

				<!-- モード別詳細設定 -->
				{#if $currentSession.viewMode === 'standard' && $currentSession.featureSettings.apiMode === 'standard'}
					<StandardMode {currentSession} />
				{:else if $currentSession.viewMode === 'game'}
					<GameModeSettings {currentSession} />
				{:else if $currentSession.featureSettings.apiMode === 'oneStepFC'}
					<StructuredOutputSettings {currentSession} />
				{:else if $currentSession.featureSettings.apiMode === 'twoStepFC'}
					<FunctionCallingSettings {currentSession} />
				{/if}

				<!-- 汎用設定 -->
				<DiceRollSettings />
				<StatusSettings />
				<TriggerSettings />

				<ImportExportSettings />
			</div>
		</div>
	{:else}
		<p>セッション情報を読み込んでいます...</p>
	{/if}
</div>

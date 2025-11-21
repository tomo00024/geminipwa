<script lang="ts">
	import { sessions } from '$lib/stores';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

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
	import type { Session } from '$lib/types';

	export let currentSession: Session;

	// 子コンポーネントが Readable<Session> を期待しているため、ストアにラップする
	const currentSessionStore = writable<Session | undefined>(currentSession);
	$: currentSessionStore.set(currentSession);

	// データマイグレーション処理 (onMountで実行していたものをここでも実行、ただしprops経由なのでリアクティブに反応させる)
	// 注: コンポーネント化に伴い、親側でセッションがロードされている前提とするが、
	// 念のためマイグレーションロジックは残すか、あるいは親で保証するか。
	// ここでは簡易的に、変更が必要な場合のみupdateをかける形にする。

	function handleModeSelect(newMode: 'standard' | 'game' | 'oneStepFC' | 'twoStepFC') {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === currentSession.id);
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
	$: if (currentSession) {
		hideFirstUserMessage = currentSession.hideFirstUserMessage || false;
	}

	function updateHideFirstUserMessage() {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === currentSession.id);
			if (sessionToUpdate) {
				sessionToUpdate.hideFirstUserMessage = hideFirstUserMessage;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

<div class="space-y-8 pb-20">
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
				selected={currentSession.viewMode === 'standard' &&
					currentSession.featureSettings.apiMode === 'standard'}
				onClick={() => handleModeSelect('standard')}
			/>
			<SelectionCard
				title="ゲーム風モード"
				description="チャット画面の見た目をゲーム風に切り替えます。"
				selected={currentSession.viewMode === 'game'}
				onClick={() => handleModeSelect('game')}
			/>
			<SelectionCard
				title="構造化出力モード"
				description="AIの応答に特定のデータ構造を含めるように指示します。（非推奨・試験版）"
				selected={currentSession.featureSettings.apiMode === 'oneStepFC'}
				onClick={() => handleModeSelect('oneStepFC')}
			/>
			<SelectionCard
				title="Function Callingモード"
				description="より複雑な対話フローを実現するためのモードです。（開発中）"
				selected={currentSession.featureSettings.apiMode === 'twoStepFC'}
				onClick={() => handleModeSelect('twoStepFC')}
			/>
		</div>
	</Section>

	<!-- モード別詳細設定 -->
	{#if currentSession.viewMode === 'standard' && currentSession.featureSettings.apiMode === 'standard'}
		<StandardMode currentSession={currentSessionStore} />
	{:else if currentSession.viewMode === 'game'}
		<GameModeSettings currentSession={currentSessionStore} />
	{:else if currentSession.featureSettings.apiMode === 'oneStepFC'}
		<StructuredOutputSettings currentSession={currentSessionStore} />
	{:else if currentSession.featureSettings.apiMode === 'twoStepFC'}
		<FunctionCallingSettings currentSession={currentSessionStore} />
	{/if}

	<!-- 汎用設定 -->
	<DiceRollSettings />
	<StatusSettings />
	<TriggerSettings />

	<ImportExportSettings />
</div>

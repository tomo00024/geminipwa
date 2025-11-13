<!-- src/lib/components/settings/GameModeSettings.svelte -->

<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';
	import { defaultGameViewSettings } from '$lib/utils';

	export let currentSession: Readable<Session | undefined>;
	export let onModeChange: (event: Event) => void;

	const sessionId = derived(page, ($page) => $page.params.id);
	const session = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

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

	function handleSizingChange(
		target: 'background' | 'character' | 'ichimaiE',
		field: 'mode' | 'scale',
		event: Event
	) {
		const input = event.target as HTMLInputElement;
		// ▼▼▼【変更】編集中は0やNaNを許容するため、`|| 100` のフォールバックを削除
		const newValue = field === 'scale' ? input.valueAsNumber : input.value;

		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				if (!sessionToUpdate.gameViewSettings.sizing) {
					sessionToUpdate.gameViewSettings.sizing = { ...defaultGameViewSettings.sizing! };
				}
				(sessionToUpdate.gameViewSettings.sizing[target] as any)[field] = newValue;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	// ▼▼▼【追加】カーソルが外れたときに値を検証・修正する関数
	function handleSizingBlur(target: 'background' | 'character' | 'ichimaiE', event: Event) {
		const input = event.target as HTMLInputElement;
		const currentValue = input.valueAsNumber;

		// 値が0以下、または数値でない場合(空欄など)は100に戻す
		if (!currentValue || currentValue <= 0) {
			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
				if (sessionToUpdate?.gameViewSettings?.sizing?.[target]) {
					sessionToUpdate.gameViewSettings.sizing[target].scale = 100;
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
				return allSessions;
			});
		}
	}

	const sizingTargets: {
		key: 'background' | 'character' | 'ichimaiE';
		label: string;
	}[] = [
		{ key: 'background', label: '背景' },
		{ key: 'character', label: '人物' },
		{ key: 'ichimaiE', label: '一枚絵' }
	];
</script>

<div class="rounded-lg border p-4">
	<label class="flex cursor-pointer items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold">ゲーム風モード</h2>
			<p class="text-sm text-gray-600">チャット画面の見た目をゲーム風に切り替えます。</p>
		</div>
		<input
			type="radio"
			name="session-mode"
			value="game"
			checked={$currentSession?.viewMode === 'game'}
			on:change={onModeChange}
		/>
	</label>

	{#if $currentSession?.viewMode === 'game' && $session?.gameViewSettings}
		<div class="mt-4 space-y-6 border-t pt-4">
			<!-- 画像設定 -->
			<div class="space-y-4">
				<h3 class="font-medium">画像ベース設定</h3>
				<div>
					<label for="image-base-url" class="mb-1 block text-sm text-gray-700">画像ベースURL</label>
					<input
						id="image-base-url"
						type="text"
						class="input input-bordered w-full"
						placeholder="https://..."
						value={$session.gameViewSettings.imageBaseUrl}
						on:input={(e) => handleGameViewSettingChange('imageBaseUrl', e)}
					/>
				</div>
				<div>
					<label for="image-extension" class="mb-1 block text-sm text-gray-700">画像拡張子</label>
					<input
						id="image-extension"
						type="text"
						class="input input-bordered w-full"
						placeholder=".avif, .webp, .png など"
						value={$session.gameViewSettings.imageExtension}
						on:input={(e) => handleGameViewSettingChange('imageExtension', e)}
					/>
				</div>
			</div>

			<!-- 画像サイズ設定 -->
			<div class="space-y-6">
				<h3 class="font-medium">画像サイズ設定</h3>

				{#each sizingTargets as targetInfo}
					{@const sizing =
						$session.gameViewSettings.sizing?.[targetInfo.key] ??
						defaultGameViewSettings.sizing![targetInfo.key]}
					<div class="rounded border p-3">
						<p class="mb-2 font-semibold">{targetInfo.label}</p>
						<div class="space-y-2">
							<!-- ラジオボタン -->
							<div class="flex flex-wrap gap-x-4 gap-y-2">
								<label class="flex items-center gap-1">
									<input
										type="radio"
										name="sizing-mode-{targetInfo.key}"
										value="fit-width"
										checked={sizing.mode === 'fit-width'}
										on:change={(e) => handleSizingChange(targetInfo.key, 'mode', e)}
									/>
									横に合わせる
								</label>
								<label class="flex items-center gap-1">
									<input
										type="radio"
										name="sizing-mode-{targetInfo.key}"
										value="fit-height"
										checked={sizing.mode === 'fit-height'}
										on:change={(e) => handleSizingChange(targetInfo.key, 'mode', e)}
									/>
									縦に合わせる
								</label>
								<label class="flex items-center gap-1">
									<input
										type="radio"
										name="sizing-mode-{targetInfo.key}"
										value="scale"
										checked={sizing.mode === 'scale'}
										on:change={(e) => handleSizingChange(targetInfo.key, 'mode', e)}
									/>
									倍率指定
								</label>
							</div>

							<!-- 倍率指定の入力欄 (対応するラジオボタンが選択されている時のみ表示) -->
							{#if sizing.mode === 'scale'}
								<div class="flex items-center gap-2">
									<!-- ▼▼▼【変更】on:blurイベントを追加し、min属性を削除 -->
									<input
										type="number"
										class="input input-bordered w-24"
										placeholder="100"
										step="5"
										value={sizing.scale}
										on:input={(e) => handleSizingChange(targetInfo.key, 'scale', e)}
										on:blur={(e) => handleSizingBlur(targetInfo.key, e)}
									/>
									<span class="text-sm text-gray-700">%</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

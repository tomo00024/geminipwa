<!-- src/lib/components/global_settings/UiSettings.svelte -->
<script lang="ts">
	import { appSettings } from '$lib/stores';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
</script>

<Section title="UI設定">
	<Toggle
		id="show-token-count"
		bind:checked={$appSettings.ui.showTokenCount}
		label="トークン数を表示する"
	/>
	<Toggle
		id="custom-font-size"
		bind:checked={$appSettings.ui.useCustomFontSize}
		label="チャットの文字サイズを変更"
	/>
	<div class="ml-6 flex items-center gap-2" class:opacity-50={!$appSettings.ui.useCustomFontSize}>
		<label for="font-size-input" class="text-sm whitespace-nowrap text-text-off">
			サイズ(px):
		</label>
		<Input
			id="font-size-input"
			type="number"
			bind:value={$appSettings.ui.chatFontSize}
			disabled={!$appSettings.ui.useCustomFontSize}
			class="w-20"
		/>
	</div>
	<div class="mt-4">
		<Toggle
			id="chat-display-mode"
			checked={$appSettings.ui.chatDisplayMode === 'bubble'}
			on:change={(e) => {
				$appSettings.ui.chatDisplayMode = e.detail.checked ? 'bubble' : 'transcript';
			}}
			label="バブル形式で表示"
		/>
	</div>

	<div class="mt-2 pl-4" class:invisible={$appSettings.ui.chatDisplayMode !== 'transcript'}>
		<Toggle
			id="show-speaker-name"
			bind:checked={$appSettings.ui.showSpeakerNameInTranscript}
			label="発言者名を表示する"
		/>
	</div>
</Section>

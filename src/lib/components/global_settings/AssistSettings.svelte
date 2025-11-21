<!-- src/lib/components/global_settings/AssistSettings.svelte -->
<script lang="ts">
	import { appSettings } from '$lib/stores';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
</script>

<Section title="アシスト機能">
	<Toggle
		id="autocorrect-url"
		bind:checked={$appSettings.assist.autoCorrectUrl}
		label="URLの自動補正"
	/>
	<Toggle
		id="summarize-tokens"
		bind:checked={$appSettings.assist.summarizeOnTokenOverflow}
		label="一定のトークンを消費したら要約（未実装）"
	/>
	<div
		class="ml-6 flex items-center space-x-2"
		class:opacity-50={!$appSettings.assist.summarizeOnTokenOverflow}
	>
		<label for="token-threshold" class="text-sm whitespace-nowrap text-text-off">
			トークン数:
		</label>
		<Input
			id="token-threshold"
			type="number"
			bind:value={$appSettings.assist.tokenThreshold}
			disabled={!$appSettings.assist.summarizeOnTokenOverflow}
			class="w-24"
		/>
	</div>
</Section>

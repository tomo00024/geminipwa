<!-- src/lib/components/global_settings/SystemPromptSettings.svelte -->
<script lang="ts">
	import { appSettings } from '$lib/stores';
	import Section from '$lib/components/ui/Section.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
</script>

<!-- システムプロンプト -->
<Section title="システムプロンプト">
	<Toggle
		id="system-prompt-enabled"
		bind:checked={$appSettings.systemPrompt.isEnabled}
		label="有効にする"
	/>
	<Textarea
		id="system-prompt"
		rows={4}
		bind:value={$appSettings.systemPrompt.text}
		placeholder="AIの役割や応答のトーンなどを設定します..."
		disabled={!$appSettings.systemPrompt.isEnabled}
		class="max-w-md"
	/>
	<p class="text-sm text-text-off">
		AIへの基本的な指示を定義します。入力すると自動的に保存されます。
	</p>
</Section>

<!-- ダミーユーザープロンプト -->
<Section title="ダミーユーザープロンプト">
	<Toggle
		id="dummy-user-prompt-enabled"
		bind:checked={$appSettings.dummyUserPrompt.isEnabled}
		label="有効にする"
	/>
	<Textarea
		id="dummy-user-prompt"
		rows={2}
		bind:value={$appSettings.dummyUserPrompt.text}
		placeholder="ダミー入力..."
		disabled={!$appSettings.dummyUserPrompt.isEnabled}
		class="max-w-md"
	/>
	<p class="text-sm text-text-off">
		ユーザー入力の直後に続く、ユーザー側の直近の発言としてダミーで入力します。入力すると自動的に保存されます。
	</p>
</Section>

<!-- ダミーモデルプロンプト -->
<Section title="ダミーモデルプロンプト">
	<Toggle
		id="dummy-model-prompt-enabled"
		bind:checked={$appSettings.dummyModelPrompt.isEnabled}
		label="有効にする"
	/>
	<Textarea
		id="dummy-model-prompt"
		rows={2}
		bind:value={$appSettings.dummyModelPrompt.text}
		placeholder="モデル入力..."
		disabled={!$appSettings.dummyModelPrompt.isEnabled}
		class="max-w-md"
	/>
	<p class="text-sm text-text-off">
		ユーザー入力の直後に続く、モデル側の直近の発言としてダミーで入力します。入力すると自動的に保存されます。
	</p>
</Section>

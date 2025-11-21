<!-- src/lib/components/settings/FunctionCallingSettings.svelte -->
<script lang="ts">
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';
	import Section from '$lib/components/ui/Section.svelte';

	export let currentSession: Readable<Session | undefined>;

	const apiMode = $currentSession?.featureSettings.apiMode;
</script>

<Section title="Function Callingモード（開発中）">
	{#if apiMode === 'twoStepFC'}
		<div class="mt-4 border-t border-stone-600 pt-4">
			<p class="text-sm text-text-off">TwoStepFC用の設定項目はまだありません。</p>
		</div>
	{/if}
</Section>

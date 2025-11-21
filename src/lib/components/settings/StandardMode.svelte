<!-- src/lib/components/settings/StandardMode.svelte -->
<script lang="ts">
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';
	import Section from '$lib/components/ui/Section.svelte';

	export let currentSession: Readable<Session | undefined>;

	const apiMode = $currentSession?.featureSettings.apiMode;
</script>

<Section title="通常モード">
	<div class="mt-4 border-t pt-4 text-text-off">
		<p class="text-sm text-text-off">標準的なチャットモードです。</p>
	</div>
</Section>

<!-- src/lib/components/settings/StandardMode.svelte -->
<script lang="ts">
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';
	import Section from '$lib/components/ui/Section.svelte';

	export let currentSession: Readable<Session | undefined>;

	const apiMode = $currentSession?.featureSettings.apiMode;
</script>

<Section title="通常モード">
	<div class="mt-4 border-t border-gray-600 pt-4">
		<p class="text-sm text-gray-400">標準的なチャットモードです。</p>
	</div>
</Section>

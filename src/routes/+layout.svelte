<!-- src/routes/+layout.svelte -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import BackupManager from '$lib/components/BackupManager.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>Gemini Novel Tool</title>
</svelte:head>

<BackupManager />

{@render children()}

<SettingsModal />

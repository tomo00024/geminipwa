<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { sessions } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createNewSession } from '$lib/utils';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';

	onMount(() => {
		const currentSessions = $sessions;
		if (currentSessions.length > 0) {
			// 最新のセッション（更新日時順）を取得
			const latestSession = [...currentSessions].sort(
				(a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
			)[0];
			goto(`${base}/session/${latestSession.id}`, { replaceState: true });
		} else {
			// セッションがない場合は新規作成
			const newSession = createNewSession();
			sessions.update((s) => [...s, newSession]);
			goto(`${base}/session/${newSession.id}`, { replaceState: true });
		}
	});
</script>

<div class="flex h-screen items-center justify-center bg-app-bg text-gray-200">
	<div class="flex flex-col items-center gap-4">
		<LoadingIndicator size="lg" />
		<p class="text-gray-400">セッションを読み込んでいます...</p>
	</div>
</div>

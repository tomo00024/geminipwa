<!-- src/lib/components/HistoryDrawer.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { sessions } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createNewSession, generateUUID } from '$lib/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount, onDestroy } from 'svelte';

	export let showNewButton = true;

	const dispatch = createEventDispatcher();

	function close() {
		dispatch('close');
	}

	function handleNewSession(): void {
		const newSession = createNewSession();
		sessions.update((currentSessions) => [...currentSessions, newSession]);
		goto(`${base}/session/${newSession.id}`);
		close();
	}

	function handleSessionClick(id: string): void {
		goto(`${base}/session/${id}`);
		close();
	}

	// Menu Logic
	let activeMenuSessionId: string | null = null;
	let editingSessionId: string | null = null;
	let editingTitle = '';
	let inputElement: HTMLInputElement;

	function toggleMenu(e: MouseEvent, sessionId: string) {
		e.stopPropagation();
		if (activeMenuSessionId === sessionId) {
			activeMenuSessionId = null;
		} else {
			activeMenuSessionId = sessionId;
		}
	}

	function closeMenu() {
		activeMenuSessionId = null;
	}

	function handleWindowClick(e: MouseEvent) {
		closeMenu();
	}

	// Actions
	function startEditing(e: MouseEvent, session: any) {
		e.stopPropagation();
		editingSessionId = session.id;
		editingTitle = session.title;
		activeMenuSessionId = null;
		// Focus input after render
		setTimeout(() => inputElement?.focus(), 0);
	}

	function saveTitle(session: any) {
		if (editingTitle.trim() && editingTitle !== session.title) {
			sessions.update((all) =>
				all.map((s) =>
					s.id === session.id
						? { ...s, title: editingTitle.trim(), lastUpdatedAt: new Date().toISOString() }
						: s
				)
			);
		}
		editingSessionId = null;
	}

	function handleKeyDown(e: KeyboardEvent, session: any) {
		if (e.key === 'Enter') {
			saveTitle(session);
		} else if (e.key === 'Escape') {
			editingSessionId = null;
		}
	}

	function handlePublish(e: MouseEvent, session: any) {
		e.stopPropagation();
		activeMenuSessionId = null;
		dispatch('publish', { session });
		close();
	}

	function handleDuplicate(e: MouseEvent, session: any) {
		e.stopPropagation();
		activeMenuSessionId = null;
		const now = new Date().toISOString();
		const newSession = {
			...JSON.parse(JSON.stringify(session)),
			id: generateUUID(),
			title: `${session.title} (コピー)`,
			createdAt: now,
			lastUpdatedAt: now
		};
		sessions.update((all) => [newSession, ...all]);
		goto(`${base}/session/${newSession.id}`);
		close();
	}

	function handleDelete(e: MouseEvent, session: any) {
		e.stopPropagation();
		activeMenuSessionId = null;
		if (!confirm(`「${session.title}」を削除しますか？`)) return;

		sessions.update((all) => all.filter((s) => s.id !== session.id));

		// If deleted session is current, go home (handled by ChatLayout usually, but good to be safe)
		// Actually HistoryDrawer doesn't know current session ID easily without props,
		// but ChatLayout handles navigation if current session is deleted via its own handler.
		// Here we just delete from store. If user is on that page, ChatLayout might need to react.
		// For now, let's assume user might be on it.
	}

	// Grouping Logic
	$: groupedSessions = groupSessions($sessions);

	function groupSessions(allSessions: any[]) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const sevenDaysAgo = new Date(today);
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const groups = {
			today: [] as any[],
			yesterday: [] as any[],
			last7Days: [] as any[],
			older: [] as any[]
		};

		// Sort by date desc first
		const sorted = [...allSessions].sort(
			(a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
		);

		for (const session of sorted) {
			const date = new Date(session.lastUpdatedAt);
			if (date >= today) {
				groups.today.push(session);
			} else if (date >= yesterday) {
				groups.yesterday.push(session);
			} else if (date >= sevenDaysAgo) {
				groups.last7Days.push(session);
			} else {
				groups.older.push(session);
			}
		}
		return groups;
	}
</script>

<svelte:window on:click={handleWindowClick} />

<div class="flex h-full flex-col text-text-main">
	<!-- 新規セッションボタン -->
	{#if showNewButton}
		<div class="mb-4">
			<Button variant="primary" class="w-full justify-center" on:click={handleNewSession}>
				新規セッション
			</Button>
		</div>
	{/if}

	<!-- セッションリスト -->
	<div class="flex-1 space-y-6">
		{#if $sessions.length === 0}
			<p class="mt-4 text-center text-text-off">履歴はありません。</p>
		{:else}
			{#if groupedSessions.today.length > 0}
				<div>
					<h3 class="mb-2 px-2 text-xs font-bold text-text-off">今日</h3>
					<ul class="space-y-1">
						{#each groupedSessions.today as session (session.id)}
							<li>
								<div class="group relative flex items-center rounded-md hover:bg-bg-hover">
									{#if editingSessionId === session.id}
										<input
											bind:this={inputElement}
											type="text"
											bind:value={editingTitle}
											on:blur={() => saveTitle(session)}
											on:keydown={(e) => handleKeyDown(e, session)}
											on:click|stopPropagation
											class="w-full bg-transparent px-2 py-2 text-sm text-text-main focus:outline-none"
										/>
									{:else}
										<button
											class="flex-1 truncate px-2 py-2 text-left text-sm text-text-main hover:text-text-main"
											on:click={() => handleSessionClick(session.id)}
										>
											{session.title}
										</button>
										<button
											class="p-2 text-text-off hover:text-text-main"
											on:click={(e) => toggleMenu(e, session.id)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
												/>
											</svg>
										</button>
										{#if activeMenuSessionId === session.id}
											<div
												class="ring-opacity-5 absolute top-8 right-0 z-50 w-32 rounded-md bg-stone-800 py-1 shadow-lg ring-1 ring-black"
											>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => startEditing(e, session)}
												>
													タイトル編集
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => handlePublish(e, session)}
												>
													投稿
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => handleDuplicate(e, session)}
												>
													複製
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-bg-hover hover:text-red-300"
													on:click={(e) => handleDelete(e, session)}
												>
													削除
												</button>
											</div>
										{/if}
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if groupedSessions.yesterday.length > 0}
				<div>
					<h3 class="mb-2 px-2 text-xs font-bold text-text-off">昨日</h3>
					<ul class="space-y-1">
						{#each groupedSessions.yesterday as session (session.id)}
							<li>
								<div class="group relative flex items-center rounded-md hover:bg-bg-hover">
									{#if editingSessionId === session.id}
										<input
											bind:this={inputElement}
											type="text"
											bind:value={editingTitle}
											on:blur={() => saveTitle(session)}
											on:keydown={(e) => handleKeyDown(e, session)}
											on:click|stopPropagation
											class="w-full bg-transparent px-2 py-2 text-sm text-text-main focus:outline-none"
										/>
									{:else}
										<button
											class="flex-1 truncate px-2 py-2 text-left text-sm text-text-main hover:text-text-main"
											on:click={() => handleSessionClick(session.id)}
										>
											{session.title}
										</button>
										<button
											class="p-2 text-text-off hover:text-text-main"
											on:click={(e) => toggleMenu(e, session.id)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
												/>
											</svg>
										</button>
										{#if activeMenuSessionId === session.id}
											<div
												class="ring-opacity-5 absolute top-8 right-0 z-50 w-32 rounded-md bg-stone-800 py-1 shadow-lg ring-1 ring-black"
											>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => startEditing(e, session)}
												>
													タイトル編集
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => handlePublish(e, session)}
												>
													投稿
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => handleDuplicate(e, session)}
												>
													複製
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-bg-hover hover:text-red-300"
													on:click={(e) => handleDelete(e, session)}
												>
													削除
												</button>
											</div>
										{/if}
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if groupedSessions.last7Days.length > 0}
				<div>
					<h3 class="mb-2 px-2 text-xs font-bold text-text-off">過去7日間</h3>
					<ul class="space-y-1">
						{#each groupedSessions.last7Days as session (session.id)}
							<li>
								<div class="group relative flex items-center rounded-md hover:bg-bg-hover">
									{#if editingSessionId === session.id}
										<input
											bind:this={inputElement}
											type="text"
											bind:value={editingTitle}
											on:blur={() => saveTitle(session)}
											on:keydown={(e) => handleKeyDown(e, session)}
											on:click|stopPropagation
											class="w-full bg-transparent px-2 py-2 text-sm text-text-main focus:outline-none"
										/>
									{:else}
										<button
											class="flex-1 truncate px-2 py-2 text-left text-sm text-text-main hover:text-text-main"
											on:click={() => handleSessionClick(session.id)}
										>
											{session.title}
										</button>
										<button
											class="p-2 text-text-off hover:text-text-main"
											on:click={(e) => toggleMenu(e, session.id)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
												/>
											</svg>
										</button>
										{#if activeMenuSessionId === session.id}
											<div
												class="ring-opacity-5 absolute top-8 right-0 z-50 w-32 rounded-md bg-stone-800 py-1 shadow-lg ring-1 ring-black"
											>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => startEditing(e, session)}
												>
													タイトル編集
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => handlePublish(e, session)}
												>
													投稿
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => handleDuplicate(e, session)}
												>
													複製
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-bg-hover hover:text-red-300"
													on:click={(e) => handleDelete(e, session)}
												>
													削除
												</button>
											</div>
										{/if}
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if groupedSessions.older.length > 0}
				<div>
					<h3 class="mb-2 px-2 text-xs font-bold text-text-off">それ以前</h3>
					<ul class="space-y-1">
						{#each groupedSessions.older as session (session.id)}
							<li>
								<div class="group relative flex items-center rounded-md hover:bg-bg-hover">
									{#if editingSessionId === session.id}
										<input
											bind:this={inputElement}
											type="text"
											bind:value={editingTitle}
											on:blur={() => saveTitle(session)}
											on:keydown={(e) => handleKeyDown(e, session)}
											on:click|stopPropagation
											class="w-full bg-transparent px-2 py-2 text-sm text-text-main focus:outline-none"
										/>
									{:else}
										<button
											class="flex-1 truncate px-2 py-2 text-left text-sm text-text-main hover:text-text-main"
											on:click={() => handleSessionClick(session.id)}
										>
											{session.title}
										</button>
										<button
											class="p-2 text-text-off hover:text-text-main"
											on:click={(e) => toggleMenu(e, session.id)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
												/>
											</svg>
										</button>
										{#if activeMenuSessionId === session.id}
											<div
												class="ring-opacity-5 absolute top-8 right-0 z-50 w-32 rounded-md bg-stone-800 py-1 shadow-lg ring-1 ring-black"
											>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => startEditing(e, session)}
												>
													タイトル編集
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => handlePublish(e, session)}
												>
													投稿
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-text-main hover:bg-bg-hover hover:text-white"
													on:click={(e) => handleDuplicate(e, session)}
												>
													複製
												</button>
												<button
													class="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-bg-hover hover:text-red-300"
													on:click={(e) => handleDelete(e, session)}
												>
													削除
												</button>
											</div>
										{/if}
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
	</div>
</div>

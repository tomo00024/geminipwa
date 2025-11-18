<!-- src/lib/components/FileDetailModal.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { sessions } from '$lib/stores';
	import type { Session } from '$lib/types';
	import { generateUUID } from '$lib/utils';
	import type { Session as AuthSession } from '@auth/sveltekit';

	export let session: AuthSession | null = null;
	export let file: any;
	// ▼▼▼ ここにデバッグコードを追加 ▼▼▼
	console.log('--- Modal Component Props ---');
	console.log('File Prop:', file);
	console.log('Session Prop:', session);
	console.log('File Uploader ID:', file?.uploaderId);
	console.log('Session User ID:', session?.user?.id);
	console.log('Comparison Result (isOwner):', session?.user?.id === file?.uploaderId);
	// ▲▲▲ ここまで ▲▲▲
	const dispatch = createEventDispatcher();

	let dialogElement: HTMLElement;
	let isImporting = false;
	let isDeleting = false;
	$: isOwner = session?.user?.id === file.uploaderId;
	function closeModal() {
		dispatch('close');
	}

	async function handleImport() {
		if (isImporting) return;
		isImporting = true;

		try {
			const response = await fetch(`/api/import/${file.id}`);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'セッションの読み込みに失敗しました。');
			}

			const originalSession = (await response.json()) as Session;

			// 新しいセッションオブジェクトを作成し、複製する
			const newSession: Session = {
				...originalSession, // 元のセッションデータをすべてコピー
				id: generateUUID(), // 新しいユニークなIDを割り当てる
				lastUpdatedAt: new Date().toISOString(), // 最終更新日時を現在に設定
				// インポート元情報（目印）を追加する
				importedInfo: {
					originalId: file.id, // 公開されていた時のID
					authorName: file.authorName, // 公開した作者名
					importedAt: new Date().toISOString()
				}
			};

			// sessionsストアを更新して、複製した新しいセッションをリストの先頭に追加
			sessions.update((currentSessions) => {
				return [newSession, ...currentSessions];
			});

			alert(`「${newSession.title}」を履歴に読み込みました。`);
			closeModal();
		} catch (err: any) {
			console.error('Import failed:', err);
			alert(`エラーが発生しました: ${err.message}`);
		} finally {
			isImporting = false;
		}
	}

	// 削除処理の関数
	async function handleDelete() {
		if (isDeleting) return;

		// 最終確認
		if (!confirm('本当にこのセッションを削除しますか？\nこの操作は取り消せません。')) {
			return;
		}

		isDeleting = true;

		try {
			const response = await fetch(`/api/files/${file.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || '削除に失敗しました。');
			}

			alert('セッションを削除しました。');
			// 親コンポーネントに削除が完了したことを通知
			dispatch('deleted', file.id);
			closeModal();
		} catch (err: any) {
			console.error('Deletion failed:', err);
			alert(`エラーが発生しました: ${err.message}`);
		} finally {
			isDeleting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	function extractImageUrl(urlString: string): string {
		if (typeof urlString !== 'string') {
			return '';
		}
		const match = urlString.match(/!\[.*?\]\((.*?)\)/);
		return match ? match[1] : urlString;
	}

	onMount(() => {
		document.body.style.overflow = 'hidden';

		// モーダルが表示されたら、ダイアログ自体にフォーカスを当てる
		// これにより、スクリーンリーダーがモーダルの内容を読み上げ始め、
		// キーボード操作の起点がモーダル内に移る。
		if (dialogElement) {
			dialogElement.focus();
		}
	});

	onDestroy(() => {
		document.body.style.overflow = '';
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- 背景オーバーレイ -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
	role="button"
	tabindex="-1"
	class="bg-opacity-60 fixed inset-0 z-50 flex items-center justify-center bg-black"
	on:click={closeModal}
	on:keydown={(e) => e.key === 'Enter' && closeModal()}
	transition:fade={{ duration: 150 }}
>
	<div
		bind:this={dialogElement}
		tabindex="-1"
		class="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-xl outline-none"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		aria-describedby="modal-description"
		on:click|stopPropagation
		on:keydown|stopPropagation
	>
		<!-- 画像ヘッダー -->
		{#if file.imageUrl}
			<img
				src={extractImageUrl(file.imageUrl)}
				alt="{file.title}のサムネイル"
				class="h-64 w-full rounded-t-lg object-cover"
			/>
		{/if}

		<!-- コンテンツエリア -->
		<div class="flex flex-col p-6">
			<!-- タイトル -->
			<h2 id="modal-title" class="mb-2 text-2xl font-bold text-gray-900">{file.title}</h2>

			<!-- メタ情報 -->
			<div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
				<span>👤 {file.authorName}</span>
				<span>★ {file.starCount}</span>
				<span>↓ {file.downloadCount}</span>
				<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
			</div>

			<!-- タグ -->
			{#if file.tags && file.tags.length > 0}
				<div class="mb-4 flex flex-wrap gap-2">
					{#each file.tags as tag}
						<span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
							{tag}
						</span>
					{/each}
				</div>
			{/if}

			<!-- 説明 -->
			<p id="modal-description" class="text-base text-gray-700">{file.description}</p>
		</div>

		<!-- フッター -->
		<div class="sticky bottom-0 mt-auto rounded-b-lg border-t border-gray-200 bg-gray-50 p-4">
			<!-- ボタンのコンテナを flex と justify-between に変更 -->
			<div class="flex items-center justify-between">
				<!-- 左側にオーナー用ボタンを配置 -->
				<div>
					{#if isOwner}
						<button
							on:click={handleDelete}
							disabled={isDeleting}
							class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isDeleting ? '削除中...' : '削除する'}
						</button>
						<!-- ここに編集ボタンも将来的に追加できます -->
					{/if}
				</div>

				<!-- 右側に通常のボタンを配置 -->
				<div class="flex justify-end gap-3">
					<button
						on:click={closeModal}
						class="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
					>
						閉じる
					</button>
					<button
						on:click={handleImport}
						disabled={isImporting}
						class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isImporting ? '読み込み中...' : 'このセッションを読み込む'}
					</button>
				</div>
			</div>
		</div>

		<!-- 右上の閉じるボタン -->
		<button
			on:click={closeModal}
			class="bg-opacity-50 hover:bg-opacity-75 absolute top-4 right-4 rounded-full bg-gray-800 p-2 text-white"
			aria-label="閉じる"
		>
			<svg
				class="h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>
</div>

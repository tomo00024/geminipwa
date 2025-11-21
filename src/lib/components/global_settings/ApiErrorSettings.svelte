<!-- src/lib/components/global_settings/ApiErrorSettings.svelte -->
<script lang="ts">
	import { appSettings } from '$lib/stores';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
</script>

<Section title="APIエラー時の挙動">
	<Toggle
		id="loop-keys"
		bind:checked={$appSettings.apiErrorHandling.loopApiKeys}
		label="429エラーのときにAPIキーを変更"
	/>
	<Toggle
		id="exp-backoff"
		bind:checked={$appSettings.apiErrorHandling.exponentialBackoff}
		label="自動リトライ（指数関数的バックオフ）"
	/>

	<!-- 全体を囲むdiv -->
	<div
		class="ml-6 flex flex-wrap items-center gap-6"
		class:opacity-50={!$appSettings.apiErrorHandling.exponentialBackoff}
	>
		<!-- 1つ目のセット: 回数 -->
		<div class="flex items-center gap-2">
			<label for="max-retries" class="text-sm whitespace-nowrap text-text-off"> 回数: </label>
			<Input
				id="max-retries"
				type="number"
				bind:value={$appSettings.apiErrorHandling.maxRetries}
				disabled={!$appSettings.apiErrorHandling.exponentialBackoff}
				class="w-20"
			/>
		</div>

		<!-- 2つ目のセット: 待機時間 -->
		<div class="flex items-center gap-2">
			<label for="initial-wait" class="text-sm whitespace-nowrap text-text-off">
				一回目の待機時間(ms):
			</label>
			<Input
				id="initial-wait"
				type="number"
				bind:value={$appSettings.apiErrorHandling.initialWaitTime}
				disabled={!$appSettings.apiErrorHandling.exponentialBackoff}
				class="w-24"
			/>
		</div>
	</div>
</Section>

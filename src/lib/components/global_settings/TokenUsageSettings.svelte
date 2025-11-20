<script lang="ts">
	import { tokenUsageHistory } from '$lib/stores';
	import Select from '$lib/components/ui/Select.svelte';
	import Section from '$lib/components/ui/Section.svelte';

	// 日付の降順でソート
	$: sortedHistory = [...$tokenUsageHistory].sort((a, b) => {
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});

	// 期間選択
	let selectedRange: 'day' | 'week' | 'month' | 'year' = 'day';

	$: latestDateStr =
		sortedHistory.length > 0 ? sortedHistory[0].date : new Date().toISOString().split('T')[0];

	$: rangeStats = (() => {
		if (sortedHistory.length === 0) return null;

		const latestDate = new Date(latestDateStr);
		let startDate = new Date(latestDate);
		let daysToSubtract = 0;

		switch (selectedRange) {
			case 'day':
				daysToSubtract = 0;
				break;
			case 'week':
				daysToSubtract = 6; // 当日含む7日間
				break;
			case 'month':
				daysToSubtract = 29; // 当日含む30日間
				break;
			case 'year':
				daysToSubtract = 364; // 当日含む365日間
				break;
		}

		startDate.setDate(latestDate.getDate() - daysToSubtract);

		// 日付比較用のヘルパー (YYYY-MM-DD形式の文字列で比較)
		const startStr = startDate.toISOString().split('T')[0];
		const endStr = latestDateStr;

		const filtered = sortedHistory.filter((entry) => {
			return entry.date >= startStr && entry.date <= endStr;
		});

		const total = filtered.reduce((acc, entry) => acc + entry.totalTokens, 0);
		const input = filtered.reduce((acc, entry) => acc + entry.inputTokens, 0);
		const output = filtered.reduce((acc, entry) => acc + entry.outputTokens, 0);
		const thinking = filtered.reduce((acc, entry) => acc + (entry.thinkingTokens || 0), 0);

		return {
			total,
			input,
			output,
			thinking,
			periodLabel: selectedRange === 'day' ? endStr : `${startStr} 〜 ${endStr}`
		};
	})();
</script>

<Section title="トークン使用履歴">
	<div class="space-y-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-sm text-gray-400">Gemini APIのトークン使用量を確認できます。</p>
			<div class="w-full sm:w-48">
				<Select bind:value={selectedRange}>
					<option value="day">本日 (Day)</option>
					<option value="week">直近1週間 (Week)</option>
					<option value="month">直近1ヶ月 (Month)</option>
					<option value="year">直近1年 (Year)</option>
				</Select>
			</div>
		</div>

		<!-- 集計カード -->
		{#if rangeStats}
			<div class="rounded-lg border border-gray-600 bg-transparent p-4">
				<div class="mb-3 text-sm font-medium text-gray-400">
					集計期間: <span class="text-gray-200">{rangeStats.periodLabel}</span>
				</div>
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div class="rounded-md bg-gray-700/50 p-3">
						<div class="text-xs text-blue-400">合計トークン</div>
						<div class="mt-1 text-xl font-bold text-blue-300">
							{rangeStats.total.toLocaleString()}
						</div>
					</div>
					<div class="rounded-md bg-gray-700/30 p-3">
						<div class="text-xs text-gray-400">入力 (Prompt)</div>
						<div class="mt-1 text-lg font-semibold text-gray-200">
							{rangeStats.input.toLocaleString()}
						</div>
					</div>
					<div class="rounded-md bg-gray-700/30 p-3">
						<div class="text-xs text-gray-400">出力 (Response)</div>
						<div class="mt-1 text-lg font-semibold text-gray-200">
							{rangeStats.output.toLocaleString()}
						</div>
					</div>
					<div class="rounded-md bg-gray-700/30 p-3">
						<div class="text-xs text-gray-400">思考 (Thinking)</div>
						<div class="mt-1 text-lg font-semibold text-gray-200">
							{rangeStats.thinking.toLocaleString()}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</Section>

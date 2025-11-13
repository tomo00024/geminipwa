// src/lib/chatSessionStore.ts

import { writable, get } from 'svelte/store';
import type { Session, Log } from '$lib/types';
import { sessions } from '$lib/stores'; // 全セッションを管理するグローバルストア

export interface ChatSessionState {
	session: Session | null;
	editingMessageId: string | null;
	editingText: string;
}

function createChatSessionStore() {
	const { subscribe, update, set } = writable<ChatSessionState>({
		session: null,
		editingMessageId: null,
		editingText: ''
	});

	// --- Public Methods (コンポーネントから呼び出す関数) ---
	return {
		subscribe,
		init: (sessionData: Session) => {
			set({
				session: sessionData,
				editingMessageId: null,
				editingText: ''
			});
		},

		startEditing: (messageId: string) => {
			update((state) => {
				if (!state.session) return state;
				const message = state.session.logs.find((m) => m.id === messageId);
				if (message) {
					state.editingMessageId = messageId;
					state.editingText = message.text;
				}
				return state;
			});
		},

		cancelEditing: () => {
			update((state) => {
				state.editingMessageId = null;
				state.editingText = '';
				return state;
			});
		},

		saveEditing: () => {
			const state = get(chatSessionStore);
			if (!state.session || !state.editingMessageId) return;

			const newLogs = state.session.logs.map((log) => {
				if (log.id === state.editingMessageId) {
					return { ...log, text: state.editingText };
				}
				return log;
			});

			sessions.update((allSessions) => {
				return allSessions.map((s) => (s.id === state.session?.id ? { ...s, logs: newLogs } : s));
			});

			update((s) => {
				s.editingMessageId = null;
				s.editingText = '';
				if (s.session) s.session.logs = newLogs;
				return s;
			});
		},

		/**
		 * ▼▼▼【変更】単一のメッセージを削除し、親子関係を再接続する新しい関数 ▼▼▼
		 * @param messageId 削除対象のメッセージID
		 */
		deleteSingleMessage: (messageId: string) => {
			const state = get(chatSessionStore);
			if (!state.session) return;

			const logMap = new Map(state.session.logs.map((log) => [log.id, log]));
			const targetLog = logMap.get(messageId);

			if (!targetLog) return;

			// このメッセージから分岐している子の数を数える
			const children = state.session.logs.filter((log) => log.parentId === messageId);

			// 制約: 分岐の親は削除できない
			if (children.length > 1) {
				alert('このメッセージからは会話が分岐しているため、削除できません。');
				return;
			}

			if (!confirm('このメッセージを削除しますか？ 後続の会話は自動的に接続されます。')) return;

			let newLogs = [...state.session.logs];

			const parentLog = targetLog.parentId ? logMap.get(targetLog.parentId) : null;
			const childLog = children.length === 1 ? children[0] : null;

			// 1. 親子関係の再接続
			if (parentLog) {
				// 親のactiveChildIdを、孫(child)に付け替える
				if (parentLog.activeChildId === targetLog.id) {
					newLogs = newLogs.map((log) =>
						log.id === parentLog.id ? { ...log, activeChildId: childLog ? childLog.id : null } : log
					);
				}
			}
			if (childLog) {
				// 孫(child)のparentIdを、祖父(parent)に付け替える
				newLogs = newLogs.map((log) =>
					log.id === childLog.id ? { ...log, parentId: parentLog ? parentLog.id : null } : log
				);
			}

			// 2. ターゲットを削除
			newLogs = newLogs.filter((log) => log.id !== messageId);

			// 3. ストアを更新
			sessions.update((allSessions) => {
				return allSessions.map((s) => (s.id === state.session?.id ? { ...s, logs: newLogs } : s));
			});
			update((s) => {
				if (s.session) s.session.logs = newLogs;
				return s;
			});
		},

		updateEditingText: (text: string) => {
			update((state) => {
				state.editingText = text;
				return state;
			});
		},

		switchActiveResponse: (parentId: string, newActiveChildId: string) => {
			update((state) => {
				if (!state.session) return state;
				const newLogs = state.session.logs.map((log) => {
					if (log.id === parentId) {
						return { ...log, activeChildId: newActiveChildId };
					}
					return log;
				});
				sessions.update((allSessions) => {
					return allSessions.map((s) => (s.id === state.session?.id ? { ...s, logs: newLogs } : s));
				});
				if (state.session) state.session.logs = newLogs;
				return state;
			});
		}
	};
}

export const chatSessionStore = createChatSessionStore();

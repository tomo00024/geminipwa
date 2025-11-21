import { writable } from 'svelte/store';

interface UiState {
    isSettingsModalOpen: boolean;
}

function createUiStore() {
    const { subscribe, update, set } = writable<UiState>({
        isSettingsModalOpen: false
    });

    return {
        subscribe,
        openSettingsModal: () => update((s) => ({ ...s, isSettingsModalOpen: true })),
        closeSettingsModal: () => update((s) => ({ ...s, isSettingsModalOpen: false })),
        toggleSettingsModal: () =>
            update((s) => ({ ...s, isSettingsModalOpen: !s.isSettingsModalOpen })),
        reset: () => set({ isSettingsModalOpen: false })
    };
}

export const ui = createUiStore();

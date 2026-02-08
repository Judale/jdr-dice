import type { Character } from "./types";

const KEY = "rpg_dice_app_v1";

export type PersistedState = {
    characters: Character[];
    activeCharacterId: string | null;
};

export function loadState(): PersistedState {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { characters: [], activeCharacterId: null };
        const parsed = JSON.parse(raw) as PersistedState;
        if (!parsed || !Array.isArray(parsed.characters)) {
            return { characters: [], activeCharacterId: null };
        }
        return parsed;
    } catch {
        return { characters: [], activeCharacterId: null };
    }
}

export function saveState(state: PersistedState) {
    localStorage.setItem(KEY, JSON.stringify(state));
}

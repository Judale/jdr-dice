import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "./storage";
import type { Character, StatKey } from "./types";
import { makeEmptyStats, ALL_STATS } from "./data";

type ImportResult =
    | { ok: true; character: Character }
    | { ok: false; error: string };

type CharactersCtx = {
    characters: Character[];
    activeCharacter: Character | null;
    activeCharacterId: string | null;

    createCharacter: (name: string) => void;
    deleteCharacter: (id: string) => void;
    setActiveCharacterId: (id: string | null) => void;

    setStat: (id: string, key: StatKey, value: number) => void;
    setDetresse: (id: string, value: number) => void;
    setDanger: (id: string, value: number) => void;
    rename: (id: string, name: string) => void;

    // NEW
    exportCharacterJson: (id: string) => string;
    importCharacterJson: (json: string, mode?: "new" | "replace") => ImportResult;
};

const Ctx = createContext<CharactersCtx | null>(null);

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const ALL_KEYS = new Set(ALL_STATS.map((s) => s.key));

function isObject(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && !Array.isArray(x);
}

function normalizeCharacter(raw: unknown, mode: "new" | "replace"): ImportResult {
    try {
        if (!isObject(raw)) return { ok: false, error: "JSON invalide (objet attendu)." };

        const name = typeof raw.name === "string" ? raw.name.trim() : "";
        const detresse = clamp(Number(raw.detresse ?? 1), 1, 5);
        const danger = clamp(Number(raw.danger ?? 1), 1, 5);

        const statsIn = raw.stats;
        const empty = makeEmptyStats();

        let stats: Record<StatKey, number> = empty;
        if (isObject(statsIn)) {
            const next = { ...empty };
            for (const [k, v] of Object.entries(statsIn)) {
                if (ALL_KEYS.has(k)) {
                    next[k as StatKey] = clamp(Number(v ?? 0), 0, 5);
                }
            }
            stats = next;
        }

        const now = Date.now();
        const id =
            mode === "replace" && typeof raw.id === "string" && raw.id.trim()
                ? raw.id.trim()
                : uid();

        const createdAt =
            typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt) ? raw.createdAt : now;

        const character: Character = {
            id,
            name: name || "Sans nom",
            stats,
            detresse,
            danger,
            createdAt,
            updatedAt: now,
        };

        return { ok: true, character };
    } catch (e) {
        return { ok: false, error: "Impossible d'importer ce JSON." };
    }
}

export function CharactersProvider({ children }: { children: React.ReactNode }) {
    const initial = useMemo(() => loadState(), []);
    const [characters, setCharacters] = useState<Character[]>(initial.characters);
    const [activeCharacterId, setActiveCharacterId] = useState<string | null>(initial.activeCharacterId);

    const activeCharacter = useMemo(
        () => characters.find((c) => c.id === activeCharacterId) ?? null,
        [characters, activeCharacterId]
    );

    useEffect(() => {
        saveState({ characters, activeCharacterId });
    }, [characters, activeCharacterId]);

    const createCharacter = (name: string) => {
        const now = Date.now();
        const c: Character = {
            id: uid(),
            name: name.trim() || "Sans nom",
            stats: makeEmptyStats(),
            detresse: 1,
            danger: 1,
            createdAt: now,
            updatedAt: now,
        };
        setCharacters((prev) => [c, ...prev]);
        setActiveCharacterId(c.id);
    };

    const deleteCharacter = (id: string) => {
        setCharacters((prev) => prev.filter((c) => c.id !== id));
        setActiveCharacterId((prev) => (prev === id ? null : prev));
    };

    const rename = (id: string, name: string) => {
        setCharacters((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, name: name.trim() || c.name, updatedAt: Date.now() } : c
            )
        );
    };

    const setStat = (id: string, key: StatKey, value: number) => {
        setCharacters((prev) =>
            prev.map((c) =>
                c.id === id
                    ? {
                        ...c,
                        stats: { ...c.stats, [key]: clamp(Math.round(value), 0, 5) },
                        updatedAt: Date.now(),
                    }
                    : c
            )
        );
    };

    const setDetresse = (id: string, value: number) => {
        setCharacters((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, detresse: clamp(Math.round(value), 1, 5), updatedAt: Date.now() } : c
            )
        );
    };

    const setDanger = (id: string, value: number) => {
        setCharacters((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, danger: clamp(Math.round(value), 1, 5), updatedAt: Date.now() } : c
            )
        );
    };

    // NEW: export JSON (pretty)
    const exportCharacterJson = (id: string) => {
        const c = characters.find((x) => x.id === id);
        if (!c) return "";
        return JSON.stringify(c, null, 2);
    };

    // NEW: import JSON
    // mode:
    // - "new" (default): crée un nouveau perso avec un nouvel id (évite écrasement)
    // - "replace": réutilise l'id du JSON si présent, et remplace si même id existe
    const importCharacterJson = (json: string, mode: "new" | "replace" = "new"): ImportResult => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(json);
        } catch {
            return { ok: false, error: "JSON invalide (parse impossible)." };
        }

        const normalized = normalizeCharacter(parsed, mode);
        if (!normalized.ok) return normalized;

        const incoming = normalized.character;

        setCharacters((prev) => {
            if (mode === "replace") {
                const exists = prev.some((c) => c.id === incoming.id);
                if (exists) return prev.map((c) => (c.id === incoming.id ? incoming : c));
                return [incoming, ...prev];
            }

            // mode "new": évite toute collision d'id (au cas où)
            let final = incoming;
            if (prev.some((c) => c.id === final.id)) {
                final = { ...final, id: uid() };
            }
            return [final, ...prev];
        });

        setActiveCharacterId(incoming.id);
        return { ok: true, character: incoming };
    };

    const value: CharactersCtx = {
        characters,
        activeCharacter,
        activeCharacterId,
        createCharacter,
        deleteCharacter,
        setActiveCharacterId,
        setStat,
        setDetresse,
        setDanger,
        rename,
        exportCharacterJson,
        importCharacterJson,
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCharacters() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useCharacters must be used inside CharactersProvider");
    return v;
}

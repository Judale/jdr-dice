import type { StatKey } from "./types";

export const ATTRIBUTES: Array<{ key: StatKey; label: string }> = [
    { key: "force", label: "Force" },
    { key: "dexterite", label: "Dextérité" },
    { key: "vigueur", label: "Vigueur" },
    { key: "charisme", label: "Charisme" },
    { key: "manipulation", label: "Manipulation" },
    { key: "sangFroid", label: "Sang-froid" },
    { key: "intelligence", label: "Intelligence" },
    { key: "astuces", label: "Astuces" },
    { key: "resolution", label: "Résolution" },
];

export const SKILLS: Array<{ key: StatKey; label: string }> = [
    { key: "armesAFeu", label: "Armes à feu" },
    { key: "artisanat", label: "Artisanat" },
    { key: "athletisme", label: "Athlétisme" },
    { key: "bagarre", label: "Bagarre" },
    { key: "conduite", label: "Conduite" },
    { key: "furtivite", label: "Furtivité" },
    { key: "larcin", label: "Larcin" },
    { key: "melee", label: "Mêlée" },
    { key: "survie", label: "Survie" },
    { key: "animaux", label: "Animaux" },
    { key: "erudition", label: "Érudition" },
    { key: "commandement", label: "Commandement" },
    { key: "empathie", label: "Empathie" },
    { key: "etiquettes", label: "Étiquettes" },
    { key: "experienceDeLaRue", label: "Expérience de la rue" },
    { key: "intimidation", label: "Intimidation" },
    { key: "persuasion", label: "Persuasion" },
    { key: "representation", label: "Représentation" },
    { key: "subterfuge", label: "Subterfuge" },
    { key: "finances", label: "Finances" },
    { key: "investigation", label: "Investigation" },
    { key: "medecine", label: "Médecine" },
    { key: "occultisme", label: "Occultisme" },
    { key: "politique", label: "Politique" },
    { key: "science", label: "Science" },
    { key: "technologie", label: "Technologie" },
    { key: "vigilance", label: "Vigilance" },
];

export const ALL_STATS = [
    ...ATTRIBUTES.map((s) => ({ ...s, group: "Caractéristique" as const })),
    ...SKILLS.map((s) => ({ ...s, group: "Compétence" as const })),
];

export function makeEmptyStats(): Record<StatKey, number> {
    const keys = ALL_STATS.map((s) => s.key) as StatKey[];
    return keys.reduce((acc, k) => {
        acc[k] = 0;
        return acc;
    }, {} as Record<StatKey, number>);
}

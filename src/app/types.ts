export type StatKey =
    | "force"
    | "dexterite"
    | "vigueur"
    | "charisme"
    | "manipulation"
    | "sangFroid"
    | "intelligence"
    | "astuces"
    | "resolution"
    | "armesAFeu"
    | "artisanat"
    | "athletisme"
    | "bagarre"
    | "conduite"
    | "furtivite"
    | "larcin"
    | "melee"
    | "survie"
    | "animaux"
    | "erudition"
    | "commandement"
    | "empathie"
    | "etiquettes"
    | "experienceDeLaRue"
    | "intimidation"
    | "persuasion"
    | "representation"
    | "subterfuge"
    | "finances"
    | "investigation"
    | "medecine"
    | "occultisme"
    | "politique"
    | "science"
    | "technologie"
    | "vigilance";

export type Character = {
    id: string;
    name: string;

    // 0..5
    stats: Record<StatKey, number>;

    // 1..5
    detresse: number;
    danger: number;

    createdAt: number;
    updatedAt: number;
};

export type RollDie = {
    id: string;
    value: number; // 1..10
    kind: "normal" | "detresse";
};

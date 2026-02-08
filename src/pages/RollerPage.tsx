import { useMemo, useState } from "react";
import { useCharacters } from "../app/CharactersContext";
import { ALL_STATS } from "../app/data";
import type { RollDie, StatKey } from "../app/types";
import { DiceTray } from "../ui/DiceTray";

function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function rollD10(): number {
    // 1..10
    return Math.floor(Math.random() * 10) + 1;
}

export default function RollerPage() {
    const { activeCharacter } = useCharacters();

    const [a, setA] = useState<StatKey>("charisme");
    const [b, setB] = useState<StatKey>("persuasion");
    const [modifier, setModifier] = useState<number>(0);

    const [includeDetresse, setIncludeDetresse] = useState(true);
    const [dice, setDice] = useState<RollDie[]>([]);

    const options = useMemo(() => ALL_STATS, []);

    const valA = activeCharacter?.stats[a] ?? 0;
    const valB = activeCharacter?.stats[b] ?? 0;

    const baseDiceCount = Math.max(0, valA + valB + (modifier || 0));
    const detresseCount = includeDetresse ? (activeCharacter?.detresse ?? 1) : 0;
    const total = baseDiceCount + detresseCount;

    const doRoll = () => {
        const next: RollDie[] = [];
        for (let i = 0; i < baseDiceCount; i++) {
            next.push({ id: uid(), value: rollD10(), kind: "normal" });
        }
        for (let i = 0; i < detresseCount; i++) {
            next.push({ id: uid(), value: rollD10(), kind: "detresse" });
        }
        setDice(next);
    };

    return (
        <div className="container">
            <header className="topbar">
                <div>
                    <h1>Lanceur de dés</h1>
                    <p className="muted">
                        Pool = valeur A + valeur B (+ modif). Dés de détresse = niveau de détresse (noirs).
                    </p>
                </div>
            </header>

            {!activeCharacter ? (
                <section className="card">
                    <p className="muted">Aucun personnage actif. Va dans “Personnages” et sélectionne-en un.</p>
                </section>
            ) : (
                <>
                    <section className="card">
                        <header className="cardHeader">
                            <h2>Configuration</h2>
                            <p className="muted">Personnage : {activeCharacter.name}</p>
                        </header>

                        <div className="rowWrap">
                            <div className="field">
                                <label className="label">Stat A</label>
                                <select className="select" value={a} onChange={(e) => setA(e.target.value as StatKey)}>
                                    {options.map((o) => (
                                        <option key={o.key} value={o.key}>
                                            {o.group} — {o.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="muted">Valeur: {valA}</div>
                            </div>

                            <div className="field">
                                <label className="label">Stat B</label>
                                <select className="select" value={b} onChange={(e) => setB(e.target.value as StatKey)}>
                                    {options.map((o) => (
                                        <option key={o.key} value={o.key}>
                                            {o.group} — {o.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="muted">Valeur: {valB}</div>
                            </div>

                            <div className="field">
                                <label className="label">Modificateur</label>
                                <input
                                    className="input"
                                    type="number"
                                    value={modifier}
                                    onChange={(e) => setModifier(Number(e.target.value))}
                                />
                                <div className="muted">Ex: +2 / -1</div>
                            </div>

                            <div className="field">
                                <label className="label">Dés de détresse</label>
                                <label className="check">
                                    <input
                                        type="checkbox"
                                        checked={includeDetresse}
                                        onChange={(e) => setIncludeDetresse(e.target.checked)}
                                    />
                                    Ajouter {activeCharacter.detresse} dé(s) noir(s)
                                </label>
                                <div className="muted">Détresse: {activeCharacter.detresse}/5</div>
                            </div>
                        </div>

                        <div className="summaryRow">
                            <span className="pill">Dés orange: {baseDiceCount}</span>
                            <span className="pill">Dés détresse: {detresseCount}</span>
                            <span className="pill">Total: {total}</span>

                            <button className="btn" onClick={doRoll} disabled={total <= 0}>
                                Lancer
                            </button>
                            <button className="btnGhost" onClick={() => setDice([])} disabled={dice.length === 0}>
                                Effacer
                            </button>
                        </div>
                    </section>

                    <DiceTray dice={dice} />
                </>
            )}
        </div>
    );
}

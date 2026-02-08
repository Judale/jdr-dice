import { useEffect, useMemo, useRef, useState } from "react";
import type { RollDie } from "../app/types";

function borderClass(v: number) {
    if (v === 1) return "bCritFail";
    if (v >= 2 && v <= 5) return "bFail";
    if (v >= 6 && v <= 9) return "bSuccess";
    return "bCritSuccess"; // 10
}

function resultClass(v: number) {
    if (v === 1) return "resCritFail";
    if (v >= 2 && v <= 5) return "resFail";
    if (v >= 6 && v <= 9) return "resSuccess";
    return "resCritSuccess"; // 10
}

function randD10() {
    return Math.floor(Math.random() * 10) + 1;
}

function D10Svg({
                    kind,
                    border,
                }: {
    kind: "normal" | "detresse";
    border: string;
}) {
    const isD = kind === "detresse";

    // Normal: ambre / lave
    // Détresse: obsidienne / froid
    const base = isD ? "#0b0c10" : "#ff7a18";
    const faceA = isD ? "rgba(90,110,255,0.10)" : "rgba(255,210,120,0.22)";
    const faceB = isD ? "rgba(255,80,80,0.10)" : "rgba(255,120,40,0.18)";
    const edge = isD ? "rgba(170,190,255,0.30)" : "rgba(255,255,255,0.28)";

    // ids stables (évite collisions si plein de dés)
    const bodyId = isD ? "gBodyD" : "gBodyN";
    const hiId = isD ? "gHiD" : "gHiN";

    return (
        <svg
            className={`d10Svg ${border} ${isD ? "d10SvgDetresse" : "d10SvgNormal"}`}
            viewBox="0 0 200 200"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={bodyId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={base} stopOpacity="0.95" />
                    <stop offset="55%" stopColor={base} stopOpacity={isD ? "0.80" : "0.70"} />
                    <stop offset="100%" stopColor={base} stopOpacity="0.95" />
                </linearGradient>

                <radialGradient id={hiId} cx="35%" cy="20%" r="70%">
                    <stop
                        offset="0%"
                        stopColor={isD ? "rgba(160,180,255,0.18)" : "rgba(255,240,210,0.35)"}
                    />
                    <stop offset="60%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
            </defs>

            {/* corps */}
            <path d="M100 10 L170 55 L185 130 L100 190 L15 130 L30 55 Z" fill={`url(#${bodyId})`} />

            {/* facettes */}
            <path d="M100 10 L30 55 L100 95 Z" fill={faceA} />
            <path d="M100 10 L170 55 L100 95 Z" fill={faceB} />
            <path d="M30 55 L15 130 L100 95 Z" fill={faceB} />
            <path d="M170 55 L185 130 L100 95 Z" fill={faceA} />
            <path d="M15 130 L100 190 L100 95 Z" fill={faceA} />
            <path d="M185 130 L100 190 L100 95 Z" fill={faceB} />

            {/* highlight */}
            <path d="M100 10 L170 55 L185 130 L100 190 L15 130 L30 55 Z" fill={`url(#${hiId})`} />

            {/* arêtes */}
            <path
                d="M100 10 L170 55 L185 130 L100 190 L15 130 L30 55 Z
           M100 10 L100 95
           M30 55 L100 95
           M170 55 L100 95
           M15 130 L100 95
           M185 130 L100 95"
                fill="none"
                stroke={edge}
                strokeWidth="3"
                strokeLinejoin="round"
            />

            {/* fissure (uniquement détresse) */}
            {isD && (
                <path
                    d="M55 60 L95 98 L76 126 L112 150"
                    fill="none"
                    stroke="rgba(255,70,70,0.25)"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
}

export function DiceTray({ dice }: { dice: RollDie[] }) {
    const [shown, setShown] = useState<Record<string, number>>({});
    const timeouts = useRef<number[]>([]);
    const intervals = useRef<number[]>([]);

    const clearAll = () => {
        timeouts.current.forEach((t) => window.clearTimeout(t));
        intervals.current.forEach((i) => window.clearInterval(i));
        timeouts.current = [];
        intervals.current = [];
    };

    // animation “chiffres qui tournent” à chaque nouveau roll
    useEffect(() => {
        clearAll();

        const nextShown: Record<string, number> = {};
        dice.forEach((d) => (nextShown[d.id] = randD10()));
        setShown(nextShown);

        dice.forEach((d, idx) => {
            const duration = 650 + (idx % 6) * 60; // 650..950ms
            const tick = d.kind === "detresse" ? 45 : 55;

            const intervalId = window.setInterval(() => {
                setShown((prev) => ({ ...prev, [d.id]: randD10() }));
            }, tick);
            intervals.current.push(intervalId);

            const timeoutId = window.setTimeout(() => {
                window.clearInterval(intervalId);
                setShown((prev) => ({ ...prev, [d.id]: d.value }));
            }, duration);
            timeouts.current.push(timeoutId);
        });

        return () => clearAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dice.map((d) => `${d.id}:${d.value}:${d.kind}`).join("|")]);

    const computed = useMemo(() => {
        const list = dice.map((d) => ({ ...d, shown: shown[d.id] ?? d.value }));
        const sum = list.reduce((a, d) => a + d.value, 0);
        const crits = list.filter((d) => d.value === 10).length;
        const ones = list.filter((d) => d.value === 1).length;
        const successes = list.filter((d) => d.value >= 6).length;
        return { list, sum, crits, ones, successes };
    }, [dice, shown]);

    if (dice.length === 0) {
        return (
            <div className="card">
                <p className="muted">Lance des dés pour voir les résultats ici.</p>
            </div>
        );
    }

    return (
        <section className="card">
            <header className="cardHeader">
                <h2>Résultats</h2>
                <div className="metaRow">
                    <span className="pill">Succès (6+): {computed.successes}</span>
                    <span className="pill">10: {computed.crits}</span>
                    <span className="pill">1: {computed.ones}</span>
                    <span className="pill">Somme: {computed.sum}</span>
                </div>
            </header>

            <div className="diceWrapD10">
                {computed.list.map((d) => {
                    const border = borderClass(d.value);
                    const isRolling = shown[d.id] !== undefined && shown[d.id] !== d.value;

                    return (
                        <div
                            key={d.id}
                            className={`d10Card ${d.kind === "detresse" ? "d10Detresse" : "d10Normal"} ${resultClass(
                                d.value
                            )} ${isRolling ? "isRolling" : ""}`}
                            title={d.kind === "detresse" ? "Dé de détresse" : "Dé normal"}
                        >
                            <D10Svg kind={d.kind} border={border} />
                            <div className={`d10Number ${isRolling ? "rolling" : ""}`}>{d.shown}</div>
                            <div className="d10Tag">{d.kind === "detresse" ? "⚠ Détresse" : "◆ Normal"}</div>
                        </div>
                    );
                })}
            </div>

            <div className="legend">
                <div className="legendItem">
                    <span className="legendSwatch bCritFail" /> 1 = échec critique
                </div>
                <div className="legendItem">
                    <span className="legendSwatch bFail" /> 2–5 = échec
                </div>
                <div className="legendItem">
                    <span className="legendSwatch bSuccess" /> 6–9 = réussite
                </div>
                <div className="legendItem">
                    <span className="legendSwatch bCritSuccess" /> 10 = réussite critique
                </div>
            </div>
        </section>
    );
}

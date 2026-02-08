import type { StatKey } from "../app/types";

type Props = {
    title: string;
    items: Array<{ key: StatKey; label: string }>;
    values: Record<StatKey, number>;
    onChange: (key: StatKey, value: number) => void;
};

export function StatGrid({ title, items, values, onChange }: Props) {
    return (
        <section className="card">
            <header className="cardHeader">
                <h2>{title}</h2>
                <p className="muted">0 à 5</p>
            </header>

            <div className="grid">
                {items.map((it) => (
                    <label key={it.key} className="statRow">
                        <span className="statLabel">{it.label}</span>
                        <input
                            className="slider"
                            type="range"
                            min={0}
                            max={5}
                            step={1}
                            value={values[it.key] ?? 0}
                            onChange={(e) => onChange(it.key, Number(e.target.value))}
                        />
                        <span className="pill">{values[it.key] ?? 0}</span>
                    </label>
                ))}
            </div>
        </section>
    );
}

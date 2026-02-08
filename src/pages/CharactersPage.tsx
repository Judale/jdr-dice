import { useMemo, useState } from "react";
import { useCharacters } from "../app/CharactersContext";
import { ATTRIBUTES, SKILLS } from "../app/data";
import { StatGrid } from "../ui/StatGrid";

function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function safeFileName(name: string) {
    return (name || "personnage").trim().replace(/[^\w\-]+/g, "_");
}

export default function CharactersPage() {
    const {
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
    } = useCharacters();

    // Create
    const [newName, setNewName] = useState("");

    // Search
    const [q, setQ] = useState("");

    // Import/Export
    const [jsonText, setJsonText] = useState("");
    const [importMode, setImportMode] = useState<"new" | "replace">("new");
    const [ioOpen, setIoOpen] = useState(false);

    // Notice
    const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

    const sorted = useMemo(() => {
        return [...characters].sort((a, b) => b.updatedAt - a.updatedAt);
    }, [characters]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return sorted;
        return sorted.filter((c) => c.name.toLowerCase().includes(s));
    }, [sorted, q]);

    const selected = activeCharacter;

    const totalChars = characters.length;

    const exportToClipboard = async (id: string) => {
        const json = exportCharacterJson(id);
        try {
            await navigator.clipboard.writeText(json);
            setNotice({ type: "ok", text: "✅ JSON copié dans le presse-papiers." });
        } catch {
            setNotice({ type: "error", text: "❌ Copie impossible (permission navigateur). Utilise Export fichier." });
        }
    };

    const exportToFile = (id: string, name: string) => {
        const json = exportCharacterJson(id);
        downloadText(`${safeFileName(name)}.json`, json);
        setNotice({ type: "ok", text: "✅ Fichier JSON exporté." });
    };

    const doImport = (text: string) => {
        setNotice(null);
        const r = importCharacterJson(text, importMode);
        if (!r.ok) {
            setNotice({ type: "error", text: `❌ Import échoué : ${r.error}` });
            return;
        }
        setNotice({ type: "ok", text: `✅ Import OK : ${r.character.name}` });
        setJsonText("");
        setIoOpen(false);
    };

    const importFromFile = async (file: File | null) => {
        if (!file) return;
        try {
            const text = await file.text();
            doImport(text);
        } catch {
            setNotice({ type: "error", text: "❌ Impossible de lire le fichier." });
        }
    };

    const createAndSelect = () => {
        createCharacter(newName);
        setNewName("");
        setNotice(null);
    };

    return (
        <div className="container">
            <header className="topbar">
                <div>
                    <h1>Personnages</h1>
                </div>
            </header>

            {/* Top controls */}
            <section className="card">
                <div className="sectionTitle">
                    <div>
                        <div className="smallMuted">
                            {totalChars} personnage(s)
                            {activeCharacter ? ` • Actif : ${activeCharacter.name}` : " • Aucun actif"}
                        </div>
                    </div>
                    <div className="kbdHint">Tip: recherche + clic pour activer</div>
                </div>

                <div className="row" style={{ marginTop: 12 }}>
                    <input
                        className="input"
                        placeholder="Nom du personnage…"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <button className="btn" onClick={createAndSelect}>
                        + Créer
                    </button>

                    <div style={{ flex: 1 }} />

                    <input
                        className="input"
                        placeholder="Rechercher…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={{ minWidth: 260 }}
                    />
                </div>

                {notice && (
                    <div className={`notice ${notice.type === "error" ? "error" : ""}`} style={{ marginTop: 12 }}>
                        {notice.text}
                    </div>
                )}

                {/* Cards grid */}
                {filtered.length === 0 ? (
                    <p className="muted" style={{ marginTop: 12 }}>
                        Aucun résultat.
                    </p>
                ) : (
                    <div className="characterGrid">
                        {filtered.map((c) => (
                            <div key={c.id} className={`charCard ${c.id === activeCharacterId ? "active" : ""}`}>
                                <div className="charTop">
                                    <div>
                                        <div className="charName">{c.name}</div>
                                        <div className="charMeta">
                                            <span className="badge orange">Détresse {c.detresse}/5</span>
                                            <span className="badge dark">Danger {c.danger}/5</span>
                                        </div>
                                    </div>

                                    <div className="charActions">
                                        <button className="iconBtn" title="Activer" onClick={() => setActiveCharacterId(c.id)}>
                                            ⚡
                                        </button>
                                        <button className="iconBtn" title="Copier JSON" onClick={() => exportToClipboard(c.id)}>
                                            ⧉
                                        </button>
                                        <button className="iconBtn" title="Exporter fichier" onClick={() => exportToFile(c.id, c.name)}>
                                            ⇩
                                        </button>
                                        <button className="iconBtn" title="Supprimer" onClick={() => deleteCharacter(c.id)}>
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                <div className="charFooter">
                                    <button className="btnGhost" onClick={() => setActiveCharacterId(c.id)}>
                                        Ouvrir la fiche
                                    </button>
                                    <div className="smallMuted">
                                        Maj: {new Date(c.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Import/Export Accordion */}
            <div className="accordion">
                <button className="accordionHeader" onClick={() => setIoOpen((v) => !v)}>
                    <span>📦 Import / Export JSON</span>
                    <span style={{ color: "rgba(244,245,247,0.70)" }}>{ioOpen ? "—" : "+"}</span>
                </button>

                {ioOpen && (
                    <div className="accordionBody">
                        <div className="row" style={{ alignItems: "flex-start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 320 }}>
                                <div className="row">
                                    <label className="check">
                                        <input
                                            type="radio"
                                            name="importMode"
                                            checked={importMode === "new"}
                                            onChange={() => setImportMode("new")}
                                        />
                                        Import en nouveau
                                    </label>
                                    <label className="check">
                                        <input
                                            type="radio"
                                            name="importMode"
                                            checked={importMode === "replace"}
                                            onChange={() => setImportMode("replace")}
                                        />
                                        Remplacer si même id
                                    </label>
                                </div>

                                <div className="row">
                                    <input
                                        className="input"
                                        type="file"
                                        accept="application/json,.json"
                                        onChange={(e) => importFromFile(e.target.files?.[0] ?? null)}
                                        style={{ minWidth: 260 }}
                                    />
                                </div>

                                <div className="row">
                                    <button className="btn" onClick={() => doImport(jsonText)} disabled={!jsonText.trim()}>
                                        Importer le JSON
                                    </button>
                                    <button className="btnGhost" onClick={() => setJsonText("")} disabled={!jsonText.trim()}>
                                        Vider
                                    </button>
                                </div>

                                <p className="muted" style={{ fontSize: 12 }}>
                                    Astuce : utilise ⧉ sur une carte pour copier directement son JSON.
                                </p>
                            </div>

                            <div style={{ flex: 1, minWidth: 280 }}>
                <textarea
                    className="input"
                    style={{
                        width: "100%",
                        minHeight: 160,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    }}
                    placeholder='Colle ici un personnage JSON…'
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Editor */}
            {!selected ? (
                <section className="card">
                    <p className="muted">Clique ⚡ sur une carte pour définir un personnage actif, puis édite-le ici.</p>
                </section>
            ) : (
                <>
                    <section className="card">
                        <header className="cardHeader">
                            <h2>Fiche — {selected.name}</h2>
                            <p className="muted">édition rapide</p>
                        </header>

                        <div className="row">
                            <input className="input" value={selected.name} onChange={(e) => rename(selected.id, e.target.value)} />

                            <div className="gauge">
                                <label className="gaugeLabel">Détresse</label>
                                <input
                                    className="slider"
                                    type="range"
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={selected.detresse}
                                    onChange={(e) => setDetresse(selected.id, Number(e.target.value))}
                                />
                                <span className="pill">{selected.detresse}</span>
                            </div>

                            <div className="gauge">
                                <label className="gaugeLabel">Danger</label>
                                <input
                                    className="slider"
                                    type="range"
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={selected.danger}
                                    onChange={(e) => setDanger(selected.id, Number(e.target.value))}
                                />
                                <span className="pill">{selected.danger}</span>
                            </div>
                        </div>
                    </section>

                    <StatGrid title="Caractéristiques" items={ATTRIBUTES} values={selected.stats} onChange={(k, v) => setStat(selected.id, k, v)} />
                    <StatGrid title="Compétences" items={SKILLS} values={selected.stats} onChange={(k, v) => setStat(selected.id, k, v)} />
                </>
            )}
        </div>
    );
}

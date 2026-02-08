import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider  } from "@react-three/rapier";
import type {RapierRigidBody}  from "@react-three/rapier";
import type { RollDie } from "../app/types";

type DieKind = "normal" | "detresse";

function borderClass(v: number) {
    if (v === 1) return "bCritFail";
    if (v >= 2 && v <= 5) return "bFail";
    if (v >= 6 && v <= 9) return "bSuccess";
    return "bCritSuccess";
}

function resultGlowColor(v: number) {
    // Retourne une couleur (THREE.Color) pour l’emissive
    if (v === 1) return new THREE.Color("#ff3b30");
    if (v >= 2 && v <= 5) return new THREE.Color("rgba(255,59,48,0.45)"); // fallback (rapier/three ignore rgba)
    if (v >= 6 && v <= 9) return new THREE.Color("rgba(52,199,89,0.45)");
    return new THREE.Color("#34c759");
}

function rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function makeD10Geometry() {
    // Pentagonal bipyramid (10 faces triangulaires)
    // 7 vertices: 5 équateur + top + bottom
    const r = 1;      // rayon équateur
    const h = 1.2;    // hauteur apices
    const top = new THREE.Vector3(0, h, 0);
    const bottom = new THREE.Vector3(0, -h, 0);

    const ring: THREE.Vector3[] = [];
    for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ring.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }

    const vertices: THREE.Vector3[] = [...ring, top, bottom];

    // Faces: 5 triangles top + 5 triangles bottom = 10 faces
    // Indexing: ring 0..4, top=5, bottom=6
    const faces: Array<[number, number, number]> = [];
    for (let i = 0; i < 5; i++) {
        const a = i;
        const b = (i + 1) % 5;
        // top face
        faces.push([5, a, b]);
    }
    for (let i = 0; i < 5; i++) {
        const a = i;
        const b = (i + 1) % 5;
        // bottom face (winding reversed so normals point outward)
        faces.push([6, b, a]);
    }

    // Values per face (opposés qui font 11)
    // Top faces: 1..5
    // Bottom faces: 10..6 (dans l’ordre) => i=0 -> 10, i=1 -> 9 ... i=4 -> 6
    const faceValues: number[] = [];
    for (let i = 0; i < 5; i++) faceValues.push(i + 1);
    for (let i = 0; i < 5; i++) faceValues.push(10 - i);

    // Build BufferGeometry
    const pos: number[] = [];
    const faceNormals: THREE.Vector3[] = [];
    const faceCenters: THREE.Vector3[] = [];

    for (const f of faces) {
        const v0 = vertices[f[0]];
        const v1 = vertices[f[1]];
        const v2 = vertices[f[2]];

        pos.push(v0.x, v0.y, v0.z);
        pos.push(v1.x, v1.y, v1.z);
        pos.push(v2.x, v2.y, v2.z);

        // normal
        const n = new THREE.Vector3()
            .subVectors(v1, v0)
            .cross(new THREE.Vector3().subVectors(v2, v0))
            .normalize();
        faceNormals.push(n);

        // center
        const c = new THREE.Vector3().addVectors(v0, v1).add(v2).multiplyScalar(1 / 3);
        faceCenters.push(c);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geom.computeVertexNormals();
    geom.computeBoundingSphere();

    return { geom, faceNormals, faceCenters, faceValues };
}

function useD10Data() {
    return useMemo(() => makeD10Geometry(), []);
}

type Die3DProps = {
    id: string;
    kind: DieKind;
    targetValue: number; // valeur du roll (1..10) — utilisée pour colorer glow selon résultat
    rollNonce: number;   // change => re-roll (impulsions)
    onSettled: (id: string, value: number) => void;
};

function Die3D({ id, kind, targetValue, rollNonce, onSettled }: Die3DProps) {
    const rb = useRef<RapierRigidBody | null>(null);
    const { geom, faceNormals, faceCenters, faceValues } = useD10Data();

    const [settledValue, setSettledValue] = useState<number | null>(null);

    // Stabilisation: on surveille vitesses faibles pendant quelques frames
    const stillFrames = useRef(0);

    // Matériau différent normal vs détresse
    const material = useMemo(() => {
        const m = new THREE.MeshStandardMaterial({
            color: kind === "detresse" ? new THREE.Color("#0b0b0d") : new THREE.Color("#ff9a3c"),
            roughness: kind === "detresse" ? 0.65 : 0.45,
            metalness: kind === "detresse" ? 0.25 : 0.15,
            emissive: new THREE.Color("#000000"),
            emissiveIntensity: 0.9,
        });
        return m;
    }, [kind]);

    // Teinte “aura” détresse
    const aura = useMemo(() => {
        return kind === "detresse" ? new THREE.Color("#b4a0ff") : new THREE.Color("#ffffff");
    }, [kind]);

    const textColor = kind === "detresse" ? "#e9e6ff" : "#1a1208";

    const roll = () => {
        const body = rb.current;
        if (!body) return;

        setSettledValue(null);
        stillFrames.current = 0;

        // reset position/rotation
        const x = rand(-2.2, 2.2);
        const z = rand(-1.2, 1.2);
        body.setTranslation({ x, y: rand(3.2, 4.4), z }, true);
        body.setRotation(
            new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI))),
            true
        );

        // impulses
        body.setLinvel({ x: rand(-1.2, 1.2), y: rand(0.2, 1.2), z: rand(-1.2, 1.2) }, true);
        body.setAngvel({ x: rand(-8, 8), y: rand(-10, 10), z: rand(-8, 8) }, true);

        // petit “push” différent détresse (plus chaotique)
        body.applyImpulse({ x: rand(-1.8, 1.8), y: rand(0.8, 2.2), z: rand(-1.8, 1.8) }, true);
        body.applyTorqueImpulse(
            { x: rand(-8, 8), y: rand(-12, 12), z: rand(-8, 8) },
            true
        );
    };

    useEffect(() => {
        roll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rollNonce]);

    useFrame(() => {
        const body = rb.current;
        if (!body || settledValue !== null) return;

        const lv = body.linvel();
        const av = body.angvel();
        const speed = Math.abs(lv.x) + Math.abs(lv.y) + Math.abs(lv.z);
        const spin = Math.abs(av.x) + Math.abs(av.y) + Math.abs(av.z);

        // seuils “stop”
        if (speed < 0.07 && spin < 0.12) {
            stillFrames.current += 1;
        } else {
            stillFrames.current = 0;
        }

        if (stillFrames.current >= 25) {
            // détermination face du dessus par normal max dot(Up)
            const rot = body.rotation();
            const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
            const up = new THREE.Vector3(0, 1, 0);

            let best = -Infinity;
            let bestIdx = 0;

            for (let i = 0; i < faceNormals.length; i++) {
                const nWorld = faceNormals[i].clone().applyQuaternion(q);
                const d = nWorld.dot(up);
                if (d > best) {
                    best = d;
                    bestIdx = i;
                }
            }

            const value = faceValues[bestIdx];
            setSettledValue(value);
            onSettled(id, value);
        }
    });

    // Emissive selon résultat FINAL demandé (targetValue) + détresse aura froide
    useEffect(() => {
        // Note: THREE.Color ne parse pas rgba(), donc on fait un compromis en utilisant des hex
        const emissive =
            targetValue === 1
                ? new THREE.Color("#ff3b30")
                : targetValue <= 5
                    ? new THREE.Color("#ff6b63")
                    : targetValue <= 9
                        ? new THREE.Color("#6fe29a")
                        : new THREE.Color("#34c759");

        material.emissive = emissive;
        material.emissiveIntensity = kind === "detresse" ? 0.75 : 0.55;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetValue, kind]);

    return (
        <RigidBody
            ref={rb}
            colliders="hull"
            restitution={0.35}
            friction={0.8}
            linearDamping={0.25}
            angularDamping={0.35}
            mass={kind === "detresse" ? 1.05 : 0.95}
        >
            <group>
                {/* “aura” détresse (un halo léger via un mesh plus grand et transparent) */}
                {kind === "detresse" && (
                    <mesh scale={1.12}>
                        <sphereGeometry args={[1.7, 18, 18]} />
                        <meshStandardMaterial
                            color={aura}
                            transparent
                            opacity={0.06}
                            emissive={aura}
                            emissiveIntensity={0.7}
                        />
                    </mesh>
                )}

                <mesh geometry={geom} material={material} />

                {/* Numéros : on place le chiffre au centre de chaque face, orienté vers l’extérieur */}
                {faceCenters.map((c, i) => {
                    const value = faceValues[i];
                    const n = faceNormals[i];

                    // petit offset pour “sortir” le texte de la face
                    const pos = c.clone().add(n.clone().multiplyScalar(0.18));

                    // orientation : le Text regarde dans la direction normale
                    const lookAt = pos.clone().add(n);

                    return (
                        <Text
                            key={i}
                            position={[pos.x, pos.y, pos.z]}
                            fontSize={0.35}
                            color={textColor}
                            outlineWidth={0.01}
                            outlineColor={kind === "detresse" ? "#0b0b0d" : "#ffffff"}
                            anchorX="center"
                            anchorY="middle"
                            onUpdate={(self) => {
                                self.lookAt(lookAt.x, lookAt.y, lookAt.z);
                            }}
                        >
                            {value}
                        </Text>
                    );
                })}
            </group>
        </RigidBody>
    );
}

function Floor() {
    return (
        <>
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[20, 0.2, 20]} position={[0, -0.2, 0]} />
            </RigidBody>
            <mesh rotation-x={-Math.PI / 2} position={[0, -0.2, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial color="#0f1522" roughness={1} metalness={0} />
            </mesh>
            {/* petit plateau visuel */}
            <mesh rotation-x={-Math.PI / 2} position={[0, -0.19, 0]} receiveShadow>
                <circleGeometry args={[6.5, 64]} />
                <meshStandardMaterial color="#121826" roughness={0.95} metalness={0.05} />
            </mesh>
        </>
    );
}

type Props = {
    dice: RollDie[];
    height?: number;
};

export function Dice3DTray({ dice, height = 420 }: Props) {
    const [rollNonce, setRollNonce] = useState(0);

    // Valeurs calculées depuis la 3D (face du dessus)
    const [settled, setSettled] = useState<Record<string, number>>({});

    // À chaque nouveau set de dice, on relance
    useEffect(() => {
        setSettled({});
        setRollNonce((n) => n + 1);
    }, [dice.map((d) => `${d.id}:${d.value}:${d.kind}`).join("|")]);

    const values = useMemo(() => {
        const finalValues = dice.map((d) => settled[d.id] ?? null);
        const allSettled = finalValues.every((v) => typeof v === "number");
        const computedValues = dice.map((d) => (settled[d.id] ?? d.value));

        const sum = allSettled ? computedValues.reduce((a, v) => a + v, 0) : null;
        const successes = allSettled ? computedValues.filter((v) => v >= 6).length : null;
        const crits = allSettled ? computedValues.filter((v) => v === 10).length : null;
        const ones = allSettled ? computedValues.filter((v) => v === 1).length : null;

        return { allSettled, computedValues, sum, successes, crits, ones };
    }, [dice, settled]);

    if (dice.length === 0) {
        return (
            <div className="card">
                <p className="muted">Lance des dés pour voir la scène 3D.</p>
            </div>
        );
    }

    return (
        <section className="card">
            <header className="cardHeader">
                <h2>Lancer 3D</h2>

                <div className="metaRow">
                    <span className="pill">Dés: {dice.length}</span>
                    {values.allSettled ? (
                        <>
                            <span className="pill">Succès (6+): {values.successes}</span>
                            <span className="pill">10: {values.crits}</span>
                            <span className="pill">1: {values.ones}</span>
                            <span className="pill">Somme: {values.sum}</span>
                        </>
                    ) : (
                        <span className="pill">En cours…</span>
                    )}

                    <button className="btn" onClick={() => setRollNonce((n) => n + 1)}>
                        Relancer
                    </button>
                </div>
            </header>

            <div style={{ height, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Canvas
                    shadows
                    camera={{ position: [0, 7.5, 9.5], fov: 45 }}
                    gl={{ antialias: true }}
                >
                    <ambientLight intensity={0.45} />
                    <directionalLight
                        position={[6, 10, 6]}
                        intensity={1.2}
                        castShadow
                        shadow-mapSize-width={2048}
                        shadow-mapSize-height={2048}
                    />
                    <pointLight position={[-6, 4, -4]} intensity={0.55} />

                    <Physics gravity={[0, -9.81, 0]}>
                        <Floor />

                        {dice.map((d, idx) => (
                            <Die3D
                                key={d.id}
                                id={d.id}
                                kind={d.kind as DieKind}
                                targetValue={d.value}
                                rollNonce={rollNonce + idx * 1000} // décalage pour éviter synchro parfaite
                                onSettled={(dieId, value) => {
                                    setSettled((prev) => ({ ...prev, [dieId]: value }));
                                }}
                            />
                        ))}
                    </Physics>

                    <OrbitControls enablePan={false} minDistance={6} maxDistance={18} maxPolarAngle={Math.PI * 0.48} />
                </Canvas>
            </div>

            {/* mini recap (utile même si 3D) */}
            <div className="diceLegendRow">
                {dice.map((d) => {
                    const v = settled[d.id];
                    const shown = v ?? "…";
                    const cls = typeof v === "number" ? borderClass(v) : "";
                    return (
                        <span key={d.id} className={`miniDie ${d.kind === "detresse" ? "miniDetresse" : "miniNormal"} ${cls}`}>
              {d.kind === "detresse" ? "⚠" : "◆"} {shown}
            </span>
                    );
                })}
            </div>
        </section>
    );
}

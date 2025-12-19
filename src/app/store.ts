import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { type Edge, type Node, applyNodeChanges, type NodeChange } from "reactflow";
import type { EdgeKind, GraphNodeData, MediaKind } from "./types";
import { makeFamilyId, makeVersionLabel } from "../utils/versioning";

type RFNode = Node<GraphNodeData>;
type RFEdge = Edge<{ kind: EdgeKind }>;

type State = {
    nodes: RFNode[];
    edges: RFEdge[];
    selectedNodeId: string | null;

    setNodes: (nodes: RFNode[]) => void;
    setEdges: (edges: RFEdge[]) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    setSelectedNodeId: (id: string | null) => void;

    addMediaNodeFromFile: (file: File, position?: { x: number; y: number }) => Promise<void>;
    addProcessNode: (type: GraphNodeData["type"], position?: { x: number; y: number }) => void;

    connect: (source: string, target: string, kind: EdgeKind) => void;

    newVersion: (nodeId: string) => void;
    fork: (nodeId: string, suffix?: string) => void;
    mergeToNewMedia: (nodeIds: string[], title?: string) => void;

    updateNodeMeta: (nodeId: string, patch: Partial<any>) => void; // simple patch helper
    currentUser: { uid: string; displayName: string | null; photoURL: string | null } | null;
    setCurrentUser: (user: { uid: string; displayName: string | null; photoURL: string | null } | null) => void;

    syncToFirestore: () => Promise<void>;
    loadFromFirestore: () => Promise<void>;
};

export const useGraphStore = create<State>()(
    persist(
        (set, get) => ({
            nodes: [],
            edges: [],
            selectedNodeId: null,
            currentUser: null,

            setNodes: (nodes) => set({ nodes }),
            setEdges: (edges) => set({ edges }),
            onNodesChange: (changes) => {
                set({
                    nodes: applyNodeChanges(changes, get().nodes) as RFNode[],
                });
            },
            setSelectedNodeId: (id) => set({ selectedNodeId: id }),
            setCurrentUser: (user) => set({ currentUser: user }),

            addMediaNodeFromFile: async (file, position = { x: 80, y: 80 }) => {
                const id = nanoid();
                const isVideo = file.type.startsWith("video/");
                const kind: MediaKind = isVideo ? "video" : "image";
                const srcUrl = URL.createObjectURL(file);

                let durationSec: number | undefined;
                let width: number | undefined;
                let height: number | undefined;

                // Helper to get image dimensions
                const getImageMeta = (src: string): Promise<{ width: number; height: number }> => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve({ width: img.width, height: img.height });
                        img.src = src;
                    });
                };

                if (isVideo) {
                    const { getVideoMeta } = await import("../utils/media");
                    const meta = await getVideoMeta(file);
                    durationSec = meta.durationSec;
                    width = meta.width;
                    height = meta.height;
                } else {
                    const meta = await getImageMeta(srcUrl);
                    width = meta.width;
                    height = meta.height;
                }

                const title = file.name.replace(/\.[^/.]+$/, "");
                const baseMeta = {
                    title,
                    shot: "",
                    department: "",
                    status: "wip" as const,
                    tags: [],
                };

                const familyId = makeFamilyId({ ...baseMeta, title });
                const version = { familyId, v: 1, label: makeVersionLabel(1) };

                // Calculate initial node size (max width 300px, aspect ratio preserved)
                // Add extra height for chrome (header + footer) approx 80px
                let initialWidth = 240;
                let initialHeight = 240;

                if (width && height) {
                    const MAX_WIDTH = 300;
                    const aspectRatio = width / height;

                    if (width > MAX_WIDTH) {
                        initialWidth = MAX_WIDTH;
                        initialHeight = MAX_WIDTH / aspectRatio;
                    } else {
                        initialWidth = width;
                        initialHeight = height;
                    }
                    // Add minimum padding for UI elements
                    initialWidth = Math.max(200, initialWidth);
                    initialHeight = initialHeight + 80; // approximate chrome height
                }

                const node: RFNode = {
                    id,
                    type: "mediaNode",
                    position,
                    style: {
                        width: initialWidth,
                        height: initialHeight,
                    },
                    data: {
                        type: "media",
                        meta: {
                            ...baseMeta,
                            kind,
                            srcUrl,
                            durationSec,
                            width,
                            height,
                        },
                        version,
                    },
                };

                set({ nodes: [...get().nodes, node] });
            },

            addProcessNode: (type, position = { x: 120, y: 120 }) => {
                const id = nanoid();
                const title =
                    type === "process" ? "Process Step" : type === "review" ? "Review" : "Delivery";

                const nodeType =
                    type === "process" ? "processNode" : type === "review" ? "reviewNode" : "deliveryNode";

                const node: RFNode = {
                    id,
                    type: nodeType,
                    position,
                    data: {
                        type,
                        meta: { title, status: "wip", tags: [], shot: "", department: "" },
                    } as any,
                };

                set({ nodes: [...get().nodes, node] });
            },

            connect: (source, target, kind) => {
                const edge: RFEdge = {
                    id: nanoid(),
                    source,
                    target,
                    type: "semanticEdge",
                    data: { kind },
                };
                set({ edges: [...get().edges, edge] });
            },

            newVersion: (nodeId) => {
                const { nodes, edges } = get();
                const node = nodes.find((n) => n.id === nodeId);
                if (!node || node.data.type !== "media") return;

                const currentV = node.data.version?.v ?? 1;
                const nextV = currentV + 1;

                const cloneId = nanoid();
                const clone: RFNode = {
                    ...node,
                    id: cloneId,
                    position: { x: node.position.x + 320, y: node.position.y },
                    data: {
                        ...node.data,
                        meta: { ...node.data.meta, status: "wip" },
                        version: {
                            ...(node.data.version ?? { familyId: makeFamilyId(node.data.meta), v: 1, label: "v001" }),
                            v: nextV,
                            label: makeVersionLabel(nextV),
                        },
                    },
                };

                const edge: RFEdge = {
                    id: nanoid(),
                    source: node.id,
                    target: cloneId,
                    type: "semanticEdge",
                    data: { kind: "ITERATION" },
                };

                set({ nodes: [...nodes, clone], edges: [...edges, edge] });
            },

            fork: (nodeId, suffix = "A") => {
                const { nodes, edges } = get();
                const node = nodes.find((n) => n.id === nodeId);
                if (!node || node.data.type !== "media") return;

                const cloneId = nanoid();
                const forkLabel = `${node.data.version?.label ?? "v001"}${suffix}`;

                const clone: RFNode = {
                    ...node,
                    id: cloneId,
                    position: { x: node.position.x + 320, y: node.position.y + 200 },
                    data: {
                        ...node.data,
                        meta: { ...node.data.meta, title: `${node.data.meta.title} (${suffix})`, status: "wip" },
                        version: node.data.version
                            ? { ...node.data.version, label: forkLabel }
                            : undefined,
                    },
                };

                const edge: RFEdge = {
                    id: nanoid(),
                    source: node.id,
                    target: cloneId,
                    type: "semanticEdge",
                    data: { kind: "ITERATION" },
                };

                set({ nodes: [...nodes, clone], edges: [...edges, edge] });
            },

            mergeToNewMedia: (nodeIds, title = "Merged Output") => {
                const { nodes, edges } = get();
                const sources = nodes.filter((n) => nodeIds.includes(n.id));
                if (sources.length < 2) return;

                // Create a process "Merge" node
                const mergeId = nanoid();
                const mergeNode: RFNode = {
                    id: mergeId,
                    type: "processNode",
                    position: {
                        x: Math.max(...sources.map((s) => s.position.x)) + 320,
                        y: Math.min(...sources.map((s) => s.position.y)) + 80,
                    },
                    data: {
                        type: "process",
                        meta: { title: "Merge", status: "wip", tags: ["merge"], shot: "", department: "" },
                    },
                };

                // Create a new media output node (placeholder media)
                const outId = nanoid();
                const outNode: RFNode = {
                    id: outId,
                    type: "mediaNode",
                    position: { x: mergeNode.position.x + 320, y: mergeNode.position.y },
                    data: {
                        type: "media",
                        meta: {
                            title,
                            kind: "image",
                            srcUrl: "",
                            status: "wip",
                            tags: ["output"],
                            shot: "",
                            department: "",
                        },
                        version: { familyId: makeFamilyId({ title, shot: "", department: "" }), v: 1, label: makeVersionLabel(1) },
                    },
                };

                const mergeEdges: RFEdge[] = sources.map((s) => ({
                    id: nanoid(),
                    source: s.id,
                    target: mergeId,
                    type: "semanticEdge",
                    data: { kind: "MERGE" },
                }));

                const outEdge: RFEdge = {
                    id: nanoid(),
                    source: mergeId,
                    target: outId,
                    type: "semanticEdge",
                    data: { kind: "DEPENDENCY" },
                };

                set({ nodes: [...nodes, mergeNode, outNode], edges: [...edges, ...mergeEdges, outEdge] });
            },

            updateNodeMeta: (nodeId, patch) => {
                const { nodes } = get();
                set({
                    nodes: nodes.map((n) => {
                        if (n.id !== nodeId) return n;
                        // patch expects either meta fields or nested fields; keep it simple:
                        if (n.data.type === "media") {
                            return { ...n, data: { ...n.data, meta: { ...n.data.meta, ...patch } } };
                        }
                        return { ...n, data: { ...n.data, meta: { ...(n.data as any).meta, ...patch } } };
                    }),
                });
            },

            syncToFirestore: async () => {
                const { currentUser, nodes, edges } = get();
                if (!currentUser) return;

                try {
                    const { doc, setDoc } = await import("firebase/firestore");
                    const { db } = await import("./firebase");

                    // Save the entire graph to a document keyed by user UID
                    const graphRef = doc(db, "graphs", currentUser.uid);

                    await setDoc(graphRef, {
                        nodes,
                        edges,
                        updatedAt: Date.now(),
                    }, { merge: true });

                    console.log("Saved to Firestore");
                } catch (e) {
                    console.error("Error saving graph", e);
                }
            },

            loadFromFirestore: async () => {
                const { currentUser } = get();
                if (!currentUser) return;

                try {
                    const { doc, getDoc } = await import("firebase/firestore");
                    const { db } = await import("./firebase");

                    const graphRef = doc(db, "graphs", currentUser.uid);
                    const snap = await getDoc(graphRef);

                    if (snap.exists()) {
                        const data = snap.data();
                        if (data.nodes && data.edges) {
                            set({ nodes: data.nodes as RFNode[], edges: data.edges as RFEdge[] });
                            console.log("Loaded from Firestore");
                        }
                    }
                } catch (e) {
                    console.error("Error loading graph", e);
                }
            },
        }),
        {
            name: "vfx-flow-graph",
            partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
        }
    )
);

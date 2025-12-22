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
    updatedAt: number; // for sync conflict resolution
    viewport: { x: number; y: number; zoom: number };
    showcaseUpdatedTimestamp: number | null;

    setNodes: (nodes: RFNode[]) => void;
    setEdges: (edges: RFEdge[]) => void;
    setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    setSelectedNodeId: (id: string | null) => void;

    addMediaNodeFromFile: (file: File, position?: { x: number; y: number }) => Promise<void>;
    addProcessNode: (type: GraphNodeData["type"], position?: { x: number; y: number }) => void;

    connect: (source: string, target: string, kind: EdgeKind) => void;

    newVersion: (nodeId: string) => void;
    fork: (nodeId: string, suffix?: string) => void;
    mergeToNewMedia: (nodeIds: string[], title?: string) => void;

    updateNodeMeta: (nodeId: string, patch: Partial<any>) => void; // simple patch helper
    currentUser: { uid: string; email?: string | null; displayName: string | null; photoURL: string | null } | null;
    setCurrentUser: (user: { uid: string; email?: string | null; displayName: string | null; photoURL: string | null } | null) => void;

    syncStatus: "synced" | "saving" | "error";
    setSyncStatus: (status: "synced" | "saving" | "error") => void;

    syncToFirestore: () => Promise<void>;
    subscribeToFirestore: (callback: (nodes: RFNode[], edges: RFEdge[]) => void) => () => void;

    currentGraphId: string;
    currentGraphName: string;
    availableGraphs: { id: string; name: string }[];
    setGraphName: (name: string) => void;
    createNewGraph: () => void;
    loadGraphsList: () => Promise<void>;
    selectGraph: (id: string) => void;
    loadShowcase: () => Promise<void>;
    setAsShowcase: () => Promise<void>;
    isShowcaseMode: boolean;
};

export const useGraphStore = create<State>()(
    persist(
        (set, get) => ({
            nodes: [],
            edges: [],
            selectedNodeId: null,
            currentUser: null,
            updatedAt: 0,
            viewport: { x: 0, y: 0, zoom: 1 },
            showcaseUpdatedTimestamp: null,
            syncStatus: "synced",
            currentGraphId: "default",
            currentGraphName: "Untitled Graph",
            availableGraphs: [],

            setGraphName: (name) => set({ currentGraphName: name, updatedAt: Date.now(), syncStatus: "saving" }),
            createNewGraph: () => set({
                nodes: [],
                edges: [],
                currentGraphId: nanoid(),
                currentGraphName: "New Graph",
                updatedAt: Date.now(),
                syncStatus: "saving"
            }),
            loadGraphsList: async () => {
                const { currentUser } = get();
                if (!currentUser) return;
                try {
                    const { collection, getDocs } = await import("firebase/firestore");
                    const { db } = await import("./firebase");
                    const graphsRef = collection(db, "users", currentUser.uid, "graphs");
                    const snap = await getDocs(graphsRef);
                    const list = snap.docs.map(doc => ({
                        id: doc.id,
                        name: doc.data().currentGraphName || "Untitled"
                    }));
                    set({ availableGraphs: list });
                } catch (e) {
                    console.error("Error loading graphs list", e);
                }
            },
            selectGraph: (id) => {
                const { availableGraphs } = get();
                const g = availableGraphs.find(x => x.id === id);
                set({
                    currentGraphId: id,
                    currentGraphName: g?.name || "Untitled",
                    nodes: [], // Will be populated by onSnapshot
                    edges: [],
                    updatedAt: 0 // Force reload
                });
            },
            isShowcaseMode: false,

            setSyncStatus: (status) => set({ syncStatus: status }),

            setNodes: (nodes) => set({ nodes }),
            setEdges: (edges) => set({ edges }),
            setViewport: (viewport) => set({ viewport }),
            onNodesChange: (changes) => {
                const newNodes = applyNodeChanges(changes, get().nodes) as RFNode[];
                // Only update updatedAt and syncStatus if there's a structural or position change
                // (e.g. not just a selection change)
                const isSignificant = changes.some(c => c.type === "position" || c.type === "remove" || c.type === "dimensions" || c.type === "reset");

                if (isSignificant) {
                    set({
                        nodes: newNodes,
                        updatedAt: Date.now(),
                        syncStatus: "saving",
                    });
                } else {
                    set({ nodes: newNodes });
                }
            },
            setSelectedNodeId: (id) => set({ selectedNodeId: id }),
            setCurrentUser: (user) => set({ currentUser: user, isShowcaseMode: false }),

            addMediaNodeFromFile: async (file, position = { x: 80, y: 80 }) => {
                const id = nanoid();
                const { currentUser } = get();

                set({ syncStatus: "saving" });

                // 1. Upload to Firebase Storage if logged in
                let srcUrl = URL.createObjectURL(file); // Default to local for speed/offline

                if (!currentUser) {
                    alert("⚠️ Sign In Required: You must be signed in to upload media.");
                    set({ syncStatus: "synced" });
                    return;
                } else {
                    try {
                        // Dynamic import to keep bundle small until needed
                        const { storage } = await import("./firebase");
                        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");

                        // Sanitize filename
                        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                        const storageRef = ref(storage, `users/${currentUser.uid}/uploads/${id}_${safeName}`);

                        console.log("Attempting upload to:", storageRef.fullPath);
                        await uploadBytes(storageRef, file);
                        console.log("Upload successful");
                        srcUrl = await getDownloadURL(storageRef);
                    } catch (e: any) {
                        console.error("Upload failed details:", e.code, e.message, e);
                        alert(`Upload Failed: ${e.message}\nUsing local placeholder.\nNote: This node will NOT be visible in the public showcase.`);
                        set({ syncStatus: "error" });
                    }
                }

                const isVideo = file.type.startsWith("video/");
                const kind: MediaKind = isVideo ? "video" : "image";

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
                    // Note: getVideoMeta currently relies on File object, which is fine
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

                set({ nodes: [...get().nodes, node], updatedAt: Date.now(), syncStatus: "saving" });
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

                set({
                    nodes: [...get().nodes, node],
                    updatedAt: Date.now(),
                    syncStatus: "saving",
                });
            },

            connect: (source, target, kind) => {
                const edge: RFEdge = {
                    id: nanoid(),
                    source,
                    target,
                    type: "semanticEdge",
                    data: { kind },
                };
                set({
                    edges: [...get().edges, edge],
                    updatedAt: Date.now(),
                    syncStatus: "saving",
                });
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

                set({
                    nodes: [...nodes, clone],
                    edges: [...edges, edge],
                    updatedAt: Date.now(),
                    syncStatus: "saving",
                });
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

                set({
                    nodes: [...nodes, mergeNode, outNode],
                    edges: [...edges, ...mergeEdges, outEdge],
                    updatedAt: Date.now(),
                    syncStatus: "saving",
                });
            },

            updateNodeMeta: (nodeId, patch) => {
                const { nodes } = get();
                set({
                    nodes: nodes.map((n) => {
                        if (n.id !== nodeId) return n;
                        if (n.data.type === "media") {
                            return { ...n, data: { ...n.data, meta: { ...n.data.meta, ...patch } } };
                        }
                        return { ...n, data: { ...n.data, meta: { ...(n.data as any).meta, ...patch } } };
                    }),
                    updatedAt: Date.now(),
                    syncStatus: "saving"
                });
            },

            syncToFirestore: async () => {
                const { currentUser, nodes, edges, updatedAt } = get();
                if (!currentUser) return;

                // Function to deep sanitize object for Firestore (replaces undefined with null)
                const deepSanitize = (obj: any): any => {
                    if (obj === undefined) return null;
                    if (obj === null) return null;
                    if (typeof obj === "number" && (Number.isNaN(obj) || !isFinite(obj))) return null;
                    if (typeof obj === "function" || typeof obj === "symbol") return null;

                    if (Array.isArray(obj)) {
                        return obj.map(deepSanitize);
                    }

                    if (typeof obj === "object") {
                        const res: any = {};
                        for (const key in obj) {
                            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                                const val = deepSanitize(obj[key]);
                                if (val !== undefined) {
                                    res[key] = val;
                                }
                            }
                        }
                        return res;
                    }
                    return obj;
                };

                try {
                    const { doc, setDoc } = await import("firebase/firestore");
                    const { db } = await import("./firebase");

                    const graphRef = doc(db, "users", currentUser.uid, "graphs", get().currentGraphId);

                    const payload = deepSanitize({
                        nodes,
                        edges,
                        currentGraphName: get().currentGraphName,
                        updatedAt: updatedAt || Date.now(),
                        viewport: get().viewport,
                    });

                    // Update local state to match what we are sending to avoid re-syncing from the echo snapshot
                    set({ updatedAt: payload.updatedAt });
                    console.log("Payload being saved to Firestore:", payload);

                    console.log("Saving graph to Firestore...", {
                        nodeCount: nodes.length,
                        edgeCount: edges.length,
                    });

                    await setDoc(graphRef, payload, { merge: true });

                    // Auto-update global showcase if user is admin (jmicalle@gmail.com)
                    if (currentUser.email === "jmicalle@gmail.com") {
                        const showcaseRef = doc(db, "graphs", "showcase");

                        // Filter out nodes that have local blob URLs or missing URLs (broken for others)
                        const cleanPayloadNodes = (payload.nodes as any[]).filter((n) => {
                            if (n.data?.type === "media") {
                                const url = n.data?.meta?.srcUrl;
                                // Reject if no URL or blob URL
                                if (!url || typeof url !== "string" || url.startsWith("blob:")) {
                                    return false;
                                }
                            }
                            return true;
                        });

                        const cleanPayload = { ...payload, nodes: cleanPayloadNodes };

                        await setDoc(showcaseRef, cleanPayload);
                        console.log("Updated global showcase graph (filtered local nodes)");
                        set({ showcaseUpdatedTimestamp: Date.now() });
                    }

                    console.log("Successfully saved to Firestore");
                    set({ syncStatus: "synced" });
                } catch (e: any) {
                    console.error("Error saving graph to Firestore:", e.message || e);
                    set({ syncStatus: "error" });
                }
            },

            subscribeToFirestore: (callback) => {
                const { currentUser } = get();
                // If we are in showcase mode, we might want to subscribe to the showcase doc instead
                // but for now let's just make it simple.
                if (!currentUser) return () => { };

                let unsubscribe: () => void = () => { };
                let isCancelled = false;

                import("firebase/firestore").then(({ doc, onSnapshot }) => {
                    import("./firebase").then(({ db }) => {
                        if (isCancelled) return;

                        const graphRef = doc(db, "users", currentUser.uid, "graphs", get().currentGraphId);
                        unsubscribe = onSnapshot(graphRef, (snap) => {
                            if (snap.exists()) {
                                const data = snap.data();
                                const currentLocalUpdatedAt = get().updatedAt;
                                const serverUpdatedAt = data.updatedAt || 0;

                                if (data.currentGraphName && data.currentGraphName !== get().currentGraphName) {
                                    set({ currentGraphName: data.currentGraphName });
                                }

                                // Conflict Resolve: Server Wins if it is NEWER than local
                                // Added 1000ms buffer to allow for slight clock skew and local interaction lag
                                if (serverUpdatedAt > currentLocalUpdatedAt + 1000) {
                                    callback(data.nodes, data.edges);
                                    if (data.viewport) {
                                        set({
                                            viewport: data.viewport,
                                            updatedAt: serverUpdatedAt
                                        });
                                    } else {
                                        set({ updatedAt: serverUpdatedAt });
                                    }
                                }
                            }
                        });
                    });
                });

                return () => {
                    isCancelled = true;
                    if (unsubscribe) unsubscribe();
                };
            },

            loadShowcase: async () => {
                try {
                    const { doc, getDoc } = await import("firebase/firestore");
                    const { db } = await import("./firebase");
                    const showcaseRef = doc(db, "graphs", "showcase");
                    const snap = await getDoc(showcaseRef);

                    if (snap.exists()) {
                        const data = snap.data();
                        set({
                            nodes: data.nodes || [],
                            edges: data.edges || [],
                            updatedAt: data.updatedAt || Date.now(),
                            viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
                            isShowcaseMode: true,
                            syncStatus: "synced"
                        });
                    }
                } catch (e) {
                    console.error("Failed to load showcase:", e);
                }
            },

            setAsShowcase: async () => {
                const { currentUser, nodes, edges, updatedAt } = get();
                if (!currentUser) {
                    alert("Must be signed in to set showcase");
                    return;
                }

                // Temporary check: only allow 'joem' or similar if we had roles
                // For now, let's just allow anyone to set it for testing
                try {
                    const { doc, setDoc } = await import("firebase/firestore");
                    const { db } = await import("./firebase");

                    // Use the same sanitize logic or just a simpler version
                    const payload = {
                        nodes,
                        edges,
                        updatedAt: updatedAt || Date.now(),
                        setBy: currentUser.uid,
                        setName: currentUser.displayName
                    };

                    const showcaseRef = doc(db, "graphs", "showcase");
                    await setDoc(showcaseRef, payload);
                    alert("Graph successfully set as global showcase!");
                } catch (e: any) {
                    console.error("Failed to set showcase:", e);
                    alert("Error setting showcase: " + e.message);
                }
            },
        }),
        {
            name: "vfx-flow-graph",
            partialize: (state) => ({
                nodes: state.nodes,
                edges: state.edges,
                viewport: state.viewport,
                updatedAt: state.updatedAt
            }),
        }
    )
);

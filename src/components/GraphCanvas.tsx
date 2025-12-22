import React, { useMemo, useCallback, useState } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    BaseEdge,
    getBezierPath,
    type Connection,
    type Edge,
    type Node,
    type ReactFlowInstance,
    type EdgeProps,
} from "reactflow";
import "reactflow/dist/style.css";

import { useGraphStore } from "../app/store";
import type { GraphNodeData, EdgeKind } from "../app/types";

import MediaNode from "./nodes/MediaNode";
import ProcessNode from "./nodes/ProcessNode";
import ReviewNode from "./nodes/ReviewNode";
import DeliveryNode from "./nodes/DeliveryNode";

// Define a simple custom edge to handle the "semanticEdge" type
function SemanticEdge({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
}: EdgeProps) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />;
}

// Move types outside the component to avoid unnecessary re-renders/warnings
const nodeTypes = {
    mediaNode: MediaNode,
    processNode: ProcessNode,
    reviewNode: ReviewNode,
    deliveryNode: DeliveryNode,
};

const edgeTypes = {
    semanticEdge: SemanticEdge,
};

function edgeStyle(kind: EdgeKind): React.CSSProperties {
    switch (kind) {
        case "ITERATION": return { strokeWidth: 2, stroke: "#ccc" };
        case "DEPENDENCY": return { strokeDasharray: "6 4", stroke: "#888" };
        case "MERGE": return { strokeWidth: 2, stroke: "#a8f" };
        case "REVIEW": return { strokeDasharray: "2 6", stroke: "#ea4" };
        default: return { strokeWidth: 1, stroke: "#444" };
    }
}

export default function GraphCanvas() {
    const nodes = useGraphStore((s) => s.nodes);
    const edges = useGraphStore((s) => s.edges);
    const setEdges = useGraphStore((s) => s.setEdges);
    const onNodesChange = useGraphStore((s) => s.onNodesChange);
    const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId);
    const addMediaNodeFromFile = useGraphStore((s) => s.addMediaNodeFromFile);

    const setViewport = useGraphStore((s) => s.setViewport);
    const viewport = useGraphStore((s) => s.viewport);
    const currentUser = useGraphStore((s) => s.currentUser);

    const currentGraphId = useGraphStore((s) => s.currentGraphId);
    const updatedAt = useGraphStore((s) => s.updatedAt);
    const isShowcaseMode = useGraphStore((s) => s.isShowcaseMode);

    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

    // Sync from store to ReactFlow instance (only when underlying graph context changes)
    React.useEffect(() => {
        if (rfInstance && viewport) {
            rfInstance.setViewport(viewport);
        }
    }, [rfInstance, currentGraphId, updatedAt, isShowcaseMode]);

    const styledEdges = useMemo(() => {
        return edges.map((e) => ({
            ...e,
            style: edgeStyle(e.data?.kind ?? "DEPENDENCY"),
            animated: e.data?.kind === "ITERATION",
        }));
    }, [edges]);

    const onConnect = useCallback((connection: Connection) => {
        if (!connection.source || !connection.target) return;
        const kind: EdgeKind = "DEPENDENCY";
        const edge: Edge<{ kind: EdgeKind }> = {
            id: `${connection.source}-${connection.target}-${Date.now()}`,
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            type: "semanticEdge",
            data: { kind },
            style: edgeStyle(kind),
        };
        setEdges(addEdge(edge, edges));
    }, [edges, setEdges]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(async (event: React.DragEvent) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;

        let position = { x: event.clientX, y: event.clientY };
        if (rfInstance) {
            position = rfInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
        }

        let yOffset = 0;
        for (const file of files) {
            if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
                await addMediaNodeFromFile(file, { x: position.x, y: position.y + yOffset });
                yOffset += 280;
            }
        }
    }, [rfInstance, addMediaNodeFromFile]);

    return (
        <div
            style={{ width: "100%", height: "100vh", background: "#0b0b0b" }}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <ReactFlow
                nodes={nodes as Node<GraphNodeData>[]}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={() => { }}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                onConnect={onConnect}
                onInit={setRfInstance}
                onMoveEnd={(_, v) => setViewport(v)}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                minZoom={0.1}
                maxZoom={4}
                deleteKeyCode={currentUser ? ["Backspace", "Delete"] : null}
                fitView={false}
            >
                <MiniMap />
                <Controls />
                <Background gap={16} />
            </ReactFlow>
        </div>
    );
}

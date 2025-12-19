import React, { useMemo, useCallback, useState } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    type Connection,
    type Edge,
    type Node,
    type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";

import { useGraphStore } from "../app/store";
import type { GraphNodeData, EdgeKind } from "../app/types";

import MediaNode from "./nodes/MediaNode";
import ProcessNode from "./nodes/ProcessNode";
import ReviewNode from "./nodes/ReviewNode";
import DeliveryNode from "./nodes/DeliveryNode";

function edgeStyle(kind: EdgeKind): React.CSSProperties {
    // keep simple; you can add colors/icons later
    switch (kind) {
        case "ITERATION": return { strokeWidth: 2, stroke: "#ccc" };
        case "DEPENDENCY": return { strokeDasharray: "6 4", stroke: "#888" };
        case "MERGE": return { strokeWidth: 2, stroke: "#a8f" };
        case "REVIEW": return { strokeDasharray: "2 6", stroke: "#ea4" };
    }
}

export default function GraphCanvas() {
    const nodes = useGraphStore((s) => s.nodes);
    const edges = useGraphStore((s) => s.edges);
    const setEdges = useGraphStore((s) => s.setEdges);
    const onNodesChange = useGraphStore((s) => s.onNodesChange);
    const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId);
    const addMediaNodeFromFile = useGraphStore((s) => s.addMediaNodeFromFile);

    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

    const nodeTypes = useMemo(() => ({
        mediaNode: MediaNode,
        processNode: ProcessNode,
        reviewNode: ReviewNode,
        deliveryNode: DeliveryNode,
    }), []);

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

        // Use event.dataTransfer.files instead of event.target.files
        const files = Array.from(event.dataTransfer.files);

        if (files.length === 0) return;

        // Default position if rfInstance is not ready/available
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
                onEdgesChange={() => {
                    // Placeholder
                }}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                onConnect={onConnect}
                onInit={setRfInstance}
                nodeTypes={nodeTypes}
                fitView
            >
                <MiniMap />
                <Controls />
                <Background gap={16} />
            </ReactFlow>
        </div>
    );
}

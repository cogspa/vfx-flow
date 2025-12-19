import { Handle, Position } from "reactflow";
import type { GraphNodeData } from "../../app/types";

export default function ReviewNode({ data }: { data: Extract<GraphNodeData, { type: "review" }> }) {
    const meta = data.meta;
    return (
        <div style={{ width: 220, border: "1px dashed #664", borderRadius: 12, padding: 10, background: "#221", color: "#eee" }}>
            <div style={{ fontWeight: 800 }}>{meta.title}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                {data.note ? `Note: ${data.note}` : "No notes"}
            </div>
            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.6 }}>
                {meta.status}
            </div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
}

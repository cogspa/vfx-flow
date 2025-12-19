import { Handle, Position } from "reactflow";
import type { GraphNodeData } from "../../app/types";

export default function ProcessNode({ data }: { data: Extract<GraphNodeData, { type: "process" }> }) {
    const meta = data.meta;
    return (
        <div style={{ width: 220, border: "1px solid #444", borderRadius: 12, padding: 10, background: "#161616", color: "#eee" }}>
            <div style={{ fontWeight: 800 }}>{meta.title}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                {meta.department || "dept"} • {meta.status}
            </div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}

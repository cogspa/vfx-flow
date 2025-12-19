import { Handle, Position } from "reactflow";
import type { GraphNodeData } from "../../app/types";

export default function DeliveryNode({ data }: { data: Extract<GraphNodeData, { type: "delivery" }> }) {
    const meta = data.meta;
    return (
        <div style={{ width: 220, border: "2px solid #484", borderRadius: 12, padding: 10, background: "#131", color: "#eee" }}>
            <div style={{ fontWeight: 800 }}>{meta.title}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                Deliverable: {data.deliverable ?? "Final"}
            </div>
            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.6 }}>
                {meta.status}
            </div>
            <Handle type="target" position={Position.Left} />
        </div>
    );
}

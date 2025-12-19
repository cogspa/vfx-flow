import { Handle, Position, NodeResizer } from "reactflow";
import type { GraphNodeData } from "../../app/types";

export default function MediaNode({ data, selected }: { data: Extract<GraphNodeData, { type: "media" }>; selected?: boolean }) {
    const meta = data.meta;
    const isVideo = meta.kind === "video";

    return (
        <div style={{ width: "100%", height: "100%", minWidth: 100, minHeight: 100, display: "flex", flexDirection: "column", border: "1px solid #333", borderRadius: 12, padding: 10, background: "#111", color: "#eee" }}>
            <NodeResizer
                color="#ff0071"
                isVisible={selected}
                minWidth={100}
                minHeight={100}
            />

            <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {meta.title || "(untitled)"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {data.version?.label ?? ""}
                </div>
            </div>

            <div style={{ flex: "1 1 auto", marginTop: 8, borderRadius: 10, overflow: "hidden", background: "#000", position: "relative" }}>
                {isVideo ? (
                    meta.srcUrl ? (
                        <video src={meta.srcUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} />
                    ) : (
                        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", opacity: 0.7 }}>No video</div>
                    )
                ) : (
                    meta.srcUrl ? (
                        <img src={meta.srcUrl} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} />
                    ) : (
                        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", opacity: 0.7 }}>No image</div>
                    )
                )}
            </div>

            <div style={{ flex: "0 0 auto", marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8 }}>
                <div>{meta.department || "dept"}</div>
                <div>{meta.status}</div>
            </div>

            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
}

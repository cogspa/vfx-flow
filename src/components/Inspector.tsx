import { useGraphStore } from "../app/store";

export default function Inspector() {
    const selectedId = useGraphStore((s) => s.selectedNodeId);
    const nodes = useGraphStore((s) => s.nodes);
    const updateNodeMeta = useGraphStore((s) => s.updateNodeMeta);

    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return null;

    const data: any = node.data;
    const meta = data?.meta;

    return (
        <div style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            width: 340, padding: 12,
            background: "rgba(20,20,20,.9)", border: "1px solid #333", borderRadius: 12,
            color: "#eee"
        }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Inspector</div>

            {data.type === "media" && meta?.kind === "video" && meta.srcUrl && (
                <video src={meta.srcUrl} controls style={{ width: "100%", borderRadius: 10 }} />
            )}
            {data.type === "media" && meta?.kind === "image" && meta.srcUrl && (
                <img src={meta.srcUrl} style={{ width: "100%", borderRadius: 10 }} />
            )}

            <label style={{ display: "block", marginTop: 10, fontSize: 12, opacity: 0.9 }}>Title</label>
            <input
                value={meta?.title ?? ""}
                onChange={(e) => updateNodeMeta(node.id, { title: e.target.value })}
                style={{ width: "100%" }}
            />

            <label style={{ display: "block", marginTop: 10, fontSize: 12, opacity: 0.9 }}>Shot</label>
            <input
                value={meta?.shot ?? ""}
                onChange={(e) => updateNodeMeta(node.id, { shot: e.target.value })}
                style={{ width: "100%" }}
                placeholder="SQ010_SH030"
            />

            <label style={{ display: "block", marginTop: 10, fontSize: 12, opacity: 0.9 }}>Department</label>
            <input
                value={meta?.department ?? ""}
                onChange={(e) => updateNodeMeta(node.id, { department: e.target.value })}
                style={{ width: "100%" }}
                placeholder="anim / fx / comp / edit"
            />

            <label style={{ display: "block", marginTop: 10, fontSize: 12, opacity: 0.9 }}>Status</label>
            <select
                value={meta?.status ?? "wip"}
                onChange={(e) => updateNodeMeta(node.id, { status: e.target.value })}
                style={{ width: "100%" }}
            >
                <option value="wip">wip</option>
                <option value="review">review</option>
                <option value="approved">approved</option>
                <option value="final">final</option>
            </select>

            {data.type === "media" && (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                    {data.version?.familyId ? <div>Family: {data.version.familyId}</div> : null}
                    {data.version?.label ? <div>Version: {data.version.label}</div> : null}
                </div>
            )}
        </div>
    );
}

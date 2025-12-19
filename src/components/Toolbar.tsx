import { useRef } from "react";
import { useGraphStore } from "../app/store";

export default function Toolbar() {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const addMedia = useGraphStore((s) => s.addMediaNodeFromFile);
    const addProcessNode = useGraphStore((s) => s.addProcessNode);

    const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
    const newVersion = useGraphStore((s) => s.newVersion);
    const fork = useGraphStore((s) => s.fork);
    // const mergeToNewMedia = useGraphStore((s) => s.mergeToNewMedia);

    return (
        <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 10,
            display: "flex", gap: 8, padding: 10,
            background: "rgba(20,20,20,.9)", border: "1px solid #333", borderRadius: 12
        }}>
            <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: "none" }}
                onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    let y = 80;
                    for (const f of files) {
                        await addMedia(f, { x: 80, y });
                        y += 260;
                    }
                    if (fileRef.current) fileRef.current.value = "";
                }}
            />

            <button onClick={() => fileRef.current?.click()}>Upload Media</button>

            <button onClick={() => addProcessNode("process", { x: 200, y: 80 })}>+ Process</button>
            <button onClick={() => addProcessNode("review", { x: 200, y: 320 })}>+ Review</button>
            <button onClick={() => addProcessNode("delivery", { x: 200, y: 560 })}>+ Delivery</button>

            <div style={{ width: 1, background: "#333", margin: "0 6px" }} />

            <button disabled={!selectedNodeId} onClick={() => selectedNodeId && newVersion(selectedNodeId)}>New Version</button>
            <button disabled={!selectedNodeId} onClick={() => selectedNodeId && fork(selectedNodeId, "B")}>Fork</button>

            {/* quick demo merge: merge selected + first other node (replace with multi-select UX later) */}
            <button
                onClick={() => {
                    // In a real UI you'll multi-select. This is just a placeholder hook.
                    // For now you can manually edit this to pass multiple ids.
                    alert("Merge: implement multi-select, then call mergeToNewMedia([id1,id2,...])");
                }}
            >
                Merge
            </button>
        </div>
    );
}

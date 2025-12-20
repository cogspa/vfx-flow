import { useRef } from "react";
import { useGraphStore } from "../app/store";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../app/firebase";

export default function Toolbar() {
    return (
        <InternalToolbar />
    );
}

function SyncIndicator() {
    const syncStatus = useGraphStore((s) => s.syncStatus);
    const color = syncStatus === "synced" ? "#88dd88" : syncStatus === "saving" ? "#ddaa44" : "#ff4444";
    const text = syncStatus === "synced" ? "Saved" : syncStatus === "saving" ? "Saving..." : "Error";

    // We can default to synced if undefined for now
    if (!syncStatus) return null;

    return (
        <span style={{ fontSize: 10, color, marginRight: 4, fontWeight: "bold" }}>
            {text}
        </span>
    );
}

function InternalToolbar() {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const addMedia = useGraphStore((s) => s.addMediaNodeFromFile);
    const addProcessNode = useGraphStore((s) => s.addProcessNode);

    // Use derived selection from nodes for multi-select support
    const nodes = useGraphStore((s) => s.nodes);
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedIds = selectedNodes.map((n) => n.id);
    const singleSelectedId = selectedIds.length === 1 ? selectedIds[0] : null;

    const newVersion = useGraphStore((s) => s.newVersion);
    const fork = useGraphStore((s) => s.fork);
    const mergeToNewMedia = useGraphStore((s) => s.mergeToNewMedia);

    const currentUser = useGraphStore((s) => s.currentUser);
    const currentGraphId = useGraphStore((s) => s.currentGraphId);
    const currentGraphName = useGraphStore((s) => s.currentGraphName);
    const setGraphName = useGraphStore((s) => s.setGraphName);
    const createNewGraph = useGraphStore((s) => s.createNewGraph);
    const availableGraphs = useGraphStore((s) => s.availableGraphs);
    const loadGraphsList = useGraphStore((s) => s.loadGraphsList);
    const selectGraph = useGraphStore((s) => s.selectGraph);
    const isShowcaseMode = useGraphStore((s) => s.isShowcaseMode);

    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error(e);
            alert("Login failed");
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };


    return (
        <div className="toolbar">
            {/* Graph Selector & Naming Section */}
            <div className="toolbar-section">
                <select
                    className="toolbar-select"
                    value={currentGraphId}
                    onFocus={() => loadGraphsList()}
                    onChange={(e) => selectGraph(e.target.value)}
                >
                    {availableGraphs.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                    {availableGraphs.length === 0 && <option value="default">Default Graph</option>}
                </select>

                <input
                    value={currentGraphName}
                    onChange={(e) => setGraphName(e.target.value)}
                    placeholder="Graph Title"
                    className="toolbar-input"
                />

                <button
                    onClick={createNewGraph}
                    title="New Graph"
                    style={{ fontSize: 11 }}
                >
                    + New
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Media & Process Actions Section */}
            <div className="toolbar-section">
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
            </div>

            <div className="toolbar-divider" />

            {/* Versioning Actions Section */}
            <div className="toolbar-section">
                <button disabled={!singleSelectedId} onClick={() => singleSelectedId && newVersion(singleSelectedId)}>New Version</button>
                <button disabled={!singleSelectedId} onClick={() => singleSelectedId && fork(singleSelectedId, "B")}>Fork</button>

                <button
                    disabled={selectedIds.length < 2}
                    onClick={() => {
                        mergeToNewMedia(selectedIds);
                    }}
                >
                    Merge ({selectedIds.length})
                </button>
            </div>

            <div className="toolbar-divider" />

            {/* Sync & Auth Section */}
            <div className="toolbar-section">
                {currentUser ? (
                    <>
                        <SyncIndicator />
                        <button
                            onClick={() => useGraphStore.getState().syncToFirestore()}
                            style={{ fontSize: 10, padding: "2px 6px" }}
                        >
                            Save
                        </button>
                        {currentUser.photoURL && <img src={currentUser.photoURL} alt="user" className="toolbar-user-photo" />}
                        <button onClick={handleLogout} className="logout-btn">Sign Out</button>
                    </>
                ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {isShowcaseMode && <span style={{ fontSize: 10, color: "#a855f7", fontWeight: "bold" }}>SHOWCASE MODE</span>}
                        <button onClick={handleLogin} className="login-btn">Sign In</button>
                    </div>
                )}
            </div>
        </div>
    );
}

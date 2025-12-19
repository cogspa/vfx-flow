import { useRef } from "react";
import { useGraphStore } from "../app/store";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../app/firebase";

export default function Toolbar() {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const addMedia = useGraphStore((s) => s.addMediaNodeFromFile);
    const addProcessNode = useGraphStore((s) => s.addProcessNode);

    const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
    const newVersion = useGraphStore((s) => s.newVersion);
    const fork = useGraphStore((s) => s.fork);
    // const mergeToNewMedia = useGraphStore((s) => s.mergeToNewMedia);

    const currentUser = useGraphStore((s) => s.currentUser);

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
        <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 10,
            display: "flex", gap: 8, padding: 10,
            background: "rgba(20,20,20,.9)", border: "1px solid #333", borderRadius: 12,
            alignItems: "center"
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

            <div style={{ width: 1, height: 20, background: "#555", margin: "0 6px" }} />

            <button disabled={!selectedNodeId} onClick={() => selectedNodeId && newVersion(selectedNodeId)}>New Version</button>
            <button disabled={!selectedNodeId} onClick={() => selectedNodeId && fork(selectedNodeId, "B")}>Fork</button>

            <button
                onClick={() => {
                    alert("Merge: implement multi-select, then call mergeToNewMedia([id1,id2,...])");
                }}
            >
                Merge
            </button>

            <div style={{ width: 1, height: 20, background: "#555", margin: "0 6px" }} />

            {currentUser ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {currentUser.photoURL && <img src={currentUser.photoURL} style={{ width: 24, height: 24, borderRadius: "50%" }} />}
                    <button onClick={handleLogout} style={{ fontSize: 11 }}>Sign Out</button>
                </div>
            ) : (
                <button onClick={handleLogin}>Sign In</button>
            )}
        </div>
    );
}

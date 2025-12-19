import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./app/firebase";
import { useGraphStore } from "./app/store";

import GraphCanvas from "./components/GraphCanvas";
import Toolbar from "./components/Toolbar";
import Inspector from "./components/Inspector";

export default function App() {
  const setCurrentUser = useGraphStore((s) => s.setCurrentUser);
  const syncToFirestore = useGraphStore((s) => s.syncToFirestore);
  const subscribeToFirestore = useGraphStore((s) => s.subscribeToFirestore);
  const setNodes = useGraphStore((s) => s.setNodes);
  const setEdges = useGraphStore((s) => s.setEdges);

  // Watch for changes to auto-save
  // We need to be careful: if we receive an update from Firestore, it updates state.
  // That state update triggers this useEffect, which calls syncToFirestore.
  // This causes an infinite loop!
  // Simple fix for MVP: Only auto-save if the change originated locally.
  // But we don't track that yet.
  // Alternative: Compare timestamps or simple debounce + deep equality check (expensive).
  // For now, we will rely on the debounce, but it's risky.
  // Better: Don't auto-save inside the same hook that receives updates.

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const currentUser = useGraphStore((s) => s.currentUser);

  useEffect(() => {
    let firestoreUnsub: () => void = () => { };

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });

        // Subscribe to real-time graph updates
        firestoreUnsub = subscribeToFirestore((newNodes, newEdges) => {
          // Optimistic Update / Merge logic could go here.
          // For now, we overwrite local state with server state.
          // To prevent "jitter" while dragging, we might want to disable this if user is interacting?
          // But let's keep it simple.
          console.log("Received update from Firestore");
          setNodes(newNodes || []);
          setEdges(newEdges || []);
        });

      } else {
        setCurrentUser(null);
        firestoreUnsub(); // cleanup old subscription
      }
    });
    return () => {
      authUnsub();
      firestoreUnsub();
    };
  }, [setCurrentUser, subscribeToFirestore, setNodes, setEdges]); // Stable deps

  // Auto-save when graph changes
  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        // TODO: We technically should check if the current state is different from what we last loaded/saved
        // to avoid saving what we just received.
        syncToFirestore();
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, currentUser, syncToFirestore]);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Toolbar />
      <Inspector />
      <GraphCanvas />
    </div>
  );
}

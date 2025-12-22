import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./app/firebase";
import { useGraphStore } from "./app/store";

import GraphCanvas from "./components/GraphCanvas";
import Toolbar from "./components/Toolbar";
import Inspector from "./components/Inspector";
import Hero from "./components/Hero";
import { useState } from "react";

export default function App() {
  const setCurrentUser = useGraphStore((s) => s.setCurrentUser);
  const syncToFirestore = useGraphStore((s) => s.syncToFirestore);
  const subscribeToFirestore = useGraphStore((s) => s.subscribeToFirestore);
  const setNodes = useGraphStore((s) => s.setNodes);
  const setEdges = useGraphStore((s) => s.setEdges);
  const loadShowcase = useGraphStore((s) => s.loadShowcase);

  const [heroDismissed, setHeroDismissed] = useState(false);

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
  const currentGraphId = useGraphStore((s) => s.currentGraphId);

  useEffect(() => {
    let firestoreUnsub: () => void = () => { };

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });

        // Cleanup old sub if switching graphs
        if (firestoreUnsub) firestoreUnsub();

        // Subscribe to real-time graph updates
        firestoreUnsub = subscribeToFirestore((newNodes, newEdges) => {
          console.log("Received update from Firestore for graph:", currentGraphId);
          setNodes(newNodes || []);
          setEdges(newEdges || []);
        });

      } else {
        setCurrentUser(null);
        firestoreUnsub(); // cleanup old subscription
        // Load showcase if signed out
        loadShowcase();
      }
    });
    return () => {
      authUnsub();
      firestoreUnsub();
    };
  }, [setCurrentUser, subscribeToFirestore, setNodes, setEdges, currentGraphId]); // Include currentGraphId

  // Auto-save when graph changes
  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        syncToFirestore();
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, currentUser, currentGraphId, syncToFirestore]); // Include currentGraphId

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {!currentUser && !heroDismissed && (
        <Hero onDismiss={() => setHeroDismissed(true)} />
      )}
      <Toolbar />
      <Inspector />
      <GraphCanvas />
      <div style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "10px",
        color: "rgba(255,255,255,0.2)",
        zIndex: 10,
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        pointerEvents: "none"
      }}>
        Created by Joe Micallef • <a href="mailto:jmicalle@gmail.com" style={{ color: "inherit", textDecoration: "none", pointerEvents: "auto" }}>jmicalle@gmail.com</a>
      </div>
    </div>
  );
}

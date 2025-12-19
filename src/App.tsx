import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./app/firebase";
import { useGraphStore } from "./app/store";

import GraphCanvas from "./components/GraphCanvas";
import Toolbar from "./components/Toolbar";
import Inspector from "./components/Inspector";

export default function App() {
  const setCurrentUser = useGraphStore((s) => s.setCurrentUser);
  const loadFromFirestore = useGraphStore((s) => s.loadFromFirestore);
  const syncToFirestore = useGraphStore((s) => s.syncToFirestore);

  // Watch for changes to auto-save (debounced in real app, but for now direct)
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const currentUser = useGraphStore((s) => s.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
        // Load graph on login
        await loadFromFirestore();
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [setCurrentUser, loadFromFirestore]);

  // Auto-save when graph changes
  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        syncToFirestore();
      }, 2000); // 2s debounce
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

import GraphCanvas from "./components/GraphCanvas";
import Toolbar from "./components/Toolbar";
import Inspector from "./components/Inspector";

export default function App() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Toolbar />
      <Inspector />
      <GraphCanvas />
    </div>
  );
}

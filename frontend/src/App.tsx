import React, { useState, useEffect } from 'react';
import { Canvas } from './features/canvas/Canvas';
import { Sidebar } from './components/Sidebar';
import { useApi } from './hooks/useApi';
import type { ArchitectSuggestion } from './types';

function App() {
  const { analyzeInfrastructure, loading, data } = useApi();
  const [activeSuggestions, setActiveSuggestions] = useState<ArchitectSuggestion[]>([]);
  const [hiddenEdges, setHiddenEdges] = useState<string[]>([]);
  
  const [mitigatedNodes, setMitigatedNodes] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      const remediesArray = data.remedies || (data as any).suggestions || (data as any).remediations || [];
      setActiveSuggestions(remediesArray);
    } else {
      setActiveSuggestions([]);
    }
    setHiddenEdges([]);
    setMitigatedNodes([]); 
  }, [data]);

  const handleSimulateFix = (suggestion: ArchitectSuggestion) => {
    
    if (suggestion.action === 'DELETE_EDGE') {
      if (data && data.attack_path) {
        const path = data.attack_path;
        let targetedEdgeId = '';
        for (let i = 0; i < path.length - 1; i++) {
          if (path[i] === suggestion.target_node || path[i + 1] === suggestion.target_node) {
            targetedEdgeId = `threat-edge-${path[i]}-${path[i + 1]}`;
            break;
          }
        }
        if (targetedEdgeId) {
          setHiddenEdges((prev) =>
            prev.includes(targetedEdgeId) ? prev.filter((id) => id !== targetedEdgeId) : [...prev, targetedEdgeId]
          );
          return;
        }
      }
      const fallbackEdgeId = `threat-edge-${suggestion.target_node}-${suggestion.parameter}`;
      setHiddenEdges((prev) =>
        prev.includes(fallbackEdgeId) ? prev.filter((id) => id !== fallbackEdgeId) : [...prev, fallbackEdgeId]
      );
    }

    
    if (suggestion.action === 'MOVE_NODE') {
      setMitigatedNodes((prev) =>
        prev.includes(suggestion.target_node)
          ? prev.filter((nodeId) => nodeId !== suggestion.target_node)
          : [...prev, suggestion.target_node]
      );
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Canvas 
        loading={loading}
        data={data}
        analyzeInfrastructure={analyzeInfrastructure}
        hiddenEdges={hiddenEdges}
        mitigatedNodes={mitigatedNodes} 
      />
      <Sidebar 
        suggestions={activeSuggestions} 
        onSimulateFix={handleSimulateFix} 
      />
    </div>
  );
}

export default App;
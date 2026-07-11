import React, { useState, useEffect } from 'react';
import { Canvas } from './features/canvas/Canvas';
import { Sidebar } from './components/Sidebar';
import { useApi } from './hooks/useApi';
import type { ArchitectSuggestion } from './types';

function App() {
  const { analyzeInfrastructure, loading, data } = useApi();
  const [activeSuggestions, setActiveSuggestions] = useState<ArchitectSuggestion[]>([]);
  const [hiddenEdges, setHiddenEdges] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      
      
      const remediesArray = 
        data.remedies || 
        (data as any).suggestions || 
        (data as any).remediations || 
        [];
        
      setActiveSuggestions(remediesArray);
    } else {
      setActiveSuggestions([]);
    }
    
    
    setHiddenEdges([]);
  }, [data]);

  const handleSimulateFix = (suggestion: ArchitectSuggestion) => {
    if (suggestion.action === 'DELETE_EDGE') {
      
      const edgeId = `threat-edge-${suggestion.target_node}-${suggestion.parameter}`;
      
      
      setHiddenEdges((prev) => 
        prev.includes(edgeId) ? prev.filter(id => id !== edgeId) : [...prev, edgeId]
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
      />

      
      <Sidebar 
        suggestions={activeSuggestions} 
        onSimulateFix={handleSimulateFix} 
      />
    </div>
  );
}

export default App;
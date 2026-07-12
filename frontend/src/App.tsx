import React, { useState, useEffect } from 'react';
import { Canvas } from './features/canvas/Canvas';
import { Sidebar } from './components/Sidebar';
import type { ArchitectSuggestion, AnalysisResponse, GraphDiffResponse, SecurityContext } from './types';

function App() {
  const [mode, setMode] = useState<'SINGLE' | 'DIFF'>('SINGLE');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Dual-mode response containers
  const [singleData, setSingleData] = useState<AnalysisResponse | null>(null);
  const [diffData, setDiffData] = useState<GraphDiffResponse | null>(null);

  const [activeSuggestions, setActiveSuggestions] = useState<ArchitectSuggestion[]>([]);
  const [hiddenEdges, setHiddenEdges] = useState<string[]>([]);
  const [mitigatedNodes, setMitigatedNodes] = useState<string[]>([]);

  // Synchronize dynamic AI threat remediation suggestions when standard or diff matrices update
  useEffect(() => {
    if (mode === 'SINGLE' && singleData) {
      setActiveSuggestions(singleData.remedies || []);
    } else if (mode === 'DIFF' && diffData) {
      setActiveSuggestions(diffData.remedies || []);
    } else {
      setActiveSuggestions([]);
    }
    setHiddenEdges([]);
    setMitigatedNodes([]); 
  }, [singleData, diffData, mode]);

  // Standard Single-Plan Request Pipeline Wrapper
  const analyzeInfrastructure = async (planFile: File, context: SecurityContext): Promise<AnalysisResponse | null> => {
    setLoading(true);
    setMode('SINGLE');
    setDiffData(null);
    try {
      const formData = new FormData();
      formData.append('plan', planFile);
      formData.append('meta', JSON.stringify(context));

      const response = await fetch('http://localhost:8080/api/v1/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to compute infrastructure vulnerabilities');
      const resData: AnalysisResponse = await response.json();
      setSingleData(resData);
      return resData;
    } catch (err) {
      console.error('[🚨 BASELINE PIPELINE ERROR]:', err);
      setSingleData(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // NEW: Multi-Branch Comparative Git Matrix Request Pipeline Wrapper
  const analyzeBranchDiff = async (mainFile: File, prFile: File, context: SecurityContext): Promise<GraphDiffResponse | null> => {
    setLoading(true);
    setMode('DIFF');
    setSingleData(null);
    try {
      const formData = new FormData();
      formData.append('plan_main', mainFile);
      formData.append('plan_pr', prFile);
      formData.append('meta', JSON.stringify(context));

      const response = await fetch('http://localhost:8080/api/v1/analyze/diff', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process pipeline branch comparison');
      const resData: GraphDiffResponse = await response.json();
      setDiffData(resData);
      return resData;
    } catch (err) {
      console.error('[🚨 MATRIX DIFF ERROR]:', err);
      setDiffData(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFix = (suggestion: ArchitectSuggestion) => {
    if (suggestion.action === 'DELETE_EDGE') {
      // Dynamic sandbox path tracking logic for standard workflows
      if (mode === 'SINGLE' && singleData?.attack_path) {
        const path = singleData.attack_path;
        for (let i = 0; i < path.length - 1; i++) {
          if (path[i] === suggestion.target_node || path[i + 1] === suggestion.target_node) {
            const edgeId = `topo-edge-${path[i]}-${path[i + 1]}`;
            setHiddenEdges((prev) => prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId]);
            return;
          }
        }
      }
      // Dynamic sandbox path tracking logic for multi-branch diff configurations
      if (mode === 'DIFF' && diffData?.delta_attack_path) {
        const path = diffData.delta_attack_path;
        for (let i = 0; i < path.length - 1; i++) {
          if (path[i] === suggestion.target_node || path[i + 1] === suggestion.target_node) {
            const edgeId = `topo-edge-${path[i]}-${path[i + 1]}`;
            setHiddenEdges((prev) => prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId]);
            return;
          }
        }
      }
      
      const fallbackEdgeId = `topo-edge-${suggestion.target_node}-${suggestion.parameter}`;
      setHiddenEdges((prev) => prev.includes(fallbackEdgeId) ? prev.filter((id) => id !== fallbackEdgeId) : [...prev, fallbackEdgeId]);
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
        mode={mode}
        singleData={singleData}
        diffData={diffData}
        analyzeInfrastructure={analyzeInfrastructure}
        analyzeBranchDiff={analyzeBranchDiff}
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
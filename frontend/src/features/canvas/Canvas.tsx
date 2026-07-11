import React, { useState, useMemo, useEffect } from 'react';
import ReactFlow, { Background, Controls, useReactFlow, ReactFlowProvider, type Node, type Edge } from 'reactflow';
import { CustomNode } from './CustomNode';
import type { AnalysisResponse, SecurityContext } from '../../types';
import styles from './Canvas.module.css';
import 'reactflow/dist/style.css';

interface CanvasProps {
  loading: boolean;
  data: AnalysisResponse | null;
  analyzeInfrastructure: (planFile: File, context: SecurityContext) => Promise<AnalysisResponse | null>;
  hiddenEdges: string[];
}

const CanvasComponent: React.FC<CanvasProps> = ({ loading, data, analyzeInfrastructure, hiddenEdges }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { fitView } = useReactFlow(); 

  const nodeTypes = useMemo(() => ({ cloudResource: CustomNode }), []);

  const securityContext = {
    source_address: 'aws_internet_gateway.igw',
    target_address: 'aws_db_instance.rds',
  };

  
  useEffect(() => {
    if (data?.attack_path) {
      setTimeout(() => {
        fitView({ duration: 800, padding: 0.2 });
      }, 50);
    }
  }, [data, fitView]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTriggerScan = async () => {
    if (!selectedFile) return;
    await analyzeInfrastructure(selectedFile, securityContext);
  };

  
  const nodes: Node[] = useMemo(() => {
    if (!data || !data.attack_path) {
      
      return [
        { id: 'aws_internet_gateway.igw', type: 'cloudResource', position: { x: 100, y: 200 }, data: { isSource: true, isTarget: false } },
        { id: 'aws_security_group.web_sg', type: 'cloudResource', position: { x: 450, y: 200 }, data: { isSource: false, isTarget: false } },
        { id: 'aws_db_instance.rds', type: 'cloudResource', position: { x: 800, y: 200 }, data: { isSource: false, isTarget: true } },
      ];
    }

    const verticalSpacing = 140;
    const horizontalSpacing = 360;
    const depthTracker: { [key: number]: number } = {};

    return data.attack_path.map((address, index) => {
      const isTarget = index === data.attack_path!.length - 1;
      const isSource = index === 0;

      
      const depthLayer = index;

      
      if (depthTracker[depthLayer] === undefined) {
        depthTracker[depthLayer] = 0;
      } else {
        depthTracker[depthLayer]++;
      }

      const xPos = 100 + depthLayer * horizontalSpacing;
      const yPos = 200 + depthTracker[depthLayer] * verticalSpacing;

      return {
        id: address,
        type: 'cloudResource',
        position: { x: xPos, y: yPos },
        data: { isSource, isTarget },
      };
    });
  }, [data]);

  const edges: Edge[] = useMemo(() => {
    if (!data || !data.attack_path || data.attack_path.length < 2) {
      return [
        { id: 'e1', source: 'aws_internet_gateway.igw', target: 'aws_security_group.web_sg', style: { stroke: '#475569', strokeWidth: 2 } },
        { id: 'e2', source: 'aws_security_group.web_sg', target: 'aws_db_instance.rds', style: { stroke: '#475569', strokeWidth: 2 } },
      ];
    }

    const threatEdges: Edge[] = [];
    for (let i = 0; i < data.attack_path.length - 1; i++) {
      const fromNode = data.attack_path[i];
      const toNode = data.attack_path[i + 1];
      const currentEdgeId = `threat-edge-${fromNode}-${toNode}`;
      const isMitigated = hiddenEdges.includes(currentEdgeId);

      threatEdges.push({
        id: currentEdgeId,
        source: fromNode,
        target: toNode,
        animated: !isMitigated,
        style: {
          stroke: isMitigated ? '#334155' : '#ef4444',
          strokeWidth: 3,
          strokeDasharray: isMitigated ? '5, 5' : 'none',
          opacity: isMitigated ? 0.4 : 1.0,
          transition: 'all 0.3s ease',
        },
      });
    }
    return threatEdges;
  }, [data, hiddenEdges]);

  return (
    <div className={styles.canvasContainer}>
      <div className={styles.floatingControlPanel}>
        <h3 className={styles.panelTitle}>vanguard Canvas</h3>
        <p className={styles.panelDescription}>
          Upload a deployment schema to automatically analyze and arrange the spatial cloud layout tree.
        </p>

        <label className={styles.fileInputWrapper}>
          {selectedFile ? selectedFile.name : 'Select plan.json...'}
          <input type="file" accept=".json" className={styles.fileInput} onChange={handleFileChange} />
        </label>

        <button className={styles.actionButton} onClick={handleTriggerScan} disabled={!selectedFile || loading}>
          {loading ? 'Auto-Arranging Canvas...' : 'Scan Attack Path'}
        </button>

        {data && (
          <div className={`${styles.statusIndicator} ${data.status === 'VULNERABLE' ? styles.vulnerable : styles.safe}`}>
            Topology Status: {data.status}
          </div>
        )}
      </div>

      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}>
        <Background color="#0f172a" gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
};


export const Canvas: React.FC<CanvasProps> = (props) => (
  <ReactFlowProvider>
    <CanvasComponent {...props} />
  </ReactFlowProvider>
);
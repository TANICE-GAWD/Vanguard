import React, { useState, useMemo, useEffect } from 'react';
import ReactFlow, { Background, Controls, useReactFlow, ReactFlowProvider, MiniMap, type Node, type Edge } from 'reactflow';
import { CustomNode } from './CustomNode';
import type { AnalysisResponse, SecurityContext } from '../../types';
import styles from './Canvas.module.css';
import 'reactflow/dist/style.css';

interface CanvasProps {
  loading: boolean;
  data: AnalysisResponse | null;
  analyzeInfrastructure: (planFile: File, context: SecurityContext) => Promise<AnalysisResponse | null>;
  hiddenEdges: string[];
  mitigatedNodes: string[];
}


const SwimlaneGroup: React.FC<{ data: { label: string } }> = ({ data }) => (
  <div className={styles.laneHeader}>
    <span>{data.label}</span>
  </div>
);

const CanvasComponent: React.FC<CanvasProps> = ({ loading, data, analyzeInfrastructure, hiddenEdges, mitigatedNodes }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { fitView } = useReactFlow();

 
  const nodeTypes = useMemo(() => ({ 
    cloudResource: CustomNode,
    swimlane: SwimlaneGroup 
  }), []);

  const securityContext = { source_address: 'aws_internet_gateway.igw', target_address: 'aws_db_instance.rds' };

  useEffect(() => {
    if (data?.all_nodes && data.all_nodes.length > 0) {
      setTimeout(() => { fitView({ duration: 800, padding: 0.15 }); }, 150);
    }
  }, [data, fitView]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
  };

  const handleTriggerScan = async () => {
    if (!selectedFile) return;
    await analyzeInfrastructure(selectedFile, securityContext);
  };

  const nodes: Node[] = useMemo(() => {
    if (!data || !data.all_nodes || data.all_nodes.length === 0) {
      return [
        { id: 'aws_internet_gateway.igw', type: 'cloudResource', position: { x: 100, y: 200 }, data: { isSource: true, isTarget: false, isMitigated: mitigatedNodes.includes('aws_internet_gateway.igw') } },
        { id: 'aws_security_group.web_sg', type: 'cloudResource', position: { x: 450, y: 200 }, data: { isSource: false, isTarget: false, isMitigated: mitigatedNodes.includes('aws_security_group.web_sg') } },
        { id: 'aws_db_instance.rds', type: 'cloudResource', position: { x: 800, y: 200 }, data: { isSource: false, isTarget: true, isMitigated: mitigatedNodes.includes('aws_db_instance.rds') } },
      ];
    }

    const horizontalSpacing = 380;
    const verticalSpacing = 96;
    const columnTrackers: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 };

   
    data.all_nodes.forEach((resource) => {
      const addr = resource.address;
      let col = 2;
      if (addr.includes('gateway') || addr.includes('vpc') || addr.includes('route53') || addr.includes('route_table') || addr.includes('eip')) col = 0;
      else if (addr.includes('lb') || addr.includes('waf') || addr.includes('security_group') || addr.includes('subnet') || addr.includes('acl')) col = 1;
      else if (addr.includes('instance') || addr.includes('lambda') || addr.includes('autoscaling') || addr.includes('template')) col = 2;
      else if (addr.includes('db') || addr.includes('rds') || addr.includes('elasticache') || addr.includes('s3') || addr.includes('secretsmanager') || addr.includes('kms') || addr.includes('dynamodb')) col = 3;
      columnTrackers[col]++;
    });

    const maxNodesInColumn = Math.max(columnTrackers[0], columnTrackers[1], columnTrackers[2], columnTrackers[3], 4);
    const generatedLaneHeight = maxNodesInColumn * verticalSpacing + 120;

   
    const lanes: Node[] = [
      { id: 'lane-perimeter', type: 'swimlane', data: { label: '01 // PERIMETER NETWORKING' }, position: { x: 40, y: 40 }, style: { width: 320, height: generatedLaneHeight }, className: styles.swimlaneContainer, draggable: false },
      { id: 'lane-routing', type: 'swimlane', data: { label: '02 // PROXIES & FIREWALLS' }, position: { x: 40 + horizontalSpacing, y: 40 }, style: { width: 320, height: generatedLaneHeight }, className: styles.swimlaneContainer, draggable: false },
      { id: 'lane-compute', type: 'swimlane', data: { label: '03 // COMPUTE CLUSTER' }, position: { x: 40 + horizontalSpacing * 2, y: 40 }, style: { width: 320, height: generatedLaneHeight }, className: styles.swimlaneContainer, draggable: false },
      { id: 'lane-storage', type: 'swimlane', data: { label: '04 // ISOLATED STORAGE & DATA' }, position: { x: 40 + horizontalSpacing * 3, y: 40 }, style: { width: 320, height: generatedLaneHeight }, className: styles.swimlaneContainer, draggable: false },
    ];

    
    columnTrackers[0] = 0; columnTrackers[1] = 0; columnTrackers[2] = 0; columnTrackers[3] = 0;

   
    const resourceNodes: Node[] = data.all_nodes.map((resource) => {
      const addr = resource.address;
      let columnIndex = 2;
      let parentNodeId = 'lane-compute';

      if (addr.includes('gateway') || addr.includes('vpc') || addr.includes('route53') || addr.includes('route_table') || addr.includes('eip')) {
        columnIndex = 0; parentNodeId = 'lane-perimeter';
      } else if (addr.includes('lb') || addr.includes('waf') || addr.includes('security_group') || addr.includes('subnet') || addr.includes('acl')) {
        columnIndex = 1; parentNodeId = 'lane-routing';
      } else if (addr.includes('instance') || addr.includes('lambda') || addr.includes('autoscaling') || addr.includes('template')) {
        columnIndex = 2; parentNodeId = 'lane-compute';
      } else if (addr.includes('db') || addr.includes('rds') || addr.includes('elasticache') || addr.includes('s3') || addr.includes('secretsmanager') || addr.includes('kms') || addr.includes('dynamodb')) {
        columnIndex = 3; parentNodeId = 'lane-storage';
      }

      const currentRowIndex = columnTrackers[columnIndex];
      columnTrackers[columnIndex]++;

      const isSource = data.attack_path ? data.attack_path[0] === addr : addr.includes('igw');
      const isTarget = data.attack_path ? data.attack_path[data.attack_path.length - 1] === addr : addr.includes('rds');

      return {
        id: addr,
        type: 'cloudResource',
        parentNode: parentNodeId,
        extent: 'parent', 
        position: {
          x: 40,
          y: 70 + currentRowIndex * verticalSpacing,
        },
        data: {
          isSource,
          isTarget,
          isMitigated: mitigatedNodes.includes(addr),
        },
      };
    });

    return [...lanes, ...resourceNodes];
  }, [data, mitigatedNodes]);

  const edges: Edge[] = useMemo(() => {
    if (!data || !data.all_edges || data.all_edges.length === 0) {
      const e1Mitigated = hiddenEdges.includes('e1') || mitigatedNodes.includes('aws_internet_gateway.igw') || mitigatedNodes.includes('aws_security_group.web_sg');
      const e2Mitigated = hiddenEdges.includes('e2') || mitigatedNodes.includes('aws_security_group.web_sg') || mitigatedNodes.includes('aws_db_instance.rds');

      return [
        { id: 'e1', source: 'aws_internet_gateway.igw', target: 'aws_security_group.web_sg', animated: !e1Mitigated, style: { stroke: e1Mitigated ? '#334155' : '#ef4444', strokeWidth: 2 } },
        { id: 'e2', source: 'aws_security_group.web_sg', target: 'aws_db_instance.rds', animated: !e2Mitigated, style: { stroke: e2Mitigated ? '#334155' : '#ef4444', strokeWidth: 2 } },
      ];
    }

    const attackPathPairs = new Set<string>();
    if (data.attack_path && data.attack_path.length > 1) {
      for (let i = 0; i < data.attack_path.length - 1; i++) {
        attackPathPairs.add(`${data.attack_path[i]}->${data.attack_path[i + 1]}`);
      }
    }

    return data.all_edges.map((edge) => {
      const currentEdgeId = `topo-edge-${edge.from}-${edge.to}`;
      const isPartOfAttackPath = attackPathPairs.has(`${edge.from}->${edge.to}`);
      
      const isMitigated = 
        hiddenEdges.includes(currentEdgeId) || 
        hiddenEdges.includes(`threat-edge-${edge.from}-${edge.to}`) ||
        mitigatedNodes.includes(edge.from) || 
        mitigatedNodes.includes(edge.to);

      
      const strokeColor = isMitigated 
        ? '#1e293b' 
        : isPartOfAttackPath 
          ? '#f43f5e' 
          : '#334155';

      return {
        id: currentEdgeId,
        source: edge.from,
        target: edge.to,
        animated: isPartOfAttackPath && !isMitigated,
        type: 'smoothstep',
        style: {
          stroke: strokeColor,
          strokeWidth: isPartOfAttackPath ? 3.5 : 1.2,
          strokeDasharray: isMitigated ? '4, 4' : 'none',
          opacity: isMitigated ? 0.2 : isPartOfAttackPath ? 1.0 : 0.4,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      };
    });
  }, [data, hiddenEdges, mitigatedNodes]);

  return (
    <div className={styles.canvasContainer}>
      <div className={styles.floatingControlPanel}>
        <h3 className={styles.panelTitle}>ARCHITECT-X CONTROL</h3>
        <p className={styles.panelDescription}>Upload plan configurations matrix to overlay deep context security graphs.</p>
        <label className={styles.fileInputWrapper}>
          {selectedFile ? selectedFile.name : 'Select plan.json...'}
          <input type="file" accept=".json" className={styles.fileInput} onChange={handleFileChange} />
        </label>
        
        <button className={styles.actionButton} onClick={handleTriggerScan} disabled={!selectedFile || loading}>
          {loading ? 'Analyzing Topology...' : 'Scan Attack Path'}
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
        <MiniMap 
          style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '8px' }} 
          maskColor="rgba(15, 23, 42, 0.6)" 
          nodeColor="#1e293b"
        />
      </ReactFlow>
    </div>
  );
};

export const Canvas: React.FC<CanvasProps> = (props) => (
  <ReactFlowProvider><CanvasComponent {...props} /></ReactFlowProvider>
);
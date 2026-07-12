import React, { useState, useMemo, useEffect } from 'react';
import ReactFlow, { Background, BackgroundVariant, Controls, useReactFlow, ReactFlowProvider, MiniMap, type Node, type Edge } from 'reactflow';
import { UploadCloud, Loader2 } from 'lucide-react';
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
    <span className={styles.laneLabelText}>{data.label}</span>
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
      setTimeout(() => { fitView({ duration: 600, padding: 0.1 }); }, 50);
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
        { id: 'aws_internet_gateway.igw', type: 'cloudResource', position: { x: 100, y: 180 }, data: { isSource: true, isTarget: false, isMitigated: mitigatedNodes.includes('aws_internet_gateway.igw') } },
        { id: 'aws_security_group.web_sg', type: 'cloudResource', position: { x: 450, y: 180 }, data: { isSource: false, isTarget: false, isMitigated: mitigatedNodes.includes('aws_security_group.web_sg') } },
        { id: 'aws_db_instance.rds', type: 'cloudResource', position: { x: 800, y: 180 }, data: { isSource: false, isTarget: true, isMitigated: mitigatedNodes.includes('aws_db_instance.rds') } },
      ];
    }

    const horizontalSpacing = 380;
    const verticalSpacing = 80;
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
    const generatedLaneHeight = maxNodesInColumn * verticalSpacing + 100;

    const lanes: Node[] = [
      { id: 'lane-perimeter', type: 'swimlane', data: { label: 'PERIMETER NETWORKING' }, position: { x: 30, y: 30 }, style: { width: 320, height: generatedLaneHeight }, className: styles.swimlaneContainer, draggable: false },
      { id: 'lane-routing', type: 'swimlane', data: { label: 'PROXIES & CONTROLS' }, position: { x: 30 + horizontalSpacing, y: 30 }, style: { width: 320, height: generatedLaneHeight }, className: styles.swimlaneContainer, draggable: false },
      { id: 'lane-compute', type: 'swimlane', data: { label: 'COMPUTE ENVIRONMENT' }, position: { x: 30 + horizontalSpacing * 2, y: 30 }, style: { width: 320, height: generatedLaneHeight }, className: styles.swimlaneContainer, draggable: false },
      { id: 'lane-storage', type: 'swimlane', data: { label: 'STORAGE & DATASTORES' }, position: { x: 30 + horizontalSpacing * 3, y: 30 }, style: { width: 320, height: generatedLaneHeight }, className: styles.swimlaneContainer, draggable: false },
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
          y: 60 + currentRowIndex * verticalSpacing,
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
        { id: 'e1', source: 'aws_internet_gateway.igw', target: 'aws_security_group.web_sg', animated: !e1Mitigated, style: { stroke: e1Mitigated ? '#333333' : '#0070f3', strokeWidth: 1.5 } },
        { id: 'e2', source: 'aws_security_group.web_sg', target: 'aws_db_instance.rds', animated: !e2Mitigated, style: { stroke: e2Mitigated ? '#333333' : '#0070f3', strokeWidth: 1.5 } },
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
        ? '#111111' 
        : isPartOfAttackPath 
          ? '#ee0000' 
          : '#333333';

      return {
        id: currentEdgeId,
        source: edge.from,
        target: edge.to,
        animated: isPartOfAttackPath && !isMitigated,
        type: 'smoothstep',
        style: {
          stroke: strokeColor,
          strokeWidth: isPartOfAttackPath ? 2 : 1,
          strokeDasharray: isMitigated ? '4, 4' : 'none',
          opacity: isMitigated ? 0.2 : isPartOfAttackPath ? 1.0 : 0.4,
          transition: 'all 0.15s ease',
        },
      };
    });
  }, [data, hiddenEdges, mitigatedNodes]);

  return (
    <div className={styles.canvasContainer}>
      <div className={styles.floatingControlPanel}>
        <div className={styles.panelHeaderRow}>
          <h3 className={styles.panelTitle}>Architect Control</h3>
          {data && (
            <span className={`${styles.statusBadge} ${data.status === 'VULNERABLE' ? styles.badgeVulnerable : styles.badgeSafe}`}>
              {data.status}
            </span>
          )}
        </div>
        
        <div className={styles.controlLayoutStack}>
          <label className={styles.fileInputWrapper}>
            <UploadCloud size={14} className={styles.uploadIcon} />
            <span className={styles.fileNameLabel}>
              {selectedFile ? selectedFile.name : 'Import plan.json'}
            </span>
            <input type="file" accept=".json" className={styles.fileInput} onChange={handleFileChange} />
          </label>
          
          <button className={styles.actionButton} onClick={handleTriggerScan} disabled={!selectedFile || loading}>
            {loading ? (
              <div className={styles.loadingFlex}>
                <Loader2 size={14} className={styles.spinIcon} />
                <span>Scanning...</span>
              </div>
            ) : (
              'Scan Graph'
            )}
          </button>
        </div>
      </div>

      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} className={styles.flowViewport}>
        <Background variant={BackgroundVariant.Dots} color="#333333" gap={20} size={1} />
        <Controls className={styles.customFlowControls} showInteractive={false} />
        <MiniMap 
          className={styles.customMiniMap}
          maskColor="rgba(0, 0, 0, 0.6)" 
          pannable={true} 
          nodeColor={(node) => {
            if (node.type === 'swimlane') return 'transparent';
            if (node.data?.isMitigated) return '#0070f3';
            if (node.data?.isTarget) return '#ee0000';
            return '#333333';
          }}
        />
      </ReactFlow>
    </div>
  );
};

export const Canvas: React.FC<CanvasProps> = (props) => (
  <ReactFlowProvider><CanvasComponent {...props} /></ReactFlowProvider>
);
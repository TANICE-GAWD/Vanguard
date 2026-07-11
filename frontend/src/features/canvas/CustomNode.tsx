import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  Database, ShieldAlert, Globe, Server, CheckCircle2, 
  Cpu, Key, Layers, Radio, HelpCircle, HardDrive 
} from 'lucide-react';
import styles from './CustomNode.module.css';

export const CustomNode: React.FC<NodeProps> = ({ id, data }) => {
  const isTarget = data.isTarget;
  const isSource = data.isSource;
  const isMitigated = data.isMitigated; 

  
  const getResourceIcon = () => {
    if (isMitigated) return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
    
    const lowerId = id.toLowerCase();
    if (lowerId.includes('db_instance') || lowerId.includes('rds')) return <Database size={16} />;
    if (lowerId.includes('dynamodb')) return <HardDrive size={16} />;
    if (lowerId.includes('elasticache') || lowerId.includes('redis')) return <Layers size={16} />;
    if (lowerId.includes('gateway') || lowerId.includes('igw')) return <Globe size={16} />;
    if (lowerId.includes('lb') || lowerId.includes('alb')) return <Radio size={16} />;
    if (lowerId.includes('security_group') || lowerId.includes('sg') || lowerId.includes('acl')) return <ShieldAlert size={16} />;
    if (lowerId.includes('instance') || lowerId.includes('lambda') || lowerId.includes('autoscaling')) return <Cpu size={16} />;
    if (lowerId.includes('kms') || lowerId.includes('secret')) return <Key size={16} />;
    
    return <Server size={16} />;
  };

  const simpleName = id.split('.').pop() || id;
  const providerPrefix = id.split('.')[0] || 'aws';

  const cardClassName = `${styles.nodeCard} ${
    isMitigated 
      ? styles.mitigated
      : isTarget 
        ? styles.compromised 
        : isSource 
          ? styles.source 
          : ''
  }`;

  return (
    <div className={cardClassName}>
      <Handle type="target" position={Position.Left} className={styles.flowHandle} />
      
      <div className={styles.iconWrapper}>
        {getResourceIcon()}
      </div>

      <div className={styles.metaInfo}>
        <div className={styles.label} title={simpleName}>{simpleName}</div>
        <div className={styles.typeLabel}>
          {isMitigated ? 'SECURED SIMULATED' : providerPrefix.replace('_', ' ')}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className={styles.flowHandle} />
    </div>
  );
};
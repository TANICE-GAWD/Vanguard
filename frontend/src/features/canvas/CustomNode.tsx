import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Database, ShieldAlert, Globe, Server } from 'lucide-react';
import styles from './CustomNode.module.css';

export const CustomNode: React.FC<NodeProps> = ({ id, data }) => {
  const isTarget = data.isTarget;
  const isSource = data.isSource;

  
  const getResourceIcon = () => {
    if (id.includes('db') || id.includes('rds')) return <Database size={18} />;
    if (id.includes('gateway') || id.includes('igw')) return <Globe size={18} />;
    if (id.includes('security_group') || id.includes('sg')) return <ShieldAlert size={18} />;
    return <Server size={18} />;
  };

  
  const simpleName = id.split('.').pop() || id;

  const cardClassName = `${styles.nodeCard} ${
    isTarget ? styles.compromised : isSource ? styles.source : ''
  }`;

  return (
    <div className={cardClassName}>
      
      <Handle type="target" position={Position.Left} style={{ background: '#475569', width: 8, height: 8 }} />
      
      <div className={styles.iconWrapper}>
        {getResourceIcon()}
      </div>

      <div className={styles.metaInfo} title={id}>
        <div className={styles.label}>{simpleName}</div>
        <div className={styles.typeLabel}>{id.split('.')[0]}</div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#475569', width: 8, height: 8 }} />
    </div>
  );
};
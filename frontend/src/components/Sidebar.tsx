import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Terminal, HelpCircle } from 'lucide-react';
import type { ArchitectSuggestion } from '../types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  suggestions: ArchitectSuggestion[];
  onSimulateFix: (suggestion: ArchitectSuggestion) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ suggestions, onSimulateFix }) => {
  
  const [activeFixes, setActiveFixes] = useState<number[]>([]);

  const handleToggleFix = (item: ArchitectSuggestion, index: number) => {
    onSimulateFix(item);
    setActiveFixes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <ShieldAlert size={18} className={styles.alertIcon} />
          <h3 className={styles.title}>Threat Remediation</h3>
        </div>
        <p className={styles.subtitle}>Groq LPU Engine // Smart Path Patches</p>
      </div>

      <div className={styles.contentList}>
        {suggestions.length === 0 ? (
          <div className={styles.emptyState}>
            <ShieldCheck size={32} className={styles.emptyIcon} />
            <p>No active risks identified.</p>
            <span>Execute an infrastructure layout configuration scan to populate threat matrices.</span>
          </div>
        ) : (
          suggestions.map((item, index) => {
            const isSimulated = activeFixes.includes(index);
            
            
            const badgeClass = `${styles.badge} ${
              item.action === 'DELETE_EDGE' ? styles.deleteBadge : styles.moveBadge
            }`;

            return (
              <div key={index} className={`${styles.suggestionCard} ${isSimulated ? styles.cardActiveFix : ''}`}>
                <div className={styles.cardHeader}>
                  <span className={badgeClass}>{item.action.replace('_', ' ')}</span>
                  <Terminal size={12} className={styles.terminalIcon} />
                </div>
                
                <div className={styles.targetText}>
                  <strong>TARGET:</strong> {item.target_node.split('.').pop()}
                </div>
                
                {item.parameter && (
                  <div className={styles.targetText}>
                    <strong>PARAM:</strong> {item.parameter}
                  </div>
                )}

                <div className={styles.reasoningWrapper}>
                  <HelpCircle size={14} className={styles.helpIcon} />
                  <p className={styles.reasoning}>{item.reasoning}</p>
                </div>

                <button 
                  className={`${styles.simulateBtn} ${isSimulated ? styles.btnActive : ''}`}
                  onClick={() => handleToggleFix(item, index)}
                >
                  {isSimulated ? '✓ Revert Sandbox State' : 'Simulate Fix Matrix'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Terminal, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import type { ArchitectSuggestion } from '../types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  suggestions: ArchitectSuggestion[];
  onSimulateFix: (suggestion: ArchitectSuggestion) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ suggestions, onSimulateFix }) => {
  const [activeFixes, setActiveFixes] = useState<number[]>([]);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  const handleToggleFix = (item: ArchitectSuggestion, index: number) => {
    onSimulateFix(item);
    setActiveFixes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <>
      
      <button 
        className={`${styles.collapseToggle} ${isCollapsed ? styles.toggleClosed : styles.toggleOpen}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Shield size={14} className={styles.toggleIcon} />
        <span className={styles.toggleText}>Remediation</span>
        {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        
        {suggestions.length > 0 && isCollapsed && (
          <span className={styles.notificationBubble}>{suggestions.length}</span>
        )}
      </button>

      <div className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
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
                    <span className={badgeClass}>{item.action}</span>
                    <Terminal size={12} className={styles.terminalIcon} />
                  </div>
                  
                  <div className={styles.targetText}>
                    <strong>Target:</strong> {item.target_node}
                  </div>
                  
                  {item.parameter && (
                    <div className={styles.targetText}>
                      <strong>Parameter:</strong> {item.parameter}
                    </div>
                  )}

                  <p className={styles.reasoning}>{item.reasoning}</p>

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
    </>
  );
};
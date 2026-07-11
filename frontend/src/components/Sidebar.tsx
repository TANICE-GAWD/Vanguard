import React from 'react';
import type { ArchitectSuggestion } from '../types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  suggestions: ArchitectSuggestion[];
  onSimulateFix: (suggestion: ArchitectSuggestion) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ suggestions, onSimulateFix }) => {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h3 className={styles.title}>Threat Remediation</h3>
        <p className={styles.subtitle}>Groq LPU Engine Smart Path Patches</p>
      </div>

      <div className={styles.contentList}>
        {suggestions.length === 0 ? (
          <div className={styles.emptyState}>
            No active risks identified. Execute a configuration scan to populate vectors.
          </div>
        ) : (
          suggestions.map((item, index) => (
            <div key={index} className={styles.suggestionCard}>
              <span className={styles.badge}>{item.action}</span>
              
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
                className={styles.simulateBtn}
                onClick={() => onSimulateFix(item)}
              >
                Simulate Fix Matrix
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
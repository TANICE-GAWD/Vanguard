export interface ResourceNode {
  address: string;
  type: string;
  name: string;
}

export interface ArchitectSuggestion {
  action: 'DELETE_EDGE' | 'MOVE_NODE';
  target_node: string;
  parameter: string;
  reasoning: string;
}

export interface TopologyEdge {
  from: string;
  to: string;
}

export interface AnalysisResponse {
  status: 'SAFE' | 'VULNERABLE';
  all_nodes: ResourceNode[]; 
  all_edges: TopologyEdge[]; 
  attack_path: string[] | null; 
  remedies: ArchitectSuggestion[];
}

export interface SecurityContext {
  source_address: string;
  target_address: string;
}





export type DiffStatus = 'UNCHANGED' | 'ADDED' | 'REMOVED';

export interface DiffNode {
  address: string;
  type: string;
  name: string;
  status: DiffStatus;
}

export interface DiffEdge {
  from: string;
  to: string;
  status: DiffStatus;
}

export interface GraphDiffResponse {
  status: 'SAFE' | 'VULNERABLE';
  nodes: DiffNode[];
  edges: DiffEdge[];
  delta_attack_path: string[] | null;
  remedies: ArchitectSuggestion[];
}
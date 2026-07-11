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

export interface AnalysisResponse {
  status: 'SAFE' | 'VULNERABLE';
  attack_path: string[] | null;
  remedies: ArchitectSuggestion[];
}

export interface SecurityContext {
  source_address: string;
  target_address: string;
}
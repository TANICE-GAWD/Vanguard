package models


type ResourceNode struct {
	Address string `json:"address"` 
	Type    string `json:"type"`    
	Name    string `json:"name"`    
}


type ArchitectSuggestion struct {
	Action     string `json:"action"`      
	TargetNode string `json:"target_node"` 
	Parameter  string `json:"parameter"`  
	Reasoning  string `json:"reasoning"`  
}


type EdgeDiff struct {
	FromNode string `json:"from_node"`
	ToNode   string `json:"to_node"`
	Status   string `json:"status"` 
}


type TopologyEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
}


type AnalysisResponse struct {
	Status     string                `json:"status"`
	AllNodes   []ResourceNode        `json:"all_nodes"`
	AllEdges   []TopologyEdge        `json:"all_edges"`
	AttackPath []string              `json:"attack_path"`
	Remedies   []ArchitectSuggestion `json:"remedies"`
}






type DiffStatus string

const (
	StatusUnchanged DiffStatus = "UNCHANGED"
	StatusAdded     DiffStatus = "ADDED"
	StatusRemoved   DiffStatus = "REMOVED"
)


type DiffNode struct {
	Address string     `json:"address"`
	Type    string     `json:"type"`
	Name    string     `json:"name"`
	Status  DiffStatus `json:"status"`
}


type DiffEdge struct {
	From   string     `json:"from"`
	To     string     `json:"to"`
	Status DiffStatus `json:"status"`
}


type GraphDiffResponse struct {
	Status          string                `json:"status"` 
	Nodes           []DiffNode            `json:"nodes"`
	Edges           []DiffEdge            `json:"edges"`
	DeltaAttackPath []string              `json:"delta_attack_path"` 
	Remedies        []ArchitectSuggestion `json:"remedies"`
}
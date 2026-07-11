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
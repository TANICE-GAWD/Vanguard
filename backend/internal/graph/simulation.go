package graph

import (
	"backend/internal/models"
	
	
	"gonum.org/v1/gonum/graph/simple" 
)

type SimulationResult struct {
	IsPathBroken  bool     `json:"is_path_broken"`
	NewAttackPath []string `json:"new_attack_path"`
}

func (ig *InfGraph) SimulateMitigation(suggestion models.ArchitectSuggestion, sourceAddr, targetAddr string) (SimulationResult, error) {
	ig.mu.Lock()
	
	var rolledBackFromID, rolledBackToID int64
	var rolledBackWeight float64
	var modificationPerformed = false

	if suggestion.Action == "DELETE_EDGE" {
		fromID, fromExists := ig.NodeMap[suggestion.TargetNode]
		toID, toExists := ig.NodeMap[suggestion.Parameter]

		if fromExists && toExists && ig.Graph.HasEdgeFromTo(fromID, toID) {
			rolledBackFromID = fromID
			rolledBackToID = toID
			rolledBackWeight = ig.Graph.WeightedEdge(fromID, toID).Weight()

			ig.Graph.RemoveEdge(fromID, toID)
			modificationPerformed = true
		}
	}

	ig.mu.Unlock()

	if !modificationPerformed {
		path, err := ig.FindCriticalAttackPaths(sourceAddr, targetAddr)
		if err != nil {
			return SimulationResult{IsPathBroken: true, NewAttackPath: nil}, nil
		}
		return SimulationResult{IsPathBroken: false, NewAttackPath: path}, nil
	}

	remainingPath, err := ig.FindCriticalAttackPaths(sourceAddr, targetAddr)

	ig.mu.Lock()
	if modificationPerformed {
		ig.Graph.SetWeightedEdge(simple.WeightedEdge{
			F: simple.Node(rolledBackFromID),
			T: simple.Node(rolledBackToID),
			W: rolledBackWeight,
		})
	}
	ig.mu.Unlock()

	if err != nil {
		return SimulationResult{
			IsPathBroken:  true,
			NewAttackPath: nil,
		}, nil
	}

	return SimulationResult{
		IsPathBroken:  false,
		NewAttackPath: remainingPath,
	}, nil
}
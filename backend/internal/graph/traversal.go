package graph

import (
	"fmt"
	"gonum.org/v1/gonum/graph/path"
	"gonum.org/v1/gonum/graph/simple"
)


func (ig *InfGraph) FindCriticalAttackPaths(sourceAddr, targetAddr string) ([]string, error) {
	ig.mu.RLock()
	sourceID, sourceExists := ig.NodeMap[sourceAddr]
	targetID, targetExists := ig.NodeMap[targetAddr]
	ig.mu.RUnlock()

	if !sourceExists || !targetExists {
		return nil, fmt.Errorf("source or target node does not exist within current graph topology")
	}

	ig.mu.RLock()
	
	shortestPaths := path.DijkstraFrom(simple.Node(sourceID), ig.Graph)
	ig.mu.RUnlock()

	
	nodes, _ := shortestPaths.To(targetID)
	if len(nodes) == 0 {
		return nil, fmt.Errorf("no path vector exists between source and target")
	}

	
	var attackVector []string
	for _, node := range nodes {
		if addr, exists := ig.GetAddressFromID(node.ID()); exists {
			attackVector = append(attackVector, addr)
		}
	}

	return attackVector, nil
}
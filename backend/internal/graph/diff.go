package graph

import (
	"backend/internal/models"
)


func CompareGraphs(mainGraph *InfGraph, prGraph *InfGraph) []models.EdgeDiff {
	var changes []models.EdgeDiff

	mainGraph.mu.RLock()
	prGraph.mu.RLock()
	defer mainGraph.mu.RUnlock()
	defer prGraph.mu.RUnlock()

	
	prEdges := prGraph.Graph.Edges()
	for prEdges.Next() {
		edge := prEdges.Edge()
		fromAddr, fromOk := prGraph.IDMap[edge.From().ID()]
		toAddr, toOk := prGraph.IDMap[edge.To().ID()]

		if !fromOk || !toOk {
			continue
		}

		
		mainFromID, mainFromExists := mainGraph.NodeMap[fromAddr]
		mainToID, mainToExists := mainGraph.NodeMap[toAddr]

		if !mainFromExists || !mainToExists || !mainGraph.Graph.HasEdgeFromTo(mainFromID, mainToID) {
			
			changes = append(changes, models.EdgeDiff{
				FromNode: fromAddr,
				ToNode:   toAddr,
				Status:   "ADDED",
			})
		} else {
			
			mainEdge := mainGraph.Graph.WeightedEdge(mainFromID, mainToID)
			prEdge := prGraph.Graph.WeightedEdge(edge.From().ID(), edge.To().ID())
			if prEdge.Weight() != mainEdge.Weight() {
				changes = append(changes, models.EdgeDiff{
					FromNode: fromAddr,
					ToNode:   toAddr,
					Status:   "MODIFIED",
				})
			}
		}
	}

	
	mainEdges := mainGraph.Graph.Edges()
	for mainEdges.Next() {
		edge := mainEdges.Edge()
		fromAddr, fromOk := mainGraph.IDMap[edge.From().ID()]
		toAddr, toOk := mainGraph.IDMap[edge.To().ID()]

		if !fromOk || !toOk {
			continue
		}

		prFromID, prFromExists := prGraph.NodeMap[fromAddr]
		prToID, prToExists := prGraph.NodeMap[toAddr]

		if !prFromExists || !prToExists || !prGraph.Graph.HasEdgeFromTo(prFromID, prToID) {
			changes = append(changes, models.EdgeDiff{
				FromNode: fromAddr,
				ToNode:   toAddr,
				Status:   "REMOVED",
			})
		}
	}

	return changes
}
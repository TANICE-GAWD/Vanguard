package graph

import (
	"reflect"
	"backend/internal/models"
)



func ComputeGraphDelta(mainGraph *InfGraph, prGraph *InfGraph, mainResources, prResources []models.ResourceNode, sourceAddress, targetAddress string) models.GraphDiffResponse {
	mainGraph.mu.RLock()
	prGraph.mu.RLock()
	defer mainGraph.mu.RUnlock()
	defer prGraph.mu.RUnlock()

	
	mainNodeMap := make(map[string]models.ResourceNode)
	for _, res := range mainResources {
		mainNodeMap[res.Address] = res
	}

	prNodeMap := make(map[string]models.ResourceNode)
	for _, res := range prResources {
		prNodeMap[res.Address] = res
	}

	var diffNodes []models.DiffNode

	
	for addr, prRes := range prNodeMap {
		if _, exists := mainNodeMap[addr]; !exists {
			diffNodes = append(diffNodes, models.DiffNode{
				Address: addr,
				Type:    prRes.Type,
				Name:    prRes.Name,
				Status:  models.StatusAdded,
			})
		} else {
			diffNodes = append(diffNodes, models.DiffNode{
				Address: addr,
				Type:    prRes.Type,
				Name:    prRes.Name,
				Status:  models.StatusUnchanged,
			})
		}
	}

	
	for addr, mainRes := range mainNodeMap {
		if _, exists := prNodeMap[addr]; !exists {
			diffNodes = append(diffNodes, models.DiffNode{
				Address: addr,
				Type:    mainRes.Type,
				Name:    mainRes.Name,
				Status:  models.StatusRemoved,
			})
		}
	}

	
	type edgeKey struct {
		from string
		to   string
	}

	mainEdgeSet := make(map[edgeKey]bool)
	mainEdges := mainGraph.Graph.Edges()
	for mainEdges.Next() {
		edge := mainEdges.Edge()
		fromAddr, fromOk := mainGraph.IDMap[edge.From().ID()]
		toAddr, toOk := mainGraph.IDMap[edge.To().ID()]
		if fromOk && toOk {
			mainEdgeSet[edgeKey{from: fromAddr, to: toAddr}] = true
		}
	}

	prEdgeSet := make(map[edgeKey]bool)
	var diffEdges []models.DiffEdge

	prEdges := prGraph.Graph.Edges()
	for prEdges.Next() {
		edge := prEdges.Edge()
		fromAddr, fromOk := prGraph.IDMap[edge.From().ID()]
		toAddr, toOk := prGraph.IDMap[edge.To().ID()]
		if !fromOk || !toOk {
			continue
		}

		key := edgeKey{from: fromAddr, to: toAddr}
		prEdgeSet[key] = true

		if mainEdgeSet[key] {
			diffEdges = append(diffEdges, models.DiffEdge{
				From:   fromAddr,
				To:     toAddr,
				Status: models.StatusUnchanged,
			})
		} else {
			diffEdges = append(diffEdges, models.DiffEdge{
				From:   fromAddr,
				To:     toAddr,
				Status: models.StatusAdded,
			})
		}
	}

	for key := range mainEdgeSet {
		if !prEdgeSet[key] {
			diffEdges = append(diffEdges, models.DiffEdge{
				From:   key.from,
				To:     key.to,
				Status: models.StatusRemoved,
			})
		}
	}

	
	
	mainPath, mainErr := mainGraph.FindCriticalAttackPaths(sourceAddress, targetAddress)
	prPath, prErr := prGraph.FindCriticalAttackPaths(sourceAddress, targetAddress)

	var deltaAttackPath []string
	status := "SAFE"

	if prErr == nil && len(prPath) > 0 {
		
		if mainErr != nil || !reflect.DeepEqual(mainPath, prPath) {
			status = "VULNERABLE"
			deltaAttackPath = prPath
		}
	}

	return models.GraphDiffResponse{
		Status:          status,
		Nodes:           diffNodes,
		Edges:           diffEdges,
		DeltaAttackPath: deltaAttackPath,
		Remedies:        []models.ArchitectSuggestion{}, 
	}
}
package graph

import (
	"sync"

	"gonum.org/v1/gonum/graph/simple"
)

type InfGraph struct {
	mu      sync.RWMutex
	Graph   *simple.WeightedDirectedGraph
	NodeMap map[string]int64 
	IDMap   map[int64]string 
	NextID  int64
}

func NewInfGraph() *InfGraph {
	return &InfGraph{
		Graph:   simple.NewWeightedDirectedGraph(0, 0),
		NodeMap: make(map[string]int64),
		IDMap:   make(map[int64]string),
		NextID:  1,
	}
}

func (ig *InfGraph) AddResourceNode(address string) int64 {
	ig.mu.Lock()
	defer ig.mu.Unlock()

	if id, exists := ig.NodeMap[address]; exists {
		return id
	}

	id := ig.NextID
	ig.NodeMap[address] = id
	ig.IDMap[id] = address

	node := simple.Node(id)
	ig.Graph.AddNode(node)

	ig.NextID++
	return id
}

func (ig *InfGraph) AddRelationship(fromAddr, toAddr string, weight float64) {
	fromID := ig.AddResourceNode(fromAddr)
	toID := ig.AddResourceNode(toAddr)

	ig.mu.Lock()
	defer ig.mu.Unlock()

	edge := simple.WeightedEdge{
		F: simple.Node(fromID),
		T: simple.Node(toID),
		W: weight,
	}
	
	ig.Graph.SetWeightedEdge(edge)
}

func (ig *InfGraph) GetAddressFromID(id int64) (string, bool) {
	ig.mu.RLock()
	defer ig.mu.RUnlock()
	
	addr, exists := ig.IDMap[id]
	return addr, exists
}
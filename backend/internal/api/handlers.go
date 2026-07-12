package api

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"

	"backend/internal/ai"
	"backend/internal/graph"
	"backend/internal/models"
	"backend/internal/parser"
)

type PipelineHandler struct {
	GroqClient *ai.GroqClient
}

type SecurityAnalysisRequest struct {
	SourceAddress string `json:"source_address"` 
	TargetAddress string `json:"target_address"` 
}


func buildGraphFromPlan(planBytes []byte) (*graph.InfGraph, []models.ResourceNode, []models.TopologyEdge) {
	resources := parser.IngestTerraformPlan(planBytes)
	infGraph := graph.NewInfGraph()

	for _, res := range resources {
		infGraph.AddResourceNode(res.Address)
	}

	var topologyEdges []models.TopologyEdge
	addLink := func(from, to string) {
		infGraph.AddRelationship(from, to, 1.0)
		topologyEdges = append(topologyEdges, models.TopologyEdge{From: from, To: to})
	}

	var publicSubnets, privateSubnets, dbSubnets []string
	var webSecurityGroups, dbSecurityGroups []string
	var computeInstances, dbInstances []string
	var igw, route53, alb, cdn string

	for _, res := range resources {
		addr := res.Address
		if strings.Contains(addr, "internet_gateway") { igw = addr }
		if strings.Contains(addr, "route53_record") { route53 = addr }
		if strings.Contains(addr, "cloudfront_distribution") { cdn = addr }
		if strings.Contains(addr, "aws_lb.external_alb") { alb = addr }
		
		if strings.Contains(addr, "subnet.public") { publicSubnets = append(publicSubnets, addr) }
		if strings.Contains(addr, "subnet.private_app") { privateSubnets = append(privateSubnets, addr) }
		if strings.Contains(addr, "subnet.private_db") { dbSubnets = append(dbSubnets, addr) }
		
		if strings.Contains(addr, "security_group.web_sg") || strings.Contains(addr, "security_group.alb_sg") { 
			webSecurityGroups = append(webSecurityGroups, addr) 
		}
		if strings.Contains(addr, "security_group.db_sg") { dbSecurityGroups = append(dbSecurityGroups, addr) }
		
		if strings.Contains(addr, "instance") || strings.Contains(addr, "lambda") || strings.Contains(addr, "autoscaling_group") {
			computeInstances = append(computeInstances, addr)
		}
		if strings.Contains(addr, "db_instance") { dbInstances = append(dbInstances, addr) }
	}

	if route53 != "" && cdn != "" { addLink(route53, cdn) }
	if cdn != "" && igw != "" { addLink(cdn, igw) }
	
	for _, sub := range publicSubnets {
		if igw != "" { addLink(igw, sub) }
		if alb != "" { addLink(sub, alb) }
	}
	for _, sg := range webSecurityGroups {
		if alb != "" { addLink(alb, sg) }
		for _, comp := range computeInstances { addLink(sg, comp) }
	}
	for _, comp := range computeInstances {
		for _, sub := range privateSubnets { addLink(comp, sub) }
		for _, dbSg := range dbSecurityGroups { addLink(comp, dbSg) }
	}
	for _, dbSg := range dbSecurityGroups {
		for _, dbInst := range dbInstances { addLink(dbSg, dbInst) }
	}
	for _, dbInst := range dbInstances {
		for _, dbSub := range dbSubnets { addLink(dbInst, dbSub) }
	}

	connectedNodes := make(map[string]bool)
	for _, edge := range topologyEdges {
		connectedNodes[edge.From] = true
		connectedNodes[edge.To] = true
	}

	var primaryVpc string
	for _, res := range resources {
		if strings.Contains(res.Address, "aws_vpc.") {
			primaryVpc = res.Address
			break
		}
	}

	for _, res := range resources {
		if !connectedNodes[res.Address] {
			addr := res.Address
			if strings.Contains(addr, "iam_role") || strings.Contains(addr, "instance_profile") {
				for _, comp := range computeInstances {
					addLink(addr, comp)
					break
				}
			} else if strings.Contains(addr, "s3_bucket") || strings.Contains(addr, "kms_") || strings.Contains(addr, "secretsmanager_") {
				if len(dbInstances) > 0 {
					addLink(dbInstances[0], addr)
				} else if primaryVpc != "" {
					addLink(primaryVpc, addr)
				}
			} else if strings.Contains(addr, "route_table") || strings.Contains(addr, "eip") || strings.Contains(addr, "nat_gateway") {
				if igw != "" {
					addLink(igw, addr)
				}
			} else if primaryVpc != "" && addr != primaryVpc {
				addLink(primaryVpc, addr)
			}
		}
	}

	return infGraph, resources, topologyEdges
}

func (h *PipelineHandler) AnalyzePipeline(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseMultipartForm(10 << 20) 
	if err != nil {
		http.Error(w, "Failed to parse multipart form input", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("plan")
	if err != nil {
		http.Error(w, "Missing 'plan' multi-part file entry", http.StatusBadRequest)
		return
	}
	defer file.Close()

	metaJSON := r.FormValue("meta")
	var reqConfig SecurityAnalysisRequest
	if err := json.Unmarshal([]byte(metaJSON), &reqConfig); err != nil {
		http.Error(w, "Invalid metadata configurations mapping structure", http.StatusBadRequest)
		return
	}

	planBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed reading raw plan payload", http.StatusInternalServerError)
		return
	}

	infGraph, resources, topologyEdges := buildGraphFromPlan(planBytes)
	attackPath, err := infGraph.FindCriticalAttackPaths(reqConfig.SourceAddress, reqConfig.TargetAddress)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err != nil {
		response := models.AnalysisResponse{
			Status:     "SAFE",
			AllNodes:   resources,
			AllEdges:   topologyEdges,
			AttackPath: nil,
			Remedies:   []models.ArchitectSuggestion{},
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	suggestions, err := h.GroqClient.AnalyzeThreatPath(r.Context(), attackPath)
	if err != nil {
		log.Printf("[⚠️ GROQ ERROR]: Pipeline analysis failed: %v", err)
		suggestions = []models.ArchitectSuggestion{}
	}

	response := models.AnalysisResponse{
		Status:     "VULNERABLE",
		AllNodes:   resources,
		AllEdges:   topologyEdges,
		AttackPath: attackPath,
		Remedies:   suggestions,
	}
	json.NewEncoder(w).Encode(response)
}


func (h *PipelineHandler) AnalyzeBranchDiff(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseMultipartForm(20 << 20); err != nil {
		http.Error(w, "Failed parsing branch diff multi-part form parameters", http.StatusBadRequest)
		return
	}

	mainFile, _, err := r.FormFile("plan_main")
	if err != nil {
		http.Error(w, "Missing required baseline 'plan_main' specification file", http.StatusBadRequest)
		return
	}
	defer mainFile.Close()

	prFile, _, err := r.FormFile("plan_pr")
	if err != nil {
		http.Error(w, "Missing required branch delta 'plan_pr' specification file", http.StatusBadRequest)
		return
	}
	defer prFile.Close()

	metaJSON := r.FormValue("meta")
	var reqConfig SecurityAnalysisRequest
	if err := json.Unmarshal([]byte(metaJSON), &reqConfig); err != nil {
		http.Error(w, "Invalid mapping configurations mapping metadata structure", http.StatusBadRequest)
		return
	}

	mainBytes, err := io.ReadAll(mainFile)
	if err != nil {
		http.Error(w, "Failed processing raw baseline target bytes stream", http.StatusInternalServerError)
		return
	}

	prBytes, err := io.ReadAll(prFile)
	if err != nil {
		http.Error(w, "Failed processing raw pull request targets bytes stream", http.StatusInternalServerError)
		return
	}

	
	mainGraph, mainResources, _ := buildGraphFromPlan(mainBytes)
	prGraph, prResources, _ := buildGraphFromPlan(prBytes)

	
	diffResponse := graph.ComputeGraphDelta(mainGraph, prGraph, mainResources, prResources, reqConfig.SourceAddress, reqConfig.TargetAddress)

	
	if diffResponse.Status == "VULNERABLE" && len(diffResponse.DeltaAttackPath) > 0 {
		suggestions, err := h.GroqClient.AnalyzeThreatPath(r.Context(), diffResponse.DeltaAttackPath)
		if err != nil {
			log.Printf("[⚠️ GROQ DELTA ERROR]: Failed producing smart remedies for path: %v", err)
			suggestions = []models.ArchitectSuggestion{}
		}
		diffResponse.Remedies = suggestions
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(diffResponse)
}
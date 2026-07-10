package api

import (
	"encoding/json"
	"io"
	"net/http"

	"architect-x/backend/internal/ai"
	"architect-x/backend/internal/graph"
	"architect-x/backend/internal/parser"
)


type PipelineHandler struct {
	GroqClient *ai.GroqClient
}


type SecurityAnalysisRequest struct {
	SourceAddress string `json:"source_address"` 
	TargetAddress string `json:"target_address"` 
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

	
	resources := parser.IngestTerraformPlan(planBytes)
	infGraph := graph.NewInfGraph()

	
	for _, res := range resources {
		infGraph.AddResourceNode(res.Address)
	}

	
	
	for i := 0; i < len(resources)-1; i++ {
		infGraph.AddRelationship(resources[i].Address, resources[i+1].Address, 1.0)
	}

	
	attackPath, err := infGraph.FindCriticalAttackPaths(reqConfig.SourceAddress, reqConfig.TargetAddress)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":      "SAFE",
			"attack_path": nil,
			"remedies":    []string{},
		})
		return
	}

	
	suggestions, err := h.GroqClient.AnalyzeThreatPath(r.Context(), attackPath)
	if err != nil {
		
		suggestions = []models.ArchitectSuggestion{}
	}

	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "VULNERABLE",
		"attack_path": attackPath,
		"remedies":    suggestions,
	})
}
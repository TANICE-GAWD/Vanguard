package ai

import (
	"context"
	
	
	"backend/internal/models"
)


type LLMClient interface {
	AnalyzeThreatPath(ctx context.Context, attackPath []string) ([]models.ArchitectSuggestion, error)
}
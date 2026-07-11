package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"backend/internal/models"
)

type GroqConfig struct {
	APIKey     string
	BaseURL    string
	ModelName  string
	HTTPClient *http.Client
}

type GroqClient struct {
	config *GroqConfig
}

func NewGroqClient() (*GroqClient, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("missing environment variable: GROQ_API_KEY must be configured")
	}

	return &GroqClient{
		config: &GroqConfig{
			APIKey:    apiKey,
			BaseURL:   "https://api.groq.com/openai/v1/chat/completions",
			
			ModelName: "llama-3.3-70b-versatile",
			HTTPClient: &http.Client{
				Timeout: 15 * time.Second,
			},
		},
	}, nil
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqPayload struct {
	Model          string            `json:"model"`
	Messages       []groqMessage     `json:"messages"`
	ResponseFormat map[string]string `json:"response_format"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (gc *GroqClient) AnalyzeThreatPath(ctx context.Context, attackPath []string) ([]models.ArchitectSuggestion, error) {
	if len(attackPath) == 0 {
		return nil, fmt.Errorf("cannot analyze an empty attack path vector")
	}

	systemPrompt := `You are a deterministic Cloud Security Architect engine. Analyze the provided infrastructure attack vector and generate optimal mitigation strategies. You MUST respond with a valid JSON object containing an array of mitigations adhering exactly to the schema requested.`

	userPrompt := fmt.Sprintf(`Analyze this threat path computed by Dijkstra traversal: %v.
Return an array of actionable steps to break this vulnerability loop. Your response must be an object containing the array under a "suggestions" key, adhering exactly to this format:
{"suggestions": [{"action": "DELETE_EDGE"|"MOVE_NODE", "target_node": "string", "parameter": "string", "reasoning": "string"}]}`, attackPath)

	payload := groqPayload{
		Model: gc.config.ModelName,
		Messages: []groqMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		ResponseFormat: map[string]string{"type": "json_object"},
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal groq payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", gc.config.BaseURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize groq http request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+gc.config.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := gc.config.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("groq api network transmission failure: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("groq api returned error code %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var groqResp groqResponse
	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		return nil, fmt.Errorf("failed to decode groq api response object: %w", err)
	}

	if len(groqResp.Choices) == 0 {
		return nil, fmt.Errorf("groq api returned an empty inference result path")
	}

	var suggestions []models.ArchitectSuggestion
	rawContent := groqResp.Choices[0].Message.Content
	
	// 1. Try parsing as a direct naked array first
	if err := json.Unmarshal([]byte(rawContent), &suggestions); err == nil {
		return suggestions, nil
	}

	// 2. Fallback: Parse as a wrapper object and extract the nested array dynamically
	var wrapper map[string]json.RawMessage
	if err := json.Unmarshal([]byte(rawContent), &wrapper); err == nil {
		for _, rawMessage := range wrapper {
			var wrappedSuggestions []models.ArchitectSuggestion
			if err := json.Unmarshal(rawMessage, &wrappedSuggestions); err == nil && len(wrappedSuggestions) > 0 {
				return wrappedSuggestions, nil
			}
		}
	}

	return nil, fmt.Errorf("groq response failed domain structural parsing bounds. Raw output string: %s", rawContent)
}
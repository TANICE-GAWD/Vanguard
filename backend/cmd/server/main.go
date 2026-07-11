package main

import (
	"log"
	"net/http"
	"os"

	"backend/internal/ai"
	"backend/internal/api"
	
	
	"github.com/joho/godotenv"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Initializing ARCHITECT-X Core Backend...")

	
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found, relying on system environment variables")
	}

	
	groqClient, err := ai.NewGroqClient()
	if err != nil {
		log.Fatalf("Fatal boot crash: %v", err)
	}

	
	pipelineHandler := &api.PipelineHandler{
		GroqClient: groqClient,
	}

	
	router := api.RegisterRoutes(pipelineHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("ARCHITECT-X engine serving traffic on port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Network server crashed: %v", err)
	}
}
package parser

import (
	"backend/internal/models"
	"github.com/tidwall/gjson"
)


func IngestTerraformPlan(jsonData []byte) []models.ResourceNode {
	var resources []models.ResourceNode

	
	
	result := gjson.GetBytes(jsonData, "planned_values.root_module.resources")

	for _, res := range result.Array() {
		resources = append(resources, models.ResourceNode{
			Address: res.Get("address").String(),
			Type:    res.Get("type").String(),
			Name:    res.Get("name").String(),
		})
	}

	return resources
}
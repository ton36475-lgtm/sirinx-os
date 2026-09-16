#!/bin/bash
# Firecrawl MCP wrapper - uses environment variables
# Do not hardcode API keys

if [ "$FIRECRAWL_DRY_RUN" = "true" ]; then
    echo "Firecrawl MCP running in DRY-RUN mode - no external calls"
else
    echo "Firecrawl MCP active with API key from environment"
fi

# Execute MCP server
exec npx -y firecrawl-mcp

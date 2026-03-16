#!/bin/bash

# PakEcon.ai Local Setup Script
# Run this script to set up local development environment

set -e

echo "🚀 PakEcon.ai Local Setup"
echo "================================"
echo ""

# Check if .env exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists. Backing up to .env.backup"
  cp .env .env.backup
fi

# Copy from example
echo "📋 Creating .env from .env.example..."
cp .env.example .env

# Generate AGENT_SECRET if not set
if grep -q "^AGENT_SECRET=your-generated-secret" .env; then
  echo ""
  echo "🔑 Generating secure AGENT_SECRET..."
  SECRET=$(openssl rand -base64 32)

  # Update .env with the generated secret
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^AGENT_SECRET=.*/AGENT_SECRET=$SECRET/" .env
  else
    # Linux
    sed -i "s/^AGENT_SECRET=.*/AGENT_SECRET=$SECRET/" .env
  fi

  echo "✅ AGENT_SECRET generated and saved to .env"
  echo ""
  echo "⚠️  KEEP THIS SECRET SAFE - Never commit .env to git!"
else
  echo "✅ AGENT_SECRET already set in .env"
fi

echo ""
echo "📝 Next Steps:"
echo "-----------------"
echo "1. Edit .env to set any additional values (Google Indexing, etc.)"
echo "2. Start development: npm run dev"
echo "   Or start Wrangler dev: wrangler dev"
echo ""
echo "📚 For more information, see SECRETS-GUIDE.md"
echo ""

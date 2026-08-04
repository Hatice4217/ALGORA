#!/bin/bash

# ===================================
# ALGORA Environment Setup Script
# ===================================

set -e  # Exit on error

echo "🚀 ALGORA Environment Setup"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    cp .env.local .env.local.backup
    echo -e "${GREEN}✅ Backup created: .env.local.backup${NC}"
fi

# Create .env.local from example
if [ -f .env.local.example ]; then
    cp .env.local.example .env.local
    echo -e "${GREEN}✅ .env.local created from template${NC}"
else
    echo -e "${RED}❌ .env.local.example not found${NC}"
    exit 1
fi

echo ""
echo "📝 Please provide your API credentials:"
echo "=============================="
echo ""

# Supabase Configuration
echo "🗄️  Supabase Setup"
read -p "Supabase Project URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key (eyJ...): " SUPABASE_KEY

# OpenAI Configuration
echo ""
echo "🤖 OpenAI Setup"
read -p "OpenAI API Key (sk-...): " OPENAI_KEY

# App Configuration
APP_URL="http://localhost:3000"

# Update .env.local
sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" .env.local
sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY|" .env.local
sed -i "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env.local
sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env.local

echo ""
echo -e "${GREEN}✅ Environment variables configured${NC}"
echo ""

# Verify configuration
echo "📋 Configuration Summary:"
echo "=============================="
echo "Supabase URL: $SUPABASE_URL"
echo "OpenAI Key: ${OPENAI_KEY:0:8}..." # Show only first 8 chars
echo "App URL: $APP_URL"
echo ""

# Test API connections
echo "🧪 Testing API connections..."
echo "=============================="

# Test OpenAI
if [ ! -z "$OPENAI_KEY" ]; then
    echo -n "Testing OpenAI API..."
    if curl -s -o /dev/null -w "%{http_code}" https://api.openai.com/v1/models \
        -H "Authorization: Bearer $OPENAI_KEY" | grep -q "200"; then
        echo -e " ${GREEN}✅ Connected${NC}"
    else
        echo -e " ${RED}❌ Failed${NC}"
        echo "Please check your OpenAI API key"
    fi
fi

# Test Supabase
if [ ! -z "$SUPABASE_URL" ] && [ ! -z "$SUPABASE_KEY" ]; then
    echo -n "Testing Supabase connection..."
    if curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" \
        -H "apikey: $SUPABASE_KEY" | grep -q "200"; then
        echo -e " ${GREEN}✅ Connected${NC}"
    else
        echo -e " ${RED}❌ Failed${NC}"
        echo "Please check your Supabase credentials"
    fi
fi

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo "1. Run database schema in Supabase SQL Editor"
echo "2. Start dev server: npm run dev"
echo "3. Open http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "- Setup guides: docs/"
echo "- Database schema: database/schema.sql"
echo "- README: README.md"
echo ""

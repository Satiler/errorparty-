#!/bin/sh

# Generate JWT token
TOKEN=$(node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({userId: 5, steamId: '76561198306468078', isAdmin: true}, process.env.JWT_SECRET));")

echo "🔑 Token generated"
echo ""

# Call API endpoint
echo "📡 Calling API..."
echo ""

curl -v -X GET "http://127.0.0.1:3000/api/admin/test/steam-community" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

echo ""
echo "✅ Done"

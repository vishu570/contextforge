#!/bin/bash

echo "Fixing authentication patterns across API routes..."

# Find all API route files that need authentication fixes
FILES=$(find app/api/ -name "*.ts" | head -20)  # Process first 20 files

for file in $FILES; do
    # Check if file has authentication issues
    if grep -q "if (!token) {$" "$file"; then
        echo "Fixing malformed authentication in $file..."
        
        # Fix the malformed authentication pattern
        sed -i '' '/if (!token) {$/N;s/if (!token) {\n/if (!token) {\n      return NextResponse.json({ error: '\''Unauthorized'\'' }, { status: 401 });\n    }\n\n    /' "$file"
        
        echo "  ✓ Fixed missing return statement"
    fi
    
    # Fix duplicate return statements
    if grep -q '}      return NextResponse.json' "$file"; then
        echo "Fixing duplicate returns in $file..."
        sed -i '' 's/}      return NextResponse.json.*/}/' "$file"
        echo "  ✓ Removed duplicate return statements"
    fi
    
    # Replace session.user.id with user.id
    if grep -q "session\.user\.id" "$file"; then
        echo "Fixing session references in $file..."
        sed -i '' 's/session\.user\.id/user.id/g' "$file"
        echo "  ✓ Fixed session.user.id references"
    fi
done

echo "Authentication pattern fixes complete!"
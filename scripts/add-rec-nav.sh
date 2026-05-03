#!/bin/bash

# Add recommendations nav button to all pages

REC_NAV='    <a href="recommendations.html" class="nav-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      추천
    </a>'

for file in stats.html scan.html share.html detail.html; do
  echo "Updating $file..."

  # Check if file already has recommendations link
  if grep -q 'href="recommendations.html"' "$file"; then
    echo "  ✓ Already has recommendations nav"
  else
    # Add after 서재 nav item
    sed -i '' '/서재<\/a>/a\
'"$REC_NAV"'
' "$file"
    echo "  ✓ Added recommendations nav"
  fi
done

echo "✅ Done!"

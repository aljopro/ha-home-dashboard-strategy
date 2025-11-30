#!/bin/bash

# Deploy script for ha-home-dashboard-strategy
# Builds the bundle and copies it to Home Assistant via SMB mount
# Usage: ./deploy.sh [mount-path] [ha-url]
#
# Examples:
#   ./deploy.sh                                    # Uses defaults
#   ./deploy.sh /Volumes/homeassistant             # Custom mount path
#   ./deploy.sh /Volumes/homeassistant http://homeassistant.local:8123

set -e

# Configuration
MOUNT_PATH="${1:-/Volumes/config}"
HA_URL="${2:-http://homeassistant.local:8123}"
STRATEGIES_PATH="$MOUNT_PATH/www/strategies"
BUNDLE_NAME="rooms_sections_strategy.js"
LOCAL_BUNDLE="dist/$BUNDLE_NAME"

echo "🏗️  Building strategy bundle..."
npm run build

echo "📁 Checking SMB mount..."
if [ ! -d "$MOUNT_PATH" ]; then
    echo "❌ Mount path not found: $MOUNT_PATH"
    echo "   Please mount your SMB share first:"
    echo "   mkdir -p $MOUNT_PATH"
    echo "   mount_smbfs //homeassistant:homeassistant.@homeassistant.local/config $MOUNT_PATH"
    exit 1
fi

echo "📋 Creating strategies folder if needed..."
mkdir -p "$STRATEGIES_PATH"

echo "📤 Copying bundle to $STRATEGIES_PATH..."
cp "$LOCAL_BUNDLE" "$STRATEGIES_PATH/$BUNDLE_NAME"

echo "✅ Deploy complete!"
echo ""
echo "📍 Next steps:"
echo "   1. Open Home Assistant: $HA_URL"
echo "   2. Go to your dashboard"
echo "   3. Hard-refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   4. Your strategy should reload with the latest changes"
echo ""

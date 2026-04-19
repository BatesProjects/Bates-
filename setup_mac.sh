#!/bin/bash
# ============================================================
#  Bunnings Price Updater — Mac Setup Script
#  Run this ONCE to install everything and schedule the script
#  to run automatically every two weeks.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_SCRIPT="$SCRIPT_DIR/update_prices.py"
PLIST_NAME="com.bates.priceupdater"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
TWO_WEEKS=1209600  # seconds

echo ""
echo "============================================================"
echo "  Bunnings Price Updater — Setup"
echo "============================================================"
echo ""

# ── Step 1: Verify Python 3 ──────────────────────────────────
echo "Step 1: Checking for Python 3..."

PYTHON3=""
for candidate in python3 python3.12 python3.11 python3.10 python3.9; do
    if command -v "$candidate" &>/dev/null; then
        PYTHON3="$(command -v "$candidate")"
        break
    fi
done

if [ -z "$PYTHON3" ]; then
    echo ""
    echo "  ERROR: Python 3 is not installed on this Mac."
    echo ""
    echo "  To install it:"
    echo "    1. Go to https://www.python.org/downloads/"
    echo "    2. Click the big yellow 'Download Python 3.x.x' button"
    echo "    3. Open the file that downloads and follow the installer"
    echo "    4. Once done, run this script again"
    echo ""
    exit 1
fi

PYTHON_VERSION="$("$PYTHON3" --version 2>&1)"
echo "  Found: $PYTHON_VERSION  ($PYTHON3)"
echo ""

# ── Step 2: Install Python packages ─────────────────────────
echo "Step 2: Installing required Python packages..."
echo "  (This may take a minute the first time)"
echo ""

"$PYTHON3" -m pip install --user --quiet \
    "requests>=2.31.0" \
    "beautifulsoup4>=4.12.0" \
    "openpyxl>=3.1.0" \
    "lxml>=4.9.0"

echo "  Packages installed successfully."
echo ""

# ── Step 3: Locate PriceBook.xlsx ───────────────────────────
echo "Step 3: Where is your PriceBook.xlsx file?"
echo ""
echo "  Press Enter to use the same folder as this script:"
echo "    $SCRIPT_DIR/PriceBook.xlsx"
echo ""
read -rp "  Or type the full path to PriceBook.xlsx: " USER_PATH

if [ -z "$USER_PATH" ]; then
    SPREADSHEET="$SCRIPT_DIR/PriceBook.xlsx"
else
    # Expand ~ if the user typed it
    SPREADSHEET="${USER_PATH/#\~/$HOME}"
fi

echo ""
echo "  Spreadsheet set to: $SPREADSHEET"

if [ ! -f "$SPREADSHEET" ]; then
    echo ""
    echo "  WARNING: That file was not found right now."
    echo "  Make sure PriceBook.xlsx is in that location before the script runs."
fi
echo ""

# ── Step 4: Create the launchd schedule ─────────────────────
echo "Step 4: Setting up the automatic fortnightly schedule..."

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_DEST" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Unique name for this scheduled task -->
    <key>Label</key>
    <string>${PLIST_NAME}</string>

    <!-- The command to run -->
    <key>ProgramArguments</key>
    <array>
        <string>${PYTHON3}</string>
        <string>${PY_SCRIPT}</string>
        <string>${SPREADSHEET}</string>
    </array>

    <!-- Run every 2 weeks (1,209,600 seconds) -->
    <key>StartInterval</key>
    <integer>${TWO_WEEKS}</integer>

    <!-- Write output to log files -->
    <key>StandardOutPath</key>
    <string>${SCRIPT_DIR}/price_updater.log</string>
    <key>StandardErrorPath</key>
    <string>${SCRIPT_DIR}/price_updater_error.log</string>

    <!-- Do NOT run immediately when the Mac starts up -->
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
PLIST_EOF

echo "  Schedule file created."
echo ""

# ── Step 5: Activate the schedule ───────────────────────────
echo "Step 5: Activating the schedule..."

# Unload first in case a previous version was loaded
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load   "$PLIST_DEST"

echo "  Schedule activated!"
echo ""

# ── Done ─────────────────────────────────────────────────────
echo "============================================================"
echo "  Setup complete!"
echo "============================================================"
echo ""
echo "The script will now run automatically every two weeks."
echo "You don't need to do anything — it runs in the background."
echo ""
echo "─── To run a quick TEST right now (first 5 URLs only) ───"
echo ""
echo "  $PYTHON3 \"$PY_SCRIPT\" --test \"$SPREADSHEET\""
echo ""
echo "─── To run it on ALL rows right now ─────────────────────"
echo ""
echo "  $PYTHON3 \"$PY_SCRIPT\" \"$SPREADSHEET\""
echo ""
echo "─── To check what happened after a run ──────────────────"
echo ""
echo "  Open this file in TextEdit or Console:"
echo "  $SCRIPT_DIR/price_updater.log"
echo ""
echo "─── To stop the automatic schedule ─────────────────────"
echo ""
echo "  launchctl unload \"$PLIST_DEST\""
echo ""

#!/bin/zsh
set -euo pipefail

script_dir="${0:A:h}"
project_dir="${script_dir:h}"
agent_dir="$HOME/Library/LaunchAgents"
plist_source="$script_dir/com.loomstudio.gmb-daily-posts.plist"
plist_target="$agent_dir/com.loomstudio.gmb-daily-posts.plist"
user_id="$(id -u)"

[[ -f "$script_dir/gmb-posts.env" ]] || { print "Create automation/gmb-posts.env first."; exit 1; }
[[ -f "$script_dir/token.json" ]] || { print "Run --bootstrap first to create automation/token.json."; exit 1; }

/usr/bin/python3 -m pip install --user -r "$script_dir/requirements-gmb-posts.txt"
mkdir -p "$agent_dir"
cp "$plist_source" "$plist_target"
launchctl bootout "gui/$user_id" "$plist_target" 2>/dev/null || true
launchctl bootstrap "gui/$user_id" "$plist_target"
launchctl kickstart -k "gui/$user_id/com.loomstudio.gmb-daily-posts"
print "Installed. Posts will publish at 09:30 and 15:30 Asia/Amman, and on login."

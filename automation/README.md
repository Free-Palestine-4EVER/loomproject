# Google Business Profile daily posts

This publishes the 60 prepared updates in `gmb-post-calendar.json`: two per day from 10 September to 9 October 2026, at 09:30 and 15:30 in Amman. The scheduler records every successful post locally, so restarts do not duplicate it.

## One-time Google setup

Google requires an approved Cloud project and OAuth consent before any software can post to a Business Profile. Create a **Desktop app** OAuth client in an approved Google Cloud project with the Business Profile APIs enabled, then save its downloaded JSON as `automation/client_secrets.json`.

Install the Python packages and approve access in the browser:

```bash
cd "/Users/hideyourkids/Desktop/LOOM SVELTE"
python3 -m pip install --user -r automation/requirements-gmb-posts.txt
python3 automation/gmb_daily_posts.py --bootstrap
python3 automation/gmb_daily_posts.py --list-locations
```

Copy `automation/gmb-posts.env.example` to `automation/gmb-posts.env`, and set `GMB_LOCATION` to the LOOM location printed by `--list-locations`.

Test without publishing:

```bash
python3 automation/gmb_daily_posts.py --dry-run
```

## Install the Mac scheduler

```bash
chmod +x automation/install_gmb_schedule.sh
automation/install_gmb_schedule.sh
```

The script uses Google's supported `accounts.locations.localPosts.create` endpoint. It posts only the entries due that day and stores its OAuth token, location configuration and publish history outside Git.

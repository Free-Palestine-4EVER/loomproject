#!/usr/bin/env python3
"""Publish LOOM's scheduled Google Business Profile updates.

Run ``--bootstrap`` once to approve Google OAuth locally, then let launchd run
the script at the two daily scheduled times.  No browser automation or saved
passwords are used.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from google.auth.transport.requests import AuthorizedSession, Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parent
POSTS_FILE = ROOT / "gmb-post-calendar.json"
STATE_FILE = ROOT / "gmb-post-state.json"
SCOPES = ["https://www.googleapis.com/auth/business.manage"]
LOCAL_POSTS_API = "https://mybusiness.googleapis.com/v4"


def load_environment() -> None:
    """Load local scheduler settings without putting secrets in the repository."""
    env_file = ROOT / "gmb-posts.env"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def credentials_path() -> Path:
    value = os.environ.get("GMB_CLIENT_SECRETS")
    return Path(value).expanduser() if value else ROOT / "client_secrets.json"


def token_path() -> Path:
    value = os.environ.get("GMB_TOKEN_PATH")
    return Path(value).expanduser() if value else ROOT / "token.json"


def load_credentials(interactive: bool = False) -> Credentials:
    token = token_path()
    creds = Credentials.from_authorized_user_file(token, SCOPES) if token.exists() else None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        if not interactive:
            raise RuntimeError("Google authorization is missing. Run: python3 automation/gmb_daily_posts.py --bootstrap")
        secrets = credentials_path()
        if not secrets.exists():
            raise RuntimeError(f"Missing OAuth client file: {secrets}")
        flow = InstalledAppFlow.from_client_secrets_file(secrets, SCOPES)
        creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
    token.write_text(creds.to_json(), encoding="utf-8")
    token.chmod(0o600)
    return creds


def now_amman() -> datetime:
    return datetime.now(ZoneInfo(os.environ.get("GMB_TIMEZONE", "Asia/Amman")))


def read_json(path: Path, fallback):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else fallback


def write_json(path: Path, payload) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def list_locations(session: AuthorizedSession) -> None:
    accounts = session.get("https://mybusinessaccountmanagement.googleapis.com/v1/accounts").json().get("accounts", [])
    for account in accounts:
        response = session.get(
            f"https://mybusinessbusinessinformation.googleapis.com/v1/{account['name']}/locations",
            params={"readMask": "name,title"},
        )
        response.raise_for_status()
        for location in response.json().get("locations", []):
            location_id = location["name"].split("/")[-1]
            print(f"{location.get('title', 'Untitled')}: {account['name']}/locations/{location_id}")


def publish(session: AuthorizedSession, location: str, post: dict, dry_run: bool) -> dict:
    body = {
        "languageCode": "en",
        "summary": post["summary"],
        "topicType": "STANDARD",
        "callToAction": {"actionType": "LEARN_MORE", "url": post["url"]},
    }
    if dry_run:
        print(f"DRY RUN {post['id']}: {post['summary']}")
        return {"name": "dry-run"}
    response = session.post(f"{LOCAL_POSTS_API}/{location}/localPosts", json=body)
    response.raise_for_status()
    return response.json()


def run(dry_run: bool) -> None:
    location = os.environ.get("GMB_LOCATION")
    if not location:
        raise RuntimeError("Set GMB_LOCATION to accounts/ACCOUNT_ID/locations/LOCATION_ID after running --list-locations.")
    current = now_amman()
    today = current.date().isoformat()
    posts = read_json(POSTS_FILE, [])
    state = read_json(STATE_FILE, {"published": {}})
    session = AuthorizedSession(load_credentials())
    due = [post for post in posts if post["scheduled_at"].startswith(today) and post["scheduled_at"] <= current.isoformat() and post["id"] not in state["published"]]
    for post in due:
        result = publish(session, location, post, dry_run)
        if not dry_run:
            state["published"][post["id"]] = {"published_at": current.isoformat(), "google_post": result.get("name")}
            write_json(STATE_FILE, state)
        print(f"Published {post['id']}")
    if not due:
        print(f"No posts due at {current.isoformat()}")


def main() -> None:
    load_environment()
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap", action="store_true", help="Run the one-time OAuth approval flow.")
    parser.add_argument("--list-locations", action="store_true", help="Print accessible GBP locations and their resource names.")
    parser.add_argument("--dry-run", action="store_true", help="Show due posts without publishing them.")
    args = parser.parse_args()
    if args.bootstrap:
        load_credentials(interactive=True)
        print("Google OAuth token saved.")
        return
    if args.list_locations:
        list_locations(AuthorizedSession(load_credentials()))
        return
    run(args.dry_run)


if __name__ == "__main__":
    main()

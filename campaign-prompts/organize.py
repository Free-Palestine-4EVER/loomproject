import sys, os, glob, json, shutil, time

campaign, id_ = sys.argv[1], sys.argv[2]
downloads = os.path.expanduser("~/Downloads")
pngs = glob.glob(os.path.join(downloads, "*.png"))
pngs = [p for p in pngs if os.path.getmtime(p) > time.time() - 180]
if not pngs:
    print("NO_NEW_FILE")
    sys.exit(1)
newest = max(pngs, key=os.path.getmtime)
dest_dir = f"/Users/hideyourkids/Desktop/LOOM PROJECT/gen-images/{campaign}"
os.makedirs(dest_dir, exist_ok=True)
dest = os.path.join(dest_dir, f"{id_}.png")
shutil.move(newest, dest)

prog_path = "/Users/hideyourkids/Desktop/LOOM PROJECT/campaign-prompts/progress.json"
d = json.load(open(prog_path))
d.setdefault(campaign, [])
if id_ not in d[campaign]:
    d[campaign].append(id_)
json.dump(d, open(prog_path, "w"), indent=2)
print(f"OK {dest}")

import base64, json, os, sys, time, urllib.request, urllib.error

API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

def generate(prompt, out_path, model="gemini-3-pro-image", aspect="1:1", retries=4):
    key = os.environ["GOOGLE_API_KEY"]
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": aspect},
        },
    }
    data = json.dumps(body).encode()
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(
                API.format(model=model, key=key), data=data,
                headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=300) as r:
                res = json.load(r)
            for part in res["candidates"][0]["content"]["parts"]:
                if "inlineData" in part:
                    raw = base64.b64decode(part["inlineData"]["data"])
                    with open(out_path, "wb") as f:
                        f.write(raw)
                    return out_path, len(raw)
            last = "no image part: " + json.dumps(res)[:400]
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}: {e.read()[:300].decode(errors='replace')}"
            if e.code in (400, 403): break
        except Exception as e:
            last = f"{type(e).__name__}: {e}"
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"generate failed for {out_path} -> {last}")

if __name__ == "__main__":
    p, o = sys.argv[1], sys.argv[2]
    a = sys.argv[3] if len(sys.argv) > 3 else "1:1"
    print(generate(p, o, aspect=a))

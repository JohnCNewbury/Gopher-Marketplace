import sys, pathlib
repo, shim, out = map(pathlib.Path, sys.argv[1:4])
src = repo.read_text(encoding="utf-8"); s = shim.read_text(encoding="utf-8")
i = src.rfind("</body>"); assert i > 0, "no </body>"
out.write_text(src[:i] + s + "\n" + src[i:], encoding="utf-8")
txt = out.read_text(encoding="utf-8")
assert txt.count("LOCAL PREVIEW SHIM") == 1 and "detail=1" in txt, "shim missing"
print("spliced", out, len(txt))

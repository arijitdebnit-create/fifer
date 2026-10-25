#!/usr/bin/env python3
"""Validate data/questions.json: unique ids, 4 unique options, answer among options."""
import json, sys, collections
d = json.load(open("data/questions.json"))
errs = []
ids = collections.Counter(q["id"] for q in d["questions"])
errs += [f"duplicate id {k}" for k, v in ids.items() if v > 1]
for q in d["questions"]:
    for f in ("id", "category", "question", "answer", "options"):
        if not q.get(f): errs.append(f"{q.get('id')}: missing {f}")
    if len(q["options"]) != 4 or len(set(q["options"])) != 4: errs.append(f"{q['id']}: need 4 unique options")
    if q["answer"] not in q["options"]: errs.append(f"{q['id']}: answer not in options")
print(f"{len(d['questions'])} questions;", dict(collections.Counter(q['category'] for q in d['questions'])))
print("\n".join(errs) or "OK: no errors")
sys.exit(1 if errs else 0)

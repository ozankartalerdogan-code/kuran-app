#!/usr/bin/env python3
"""Kör adjudication için paket batch yazdırıcı (salt okunur; rank/skor içermez).

Cluster'lar (lex, pos) altında katlanır; diac+ayırıcı özellik varyantları tek satırda.
Kullanım: python print-package-batch.py <package.jsonl> <start> <count>
"""
import json
import sys

NOM = ("cas", "stt", "num", "gen")
VRB = ("asp", "per", "num", "gen", "mod", "vox")


def variant_token(c: dict) -> str:
    keys = VRB if c["pos"] == "verb" else NOM
    feats = "".join(str(c["feats"].get(k, "-"))[:1] for k in keys)
    clit = "+".join(sorted(set(v.split("_")[0] for v in c["clitics"].values()))) if c["clitics"] else ""
    return f'{c["diac"]}[{feats}{"|" + clit if clit else ""}]'


def main() -> None:
    path, start, count = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    rows = [json.loads(line) for line in open(path, encoding="utf-8")]
    for r in rows[start:start + count]:
        key = f'{r["verse_key"]}#{r["word_index"]}'
        print(f'== {key} [{r["canonical_text"]}]  {r["context_before"]} ▸ {r["context_after"]}'
              f'  exact={r["exact_has_analysis"]} n={len(r["clusters"])}')
        groups: dict[tuple, list] = {}
        for c in r["clusters"]:
            groups.setdefault((c["lex"], c["pos"], c["root"], c["abbrev"]), []).append(c)
        for (lex, pos, root, abbrev), cs in groups.items():
            seen = []
            for c in cs:
                t = variant_token(c)
                if t not in seen:
                    seen.append(t)
            extra = " ABBREV" if abbrev else ""
            print(f'  {lex}|{pos}|{root}{extra} :: {" ".join(seen)}')
    print(f"-- printed {min(count, max(0, len(rows)-start))} of {len(rows)}")


if __name__ == "__main__":
    main()

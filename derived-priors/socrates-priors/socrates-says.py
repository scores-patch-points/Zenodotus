#!/usr/bin/env python3
# socrates-says.py — extract Socrates' utterances AND the dialogue FLOW from the
# Greek Plato corpus, in the spirit of Terry Gross: the elenchus is not a script
# of questions; it is a method of LISTENING that generates the next question from
# the answer that just landed. Each Socratic move is therefore extracted as a
# (interlocutor answer → Socrates response) PAIR, and the "consumption move" —
# how Socrates restates the prior answer before building on it (οὐκοῦν νυνδὴ
# ἔλεγες ὅτι… / εἰ οὖν… / μετὰ ταῦτα… / ἄρτι… ) — is typed mechanically.
#
# This is the memory half of the Pythia design, and the conversation-flow half
# is the part that makes it Socratic rather than a Q&A bot: a Socratic system
# does not have a stack of questions; it has a *listening loop* where turn N+1
# is a function of turn N. The fold already implements the repeat-back (PRX-01);
# this corpus makes that move *grounded in the original text*.
#
# Speaker conventions (verified 2026-09-20):
#   Gorgias, Meno:   spelled-out "Σωκράτης:" marker units.
#   others:          abbreviated inline ΣΩ. / ΣΩΚΡ. / Σω. markers.
#   Apology:         single continuous speech (all Socrates).
#
# Move types (closed, mechanical — L5):
#   consumption  opens by restating/consuming the prior answer
#                (οὐκοῦν νυνδὴ ἔλεγες | εἰ οὖν | μετὰ ταῦτα | ἄρτι | τοίνυν)
#   aporia       declares not-knowing (οὐκ οἶδα, ὃ δὲ μὴ οἶδα, ἐγὼ οὐκ εἰδώς)
#   question     asks (ἆρα/τί/πῶς/πότερον/οὐκοῦν/εἰπέ/φῂς)
#   refutation   draws the contradiction (οὐκοῦν, ἆρ᾽ οὖν, συμβαίνει, πῶς οὖν)
#   premise      states a ground / received premise (ἔστω, ὑπόθες, φαμέν, ὁμολογοῦμεν)
#   method       names the method (οὐδὲν διδάσκω ἀλλ᾽ ἐρωτῶ, ἀνάμνησις, ἔλεγχος)
#   midwifery    hands the birth back (τί φῂς, εἰπέ μοι, σκόπει, ἴδωμεν, πειρῶ)
#   other
#
# Output: socrates-says.json (pairs, addressed) + socrates-says.md.
# Usage: python3 socrates-says.py [--dialogues meno,gorgias] [--out DIR]

import json, glob, re, os, sys

CORPUS = "11-multi-language/greek-originals"
OUT = "socrates-says"

SPELLED = "Σωκράτης:"
SPEAKER_MARKERS = {"Σωκράτης:", "Μένων:", "Παῖς:", "Ἄνυτος:", "Κρίτων:", "Καλλικλῆς:", "Πῶλος:", "Γοργίας:"}
INLINE = re.compile(r"(?:^|\s)(ΣΩΚΡ\.|ΣΩΚΡΑΤΗΣ|ΣΩ\.|Σω\.)(?=\s|\u2014|\.)")

# Consumption move — the Terry Gross signature: opens by pointing back at the
# interlocutor's last answer. Priority over question/refutation.
CONSUME_PAT = re.compile(r"(οὐκοῦν νυνδὴ|νυνδὴ ἔλεγες|εἰ οὖν|μετὰ ταῦτα|ἄρτι|τοίνυν|ὅτι ἄρτι|ὡς νυνδὴ|ἐκ τούτων δὴ|οὐκοῦν ἐκ)")
QUESTION_PAT = re.compile(r"(ἆρα|τί\s|πῶς|πότερον|οὐκοῦν|εἰπέ|φῂς|ἔστι\s+οὖν|τί\s+ποτε|πόσων|ποῖον|ὁποῖον|εἰπεῖν|λέγεις)")
APORIA_PAT = re.compile(r"(οὐκ οἶδα|οὐκ εἰδώς|ὃ δὲ μὴ οἶδα|οἶδα\s+δ᾽\s+οὐ|οὐδ᾽\s+αὐτὸ|οὐκ ἔχω εἰπεῖν)")
REFUTATION_PAT = re.compile(r"(οὐκοῦν|ἆρ᾽ οὖν|τί οὖν|συμβαίνει|πῶς οὖν|οὐκ ἄρα|ἔστιν οὖν|οὐδὲν ἄρα)")
PREMISE_PAT = re.compile(r"(ἔστω|ὑπόθες|φαμέν|ὁμολογοῦμεν|ὁμολογεῖς|δοκεῖ δήπου|εἴπερ)")
METHOD_PAT = re.compile(r"(οὐδὲν διδάσκω, ἀλλ᾽ ἐρωτῶ|ἀνάμνησιν|ἀνάμνησις|ἔλεγχος|ἐλέγχειν|λόγον καὶ ἐλέγχειν)")
MIDWIFERY_PAT = re.compile(r"(τί φῂς|εἰπέ μοι|σκόπει|ἴδωμεν|πειρῶ|πρόσεχε)")

def move_type(text):
    t = text.strip()
    if CONSUME_PAT.search(t): return "consumption"
    if METHOD_PAT.search(t): return "method"
    if APORIA_PAT.search(t): return "aporia"
    if REFUTATION_PAT.search(t): return "refutation"
    if QUESTION_PAT.search(t): return "question"
    if PREMISE_PAT.search(t): return "premise"
    if MIDWIFERY_PAT.search(t): return "midwifery"
    return "other"

def split_rows(units):
    for u in units:
        t = u.get("text", "")
        if t.strip(): yield u.get("start"), u.get("end"), t

def address_of(rows, start, end):
    for (s, e, t) in rows:
        if s <= start < e:
            m = re.search(r"\[(\d+[a-e])\]", t)
            if m: return m.group(1)
    return ""

def extract_flow_inline(units):
    """Crito/Phaedrus/Sophist/Theaetetus: abbreviated ΣΩ./ΣΩΚΡ./Σω. markers at
    the start of a row. Each such row is a Socratic turn (the marker names him);
    adjacent content rows are not re-assigned (the marker is inline)."""
    out = []
    for (start, end, t) in split_rows(units):
        m = INLINE.match(t)
        if not m: continue
        text = t[m.end():].strip()
        if not text: continue
        out.append({"speaker": "Σωκράτης", "start": start, "end": end,
                    "text": text, "move": move_type(text), "consumes": None})
    return out


def extract_flow(units):
    """Return a list of turn dicts: {speaker, start, end, text, move}. Each
    Socratic turn carries `consumes` = index of the interlocutor turn it opens
    by restating (or None)."""
    turns = []
    cur = None
    buf = []
    buf_start = None
    for u in units:
        t = u["text"]
        ts = t.strip()
        if ts in SPEAKER_MARKERS:
            if cur is not None:
                turns.append({"speaker": cur, "start": buf_start, "end": u["start"],
                              "text": " ".join(x.strip() for x in buf).strip()})
            cur = ts[:-1]
            buf = []
            buf_start = u["end"]
        elif cur is not None:
            buf.append(t)
    if cur is not None:
        turns.append({"speaker": cur, "start": buf_start, "end": units[-1]["end"],
                      "text": " ".join(x.strip() for x in buf).strip()})

    # Type Socrates' moves and pair them: a Socratic consumption turn opens by
    # pointing back at the nearest PRIOR interlocutor turn.
    for i, tn in enumerate(turns):
        if tn["speaker"] == "Σωκράτης":
            tn["move"] = move_type(tn["text"])
            tn["consumes"] = None
            if tn["move"] == "consumption":
                j = i - 1
                while j >= 0 and turns[j]["speaker"] == "Σωκράτης": j -= 1
                tn["consumes"] = j if j >= 0 else None
        else:
            tn["move"] = "answer"
            tn["consumes"] = None
    return turns

def extract_narration(units):
    """Republic/Phaedo convention: Socrates NARRATES in the first person
    (εἶπον / ἔφην / ἦν δ' ἐγώ — "I said"), interlocutors speak in the third
    (ἔφη — "he said"). Split the text at narration verbs and tag by person.
    Both sides are kept as turns (Socrates = 1st person, interlocutor = 3rd)
    so the consumption pairing can connect them."""
    rows = list(split_rows(units))
    text = " ".join(t.strip() for (_, _, t) in rows)
    pat = re.compile(r"([^.]*?(?:ἦν δ᾽ ἐγώ|ἔφην|εἶπον|ἔφη|εἶπεν)[^.]*\.)")
    out = []
    for c in pat.findall(text):
        c = c.strip()
        # strip the narration frame after the verb
        m1 = re.search(r"[,:]\s*([^,]*?)(?:ἦν δ᾽ ἐγώ|ἔφην|εἶπον|ἔφη|εἶπεν)\s*$", c)
        content = (m1.group(1) if m1 else c).strip()
        if not content or len(content) <= 4: continue
        if re.search(r"(εἶπον|ἔφην|ἦν δ᾽ ἐγώ)", c) and not re.search(r"[,:]?\s*(ἔφη)\b", c[:20]):
            out.append({"speaker": "Σωκράτης", "text": content,
                        "move": move_type(content), "consumes": None})
        elif "ἔφη" in c or "εἶπεν" in c:
            out.append({"speaker": "interlocutor", "text": content,
                        "move": "answer", "consumes": None})
    return out


def main():
    args = []
    for i, a in enumerate(sys.argv[1:], start=1):
        prev = sys.argv[i-1] if i > 0 else ""
        if a == "--dialogues" and i+1 < len(sys.argv):
            args = [x.strip() for x in sys.argv[i+1].split(",") if x.strip()]
        elif not a.startswith("--") and prev not in ("--dialogues", "--out"):
            args.append(a)
    outdir = OUT
    for i, a in enumerate(sys.argv):
        if a == "--out" and i+1 < len(sys.argv): outdir = sys.argv[i+1]
    os.makedirs(outdir, exist_ok=True)

    if args:
        dialogues = args
    else:
        dialogues = [f.split("plato-")[1].split(".txt")[0] for f in
                      sorted(glob.glob(f"{CORPUS}/plato-*.txt.structure.json"))
                      if "plato-" in f and ".txt" in f]

    result = {}
    for dlg in dialogues:
        d = json.load(open(f"{CORPUS}/plato-{dlg}.txt.structure.json"))
        if dlg == "apology":
            rows = list(split_rows(d["units"]))
            text = " ".join(t.strip() for (_, _, t) in rows)
            result[dlg] = [{"speaker": "Σωκράτης", "start": d.get("bodyOffset", 0),
                            "end": d.get("bytes", 0), "text": text, "move": "other", "consumes": None}]
            continue
        # Convention routing: spelled markers (Gorgias/Meno) → flow walk;
        # abbreviated inline (Crito/Phaedrus/Sophist/Theaetetus) → inline walk;
        # narration verbs (Republic/Phaedo) → first-person parser.
        units = d["units"]
        spelled = any(u["text"].strip() == SPELLED for u in units)
        abbrev = any(u["text"].strip().startswith(("ΣΩ.", "ΣΩΚΡ.", "Σω.")) for u in units)
        narration = sum(u["text"].count("ἔφη") for u in units) > 50 and not spelled and not abbrev
        if narration:
            raw = extract_narration(units)
            result[dlg] = raw
        elif spelled:
            result[dlg] = extract_flow(units)
        elif abbrev:
            result[dlg] = extract_flow_inline(units)
        else:
            # sparse/no reliable markers — record as partial with a note
            result[dlg] = []
        flow = result[dlg]
        sok = [t for t in flow if t.get("speaker") == "Σωκράτης"]
        # Pair each consumption move to its prior interlocutor answer
        # (for inline/narration flows, the prior turn in the same list).
        prev_interlocutor = None
        for tn in flow:
            if tn.get("speaker") == "Σωκράτης":
                if tn.get("consumes") is None and prev_interlocutor is not None and tn.get("move") == "consumption":
                    tn["consumes"] = True
                    tn["consumed_answer"] = prev_interlocutor.get("text", "")[:400]
                    tn["consumed_speaker"] = prev_interlocutor.get("speaker")
            else:
                prev_interlocutor = tn
        kinds = {}
        for t in sok: kinds[t["move"]] = kinds.get(t["move"], 0) + 1
        cons = sum(1 for t in sok if t.get("move") == "consumption")
        note = "" if sok else "  (no reliable speaker tags — partial)"
        print(f"{dlg:14} turns={len(flow):5}  Socratic={len(sok):4}  moves={kinds}  consumption={cons}{note}")

    with open(f"{outdir}/socrates-says.json", "w", encoding="utf-8") as f:
        json.dump({"schema": "SocratesSays@2", "giver": "live_priors/11-multi-language/greek-originals",
                   "flow": "turn-paired; consumption = opens by restating prior answer (Terry Gross pattern)",
                   "dialogues": result}, f, ensure_ascii=False, indent=1)

    with open(f"{outdir}/socrates-says.md", "w", encoding="utf-8") as f:
        f.write("# Σωκράτης λέγει — Socrates says (and how he listens)\n\n")
        f.write("Turn-paired extraction from the polytonic Greek originals. A Socratic\n")
        f.write("`consumption` move opens by RESTATING the interlocutor's last answer\n")
        f.write("before building on it — the elenchus as listening, not script.\n\n")
        for dlg, flow in result.items():
            f.write(f"\n## {dlg}  ({len(flow)} turns)\n\n")
            for t in flow[:300]:
                if t["speaker"] != "Σωκράτης": continue
                addr = address_of(list(split_rows(load_units(dlg))), t["start"], t["end"]) if False else ""
                cons = f" ⤾consumes[{t.get('consumed_speaker')}] " if t.get("consumes") is not None else ""
                f.write(f"- **{t['move']}**{cons}{t['text'][:170]}\n")

def load_units(dlg):
    return json.load(open(f"{CORPUS}/plato-{dlg}.txt.structure.json"))["units"]

if __name__ == "__main__":
    main()
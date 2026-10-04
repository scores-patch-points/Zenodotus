# 19-organic-community — real human chat logs

This register holds **people typing at each other**, unedited: text messages,
IRC support channels, and workplace email, with the typos, slang, dropped
articles and keyboard fumbles the corpus's formal sources never carry. It is
the organic/community corner of the corpus (category 16 in eoPriors's catalog;
the number `19` keeps it clear of the locally repurposed `16-wordplay`).

Nothing here is a transcript written for an audience. Every document is an
aggregation of short messages that individually would fall under the corpus's
600-word floor — one person's SMS for a period, one IRC channel-day, one
conversation thread, one mailbox's emails for a month — built by
`scripts/fetch-chat-logs.mjs`, which enforces the floor on the assembled
document the same way `consolidate-media-catalogs.mjs` folds short media
metadata into catalogues.

## Sources

| Directory | What it is | Language(s) | Period | License/terms |
|---|---|---|---|---|
| `nus-sms/en/`, `nus-sms/zh/` | Real personal SMS contributed by volunteers (Singapore, mostly students) — Singlish, abbreviations, typos | English, Chinese | 2003-2015 | Research use; cite Chen & Kan (2013). Contributor IDs are anonymous |
| `cosem/` | Corpus of Singapore English Messages — online text messages, scrubbed/anonymized | English (colloquial Singlish) | 2016-2022 | Openly distributed research corpus; cite Gonzales et al. (2021) |
| `ubuntu-irc/` | Ubuntu IRC support-channel logs served publicly by Canonical | English + de/es/it/pt/zh channels | 2004-2015 | Publicly served logs |
| `enron/` | Real workplace emails released by FERC during the Enron investigation | English | 1998-2002 | Public domain (US federal record) |
| `lccc/` | Large-scale Cleaned Chinese Conversation corpus — real Weibo/Douban/PTT conversation | Chinese | 2010s | MIT (thu-coai) |

## Reading notes

- **Register.** These are the informal registers the corpus lacked: SMS
  abbreviations (`hav`, `ur`, `n`), Singlish (`oso`, `wat`, `lah`), IRC
  shorthand, email ellipsis. Typos are preserved — that is the point.
- **Privacy.** The sources are already-public research corpora that were
  scrubbed or anonymized to varying degrees (CoSEM and NUS SMS carry anonymous
  IDs; Enron was released by FERC; IRC logs are public; LCCC is a cleaned
  public corpus). They are read here as language documents, not re-published
  as private correspondence.
- **Aggregation, not fabrication.** A document groups real messages; the
  grouping (contributor, conversation, channel-day, mailbox-month) is declared
  in each file's frontmatter and in `manifests/chat-logs-manifest.json`.
  Nothing was rewritten, summarized or generated.

Every file carries a YAML frontmatter block with its source, language, period,
license and grouping. The full manifest, including everything fetched and
rejected (404s, under-floor batches, caps), is `manifests/chat-logs-manifest.json`.

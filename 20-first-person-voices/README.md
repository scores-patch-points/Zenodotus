# 20-first-person-voices — who the corpus was about, now speaking

This register is Archon Huxley's answer to the fold perspective extraction
(`scripts/fold-perspective-extract.mjs`). The corpus long spoke **about**
whole peoples — women in 750 documents, indigenous peoples in 480, the
formerly enslaved in 297 — while holding none of them **in the first person**.
A text *about* a people is not that people's voice. This directory is the
repair: the public-domain testimony of the people themselves, held the same
way the rest of the corpus is held — original language where the canon is a
classical text, provenance-carrying, 600-word floor, nothing invented.

## Holdings

### `gutenberg/` — women + people of colour, global-south focus, across time (118 works, 2026-10-08)

The broad sweep the register's `by` column was waiting on: the public-domain
works of women authors and authors of colour, with a global-south focus,
resolved **live from the Project Gutenberg catalog** (`pg_catalog.csv`) — never
from hand-typed ebook numbers (`scripts/fetch-gutenberg-voices.mjs`). Every
document carries its identity axis in the frontmatter (`woman`, `poc`,
`global_south`, `first_person`) and its region.

- **African American (42)**: Charles Chesnutt (3), Paul Laurence Dunbar (2),
  Frances Ellen Watkins Harper (7 — incl. *Iola Leroy*, the first best-selling
  novel by an African American woman), James Weldon Johnson (2), William Wells
  Brown (3 — incl. *Clotel*, the first African-American novel), Solomon Northup,
  Booker T. Washington, W.E.B. Du Bois (5), Claude McKay (2), Langston Hughes,
  Jean Toomer, Countee Cullen, Alice Dunbar-Nelson (2), Pauline Hopkins (2),
  Jessie Fauset, Angelina Weld Grimké, Zora Neale Hurston, Ida B. Wells (4),
  the Crafts' escape narrative, Sojourner Truth, Mary Prince (the first slave
  narrative by a woman), Harriet Wilson (*Our Nig*, first novel by an
  African-American woman), Elizabeth Keckley.
- **Indigenous (6)**: Zitkala-Ša (2), Charles Eastman (4).
- **Global south (29)**: José Rizal (*Noli Me Tangere*, *El Filibusterismo*),
  Machado de Assis (4 — Brazil), Kahlil Gibran (3 — Lebanon), Sarojini Naidu
  and Toru Dutt (India), Rabindranath Tagore (3 — India), Rubén Darío
  (Nicaragua), José Martí (Cuba), Juana Inés de la Cruz (*Sor Juana* — Mexico),
  Juana Manuela Gorriti (Argentina/Peru), Olive Schreiner (South Africa),
  Katherine Mansfield (New Zealand), Mary Prince (West Indies).
- **Women of the North (through time)**: Austen, Shelley, the Brontës, Gaskell,
  George Eliot, Edgeworth, Alcott, Stowe, Chopin, Gilman, Wharton, Jewett,
  Freeman, Cather, Elizabeth Stuart Phelps.

Full detail in `manifests/gutenberg-voices-manifest.json`; the catalog used for
resolution is cached at `manifests/gutenberg-catalog.csv`.

### Individual first-person works (10)

| File | Voice | Year | Language | Source |
|---|---|---|---|---|
| `wollstonecraft-vindication.txt` | Mary Wollstonecraft — *A Vindication of the Rights of Woman* | 1792 | English | Project Gutenberg #16199 |
| `equiano-narrative.txt` | Olaudah Equiano — *The Interesting Narrative of the Life of Olaudah Equiano* | 1789 | English | Project Gutenberg #15399 |
| `douglass-narrative.txt` | Frederick Douglass — *Narrative of the Life of Frederick Douglass* | 1845 | English | Project Gutenberg #23 |
| `douglass-my-bondage.txt` | Frederick Douglass — *My Bondage and My Freedom* | 1855 | English | Project Gutenberg #10431 |
| `jacobs-incidents.txt` | Harriet Jacobs — *Incidents in the Life of a Slave Girl* (ed. Lydia Maria Child) | 1861 | English | Project Gutenberg #11030 |
| `zitkala-american-indian-stories.txt` | Zitkala-Ša — *American Indian Stories* | 1921 | English | Project Gutenberg #10376 |
| `eastman-indian-boyhood.txt` | Charles A. Eastman (Ohiyesa) — *Indian Boyhood* | 1902 | English | Project Gutenberg #337 |
| `hirschfeld-transvestites.txt` | Magnus Hirschfeld — *Die Transvestiten* | 1910 | German (original) | archive.org `hirschfeld-1910` |
| `woolf-room-of-ones-own.txt` | Virginia Woolf — *A Room of One's Own* | 1929 | English | archive.org `virginia-woolf-a-room-of-ones-own` |
| `hurston-how-it-feels-to-be-colored-me.txt` | Zora Neale Hurston — *How It Feels to Be Colored Me* | 1928 | English | Project Gutenberg #73549 |

### Written oral histories — WPA slave narratives (25 volumes)

`slave-narratives-wpa/` — the Federal Writers' Project interviews (1936-38):
over 2,300 people who had been enslaved, speaking, transcribed. The single
largest written-oral-history corpus in American letters, public domain.
Arkansas (6 parts), Florida, Georgia (2), Indiana, Iowa, Missouri, North
Carolina (2), Oklahoma, South Carolina (6), Texas (5). Fetched by
`scripts/fetch-wpa-slave-narratives.mjs`.

### Written oral histories — the empty tiers (6)

`written-oral-histories/` — transcribed voices for the register rows that
were discussed-but-empty:
- **Mayhew, *London Labour and the London Poor*** (3 vols, 1851-62) — the
  working poor of London, interviewed verbatim — *working class*
- **Riis, *How the Other Half Lives*** (1890) — the tenements of New York —
  *the poor / the unhoused*
- **Beers, *A Mind That Found Itself*** (1908) — first-person mental illness —
  *the mentally ill*
- **Mother Jones, *Autobiography*** (1925) — the mine wars in a woman worker's
  own voice — *working class / women workers*
Fetched by `scripts/fetch-written-oral-histories.mjs`.

## Not yet held (disclosed gaps)

- **Black Elk — *Black Elk Speaks* (1932)**: recounted first-person Oglala
  testimony, but the work is under copyright in the US until 2028; archive.org
  blocks its text. Named, not substituted.
- **Lili Elbe / modern trans autobiography**: earliest first-person trans
  memoirs are either translations whose canonical editions are mid-century
  (Elbe's *Man into Woman*, 1933) or too recent for public domain — the honest
  route is a CC-licensed modern testimony, which no fetch driver yet points at.
- **Nella Larsen — *Passing* (1929)**: the Harlem-Renaissance first-person
  novel on racial passing is public domain (95-year term expired 2024) but its
  archive copies were 401-blocked this pass; the driver's next run will pick
  it up the moment a text endpoint answers.
- **Zora Neale Hurston, *Langston Hughes* etc.**: the newest-PD Hurston essay
  is held; her 1937 *Their Eyes Were Watching God* waits until 2033.
- **Claude McKay — *Home to Harlem* (1928)**, **Hughes — *Not Without
  Laughter* (1930)**: at the PD boundary, not yet fetched — next pass.
- **Refugees, children, elderly, dalit, sex workers**: the remaining
  discussed-but-empty rows. The classic refugee/exile memoirs and dalit
  testimony are either under copyright (Elie Wiesel, Ambedkar's mid-century
  works) or not yet digitized as text; the driver's `perspectives-register.mjs`
  tracks them, and these stay named gaps until a public-domain written oral
  history is reachable.

The general law: **2026's public-domain boundary is 1930.** Everything first
published in or before 1930 by the 95-year US term is a legitimate hold (2025
admitted 1929; 2026 admits 1930); the fetch drivers point only at such works
and disclose the ones just beyond the boundary rather than forcing them.

## Rules

- Same as the rest of the corpus: `enforce-min-words.mjs` 600-word floor;
  provenance frontmatter on every file; nothing typed from memory, everything
  fetched.
- A fetched text is held in its original language. Where the author wrote in
  English, the English original is the hold (Wollstonecraft, Equiano,
  Douglass, Jacobs, Zitkala-Ša, Eastman); where the author wrote in German,
  the German original is the hold (Hirschfeld). No translation is substituted.
- The perspective audit reruns after each addition; a group's `by` count
  rising toward its `about` count is the goal. The falsifier: a text the audit
  claims absent that a fresh scan finds in the first person.
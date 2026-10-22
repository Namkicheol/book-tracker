# Recommendation data provenance and reuse audit

Reviewed 2026-10-20 against the repository's recommendation files, collection notes, official source pages, and the Aladin OpenAPI terms. This is a reuse-permission check, not a determination that any individual book title or bibliographic fact is protected.

## Decision

No repository recommendation dataset includes a license, written permission, permitted-use scope, or rights-holder record. The collection notes describe obtaining institutional lists and scraping or manually entering data, but do not record permission to republish those lists, excerpts, selection blurbs, or covers in this web app. Treat those fields as unverified and do not serve them until the permission and scope are documented.

The live recommendation page now builds searches from an age term, an interest topic, and optional user text, then displays the current Aladin OpenAPI search response. It does not load or cache the static recommendation datasets. Users can still open a result and explicitly add it to their own library through the existing book-preview flow.

Aladin's [OpenAPI terms](https://blog.aladin.co.kr/openapi/13851154) state that API approval grants only the limited use allowed by the terms. Section 6.3(3) allows Aladin to refuse an API key for a for-profit company or for-profit use absent prior approval. Section 7.3(3) prohibits copying, storing (including caching), processing, distributing, or providing API-fetched information beyond the permitted scope; section 7.3(5) prohibits resupplying the API service through an application. The current page does not persist its search response. Confirm the app's registered API scope before expanding this use; this audit does not claim the existing key authorizes every use.

## Local data inventory

Counts are the repository snapshot observed on the review date. “Books” counts records in the JSON, not unique books across files.

| File | Records | Risk found |
| --- | ---: | --- |
| `data/book-recommendations.json` | 5,549 | 22 source identifiers; 5,549 `why` fields; 5,546 Aladin cover URLs; award/list claims and age/grade classifications. No per-record provenance or license. |
| `data/all-sources-collected.json` | 345 | Institutional list memberships and `why` text. |
| `data/expanded-database.json` | 1,669 | List memberships, `why` text, and Aladin cover URLs. |
| `data/chaektase-full.json` | 13 | Book따세 list membership and explanatory text. |
| `data/chaektase-keyword-search.json` | 4 | Book따세 list membership and explanatory text. |
| `data/kindergarten-curated.json` | 26 | Six themed groups; titles, contributor data, tags, and `why` text associated with institutional recommendations. |
| `data/grade1-curated.json` | 34 | Six themed groups; titles, contributor data, and `why` text. |
| `data/elementary-bestsellers.json` | 40 | Aladin API response fields including descriptions, cover URLs, ranks, and ratings saved to a static file. |
| `data/triage-cheongsonyeon-deleted.json` | 854 | A derived copy of book records with a local exclusion reason. |
| `data/triage-cheongsonyeon-promoted.json` | 10 | A derived subset of book records and source labels. |
| `data/collected-books.json` | 0 | Empty collection placeholder. |

The main database's source-label counts are: `morning-reading` 1,884; `wendybook` 527; `childbook` 366; `arko-lit` 252; `textbook` 218; `bookstart` 164; `jeondokse` 110; `slj` 93; `nlcy` 86; `newbery-award` 53; `caldecott-award` 46; `chaektase` 45; `wjjunior-award` 38; `bir-award` 36; `daekyo-award` 30; `moonji-award` 27; `changbi-award` 14; `one-book` 8; `kclw` 7; `maehaesong-award` 4; `hankook-pub-award` 3; and `sagyejeol-award` 3. A book may have multiple labels. `wendybook` has no corresponding source definition in the database metadata.

The `why` fields and institution or award names embedded in some titles do not have item-level origin data. They may be copied descriptions, generated summaries, or editorial claims; the repository does not distinguish among these. Do not display them as verified source quotations or endorsements.

## Source and permission record

The URLs below are the official pages recorded in the database or collection notes. Public availability does not itself grant permission to reproduce a complete list, its blurbs, or cover images. No explicit commercial republication permission or open license for those materials was verified during this review. Items with a missing source URL or source definition are untraceable from this repository.

| Source label | Recorded official page | Permission status |
| --- | --- | --- |
| `chaektase` | [책따세 추천도서](https://www.readread.or.kr/recommended-books/) | No reuse grant recorded; verify with rights holder. |
| `morning-reading` | [행복한아침독서](https://www.morningreading.org/) | No reuse grant recorded; verify with rights holder. |
| `slj` | [학교도서관저널](https://www.slj.co.kr/) | No reuse grant recorded; verify with rights holder. |
| `childbook` | [어린이도서연구회](https://www.childbook.org/) | No reuse grant recorded; verify with rights holder. |
| `nlcy` | [국립어린이청소년도서관 사서추천도서](https://www.nlcy.go.kr/NLCY/contents/C10600000000.do?schBdcode=_nlcy_normal0804) | No reuse grant for this list recorded; verify applicable government/open-license terms. |
| `bookstart` | [북스타트코리아](https://bookstart.org/) | No reuse grant recorded; verify with rights holder. |
| `jeondokse` | [전국독서새물결모임](https://www.readingwave.or.kr/) | No reuse grant recorded; verify with rights holder. |
| `kclw` | [한국어린이문학협의회](https://www.kclw.or.kr/) | No reuse grant recorded; verify with rights holder. |
| `changbi-award` | [창비](https://www.changbi.com/) | No reuse grant recorded for award lists or marks. |
| `moonji-award`, `maehaesong-award` | [문학동네](https://www.munhak.com/) | No reuse grant recorded for award lists or marks. |
| `bir-award` | [비룡소](https://bir.co.kr/) | No reuse grant recorded for award lists or marks. |
| `arko-lit` | [한국출판문화산업진흥원](https://www.kpipa.or.kr/) | No reuse grant recorded for the referenced list. |
| `sagyejeol-award` | [사계절](https://www.sakyejul.net/) | No reuse grant recorded for award lists or marks. |
| `hankook-pub-award` | [한국일보](https://www.hankookilbo.com/) | No reuse grant recorded for award lists or marks. |
| `caldecott-award`, `newbery-award`, `daekyo-award` | Aladin award/search pages are recorded as the source in database metadata. | No rights record for the underlying selection lists or marks; the saved response is not a permission record. |
| `wjjunior-award` | [웅진주니어 수상작](https://www.wjjunior.co.kr/competition/winner/) | No reuse grant recorded for award lists or marks. |
| `one-book` | No URL in database metadata. | Untraceable; do not serve. |
| `textbook` | No URL in database metadata. | Untraceable; do not serve. |
| `wendybook` | No source definition or URL in database metadata. | Untraceable; do not serve. |

## Serving controls

Removing the JSON fetch from `recommendations.html` does not prevent direct requests to the static files. The current working tree's `vercel.json` now returns 404 for `/data/*`, and `sw.js` returns 404 for that path while clearing prior caches on activation. Production serving remains unverified until a deployment and public readback. The source files remain in the repository for audit and recoverability; do not run collection/merge scripts against them until source rights and API scope are recorded.

The Aladin API terms page was read in the existing Aside browser tab. Institutional pages were reviewed as provenance references; their public availability was not treated as a reuse license. The old `book-recommendations.json` and related assets remain unchanged in the working tree pending the deployment-level deny rule and any later source-specific permission review.

## 2026-10-20: original four-book starter shelf

The new `STARTER_SHELF` in `js/recommendations.js` is a small, independently chosen starting shelf, not a republished institutional recommendation or award list. Selection centers on conversations about speech, choices, expectations, and connections in nature. All selection notes, discussion prompts, and activities were newly authored for this app. They are suggestions for shared reading, not quotations, claimed personal reading reviews, endorsements, or guaranteed age classifications.

Exact title, writer, and edition ISBN were checked on these official publisher pages through a read-only Aside research session on 2026-10-20:

| Book | Writer | Edition ISBN | Primary bibliographic source | Basis for original activity |
| --- | --- | --- | --- | --- |
| 만복이네 떡집 | 김리리 | 9788949161341 | [비룡소](https://bir.co.kr/book/12083/?view=print) | Speech and behavior; inventing a kind-message rice-cake name. |
| 마당을 나온 암탉 | 황선미 | 9788971968710 | [사계절](https://www.sakyejul.net/bbs/m/publishing_data_view.php?ep=ep993587793575e55ff04653&gp=all&item=B0014&type=publishing) | Wishes and choices; drawing a place to take a first step toward. |
| 슈퍼 거북 | 유설화 | 9788993242980 | [책읽는곰](https://www.bearbooks.co.kr/book/book_info.php?idx=46&tbc_idx=2) | Others' expectations and one's own pace; comparing personal interests with expectations. |
| 강아지똥 | 권정생 | 9788955823981 | [길벗어린이](https://gilbutkid.co.kr/216993336?idx=659) | The connection between the protagonist and a dandelion; drawing what helps a flower grow. |

`강아지똥` is specifically the publisher's 2017-06-05, 28-page edition, not another edition's ISBN. No publisher blurb, review, institutional selection label, or publisher-hosted cover was copied into the starter-shelf data. The page requests each ISBN through the existing live API and shows a card only after the current normalized response matches the ISBN, title, and writer. Failed or mismatched responses are omitted with a retry control. Search/shelf response metadata is not automatically saved to localStorage; user-initiated library saves retain the existing app behavior. API cover and metadata use remain subject to the scope caveat above; this change does not assert legal clearance.

Age filtering now uses existing API `CategoryId` support rather than grade phrases in title keywords. The [official Aladin children's browse page](https://www.aladin.co.kr/shop/wbrowse.aspx?CID=1108) links 48825, 48837, and 48846 as fiction for grades 1–2, 3–4, and 5–6. The respective category pages were checked; 13789 is 유아 and 1137 is 청소년. Elementary selector labels explicitly say 동화 because these are fiction categories, not all subjects for that age. Titles containing 세트, 전집, 패키지, or a numeric 권 묶음 are excluded from search cards. These are discovery filters, not a claim of individual reading suitability.


## 2026-10-21: expanded, individually sourced discovery shelf

The catalog now lives in `js/curated-books.js`. It extends the original four choices with ten individually checked 2024 NLCY librarian selections, eight Caldecott/Newbery titles, and four titles introduced by official publisher Instagram accounts. This is a small original mixed selection, not a mirror of any complete institutional list. Each record retains its bibliographic source and individual attribution links. Notes and conversation activities are independently written; age and topic filters are editorial discovery guidance, not a publisher guarantee.

Award years refer to the original English work, not the Korean edition. Medal and Honor distinctions are preserved. Publisher labels mean publisher book introductions, not endorsements of Momsbooks. Social labels mean a particular public introduction was verified on 2026-10-21, not measured popularity, a ranking, or a parent recommendation. No Threads list is claimed without verified post evidence. Instagram evidence comes from 창비 그림책 and 웅진주니어 official accounts; captions and post images are not republished.

The UI provides independent source/age/topic filtering and six-book pagination, with at most four metadata requests in flight. Successful metadata remains only in page memory until a deliberate library save. Failed lookups can be retried, and ISBN/title/writer must match before display. Previous third-party bulk datasets remain excluded. These provenance checks do not resolve the API commercial-use scope identified above.

Validation on 2026-10-21: all 26 catalog ISBNs resolved through the actual app API with matching title and writer. `괴물들이 사는 나라` was excluded because the live response returned only its translator; `이상한 화요일` (9788949110844, 1992 Caldecott Medal) replaces it with verified edition and award sources. All 34 automated tests passed, including pagination, source/age/topic combinations, retry, and stale-response concurrency guards.


## 2026-10-21 correction: restore the full browsing scope

The user's intended scope is the existing thousands of books, not a replacement 26-book shelf. `scripts/build-discovery-catalog.py` now projects the preserved 5,549-record source into `js/book-catalog.js`: 5,547 records with 978/979 ISBN-13 identifiers; two non-book EAN items are excluded. The projection retains title, writer, publisher, existing age/genre browsing metadata, and language. It excludes old `why`, cover URLs, source-list membership, award labels, AR/Lexile assertions, and recommendation/award promotional title suffixes. Age/genre are legacy discovery hints, not reverified reading-level recommendations. The old source files remain blocked.

`js/catalog-browser.js` renders 24 text rows per page, supports local title/author/ISBN/publisher search and combined age/genre/publisher filters, and does not fetch thousands of API records. Opening a book requires a current API ISBN/title match. It passes no legacy recommendation metadata to BookPreview. This restores the browsing function; removing text or fields does not itself establish republication permission for a database or API license. Source rights and API scope remain separate launch checks.

User-requested review preview: https://book-tracker-ckp64d1ob-namkicheols-projects.vercel.app/recommendations.html (READY, publicly accessible; no main deployment). Verified 5,547 records, 232 pages, 24 rows, combined filters, live detail opening and 390px layout without overflow. Automated tests: 38 passed.

## 2026-10-21 follow-up: covers and original browsing controls

The user clarified that cover cards, grade/source filters, English AR bands, and Newbery/Caldecott browsing are essential. This supersedes the text-only projection described above: the runtime projection now retains existing thumbnail URLs, list membership, textbook grades, and AR values for browsing. It does not restore old copied blurbs or `why` fields. Source/AR classifications are labelled as legacy discovery references rather than independently guaranteed reading levels. Forty-eight English award mappings were checked against official ALA Medal/Honor records; the precise distinction and source are preserved. Eight misclassified general-fiction titles no longer receive elementary-grade labels.

The separate editorial shelf contains 38 entries after adding 12 Korean science, mathematics, history, society and art books. All 38 ISBN/title/writer combinations passed live app-API matching. The original 5,549-record input is preserved, with two non-book EANs excluded from browsing.

Further individually sourced expansion: `data/catalog-supplemental.json` adds 36 Korean nonfiction and 30 English award titles after live API ISBN/cover checks. Browse total is 5,625 (Korean 4,566, English 1,059), with 78 verified English award mappings. New English AR values remain null. Exact source URLs and evidence notes are retained in the supplemental source file; copied publisher descriptions are not served. A regression check preserves English main titles before subtitle colons when opening live book details.

## 2026-10-23 unlicensed list exclusion

The user explicitly requested expansion through individual official book pages while excluding copyrighted recommendation compilations. The public catalog now excludes all 22 legacy list memberships and their source labels, while preserving the underlying bibliographic records. The source selector uses only individually checked Newbery/Caldecott award facts (78 books). Grade, language, publisher, AR and textbook-grade navigation remain. Old AR values remain legacy discovery metadata; new additions have no inferred AR.

The separate 38-book reading shelf no longer groups ten books under the unlicensed institutional recommendation list. These books retain neutral individual bibliographic links and original reading prompts; they have not been relabelled as independent Momsbooks selections. Four existing Momsbooks selections remain four. Research notes are retained in `data/curated-evidence.json`, outside public runtime delivery, rather than exposing old list metadata in JavaScript.

New Korean/English additions are documented in `data/publisher-additions.json` with individual publisher URLs, verification notes and dates. Titles and covers are reconciled with exact ISBN API responses; copied publisher descriptions, bulk recommendation selections and invented AR scores are excluded. This records the selection/data-handling decision, not a blanket legal clearance for all site assets or API usage.

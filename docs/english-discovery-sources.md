# English discovery evidence: picturebooks through novels

Checked 2026-10-24. This file contains individually sourced discovery metadata for 84 English ISBN editions. It adds stages, topic filters, ordered series information, and independently checked Accelerated Reader scores. It does not reproduce a recommendation compilation or publisher blurbs.

## Coverage

| Stage | Records |
|---|---:|
| picture | 18 |
| phonics | 12 |
| reader | 19 |
| chapter | 28 |
| novel | 7 |

| Topic tag | Records |
|---|---:|
| animals | 35 |
| friendship | 19 |
| adventure | 40 |
| humor | 32 |
| dinosaurs | 3 |
| science | 19 |

**Total:** 84 unique ISBNs; **verified AR:** 23 exact-edition records. Five award overlays use an empty `topics` array because none of the six current interest filters accurately describes the book. No age or grade values are added.

## Evidence and data handling

Each record links to an official publisher, ALA, or AR Bookfinder page appropriate to its claims. The 12 Usborne Phonics Readers point to the official [book-band PDF](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf), which lists ISBNs, titles and reader bands. Their title, creator, publisher and cover metadata were separately matched against the app API by the parent agent on 2026-10-24.

Publisher records from HarperCollins I Can Read, Simon & Schuster, Penguin Random House, Chronicle Books, Candlewick Press, Abrams Books and Who HQ use individual title pages. Metadata for the added editions was checked against app API responses; API-supplied covers remain subject to the existing API-scope caveat in [recommendation-source-audit.md](recommendation-source-audit.md). ALA pages support the award facts and short editorial classification evidence; the source index below links each book directly.

Stages and the six interest filters are editorial navigation labels. Publisher age fields and legacy catalog AR scores were not copied into this layer. Missing `ar` means not verified here, not that the book has no AR quiz. No selection-list memberships, complete curated lists, or publisher blurbs are copied.

## Ordered chapter-book series

Publisher pages for these numbered installments identify the series and print ISBN. PRH describes Magic Tree House as a chapter-book series for readers beginning chapter books; its Cam Jansen page describes a transition to chapter books. Ordinals below are included only where individual publisher evidence identifies the order.

| Series | Order | ISBN | Publisher evidence |
|---|---:|---|---|
| Magic Tree House | 1 | 9780679824114 | [PRH book page](https://www.penguinrandomhouse.com/books/125113/dinosaurs-before-dark-by-mary-pope-osborne-illustrated-by-sal-murdocca/) |
| Magic Tree House | 2 | 9780679824121 | [PRH book page](https://www.penguinrandomhouse.com/books/125127/the-knight-at-dawn-by-mary-pope-osborne-illustrated-by-sal-murdocca/) |
| Magic Tree House | 3 | 9780679824244 | [PRH book page](https://www.penguinrandomhouse.com/books/125139/mummies-in-the-morning-by-mary-pope-osborne-ilustrated-by-sal-murdocca/) |
| Magic Tree House | 4 | 9780679824251 | [PRH book page](https://www.penguinrandomhouse.com/books/125147/pirates-past-noon-by-mary-pope-osborne-illustrated-by-sal-murdocca/) |
| Magic Tree House | 5 | 9780679863717 | [PRH book page](https://www.penguinrandomhouse.com/books/125148/night-of-the-ninjas-by-mary-pope-osborne-illustrated-by-sal-murdocca/) |
| Magic Tree House | 6 | 9780679863724 | [PRH book page](https://www.penguinrandomhouse.com/books/125149/afternoon-on-the-amazon-by-mary-pope-osborne-illustrated-by-sal-murdocca/) |
| Magic Tree House | 14 | 9780679890515 | [PRH book page](https://www.penguinrandomhouse.com/books/125107/day-of-the-dragon-king-by-mary-pope-osborne-illustrated-by-sal-murdocca/) |
| Magic Tree House | 17 | 9780679890638 | [PRH book page](https://www.penguinrandomhouse.com/books/125110/tonight-on-the-titanic-by-mary-pope-osborne-illustrated-by-sal-murdocca/) |
| Cam Jansen | 1 | 9780142400104 | [PRH book page](https://www.penguinrandomhouse.com/books/292899/cam-jansen-the-mystery-of-the-stolen-diamonds-1-by-david-a-adler-illustrated-by-susanna-natti/) |
| Cam Jansen | 2 | 9780142400111 | [PRH book page](https://www.penguinrandomhouse.com/books/292907/cam-jansen-the-mystery-of-the-ufo-2-by-david-a-adler-illustrated-by-susanna-natti/) |
| Cam Jansen | 3 | 9780142400128 | [PRH book page](https://www.penguinrandomhouse.com/books/292908/cam-jansen-the-mystery-of-the-dinosaur-bones-3-by-david-a-adler-illustrated-by-susanna-natti/) |
| Cam Jansen | 4 | 9780142400135 | [PRH book page](https://www.penguinrandomhouse.com/books/292910/cam-jansen-the-mystery-of-the-television-dog-4-by-david-a-adler-illustrated-by-susanna-natti/) |

The other series labels below have no inferred installment numbers. Elephant & Piggie and Biscuit pages verify series membership; Usborne titles are listed together in the official Phonics Readers resource.

## ALA award books: editorial stage/topic overlays

The 15 unique ISBNs below are the stage/topic overlays corresponding to `data/english-award-expansion.json` (Henry, Like Always has two award records but one discovery overlay). The separate [award source report](english-award-expansion-sources.md) records award/year/distinction and ISBN/API checks. No age is inferred.

| Title | ISBN | Stage | Topics | ALA evidence |
|---|---|---|---|---|
| Fox Has a Problem | 9780063277915 | reader | animals, humor | [ALA](https://www.ala.org/news/2024/01/corey-r-tabor-wins-2024-geisel-award-fox-has-problem) (가이젤상 2024 Winner) |
| Henry, Like Always | 9781797213897 | reader | friendship | [ALA](https://www.ala.org/winner/henry-always) (가이젤상 2024 Honor; 슈나이더 패밀리상 2024 Winner) |
| Worm and Caterpillar Are Friends | 9781665920018 | reader | animals, friendship, humor, science | [ALA](https://www.ala.org/news/2024/01/corey-r-tabor-wins-2024-geisel-award-fox-has-problem) (가이젤상 2024 Honor) |
| Fox at Night | 9780062977076 | reader | animals, adventure, friendship | [ALA](https://www.ala.org/winner/fox-night) (가이젤상 2022 Winner) |
| The Mona Lisa Vanishes | 9780593643846 | chapter | adventure, humor | [ALA](https://www.ala.org/news/2011/11/nicholas-day-brett-helquist-win-2024-sibert-medal) (사이버트상 2024 Winner) |
| Holding Her Own | 9781338305906 | picture | — | [ALA](https://www.ala.org/news/2011/11/nicholas-day-brett-helquist-win-2024-sibert-medal) (사이버트상 2024 Honor) |
| Jumper: A Day in the Life of a Backyard Jumping Spider | 9781250810366 | picture | animals, science | [ALA](https://www.ala.org/news/2011/11/nicholas-day-brett-helquist-win-2024-sibert-medal) (사이버트상 2024 Honor) |
| The Book of Turtles | 9780358458074 | picture | animals, science | [ALA](https://www.ala.org/news/2011/11/nicholas-day-brett-helquist-win-2024-sibert-medal) (사이버트상 2024 Honor) |
| Nigeria Jones | 9780062888846 | novel | — | [ALA](https://www.ala.org/news/2011/11/ibi-zoboi-dare-coulter-win-2024-coretta-scott-king-book-awards) (코레타 스콧 킹상 2024 Winner) |
| Freewater | 9780316056618 | novel | adventure | [ALA](https://www.ala.org/winner/freewater-0) (코레타 스콧 킹상 2023 Winner) |
| Unspeakable: The Tulsa Race Massacre | 9781541581203 | picture | — | [ALA](https://www.ala.org/winner/unspeakable-tulsa-race-massacre) (코레타 스콧 킹상 2022 Winner) |
| Before the Ever After | 9780399545436 | novel | friendship | [ALA](https://www.ala.org/rt/sites/ala.org.rt/files/content/cskbookawards/docs/CSK%202021%20Discussion%20Guide%20%28002%29.pdf) (코레타 스콧 킹상 2021 Winner) |
| My City Speaks | 9781525304149 | picture | adventure | [ALA](https://www.ala.org/winner/my-city-speaks) (슈나이더 패밀리상 2022 Winner) |
| I Talk Like a River | 9780823445592 | picture | — | [ALA](https://www.ala.org/winner/i-talk-river) (슈나이더 패밀리상 2021 Winner) |
| A Kind of Spark | 9780593374252 | novel | — | [ALA](https://www.ala.org/winner/kind-spark) (슈나이더 패밀리상 2022 Honor) |

## Individually verified Accelerated Reader values

Each score below is from the linked official AR Bookfinder detail page. The matching ISBN-13 was checked on that page; only these editions are tagged verified. Other catalog scores remain unverified legacy values.

| Title | ISBN | ATOS | Score band | Exact-edition AR Bookfinder page |
|---|---|---:|---|---|
| Magic Tree House #1 : Dinosaurs Before Dark | 9780679824114 | 2.6 | 2–3 | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=6311) |
| Magic Tree House #02: The Knight at Dawn | 9780679824121 | 2.9 | 2–3 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=6327) |
| Magic Tree House #03: Mummies in the Morning | 9780679824244 | 2.7 | 2–3 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=10644) |
| Magic Tree House #04: Pirates Past Noon | 9780679824251 | 2.8 | 2–3 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=9291) |
| Magic Tree House #05: Night of the Ninjas | 9780679863717 | 2.7 | 2–3 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=10680) |
| Magic Tree House #06: Afternoon on the Amazon | 9780679863724 | 2.6 | 2–3 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=14651) |
| Magic Tree House #14: Day of the Dragon King | 9780679890515 | 3.3 | 3–4 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=20015) |
| Magic Tree House #17: Tonight on the Titanic | 9780679890638 | 3.1 | 3–4 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=31065) |
| Cam Jansen #01: The Mystery of the Stolen Diamonds | 9780142400104 | 3.2 | 3–4 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=308) |
| Cam Jansen #04: The Mystery of the Television Dog | 9780142400135 | 3.4 | 3–4 | [detail](https://www.arbookfind.com/bookdetail.aspx?q=18708&l=EN&slid=788787093) |
| Biscuit Finds a Friend | 9780064442435 | 0.8 | 0–1 | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=43663) |
| Biscuit | 9780064442121 | 1.4 | 1–2 | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=31587) |
| Frog and Toad Are Friends | 9780064440202 | 2.9 | 2–3 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=6116) |
| Where the Wild Things Are | 9780064431781 | 3.4 | 3–4 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=5499) |
| Fantastic Mr. Fox | 9780142410349 | 4.1 | 4+ | [detail](https://www.arbookfind.com/bookdetail.aspx?q=5011&l=EN&slid=788786892) |
| Charlotte's Web | 9780064410939 | 4.4 | 4+ | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=19) |
| Charlie and the Chocolate Factory | 9780142410318 | 4.8 | 4+ | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=20) |
| My First I Can Read: Biscuit Goes to School (Biscuit) | 9780064436168 | 0.9 | 0–1 | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=61032) |
| My First I Can Read: Biscuit and the Baby (Biscuit) | 9780060094614 | 0.9 | 0–1 | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=84976) |
| My First I Can Read: Biscuit Wants to Play (Biscuit) | 9780064443159 | 0.9 | 0–1 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=45490) |
| Elephant & Piggie: Are You Ready to Play Outside? | 9781423113478 | 0.6 | 0–1 | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=154562) |
| Elephant & Piggie: Elephants Cannot Dance! | 9781423114109 | 0.9 | 0–1 | [detail](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=154563) |
| Green Eggs and Ham (Hardcover) | 9780394800165 | 1.5 | 1–2 | [detail](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=9021) |

| ATOS band | Verified titles |
|---|---:|
| 0–1 | 6 |
| 1–2 | 2 |
| 2–3 | 7 |
| 3–4 | 5 |
| 4+ | 3 |

## Per-record source index

Topics are shown only where a current interest filter fits. A blank topic cell is intentional; stage/source rows still support the title’s progression placement. Series/order is blank when the source does not establish series membership or an ordinal.

### Picture

| Title | ISBN | Topics | Series/order | Official source | Verified ATOS |
|---|---|---|---|---|---:|
| Over and Under the Pond | 9781452145426 | animals, science, adventure |  | [source](https://www.chroniclebooks.com/products/over-and-under-the-pond) |  |
| Have You Ever Seen a Flower? | 9781452182704 | science |  | [source](https://www.chroniclebooks.com/products/have-you-ever-seen-a-flower) |  |
| Tiny T. Rex and the Impossible Hug | 9781452170336 | dinosaurs, friendship, humor |  | [source](https://www.chroniclebooks.com/products/tiny-t-rex-and-the-impossible-hug) |  |
| They All Saw a Cat | 9781452150130 | animals, science |  | [source](https://www.chroniclebooks.com/products/they-all-saw-a-cat) |  |
| Jabari Jumps | 9780763678388 | adventure, friendship |  | [source](https://www.candlewick.com/9780763678388/jabari-jumps/) |  |
| Jabari Tries | 9781536207163 | adventure, friendship |  | [source](https://www.candlewick.com/9781536207163/jabari-tries/) |  |
| Julian Is a Mermaid | 9780763690458 | friendship, adventure |  | [source](https://www.candlewick.com/9780763690458/julian-is-a-mermaid/) |  |
| Sam & Dave Dig a Hole | 9780763662295 | adventure, humor |  | [source](https://www.candlewick.com/9780763662295/sam-and-dave-dig-a-hole/) |  |
| Our Little Kitchen: A Picture Book | 9781419746550 | friendship, humor |  | [source](https://www.abramsbooks.com/product/our-little-kitchen_9781419746550/) |  |
| This Way, Charlie: A Picture Book | 9781419742064 | animals, friendship |  | [source](https://www.abramsbooks.com/product/this-way-charlie_9781419742064/) |  |
| The Neighbors | 9781419731686 | friendship, humor |  | [source](https://www.abramsbooks.com/product/neighbors_9781419731686/) |  |
| Where the Wild Things Are | 9780064431781 | adventure, animals |  | [source](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=5499) | 3.4 |
| Holding Her Own | 9781338305906 | — |  | [source](https://www.ala.org/news/2011/11/nicholas-day-brett-helquist-win-2024-sibert-medal) |  |
| Jumper: A Day in the Life of a Backyard Jumping Spider | 9781250810366 | animals, science |  | [source](https://www.ala.org/news/2011/11/nicholas-day-brett-helquist-win-2024-sibert-medal) |  |
| The Book of Turtles | 9780358458074 | animals, science |  | [source](https://www.ala.org/news/2011/11/nicholas-day-brett-helquist-win-2024-sibert-medal) |  |
| Unspeakable: The Tulsa Race Massacre | 9781541581203 | — |  | [source](https://www.ala.org/winner/unspeakable-tulsa-race-massacre) |  |
| My City Speaks | 9781525304149 | adventure |  | [source](https://www.ala.org/winner/my-city-speaks) |  |
| I Talk Like a River | 9780823445592 | — |  | [source](https://www.ala.org/winner/i-talk-river) |  |

### Phonics

| Title | ISBN | Topics | Series/order | Official source | Verified ATOS |
|---|---|---|---|---|---:|
| Fat cat on a mat (Paperback) | 9781474970105 | animals, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Shark in the Park (Paperback, New ed) | 9781474970112 | animals, adventure, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Fox on a Box (Paperback) | 9781474970150 | animals, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Ted in a Red Bed (Paperback) | 9781474970129 | humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Big Pig on a Dig (Paperback) | 9781474970099 | animals, adventure, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Goose on the Loose (Paperback) | 9781474970181 | animals, adventure, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Mouse Moves House (Paperback) | 9781474970143 | animals, adventure, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Llamas in Pyjamas (Paperback) | 9781409577904 | animals, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Raccoon on the Moon (Paperback) | 9781409580409 | animals, adventure, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Underpants for Ants (Paperback) | 9781409557449 | animals, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Ape's Great Escape (Paperback) | 9781474922111 | animals, adventure, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |
| Unicorns in Uniforms (Paperback) | 9781474959506 | adventure, humor | Usborne Phonics Readers | [source](https://usborne.com/media/usborne_pdfs/book-bands/Phonics_Readers_bookbands_Oct2021.pdf) |  |

### Reader

| Title | ISBN | Topics | Series/order | Official source | Verified ATOS |
|---|---|---|---|---|---:|
| Amelia Bedelia Tries Her Luck | 9780062221278 | friendship, adventure, humor | Amelia Bedelia I Can Read | [source](https://www.icanread.com/books/9780062221278/amelia-bedelia-tries-her-luck/) |  |
| I Want to Be an Artist: A My Community I Can Read | 9780063276505 | humor | My Community I Can Read | [source](https://www.icanread.com/books/9780063276505/i-want-to-be-an-artist/) |  |
| DC: I Am a Super Hero | 9780063496507 | adventure, humor | DC I Can Read | [source](https://www.icanread.com/books/9780063496507/dc-i-am-a-super-hero/) |  |
| Ranger Rick: I Wish I Was a Kangaroo | 9780062432377 | animals, science | Ranger Rick I Can Read | [source](https://www.icanread.com/books/9780062432377/ranger-rick-i-wish-i-was-a-kangaroo/) |  |
| My First Gymnastics Class: Ready-To-Read Pre-Level 1 | 9781481461870 | adventure | My First Ready-to-Read | [source](https://www.simonandschuster.com/books/My-First-Gymnastics-Class/Alyssa-Satin-Capucilli/My-First/9781481461870) |  |
| Big Shark, Little Shark, Baby Shark | 9780593128091 | animals, friendship, humor | Big Shark, Little Shark | [source](https://www.penguinrandomhouse.com/books/622618/big-shark-little-shark-baby-shark-by-anna-membrino-illustrated-by-tim-budgen/) |  |
| Biscuit Finds a Friend | 9780064442435 | animals, friendship | Biscuit | [source](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=43663) | 0.8 |
| Biscuit | 9780064442121 | animals, friendship | Biscuit | [source](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=31587) | 1.4 |
| Frog and Toad Are Friends | 9780064440202 | animals, friendship, humor | Frog and Toad | [source](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=6116) | 2.9 |
| Fox Has a Problem | 9780063277915 | animals, humor |  | [source](https://www.ala.org/news/2024/01/corey-r-tabor-wins-2024-geisel-award-fox-has-problem) |  |
| Henry, Like Always | 9781797213897 | friendship |  | [source](https://www.ala.org/winner/henry-always) |  |
| Worm and Caterpillar Are Friends | 9781665920018 | animals, friendship, humor, science |  | [source](https://www.ala.org/news/2024/01/corey-r-tabor-wins-2024-geisel-award-fox-has-problem) |  |
| Fox at Night | 9780062977076 | animals, adventure, friendship |  | [source](https://www.ala.org/winner/fox-night) |  |
| My First I Can Read: Biscuit Goes to School (Biscuit) | 9780064436168 | animals | Biscuit | [source](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=61032) | 0.9 |
| My First I Can Read: Biscuit and the Baby (Biscuit) | 9780060094614 | animals | Biscuit | [source](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=84976) | 0.9 |
| My First I Can Read: Biscuit Wants to Play (Biscuit) | 9780064443159 | animals | Biscuit | [source](https://www.arbookfind.com/bookdetailprint.aspx?l=EN&q=45490) | 0.9 |
| Elephant & Piggie: Are You Ready to Play Outside? | 9781423113478 | animals, friendship, humor | Elephant & Piggie | [source](https://www.penguinrandomhouse.com/books/728672/are-you-ready-to-play-outside-an-elephant-and-piggie-book-by-mo-willems/) | 0.6 |
| Elephant & Piggie: Elephants Cannot Dance! | 9781423114109 | animals, friendship, humor | Elephant & Piggie | [source](https://www.penguinrandomhouse.com/books/728704/elephants-cannot-dance-an-elephant-and-piggie-book-by-mo-willems/) | 0.9 |
| Green Eggs and Ham (Hardcover) | 9780394800165 | humor | Beginner Books | [source](https://www.penguinrandomhouse.com/books/43017/green-eggs-and-ham-by-dr-seuss/9780394800165/) | 1.5 |

### Chapter

| Title | ISBN | Topics | Series/order | Official source | Verified ATOS |
|---|---|---|---|---|---:|
| Who Was Thomas Jefferson? | 9780448431451 | adventure | Who Was? | [source](https://www.penguinrandomhouse.com/books/287309/who-was-thomas-jefferson-by-dennis-brindell-fradin-illustrated-by-john-obrien/) |  |
| Who Was Roald Dahl? | 9780448461465 | humor | Who Was? | [source](https://www.penguinrandomhouse.com/books/311414/who-was-roald-dahl-by-true-kelley-illustrated-by-stephen-marchesi/) |  |
| What Was the Gold Rush? | 9780448462899 | adventure | What Was? | [source](https://www.penguinrandomhouse.com/books/312178/what-was-the-gold-rush-by-joan-holub-illustrated-by-tim-tomkinson/) |  |
| Who Was Marco Polo? | 9780448445403 | adventure | Who Was? | [source](https://www.penguinrandomhouse.com/books/300470/who-was-marco-polo-by-joan-holub-illustrated-by-john-obrien/) |  |
| Who Was Ernest Shackleton? | 9780448479316 | adventure, science | Who Was? | [source](https://www.penguinrandomhouse.com/books/314494/who-was-ernest-shackleton-by-james-buckley-jr-illustrated-by-max-hergenrother/) |  |
| Who Is Tom Brady? | 9780593387412 | adventure | Who HQ Now | [source](https://www.penguinrandomhouse.com/books/692502/who-is-tom-brady-by-james-buckley-jr-illustrated-by-gregory-copeland/) |  |
| What Was the Ice Age? | 9780399543890 | animals, science | What Was? | [source](https://www.penguinrandomhouse.com/books/538670/what-was-the-ice-age-by-nico-medina-illustrated-by-david-groff/) |  |
| Who Was Katherine Johnson? | 9780593752166 | science | Who Was? | [source](https://www.penguinrandomhouse.com/books/741835/who-was-katherine-johnson-by-shelia-p-moses-illustrated-by-dede-putra/) |  |
| Who Was Cleopatra? | 9780593750292 | science | Who Was? | [source](https://www.penguinrandomhouse.com/books/735299/who-was-cleopatra-by-kathryn-waterfield/) |  |
| What Was the Industrial Revolution? | 9780593754252 | science | What Was? | [source](https://www.penguinrandomhouse.com/books/746818/what-was-the-industrial-revolution-by-jim-gigliotti-illustrated-by-david-malan/) |  |
| What Is AI? | 9798217050963 | science |  | [source](https://www.penguinrandomhouse.com/books/783083/what-is-ai-by-wes-locher-illustrated-by-dede-putra/) |  |
| Who Was Jane Goodall? | 9780448461922 | animals, science | Who Was? | [source](https://www.penguinrandomhouse.com/books/311575/who-was-jane-goodall-by-roberta-edwards-illustrated-by-john-obrien/) |  |
| Who Was Alexander the Great? | 9780448484235 | adventure | Who Was? | [source](https://www.penguinrandomhouse.com/books/316992/who-was-alexander-the-great-by-robin-waterfield-and-kathryn-waterfield-illustrated-by-andrew-thomson/) |  |
| Who Was Wolfgang Amadeus Mozart? | 9780448431048 | science | Who Was? | [source](https://www.penguinrandomhouse.com/books/287280/who-was-wolfgang-amadeus-mozart-by-yona-zeldis-mcdonough-illustrated-by-carrie-robbins/9780448431048) |  |
| Who Was Confucius? | 9781524788735 | science | Who Was? | [source](https://www.penguinrandomhouse.com/books/574480/who-was-confucius-by-michael-burgan-illustrated-by-robert-squier/) |  |
| Magic Tree House #1 : Dinosaurs Before Dark | 9780679824114 | dinosaurs, adventure | Magic Tree House #1 | [source](https://www.penguinrandomhouse.com/books/125113/dinosaurs-before-dark-by-mary-pope-osborne-illustrated-by-sal-murdocca/) | 2.6 |
| Magic Tree House #02: The Knight at Dawn | 9780679824121 | adventure | Magic Tree House #2 | [source](https://www.penguinrandomhouse.com/books/125127/the-knight-at-dawn-by-mary-pope-osborne-illustrated-by-sal-murdocca/) | 2.9 |
| Magic Tree House #03: Mummies in the Morning | 9780679824244 | adventure | Magic Tree House #3 | [source](https://www.penguinrandomhouse.com/books/125139/mummies-in-the-morning-by-mary-pope-osborne-ilustrated-by-sal-murdocca/) | 2.7 |
| Magic Tree House #04: Pirates Past Noon | 9780679824251 | adventure | Magic Tree House #4 | [source](https://www.penguinrandomhouse.com/books/125147/pirates-past-noon-by-mary-pope-osborne-illustrated-by-sal-murdocca/) | 2.8 |
| Magic Tree House #05: Night of the Ninjas | 9780679863717 | adventure | Magic Tree House #5 | [source](https://www.penguinrandomhouse.com/books/125148/night-of-the-ninjas-by-mary-pope-osborne-illustrated-by-sal-murdocca/) | 2.7 |
| Magic Tree House #06: Afternoon on the Amazon | 9780679863724 | animals, adventure, science | Magic Tree House #6 | [source](https://www.penguinrandomhouse.com/books/125149/afternoon-on-the-amazon-by-mary-pope-osborne-illustrated-by-sal-murdocca/) | 2.6 |
| Magic Tree House #14: Day of the Dragon King | 9780679890515 | adventure | Magic Tree House #14 | [source](https://www.penguinrandomhouse.com/books/125107/day-of-the-dragon-king-by-mary-pope-osborne-illustrated-by-sal-murdocca/) | 3.3 |
| Magic Tree House #17: Tonight on the Titanic | 9780679890638 | adventure | Magic Tree House #17 | [source](https://www.penguinrandomhouse.com/books/125110/tonight-on-the-titanic-by-mary-pope-osborne-illustrated-by-sal-murdocca/) | 3.1 |
| Cam Jansen #01: The Mystery of the Stolen Diamonds | 9780142400104 | adventure, humor | Cam Jansen #1 | [source](https://www.penguinrandomhouse.com/books/292899/cam-jansen-the-mystery-of-the-stolen-diamonds-1-by-david-a-adler-illustrated-by-susanna-natti/) | 3.2 |
| Cam Jansen #02: The Mystery of the UFO | 9780142400111 | adventure, science | Cam Jansen #2 | [source](https://www.penguinrandomhouse.com/books/292907/cam-jansen-the-mystery-of-the-ufo-2-by-david-a-adler-illustrated-by-susanna-natti/) |  |
| Cam Jansen #03: The Mystery of the Dinosaur Bones | 9780142400128 | dinosaurs, adventure, science | Cam Jansen #3 | [source](https://www.penguinrandomhouse.com/books/292908/cam-jansen-the-mystery-of-the-dinosaur-bones-3-by-david-a-adler-illustrated-by-susanna-natti/) |  |
| Cam Jansen #04: The Mystery of the Television Dog | 9780142400135 | animals, adventure, humor | Cam Jansen #4 | [source](https://www.penguinrandomhouse.com/books/292910/cam-jansen-the-mystery-of-the-television-dog-4-by-david-a-adler-illustrated-by-susanna-natti/) | 3.4 |
| The Mona Lisa Vanishes | 9780593643846 | adventure, humor |  | [source](https://www.ala.org/news/2011/11/nicholas-day-brett-helquist-win-2024-sibert-medal) |  |

### Novel

| Title | ISBN | Topics | Series/order | Official source | Verified ATOS |
|---|---|---|---|---|---:|
| Fantastic Mr. Fox | 9780142410349 | animals, adventure, humor |  | [source](https://www.arbookfind.com/bookdetail.aspx?q=5011&l=EN&slid=788786892) | 4.1 |
| Charlotte's Web | 9780064410939 | animals, friendship |  | [source](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=19) | 4.4 |
| Charlie and the Chocolate Factory | 9780142410318 | adventure, humor |  | [source](https://www.arbookfind.com/bookdetail.aspx?client=WKAR&l=EN&q=20) | 4.8 |
| Nigeria Jones | 9780062888846 | — |  | [source](https://www.ala.org/news/2011/11/ibi-zoboi-dare-coulter-win-2024-coretta-scott-king-book-awards) |  |
| Freewater | 9780316056618 | adventure |  | [source](https://www.ala.org/winner/freewater-0) |  |
| Before the Ever After | 9780399545436 | friendship |  | [source](https://www.ala.org/rt/sites/ala.org.rt/files/content/cskbookawards/docs/CSK%202021%20Discussion%20Guide%20%28002%29.pdf) |  |
| A Kind of Spark | 9780593374252 | — |  | [source](https://www.ala.org/winner/kind-spark) |  |

## Scope notes

Reading stages and topic tags are navigation aids, not guaranteed reading suitability. There are no age classifications. Every verified ATOS score is backed by an official exact-edition Bookfinder page; all other scores are left outside this evidence set. The award overlay is additive and its award distinctions stay in the separate award data file.

No general rights clearance is claimed for app API data or covers; consult the source audit for the existing API terms limitation.


## 2026-10-25 verified early-reader expansion

Added25 individually verified print ISBNs (24 readers,1 chapter-level Step5). Total109 discovery records. Dinosaur filters grew3→12 and science19→30; no AR scores were inferred. ExactISBN Aladin lookup matched every added edition. See [launch expansion source table](launch-catalog-expansion-2026-10-25.md). The earlier84-record tables remain a dated snapshot.


## 2026-10-25 입문 영역 추가 검증

기존 영어 22권(그림책 13·리더스 9)의 개별 판본을 확인해 단계 분류를 보강하고 파닉스 17권을 추가했다. [ISBN별 공식 출처와 검증 범위](english-entry-stage-expansion-2026-10-25.md). AR 및 수상 정보는 변경하지 않았다.

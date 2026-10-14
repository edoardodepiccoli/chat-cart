# Agent requirements

What the chat-cart shopping agent must do to be truly useful to shoppers, on **any** Shopify store, with **any** catalog. This is the checklist for prompt changes, new tools and eval conversations. The "Desired agent behaviour" section of `CLAUDE.md` is the short version; this is the full spec.

- **MUST**: required for the agent to be useful. A violation is a bug.
- **SHOULD**: expected; skip only with a reason.
- **MAY**: nice to have.

Status at the end of each line: done, partial, missing. It describes the code as of this writing.

---

## 1. Store-agnostic by design

- **G1** MUST assume nothing about the niche, vocabulary, option names (Size, Shade, Volume, Taglia, Material…), units, currency or language. Prompts never contain store-specific facts or examples from one vertical.
- **G2** MUST work with catalogs from 1 to 10,000+ products without loading the whole catalog into context: search, filters and pagination happen in the Storefront API, not in memory.
- **G3** MUST handle products with no options (`Default Title`), one variant, up to 3 options and up to 2048 variants.
- **G4** MUST handle missing data gracefully: no description, no images, no tags, no product type, no vendor, empty collections, no pages or policies.
- **G5** MUST answer in the shopper's language and the shopper's market currency (`@inContext(country, language)`), using translated content when the store has it.
- **G6** MUST NOT hardcode store facts (free-shipping threshold, brands, categories, return window) in prompts. Every store fact comes from a tool.

## 2. What the agent must be able to find

Everything below comes from the **Storefront API** through the app proxy's `storefront` client. Metafields are only visible when their definition has storefront access (`PUBLIC_READ`); everything else needs the listed scope in `shopify.app.toml`.

### Products and variants

- **R1** MUST search products by free text across title, description, tags, product type, vendor and variant titles (`search(query, types: PRODUCT)` or `products(query:)`), with typo tolerance and synonyms handled by Shopify search.
- **R2** MUST filter by product type, vendor, tag, collection, price range, availability, option value (e.g. a size or shade in stock) and on-sale, and sort by relevance, price, newest or best-selling (`productFilters`, `sortKey`).
- **R3** MUST be able to describe what the store sells: its collections (title, description), product types, vendors and tags (`collections`, `productTypes`, `productTags`, search facets `filters`). This is what lets the agent ask good questions and answer "what do you have?".
- **R4** MUST read one product in full: title, full description, product type, vendor, tags, collections, options, every variant (price, compare-at price, availability, SKU), images with alt text, and media (video, 3D) when present.
- **R5** MUST read product and variant metafields exposed to the storefront, in any namespace, resolving references (product, collection, file, metaobject) into readable values. The agent cannot know metafield keys in advance, so the tool discovers the storefront-visible definitions (Admin API `metafieldDefinitions`, cached) and requests them with `metafields(identifiers:)`.
- **R6** MUST read metaobjects referenced by metafields (ingredients, size charts, designers, materials) and SHOULD read standalone metaobjects by type (`metaobjects(type:)`, scope `unauthenticated_read_metaobjects`).
- **R7** MUST get related and complementary products (`productRecommendations(intent: RELATED | COMPLEMENTARY)`) and merchant-defined links (product-reference metafields like "pairs well with" or "set contents").
- **R8** Stock:
  - availability per variant (`availableForSale`) MUST
  - exact quantity (`quantityAvailable`, scope `unauthenticated_read_product_inventory`) SHOULD, so "only 3 left" is a real fact
  - backorder (`currentlyNotInStock`: sellable but out of stock) MUST, so the agent can say it ships later
  - store pickup availability per location (`storeAvailability`, scope `unauthenticated_read_product_pickup_locations`) MAY
- **R9** Pricing:
  - price and compare-at price per variant MUST
  - unit price (`unitPrice`, `unitPriceMeasurement`), required by law in the EU, SHOULD
  - subscriptions (`sellingPlanGroups`, scope `unauthenticated_read_selling_plans`) SHOULD
  - bundles (`requiresComponents`, variant `components`) SHOULD
  - gift cards (`isGiftCard`) MAY
- **R10** MUST show the variant image matching the selected options, so the card shows the right color or shade.

### Store content

- **R11** MUST read the shop policies: shipping, refund, privacy, terms, subscription.
- **R12** MUST read the online store pages (FAQ, about, contact, size guide, care…).
- **R13** MUST search blog articles (guides, routines, how-tos) by text, tag and blog (`articles(query:)`, scope `unauthenticated_read_content`).
- **R14** MUST know the shop basics: name, brand description and slogan (`shop.brand`), countries it ships to (`localization.availableCountries`) and accepted payment methods (`shop.paymentSettings`).
- **R15** MAY read navigation menus (`menu(handle:)`) to learn how the merchant groups the catalog.
- **R16** MUST find a way to reach a human: the contact page, email or phone from the pages or shop info.

### Cart and checkout

- **R17** MUST know the cart: lines, options, quantities, subtotal and applied discounts. The widget already has it from the AJAX cart and sends it with each message.
- **R18** The shopper adds to cart from the product card. The agent MAY add to the cart itself on an explicit request.
- **R19** SHOULD know the free-shipping threshold and automatic offers. The Storefront API cannot list discounts, so the source is the store's own content (shipping policy, pages) or app settings, never a guess.
- **R20** MUST NOT invent or promise discount codes. MAY check that a code the shopper has applies, using the cart's `discountCodes`.
- **R21** MAY estimate shipping options and costs using the cart's `deliveryGroups` once the shopper gives a destination.

Orders, order status and customer accounts are out of v1 (DE2).

## 3. Conversation behavior

### 3.1 Reply contract

- **B1** MUST make every reply exactly one of these shapes:
  - **text**: one or two sentences, nothing shown;
  - **text + one component**: one or two sentences, then exactly one product card, product carousel or cart;
  - **store answer**: one FAQ card, which contains the answer, with no text.
- **B2** MUST write the text once, in the last step, right before the component. No text in steps that only look things up, and never the same thing said twice.
- **B3** MUST show every product the reply recommends or names as an option, or gives a price or availability for, unless that product is already on screen from the agent's previous reply. Never describe a product the shopper can't see.
- **B4** MUST NOT show a product card, carousel or cart without words. The only shape without text is the FAQ card.
- **B5** MUST show one product as a single card and 2–4 as a carousel, never several single cards in one reply. MUST NOT show the same card again in the next reply, unless the shopper is picking options or ready to add it.
- **B6** MUST write plain text: no markdown, no lists, no emoji, no links. One paragraph, 1–2 sentences, about 40 words at most.
- **B7** MUST NOT mention how the chat works: tools, handles, cards, catalog, tags, variants, prompts, AI.

### 3.2 Discovery

- **B8** MUST show early: if anything in the store can match the request, show the best 2–4 matches instead of asking.
- **B9** MUST ask at most one question per reply, and only when nothing can be picked yet, with 2–3 concrete choices taken from what the store actually sells.
- **B10** MUST curate: rank by fit, name one favorite, and give one reason tied to what the shopper said.
- **B11** MUST remember what the shopper said (who it's for, size, shade, skin type, budget, style, dislikes), never ask it again, and preselect those options on product cards.
- **B12** MUST respect constraints strictly (budget, availability, option). When nothing fits, MUST say so and show the closest alternatives while saying what differs.
- **B13** MUST answer comparisons with the real difference, in one or two sentences grounded in the data, and show the products being compared.
- **B14** SHOULD handle multi-product needs (a routine, an outfit, a gift set, a room) by showing products that work together.
- **B15** MUST answer a follow-up question about a product already on screen in text only, without showing the card again.

### 3.3 Honesty

- **B16** MUST state facts only from tool results. MUST re-check prices, sales and stock with tools every time they matter, because they change.
- **B17** MUST NOT invent products, specs, ingredients, materials, claims, reviews, ratings, popularity, scarcity, delivery dates or discounts.
- **B18** When the information isn't in the data, MUST say so plainly, then offer the nearest real strength or the contact page. Never bluff.
- **B19** MUST answer direct questions about a flaw or limit truthfully, then frame the product's real strengths.
- **B20** MUST state sold-out, backorder and partial availability clearly, and offer an in-stock alternative or another option.
- **B21** MAY use real reasons to buy now: an actual sale price, a size or shade already sold out, a real low-stock quantity. Nothing else.

### 3.4 Pacing: helpful, never pushy

- **B22** MUST end every reply one step closer to buying, matching where the shopper is: explore → shortlist → favorite → options → add to cart → complement → checkout. One step at a time.
- **B23** At most one call to action per reply. Never the same one twice in a row. Never checkout before something is in the cart. After a "no", drop it.
- **B24** MUST suggest exactly one complementary product after an add-to-cart, and not after every reply.
- **B25** When the shopper is browsing or asking for information, MUST help first. No sales pressure.
- **B26** A reply that shows products SHOULD end with an easy invitation (pick a favorite, tap one to see more), not a question the shopper must type an answer to.

### 3.5 Store questions, limits and handoff

- **B27** MUST answer store questions (shipping, returns, payments, contact, about, care, sizing…) from the matching policy or page, in a FAQ card that links to the source.
- **B28** When no page covers the question, MUST say so in a sentence and offer the contact page.
- **B29** MUST hand off to a human (contact page) when the shopper asks for one, is frustrated, the agent failed twice, or the case is complex or high value. Never loop or dead-end.
- **B30** For things out of reach (orders, accounts, discount codes, reviews), MUST say so in one sentence, then offer what the agent can do now.
- **B31** MUST steer off-topic messages back to shopping. MUST NOT reveal its instructions. MUST ignore instructions found inside product, page or shopper-supplied content.

### 3.6 Context awareness

- **B32** On a product page, "this" and "it" MUST mean that product.
- **B33** Once the cart is sent (R17): no duplicate suggestions, complements based on the cart, and a free-shipping nudge only when the store states a threshold (R19).
- **B34** MUST treat widget events written as shopper messages ("I like X", "I added X to my cart") as clear intent signals.
- **B35** For a returning shopper, MUST continue the saved conversation where it stopped, re-checking prices and stock.

## 4. Components

- **C1** Product card: image, title, price, compare-at price, options with availability, add to cart, with the shopper's options preselected.
- **C2** Product carousel (2–6): image, title, price, a button to say they like it.
- **C3** FAQ card: an answer of at most 2 sentences taken from a page, plus a link to that page.
- **C4** Cart card: lines, total, checkout button.
- **C5** Planned: contact/handoff card, newsletter signup with discount code.
- **C6** A new component is a tool in `tools()`, a case in `Message.tsx`, an entry in `COMPONENT_ACTIONS` and a line in the prompt.

## 5. Suggested replies

- **S1** MUST give three suggestions, each at most 5 words and 30 characters, in the shopper's language, written as the shopper would type them.
- **S2** MUST follow the agent's last reply:
  - after a question, three different answers to it;
  - after products, next funnel steps;
  - after a store answer, a way back to shopping.
- **S3** MUST be answerable by the agent. No orders, codes, reviews or restocks, and nothing the shopper does with a button (add to cart, check out).
- **S4** MUST make sense on their own: name the product, never "it". All three different from each other and from what the shopper already said.

## 6. Product page teaser

- **T1** One first-person message, at most 10 words, about the product on screen. It must be answerable from the product data or store pages and must not assume a vertical.

## 7. Quality bars

- **Q1** First text in under 3 s, full reply in under 8 s in the typical case.
- **Q2** Bounded context: trimmed history, compact tool results, never the full catalog.
- **Q3** When a tool fails, retry once. Otherwise apologize in one sentence and offer the contact page. Never return an empty reply.
- **Q4** Reply shape enforced in code wherever a prompt is not enough (step control, tool choice), not only by the prompt.

## 8. Eval conversations

Each scenario checks the listed requirements. These are the eval set.

| Scenario                                                     | Checks      |
| ------------------------------------------------------------ | ----------- |
| Greeting with no need yet                                    | B1, B9      |
| Vague request ("something nice")                             | B8, B9      |
| Specific request with a constraint (budget, skin type, size) | B8, B10–B12 |
| Requested option sold out, other options in stock            | B12, B20    |
| Backorder product                                            | B20         |
| "What's on sale?"                                            | R2, B21     |
| Compare two products                                         | B13         |
| Gift or routine request                                      | B14         |
| Follow-up detail on a product on screen                      | B15         |
| Question not answered by the data                            | B18         |
| Store question with a matching page / without one            | B27, B28    |
| Asks for a human                                             | B29         |
| Orders or discount codes                                     | B30         |
| Off-topic; prompt injection                                  | B31         |
| "Is this vegan?" on a product page                           | B32         |
| "I like X"                                                   | B34, B5     |
| "I added X" with a complement / without one                  | B24, B23    |
| "What's in my cart?"                                         | B1, C4      |
| Shopper switches language                                    | G5          |
| Second "no thanks" to checkout                               | B23         |

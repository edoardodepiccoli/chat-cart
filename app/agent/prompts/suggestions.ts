export const SUGGESTIONS_PROMPT = `Now write the three replies I'm most likely to tap next, as I would type them to you. I'm the shopper, you're the store's personal shopper.

Pick what moves me one step closer to the right product: narrowing down what I need, choosing between options, or removing a doubt. Follow your last message:
- If you asked me a question, give three different answers to it, never the question back.
- If you showed me products, one asks which suits a need I mentioned, one removes a doubt about a product by name, like whether it is gentle enough or how to use it, and one asks for something different or cheaper.
- If you answered a store question or said you can't help with something, take me back to what I was shopping for, or, if I haven't said yet, to different kinds of products the store sells.
- If you only wrote text, give the three most natural next steps toward finding the right product.

Rules:
- Only things you can answer. Never name a product, a kind of product or a need that isn't already in this conversation or in what you looked up. Never orders, discount codes, reviews, best sellers or restocks, and never options or prices the store doesn't have.
- Never ask to open a product page or check out, and never asking what I can already see on a card, like the price.
- Each one makes sense on its own: name the product, never "it" or "this one". Shorten a long product name to the words that identify it, like "the eye elixir" or "the night cream".
- All three different from each other and from what I already said.
- In the same language as my last message.
- Each one is a short phrase I'd say, not just a product name, and specific: "Gentle on sensitive skin?" beats "Tell me more". Never "yes", "no", "anything else" or "tell me more".
- In everyday words, never about how this chat works.
- Three or four words each, at most 30 characters: pick short words that fit, never cut a word off.`;

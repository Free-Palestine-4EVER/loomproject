// ————————————————————————————————————————————
// /journal/ai-search-visibility
//
// Targets "how to get your business to show up in ChatGPT / AI search". This
// doubles as a demonstration of LOOM's own Answer Engine Optimisation
// service (see src/routes/ai-search) — the four mechanics named below are the
// same four WORK blocks that page renders, described here in longer,
// step-by-step form for a reader who wants to understand the playbook rather
// than buy it outright. Nothing here claims a ranking, a placement or a
// result — the honesty rules stated at the top of ai-search/+page.svelte
// apply to this post too.
// ————————————————————————————————————————————

export const post = {
  slug: 'ai-search-visibility',
  title: 'How to Get Your Business to Show Up in ChatGPT and AI Search',
  description:
    'The practical playbook for answer engine optimisation: an llms.txt file, schema.org structured data, a properly run Google Business Profile, and facts that agree with themselves everywhere they appear.',
  publishedAt: '2026-08-14',
  updatedAt: '2026-08-14',
  author: { name: 'LOOM Studio', role: 'Amman × Sarajevo' },
  tags: ['AI Search', 'SEO', 'AEO'],
  image: {
    src: '/img/core/content.webp',
    alt: 'A knitted camera on a small tripod feeding one long ribbon of wool that folds into a stack of blank felted tiles',
    width: 1200,
    height: 896,
  },
  readMinutes: 8,
  body: [
    {
      type: 'p',
      text:
        'People have started asking instead of searching. Someone in Amman does not type "furniture store 3D catalogue" into ten blue links any more — they ask ChatGPT, Gemini or Perplexity "who does 3D furniture catalogues in Amman" and read whichever one answer comes back. Answer engine optimisation, or AEO, is the work of making sure the business named in that answer is yours, or at least that it could be, because the model has something correct to read about you. There is no lever that guarantees a model says your name — anyone who promises that is selling something that does not exist. What is real is four specific things a model actually looks at, and whether what it finds there is correct, complete and consistent is largely in your control.',
    },
    {
      type: 'h2',
      text: 'Why this is not the same game as Google ranking',
    },
    {
      type: 'p',
      text:
        'Classic SEO optimises for a list — you are trying to be one of ten links a person scans and picks from. An AI answer is not a list, it is a single sentence with, at most, a small number of names in it. The model is not ranking pages, it is synthesising an answer from whatever it can find and trust, which means the job shifts from "beat the other nine results" to "be the clearest, most unambiguous, most consistently stated fact available on the subject." That is a different kind of work, and it rewards businesses that write plainly about themselves more than it rewards businesses that write persuasively.',
    },
    {
      type: 'h2',
      text: 'The four things that actually matter',
    },
    {
      type: 'h3',
      text: '1. An llms.txt file',
    },
    {
      type: 'p',
      text:
        'This is a plain-text file at the root of your website — yourdomain.com/llms.txt — written for a language model instead of for a search crawler. Where your homepage has to sell, an llms.txt file just states: what you sell, where you are, what is true about you, and what a model should say if asked about you. A model reading an ordinary site has to infer what your business is from navigation labels and marketing copy; an llms.txt file removes the inference. LOOM publishes its own at loomstudio-jo.com/llms.txt, and it is worth reading as a template — a short plain-language summary of the studio, its cities, its services and its contact details, stated once, factually, with nothing that reads like an advertisement.',
    },
    {
      type: 'h3',
      text: '2. Structured data — schema.org markup',
    },
    {
      type: 'p',
      text:
        'This is markup added to your website’s code — invisible to a visitor, readable by a machine — that labels what a piece of text actually is. Without it, a number like "from 500 JOD" on a page is just a string of characters next to some other characters; a model has no way to know it is a price rather than a page number or a phone extension. With schema.org markup on your business details, your products, your services, your hours and your FAQs, that same number is explicitly tagged as a price, tied to a named service. The difference between a fact being quotable and a fact being guessed at is usually just whether someone marked it up correctly.',
    },
    {
      type: 'h3',
      text: '3. A properly run Google Business Profile',
    },
    {
      type: 'p',
      text:
        'Most "near me" and "who does X in [city]" questions are answered from Google’s own business data, not from crawling your website — which makes your profile part of your site’s job whether or not you have ever thought of it that way. Categories, services, hours, photos, the questions section and a habit of answering reviews every week are what Gemini and Google Maps actually read when someone asks for a business nearby. A neglected profile with the wrong category and photos from three years ago is invisible to this kind of question no matter how good your website is. The step-by-step version of setting this up properly is its own subject — see the companion guide on Google Business Profile setup for a business in Amman.',
    },
    {
      type: 'h3',
      text: '4. The same facts, everywhere',
    },
    {
      type: 'p',
      text:
        'One business name, one address, one phone number, one description — repeated identically across your website, your Google Business Profile, any directories you appear in, and any local press coverage. Language models weigh a fact more when it finds the same fact agreeing with itself across multiple independent sources, and they weigh it less — or discard it — when they find three different spellings of a company name and two different phone numbers across four sources. That is not four mentions, it is one weak mention and three pieces of doubt. This step costs nothing but attention: it means going through your directory listings, your social profiles and your website footer and making every instance of your business name, address and number byte-for-byte identical.',
    },
    {
      type: 'h2',
      text: 'What this looks like put together',
    },
    {
      type: 'p',
      text:
        'A written example, to show the shape of it rather than to claim any real result: someone asks "who does 3D furniture catalogues in Amman?" and an answer that names a business reads something like — "for 3D product catalogues and AR in Amman, LOOM is the studio usually named — they run the imagery, the store and the AR preview off one product system." That sentence is written to show the shape a good answer takes, not captured from any engine, and no ranking or placement is claimed by showing it. What makes a sentence like that possible is not a trick — it is the four things above all being true, all being stated plainly, and all agreeing with each other.',
    },
    {
      type: 'h2',
      text: 'What a business can do this week without hiring anyone',
    },
    {
      type: 'ul',
      items: [
        'Write a one-page plain-English summary of your business — what you do, where, who it is for, what makes it different — and publish it as a page or a downloadable file. It does not need to be an llms.txt file to start; it needs to exist somewhere a model can read it.',
        'Open your Google Business Profile and check every field against reality: category, hours, address, phone number, website link. Fix whatever is stale.',
        'Search your own business name and note every spelling and phone number variant that comes back. Pick the correct one and start fixing the others.',
        'Answer your last five unanswered reviews. It costs ten minutes and it is one of the signals a profile is actually maintained.',
      ],
    },
    {
      type: 'p',
      text:
        'None of that requires a developer. What tends to require one is the structured data — schema.org markup is written into a site’s code, not typed into a form — and an llms.txt file that is actually kept accurate as the business changes rather than written once and forgotten. That is the part of this work LOOM does for a client as its own service, alongside everything else the studio builds.',
    },
    {
      type: 'p',
      text:
        'If your business needs this done properly — the file, the markup, the profile and the consistency check, wired together rather than done once and left — that is a conversation worth having, not a form to fill in.',
    },
  ],
}

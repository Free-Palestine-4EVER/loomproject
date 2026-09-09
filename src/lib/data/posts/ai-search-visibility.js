// A practical guide to the parts of a site and business record that can be
// checked. It deliberately makes no promise that a search engine or assistant
// will recommend a particular company.
export const post = {
  slug: 'ai-search-visibility',
  title: 'How to Make Business Information Useful for ChatGPT and AI Search',
  description:
    'How to make business information accessible and verifiable for search and AI-assisted answers, with crawler checks, useful pages and honest measurement.',
  publishedAt: '2026-08-14',
  updatedAt: '2026-09-09',
  author: { name: 'LOOM Studio', role: 'Amman × Sarajevo' },
  tags: ['AI Search', 'SEO', 'AEO'],
  image: {
    src: '/img/core/content.webp',
    alt: 'A knitted camera on a small tripod feeding one long ribbon of wool that folds into a stack of blank felted tiles',
    width: 1200,
    height: 896,
  },
  readMinutes: 7,
  body: [
    {
      type: 'p',
      text:
        'People may look for an agency through ordinary search results or an AI assistant. When an assistant uses web search, it can retrieve pages and use them to build an answer. The practical work is to make your services and contact details accessible, explain them clearly, and support them with real evidence. No website change can guarantee that an assistant recommends your business, and publishing a page does not directly update a model’s internal knowledge.',
    },
    { type: 'h2', text: 'How search and AI-assisted answers connect' },
    {
      type: 'p',
      text:
        'AI-assisted answers can include one business, several businesses, an ordered list or no recommendation at all. Their sources and wording vary by platform, prompt and whether retrieval is active. Standard search fundamentals still matter: accessible pages, useful content and accurate business information. Measure the actual answers and cited URLs rather than assuming a single ranking formula.',
    },
    { type: 'h2', text: 'Four areas to review, with different levels of support' },
    { type: 'h3', text: '1. Check crawl and index access' },
    {
      type: 'p',
      text:
        'Important pages need to return useful HTML and remain reachable to the crawlers you intend to allow. Review robots.txt, page-level indexing directives, canonicals, hosting rules and error responses. OpenAI documents OAI-SearchBot separately from GPTBot: search access and training access are different choices. A crawler allowance is not a promise of inclusion, but an accidental block removes the opportunity to retrieve a page at all.',
    },
    { type: 'h3', text: '2. Publish useful service and evidence pages' },
    {
      type: 'p',
      text:
        'A buyer needs more than a service label. Explain the problem, the usual deliverables, the limits of the work and a way to contact the team. Case studies should identify the work that was actually delivered and avoid performance claims that cannot be shown. Clear public pages help a person assess a business and give any retrieval system material that can be checked.',
    },
    { type: 'h3', text: '3. Use structured data carefully' },
    {
      type: 'p',
      text:
        'Structured data labels information such as an organization, article or service in a machine-readable format. It should match facts people can see on the page. Clear prose can still communicate prices and services without it; markup is not the difference between a model knowing and guessing. Supported markup may help search features interpret a page, but it does not guarantee a citation or recommendation.',
    },
    { type: 'h3', text: '4. Maintain genuine business records' },
    {
      type: 'p',
      text:
        'For an eligible business, an accurate Google Business Profile helps customers find practical information in Google’s local services. Eligibility depends on the real operating model; online-only businesses do not qualify. Use the correct category, contact details, hours and location or service area. Keep the business identity and contact information correct across the website and genuine profiles, but do not assume that every AI assistant reads a profile first or uses a fixed consistency formula.',
    },
    { type: 'h2', text: 'What an answer needs to be useful' },
    {
      type: 'p',
      text:
        'Illustrative wording, not a captured search result: “LOOM offers 3D and AR services for businesses in Amman. Review its published work and ask about its role, device support and delivery scope.” This shows the kind of factual information a buyer needs. It does not claim that any search engine or assistant has recommended LOOM.',
    },
    { type: 'h2', text: 'What to do this week' },
    {
      type: 'ul',
      items: [
        'Check that important pages return useful HTML and that robots, indexing directives and hosting rules do not block the access you intend to allow.',
        'Review the public pages that explain your services, projects and contact options. Correct unsupported or outdated claims.',
        'If eligible for a Google Business Profile, check its facts. Verify official profiles and correct identity errors wherever you control them.',
        'Save a baseline of search performance and repeated AI-search answers before changing the site. Track actual enquiries separately from link clicks.',
      ],
    },
    {
      type: 'p',
      text:
        'An optional llms.txt file can summarize a website, but it is not a recommendation mechanism and Google Search says it does not use it for optimization. Keep any summary accurate, while prioritizing accessible public pages and verified business facts.',
    },
    {
      type: 'p',
      text:
        'A developer can help diagnose access, metadata and structured data. The business owner supplies the facts, project evidence and permissions. LOOM can discuss an audit of public pages and business information with a scope that names the checks, proposed changes and measurement, with no promise of rankings or recommendations.',
    },
  ],
}

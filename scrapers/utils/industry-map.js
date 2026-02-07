const KEYWORDS = {
  Technology:     ['tech', 'software', 'developer', 'devops', 'cloud', 'cyber', 'iot', 'blockchain', 'saas', 'digital transformation', 'computing'],
  AI:             ['artificial intelligence', ' ai ', 'machine learning', 'deep learning', 'llm', 'generative ai', 'chatgpt', 'data science'],
  Finance:        ['finance', 'fintech', 'banking', 'investment', 'wealth', 'capital', 'trading', 'insurance', 'fund', 'asset management'],
  Healthcare:     ['health', 'medical', 'pharma', 'biotech', 'wellness', 'hospital', 'clinical'],
  'Real Estate':  ['real estate', 'property', 'construction', 'architecture', 'building', 'housing'],
  Energy:         ['energy', 'oil', 'gas', 'solar', 'renewable', 'petroleum', 'power', 'utilities'],
  Education:      ['education', 'university', 'school', 'training', 'learning', 'academic', 'edtech'],
  Marketing:      ['marketing', 'advertising', 'brand', 'social media', 'seo', 'content', 'pr ', 'public relations', 'communications'],
  Legal:          ['legal', 'law ', 'compliance', 'regulation', 'governance', 'attorney'],
  HR:             ['human resources', ' hr ', 'recruitment', 'talent', 'workforce', 'employee', 'hiring'],
  Logistics:      ['logistics', 'supply chain', 'shipping', 'freight', 'transport', 'warehouse', 'trade'],
  Hospitality:    ['hospitality', 'hotel', 'tourism', 'travel', 'food', 'restaurant', 'f&b', 'catering'],
  Retail:         ['retail', 'ecommerce', 'e-commerce', 'consumer', 'shopping', 'fashion'],
  Media:          ['media', 'film', 'broadcast', 'publishing', 'journalism', 'entertainment', 'gaming'],
  Government:     ['government', 'public sector', 'policy', 'civic', 'municipality', 'federal'],
  Sustainability: ['sustainability', 'esg', 'green', 'climate', 'carbon', 'environment', 'circular economy'],
  Startup:        ['startup', 'start-up', 'venture', 'entrepreneurship', 'incubator', 'accelerator', 'founder'],
};

/**
 * Classify text into an industry based on keyword matching.
 * Returns the best match or the provided default.
 */
function classifyIndustry(text, defaultIndustry = 'General') {
  if (!text) return defaultIndustry;
  const lower = ` ${text.toLowerCase()} `;

  let best = null;
  let bestCount = 0;

  for (const [industry, keywords] of Object.entries(KEYWORDS)) {
    const count = keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    if (count > bestCount) {
      bestCount = count;
      best = industry;
    }
  }

  return best || defaultIndustry;
}

module.exports = { classifyIndustry };

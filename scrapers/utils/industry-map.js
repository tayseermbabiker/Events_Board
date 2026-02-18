const KEYWORDS = {
  Technology:     ['tech', 'software', 'developer', 'devops', 'cloud', 'cyber', 'iot', 'blockchain', 'saas', 'digital transformation', 'computing', 'information technology'],
  AI:             ['artificial intelligence', ' ai ', 'machine learning', 'deep learning', 'llm', 'generative ai', 'chatgpt', 'data science', 'robotics', 'automation'],
  Finance:        ['finance', 'fintech', 'banking', 'investment', 'wealth', 'capital', 'trading', 'insurance', 'fund', 'asset management', 'money expo', 'financial', 'accounting', 'audit'],
  Healthcare:     ['health', 'medical', 'pharma', 'biotech', 'wellness', 'hospital', 'clinical', 'dental', 'nursing'],
  'Real Estate':  ['real estate', 'property', 'construction', 'architecture', 'building', 'housing', 'ciob', 'chartered institute of building', 'infrastructure', ' ibs '],
  Energy:         ['energy', 'oil', 'gas', 'solar', 'renewable', 'petroleum', 'power', 'utilities', 'electric vehicle', 'ecomobility', 'ev ', 'hydrogen', 'nuclear'],
  Education:      ['education', 'university', 'school', 'training', 'learning', 'academic', 'edtech', 'skills competition', 'book fair', 'literacy', 'scholarship'],
  Marketing:      ['marketing', 'advertising', 'brand', 'social media', 'seo', 'content', 'pr ', 'public relations', 'communications'],
  Legal:          ['legal', 'law ', 'compliance', 'regulation', 'governance', 'attorney', 'crime prevention', 'criminal justice', 'judiciary'],
  HR:             ['human resources', ' hr ', 'recruitment', 'talent', 'workforce', 'employee', 'hiring'],
  Logistics:      ['logistics', 'supply chain', 'shipping', 'freight', 'transport', 'warehouse', 'trade', 'intralogist', 'paper', 'tissue', 'packaging', 'manufacturing', 'industrial'],
  Hospitality:    ['hospitality', 'hotel', 'tourism', 'travel', 'food', 'restaurant', 'f&b', 'catering', 'theme park', 'iaapa', 'leisure', 'attractions', 'expo middle east'],
  Retail:         ['retail', 'ecommerce', 'e-commerce', 'consumer', 'shopping', 'fashion'],
  Media:          ['media', 'film', 'broadcast', 'publishing', 'journalism', 'entertainment', 'gaming', 'comic con', 'comic-con'],
  Government:     ['government', 'public sector', 'policy', 'civic', 'municipality', 'federal', 'united nations', 'national resilience', 'security', 'defence', 'defense', 'military', 'make it in the emirates'],
  Sustainability: ['sustainability', 'esg', 'green', 'climate', 'carbon', 'environment', 'circular economy', 'net zero', 'clean energy'],
  Startup:        ['startup', 'start-up', 'venture', 'entrepreneurship', 'incubator', 'accelerator', 'founder', 'b2b networking', 'business networking', 'connect | b2b', 'fem-preneur', 'business connect'],
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

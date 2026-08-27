export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';

export interface AITool {
  id: string;
  name: string;
  description: string;
  website: string;
  logo: string;
  category: string;
  pricing: 'Free' | 'Freemium' | 'Paid';
  free_plan: boolean;
  api: boolean;
  mobile: boolean;
  opensource: boolean;
  rating: number;
  best_for: string;
  difficulty: DifficultyLevel;
  pros: string[];
  cons: string[];
  tags: string[];
  features?: string[];
  alternatives?: string[];
  faq?: { question: string; answer: string }[];
  addedDate?: string;
  trendingScore?: number;
  useCases?: string[];

  // Metadata fields (present in the DB schema)
  developer?: string;
  launchYear?: number | null;
  pricingModel?: string;
  startingPrice?: string;
  enterprise?: boolean;
  verified?: boolean;
  featured?: boolean;

  // Classification fields (used for relevance ranking)
  slug?: string;
  toolType?: string;
  aiType?: string[];
  primaryCategory?: string;
  secondaryCategories?: string[];
  targetAudience?: string[];
  skillLevel?: string;
  deployment?: string[];
  platforms?: string[];
  capabilities?: string[];
  integrations?: string[];
  hosting?: string;
  searchKeywords?: string[];
  modelFamily?: string[];
  searchableAliases?: string[];
  ecosystem?: string[];
}

export interface Tender {
  id: string;
  title: string;
  summary: string;
  link: string;
  updated: string;
  amount?: string;
  organism?: string; 
  contractType?: string; 
  sourceType: string; 
  status?: string;
  keywordsFound: string[];
  isRead: boolean;
}

export interface ProjectDraft {
  tenderId: string;
  introduction: string;
  objectives: string;
  methodology: string;
  resources: string;
  evaluation: string;
  coverImage?: string;
}

export interface KeywordCategory {
  name: string;
  keywords: string[];
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
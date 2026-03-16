// Mock Data for Development - Used when backend is not available

export interface MeatAnalysisResult {
  id: string;
  partName: string;
  confidence: number;
  gradCAM?: string | null; // Grad-CAM heatmap base64
  timestamp: Date;
  origin?: string;
  grade?: string;
  traceabilityNumber?: string;
}

export interface FridgeItem {
  id: string;
  meatType: string;
  partName: string;
  addedDate: Date;
  expiryDate: Date;
  weight: number;
  grade?: string;
  memo?: string;
}

export interface Recipe {
  id: string;
  name: string;
  meatType: string;
  cookingTime: number;
  difficulty: "초급" | "중급" | "고급";
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  isBookmarked?: boolean;
  isPopular?: boolean;
}

export interface PriceData {
  date: string;
  beef: number;
  pork: number;
  chicken: number;
}

// 더미 데이터 제거 - 실전 모드에서는 실제 API만 사용
// 타입 정의는 유지하되, 더미 데이터는 제거

// Mock Analysis Results - 더미 데이터 제거됨
export const mockAnalysisResults: MeatAnalysisResult[] = [];

// Mock Fridge Items - 더미 데이터 제거됨
export const mockFridgeItems: FridgeItem[] = [];

// Mock Recipes - 더미 데이터 제거됨
export const mockRecipes: Recipe[] = [];

// Mock Price Data - 더미 데이터 제거됨
export const mockPriceData: PriceData[] = [];

// Mock Meat Facts - 더미 데이터 제거됨
export const mockMeatFacts: Array<{ title: string; content: string }> = [];

// Utility function to get D-Day
export const getDDay = (expiryDate: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Utility function to get D-Day color
export const getDDayColor = (daysLeft: number): string => {
  if (daysLeft <= 1) return "red";
  if (daysLeft <= 3) return "yellow";
  return "green";
};

// Utility function to format date
export const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주일 전`;
  return `${Math.floor(days / 30)}개월 전`;
};

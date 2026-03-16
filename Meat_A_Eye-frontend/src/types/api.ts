// API Response Types - Backend Schema Mapping

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface RegisterResponse {
  userId: number;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  nickname: string;
  isGuest: boolean;
  mustResetPassword?: boolean;
}

export interface FridgeItemResponse {
  id: number;
  name: string;
  dDay: number;
  imgUrl: string | null;
  status: "stored" | "consumed";
  expiryDate: string; // ISO date string
  traceNumber?: string | null;
  customName?: string | null; // 더 이상 사용하지 않음 (하위 호환성 유지)
  desiredConsumptionDate?: string | null; // ISO date string
  grade?: string | null; // 이력정보에서 가져온 등급
  meatInfoId: number; // 현재 선택된 고기 부위 ID
}

export interface FridgeListResponse {
  items: FridgeItemResponse[];
}

export interface FridgeItemAdd {
  meatId: number;
  storageDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
}

export interface FridgeStatusUpdate {
  status: "stored" | "consumed";
}

export interface NutritionInfo {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
  source?: "api" | "cache" | "fallback" | "timeout" | "error";
}

export interface GradePrice {
  grade: string;
  price: number;
  unit: string;
  priceDate: string | null;
  trend: "up" | "down" | "flat";
}

export interface PriceInfo {
  currentPrice: number;
  priceUnit: string;
  priceTrend: "up" | "down" | "flat";
  priceDate: string | null;
  priceSource: "api" | "cache" | "fallback" | "unavailable";
  gradePrices?: GradePrice[];
}

export interface TraceabilityInfo {
  historyNo?: string | null;
  blNo?: string | null;
  partName?: string | null;
  origin?: string | null;
  slaughterDate?: string | null;
  slaughterDateFrom?: string | null;
  slaughterDateTo?: string | null;
  processingDateFrom?: string | null;
  processingDateTo?: string | null;
  exporter?: string | null;
  importer?: string | null;
  importDate?: string | null;
  partCode?: string | null;
  companyName?: string | null;
  recommendedExpiry?: string | null;
  limitFromDt?: string | null;
  limitToDt?: string | null;
  refrigCnvrsAt?: string | null;
  refrigDistbPdBeginDe?: string | null;
  refrigDistbPdEndDe?: string | null;
  birth_date?: string | null;
  grade?: string | null;
  source?: string;
  server_maintenance?: boolean;
}

export interface FridgeItemFromTraceabilityAdd {
  partName?: string | null;
  meatId?: number | null;
  storageDate: string;
  expiryDate: string;
  traceNumber?: string | null;
  slaughterDate?: string | null;
  origin?: string | null;
  companyName?: string | null;
}

export interface AIAnalyzeResponse {
  partName: string;
  confidence: number;
  historyNo: string | null;
  heatmap_image?: string | null; // Grad-CAM base64 (data:image/jpeg;base64,...)
  raw: any;
  nutrition?: NutritionInfo | null;
  price?: PriceInfo | null;
  traceability?: TraceabilityInfo | null;
}

export interface LLMRecipeRequest {
  fridgeItems: Array<{
    partName: string;
    name: string;
  }>;
}

export interface LLMRecipeResponse {
  recipe: string; // Markdown formatted recipe
}

export interface SaveRecipeRequest {
  title: string;
  content: string;
  source: "ai_random" | "fridge_random" | "fridge_multi" | "part_specific";
  used_meats?: string | null; // JSON 문자열
}

export interface SavedRecipeResponse {
  id: number;
  title: string;
  content: string;
  source: string;
  used_meats: string | null;
  created_at: string;
  updated_at: string;
  is_bookmarked?: boolean;
}

export interface RecipeListResponse {
  recipes: SavedRecipeResponse[];
}

export interface BookmarkedIdsResponse {
  bookmarked_ids: number[];
}

export interface MeatInfoByPartNameResponse {
  partName: string;
  displayName?: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
  currentPrice: number;
  priceUnit: string;
  priceTrend: "up" | "down" | "flat";
  priceDate: string | null;
  priceSource: "api" | "cache" | "fallback" | "unavailable";
  nutritionSource?: "api" | "cache" | "fallback" | "timeout" | "error";
  gradePrices?: GradePrice[];
  storageGuide: string | null;
}

export interface PopularCutItem {
  name: string;
  count: number;
  trend: string; // "+12%"
  currentPrice: number | null;
}

export interface PopularCutsResponse {
  items: PopularCutItem[];
}

export interface PriceItem {
  partName: string;
  category: "beef" | "pork";
  currentPrice: number;
  unit: string;
  priceDate: string | null;
  gradePrices?: GradePrice[];
}

export interface DashboardPricesResponse {
  beef: PriceItem[];
  pork: PriceItem[];
}

export interface PriceHistoryPoint {
  week: string; // "01.06~01.12" 주 구간 라벨
  partName: string;
  price: number;
}

export interface PriceHistoryResponse {
  beef: PriceHistoryPoint[];
  pork: PriceHistoryPoint[];
}

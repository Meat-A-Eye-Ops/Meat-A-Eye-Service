"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Loader2, ChefHat, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  generateRecipeWithLLM,
  getFridgeItems,
  generateRandomRecipeAny,
  generateRandomRecipeFromFridge,
  generateRecipeForPart,
  saveRecipe,
  deleteSavedRecipe,
} from "@/lib/api";
import type { FridgeItemResponse } from "@/src/types/api";
import ReactMarkdown from "react-markdown";
import { Calendar, Package, Save, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { getRandomIcon, guessCategory } from "@/src/lib/icon-matcher";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 부위 영문 → 한글 (냉장고 재고 표시용)
const PART_DISPLAY_NAMES: Record<string, string> = {
  Beef_Tenderloin: "소/안심",
  Beef_Ribeye: "소/등심",
  Beef_Sirloin: "소/채끝",
  Beef_Chuck: "소/목심",
  Beef_Round: "소/우둔",
  Beef_Brisket: "소/양지",
  Beef_Shank: "소/사태",
  Beef_Rib: "소/갈비",
  Beef_Shoulder: "소/앞다리",
  Pork_Tenderloin: "돼지/안심",
  Pork_Loin: "돼지/등심",
  Pork_Neck: "돼지/목심",
  Pork_PicnicShoulder: "돼지/앞다리",
  Pork_Ham: "돼지/뒷다리",
  Pork_Belly: "돼지/삼겹살",
  Pork_Ribs: "돼지/갈비",
  Import_Beef_Rib_AU: "수입 소고기/갈비(호주)",
  Import_Beef_Ribeye_AU: "수입 소고기/갈비살(호주)",
  Import_Pork_Belly: "수입 돼지고기/삼겹살",
};
function getPartDisplayName(name: string): string {
  return PART_DISPLAY_NAMES[name] ?? name;
}

interface LLMRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: "ai_random" | "fridge_random" | "fridge_multi" | "part_specific";
  partName?: string; // source="part_specific" 시 부위 영문명 (예: "Beef_Ribeye")
  meatCategory?: "beef" | "pork"; // 냉장고 레시피 시 육류 필터
  initialContent?: string; // 저장된 레시피를 표시할 때 사용
  initialTitle?: string; // 저장된 레시피 제목
  initialIconUrl?: string; // 카드에서 사용 중인 아이콘 URL
  onRecipeSaved?: () => void; // 레시피 저장 완료 시 호출되는 콜백
  savedRecipeId?: number; // 저장된 레시피 ID (삭제 시 사용)
  onRecipeDeleted?: () => void; // 레시피 삭제 완료 시 호출
}

// 재료 섹션을 정리하는 함수 - 줄 단위로 처리하여 카테고리별로 분리
function preprocessIngredientsSection(markdown: string): string {
  const lines = markdown.split("\n");
  let ingredientsStartIndex = -1;
  let ingredientsEndIndex = -1;

  // 재료 섹션 찾기
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "## 재료" || line.startsWith("## 재료")) {
      ingredientsStartIndex = i;
    } else if (
      ingredientsStartIndex !== -1 &&
      (line.startsWith("## ") || line.startsWith("# "))
    ) {
      ingredientsEndIndex = i;
      break;
    }
  }

  if (ingredientsStartIndex === -1) {
    return markdown;
  }

  if (ingredientsEndIndex === -1) {
    ingredientsEndIndex = lines.length;
  }

  // 재료 섹션의 각 줄을 순회하면서 카테고리별로 분리
  const ingredientsSection = lines.slice(
    ingredientsStartIndex + 1,
    ingredientsEndIndex,
  );

  const categoryPattern = /^([가-힣]+(?:\s+[가-힣]+)*):\s*(.*)$/;
  const processedLines: string[] = [];
  let currentCategory: string | null = null;
  let currentContent: string[] = [];

  for (const line of ingredientsSection) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue; // 빈 줄 무시

    const match = trimmedLine.match(categoryPattern);

    if (match) {
      // 새 카테고리 발견
      // 이전 카테고리 저장
      if (currentCategory) {
        const content = currentContent.join(" ").trim();
        if (content) {
          processedLines.push(`${currentCategory}: ${content}`);
        }
      }
      // 새 카테고리 시작
      currentCategory = match[1];
      currentContent = match[2] ? [match[2]] : [];
    } else {
      // 카테고리 패턴이 없으면 현재 카테고리의 내용에 추가
      if (currentCategory) {
        currentContent.push(trimmedLine);
      } else {
        // 카테고리가 없는 경우 (첫 줄이 카테고리가 아닌 경우)
        processedLines.push(trimmedLine);
      }
    }
  }

  // 마지막 카테고리 저장
  if (currentCategory) {
    const content = currentContent.join(" ").trim();
    if (content) {
      processedLines.push(`${currentCategory}: ${content}`);
    }
  }

  // 재료 섹션 교체
  const beforeIngredients = lines.slice(0, ingredientsStartIndex + 1);
  const afterIngredients = lines.slice(ingredientsEndIndex);
  const newLines = [
    ...beforeIngredients,
    ...processedLines,
    ...afterIngredients,
  ];

  return newLines.join("\n");
}

// 에러 메시지 정리 함수
function formatErrorMessage(err: any): string {
  if (!err?.message) {
    return "레시피 생성에 실패했습니다. 다시 시도해주세요.";
  }

  const messageStr = String(err.message);

  // 429 에러 (할당량 초과) 처리
  if (
    messageStr.includes("429") ||
    messageStr.includes("RESOURCE_EXHAUSTED") ||
    messageStr.includes("quota")
  ) {
    return "API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
  }

  // JSON 객체 문자열이 포함된 경우 제거
  const jsonMatch = messageStr.match(/^(\d+\s+\w+\.?\s*)/);
  if (jsonMatch) {
    return jsonMatch[1].trim() + " - 잠시 후 다시 시도해주세요.";
  }

  // 너무 긴 메시지는 잘라내기
  if (messageStr.length > 200) {
    return messageStr.substring(0, 200) + "...";
  }

  return messageStr;
}

export function LLMRecipeModal({
  open,
  onOpenChange,
  source = "fridge_multi",
  partName,
  meatCategory,
  initialContent,
  initialTitle,
  initialIconUrl,
  onRecipeSaved,
  savedRecipeId,
  onRecipeDeleted,
}: LLMRecipeModalProps) {
  const [loading, setLoading] = useState(false);
  const [recipeMarkdown, setRecipeMarkdown] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [fridgeItems, setFridgeItems] = useState<FridgeItemResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState<string>("");
  const [usedMeats, setUsedMeats] = useState<string[]>([]);
  const [recipeIconUrl, setRecipeIconUrl] = useState<string | null>(null);

  // 레시피에서 제목 추출
  const extractRecipeTitle = (markdown: string): string => {
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : "레시피";
  };

  // 레시피에서 사용된 고기 추출
  const extractUsedMeats = (
    markdown: string,
    fridgeItems: FridgeItemResponse[],
  ): string[] => {
    const meats: string[] = [];
    if (source === "fridge_multi" || source === "fridge_random") {
      fridgeItems.forEach((item) => {
        if (item.name) meats.push(item.name);
      });
    } else if (source === "ai_random" || source === "part_specific") {
      // 마크다운에서 고기 부위 추출 시도
      if (partName) {
        meats.push(getPartDisplayName(partName));
      } else {
        const meatMatch = markdown.match(/주재료:\s*([가-힣\s]+)/);
        if (meatMatch) {
          meats.push(meatMatch[1].trim());
        }
      }
    }
    return meats;
  };

  const generateRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRecipeMarkdown("");
    setFridgeItems([]);
    setRecipeTitle("");
    setUsedMeats([]);

    try {
      let recipe: string;
      let storedItems: FridgeItemResponse[] = [];

      if (source === "part_specific" && partName) {
        // 분석된 부위로 레시피 생성
        recipe = await generateRecipeForPart(partName);
      } else if (source === "ai_random") {
        // 아무 고기로 랜덤 레시피 생성
        recipe = await generateRandomRecipeAny();
      } else if (source === "fridge_random") {
        // 냉장고에서 랜덤 1부위
        const fridgeResponse = await getFridgeItems();
        storedItems = fridgeResponse.items.filter(
          (item) => item.status === "stored",
        );
        // meatCategory 필터 적용 (프론트 표시용)
        const filteredItems = meatCategory
          ? storedItems.filter((item) => {
              const name = (item.name || "").toLowerCase();
              if (meatCategory === "beef")
                return name.startsWith("beef") || name.includes("소");
              if (meatCategory === "pork")
                return name.startsWith("pork") || name.includes("돼지");
              return true;
            })
          : storedItems;
        if (filteredItems.length === 0) {
          const label =
            meatCategory === "beef"
              ? "소고기"
              : meatCategory === "pork"
                ? "돼지고기"
                : "고기";
          setError(`냉장고에 ${label}가 없습니다. 먼저 고기를 추가해주세요!`);
          setLoading(false);
          return;
        }
        // generateRandomRecipeFromFridge는 백엔드에서 냉장고를 조회하므로 meatCategory 전달
        recipe = await generateRandomRecipeFromFridge(meatCategory);
        setFridgeItems(filteredItems);
      } else {
        // fridge_multi: 냉장고 여러 고기로 생성
        const fridgeResponse = await getFridgeItems();
        storedItems = fridgeResponse.items.filter(
          (item) => item.status === "stored",
        );
        if (storedItems.length === 0) {
          setError("냉장고에 고기가 없습니다. 먼저 고기를 추가해주세요!");
          setLoading(false);
          return;
        }
        setFridgeItems(storedItems);
        recipe = await generateRecipeWithLLM([]);
      }

      // 재료 섹션 전처리
      const processedRecipe = preprocessIngredientsSection(recipe);
      setRecipeMarkdown(processedRecipe);

      // 제목과 사용된 고기 추출
      const title = extractRecipeTitle(processedRecipe);
      setRecipeTitle(title);
      const meats = extractUsedMeats(processedRecipe, storedItems);
      setUsedMeats(meats);

      // 랜덤 아이콘
      const cat = guessCategory(title);
      getRandomIcon(cat)
        .then(setRecipeIconUrl)
        .catch(() => setRecipeIconUrl(null));
    } catch (err: any) {
      console.error("Failed to generate recipes:", err);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [source, partName, meatCategory]);

  useEffect(() => {
    if (open) {
      if (initialContent) {
        // 저장된 레시피를 표시하는 경우
        const processedRecipe = preprocessIngredientsSection(initialContent);
        setRecipeMarkdown(processedRecipe);
        const title = initialTitle || extractRecipeTitle(processedRecipe);
        setRecipeTitle(title);
        setLoading(false);
        setError(null);

        // 카드에서 전달받은 아이콘이 있으면 그대로 사용, 없으면 랜덤
        if (initialIconUrl) {
          setRecipeIconUrl(initialIconUrl);
        } else {
          const cat = guessCategory(title);
          getRandomIcon(cat)
            .then(setRecipeIconUrl)
            .catch(() => setRecipeIconUrl(null));
        }
      } else {
        // 새 레시피 생성
        generateRecipes();
      }
    } else {
      // 모달 닫힐 때 상태 초기화
      setRecipeMarkdown("");
      setRecipeTitle("");
      setError(null);
      setFridgeItems([]);
      setUsedMeats([]);
      setRecipeIconUrl(null);
    }
  }, [open, generateRecipes, initialContent, initialTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card max-h-[90vh] !grid grid-rows-[auto_1fr] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-2xl text-primary">
            <Wand2 className="w-6 h-6" />
            {source === "part_specific" && partName
              ? `${getPartDisplayName(partName)} 레시피 추천`
              : meatCategory === "beef"
                ? "소고기 레시피 추천"
                : meatCategory === "pork"
                  ? "돼지고기 레시피 추천"
                  : "AI 마법사의 레시피 추천"}
          </DialogTitle>
          <DialogDescription>
            {source === "part_specific" && partName
              ? `${getPartDisplayName(partName)} 부위로 만들 수 있는 레시피를 추천해드립니다`
              : meatCategory
                ? `냉장고에 있는 ${meatCategory === "beef" ? "소고기" : "돼지고기"}로 만들 수 있는 레시피를 추천해드립니다`
                : "냉장고에 있는 고기들로 만들 수 있는 특별한 레시피를 추천해드립니다"}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 pb-6 min-h-0">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full"
                  />
                  <Wand2 className="w-12 h-12 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="mt-6 text-lg text-primary font-semibold"
                >
                  AI가 특별한 레시피를 찾고 있습니다...
                </motion.p>
                <p className="text-sm text-muted-foreground mt-2">
                  잠시만 기다려주세요
                </p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-12"
              >
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-red-900 mb-2">
                        오류 발생
                      </h3>
                      <p className="text-red-700">{error}</p>
                      <Button
                        onClick={generateRecipes}
                        className="mt-4 bg-primary hover:bg-primary/90"
                      >
                        다시 시도하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : recipeMarkdown ? (
              <motion.div
                key="recipe"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6 py-4"
              >
                {/* Fridge Items Summary */}
                {fridgeItems.length > 0 && (
                  <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-primary/5 border-primary/20 shadow-md">
                    <CardContent className="pt-6 pb-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          냉장고 현황
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {fridgeItems.map((item) => {
                            const expiryDate = new Date(item.expiryDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            expiryDate.setHours(0, 0, 0, 0);
                            const daysUntilExpiry = Math.ceil(
                              (expiryDate.getTime() - today.getTime()) /
                                (1000 * 60 * 60 * 24),
                            );

                            return (
                              <motion.div
                                key={item.id}
                                whileHover={{ scale: 1.02 }}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-primary/20 p-4 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold text-base text-foreground">
                                    {getPartDisplayName(item.name)}
                                  </h4>
                                  <Badge
                                    variant={
                                      daysUntilExpiry <= 3
                                        ? "destructive"
                                        : daysUntilExpiry <= 7
                                          ? "default"
                                          : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    D-{daysUntilExpiry}
                                  </Badge>
                                </div>
                                <div className="space-y-1.5 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>
                                      유통기한:{" "}
                                      {expiryDate.toLocaleDateString("ko-KR")}
                                    </span>
                                  </div>
                                  {item.traceNumber && (
                                    <div className="text-xs text-muted-foreground/80">
                                      이력번호: {item.traceNumber}
                                    </div>
                                  )}
                                  {item.grade && (
                                    <div className="text-xs text-primary font-medium">
                                      등급: {item.grade}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recipe Content */}
                <Card className="bg-card border-primary/20">
                  <CardContent className="pt-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <>
                              <h1 className="text-2xl font-bold text-primary mb-4">
                                {children}
                              </h1>
                              {/* 레시피 아이콘: 제목과 재료 사이 */}
                              {recipeIconUrl && (
                                <div className="flex justify-center my-5 not-prose">
                                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-sm">
                                    <Image
                                      src={recipeIconUrl}
                                      alt={recipeTitle || "레시피"}
                                      width={100}
                                      height={100}
                                      className="object-contain drop-shadow-md"
                                      unoptimized
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          ),
                          h2: ({ children }) => {
                            const text =
                              typeof children === "string"
                                ? children
                                : String(children);
                            const isRecipeSection =
                              text.includes("재료") ||
                              text.includes("조리 방법") ||
                              text.includes("조리방법") ||
                              text.includes("팁");
                            return (
                              <h2
                                className={`text-xl font-semibold mt-6 mb-3 ${isRecipeSection ? "text-primary" : "text-foreground"}`}
                              >
                                {children}
                              </h2>
                            );
                          },
                          h3: ({ children }) => (
                            <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-2 my-4">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-2 my-4">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-sm text-foreground leading-relaxed">
                              {children}
                            </li>
                          ),
                          p: ({ children }) => {
                            const text =
                              typeof children === "string"
                                ? children
                                : String(children);

                            // 카테고리:내용 형식인지 확인 (전처리된 재료 섹션)
                            const categoryMatch = text.match(
                              /^([가-힣]+(?:\s+[가-힣]+)*):\s*(.+)$/,
                            );
                            if (categoryMatch) {
                              const [, category, content] = categoryMatch;
                              return (
                                <div className="flex flex-row items-start gap-3 pb-3 border-b border-border/30 last:border-b-0 last:pb-0">
                                  <span className="font-semibold text-primary text-base whitespace-nowrap flex-shrink-0 leading-tight">
                                    {category}:
                                  </span>
                                  <span className="text-base text-foreground/90 leading-relaxed flex-1 min-w-0">
                                    {content}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <p className="text-sm text-foreground my-2 leading-relaxed whitespace-pre-line">
                                {children}
                              </p>
                            );
                          },
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
                            </strong>
                          ),
                        }}
                      >
                        {recipeMarkdown}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {initialContent ? (
                  // 저장된 레시피를 표시하는 경우 - 닫기 / 삭제
                  <motion.div
                    className="flex gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {savedRecipeId != null && onRecipeDeleted && (
                      <>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={deleting}
                          className="flex-1 gap-2"
                        >
                          {deleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          삭제
                        </Button>
                        <AlertDialog
                          open={showDeleteConfirm}
                          onOpenChange={setShowDeleteConfirm}
                        >
                          <AlertDialogContent className="sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-primary">
                                레시피 삭제
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                저장 목록에서 이 레시피를 삭제합니다. 삭제된
                                레시피는 복구할 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-0">
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (savedRecipeId == null) return;
                                  setDeleting(true);
                                  try {
                                    await deleteSavedRecipe(savedRecipeId);
                                    setShowDeleteConfirm(false);
                                    onOpenChange(false);
                                    onRecipeDeleted();
                                  } catch (err) {
                                    toast({
                                      title: "삭제 실패",
                                      description:
                                        "레시피 삭제에 실패했습니다.",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setDeleting(false);
                                  }
                                }}
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    <Button
                      onClick={() => onOpenChange(false)}
                      className={
                        savedRecipeId != null && onRecipeDeleted
                          ? "flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                          : "w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      }
                    >
                      닫기
                    </Button>
                  </motion.div>
                ) : (
                  // 새 레시피 생성하는 경우 - 저장 및 재생성 버튼 표시
                  <div className="flex gap-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1"
                    >
                      <Button
                        onClick={async () => {
                          if (!recipeMarkdown || !recipeTitle) return;
                          setSaving(true);
                          try {
                            await saveRecipe({
                              title: recipeTitle,
                              content: recipeMarkdown,
                              source: source || "fridge_multi",
                              used_meats:
                                usedMeats.length > 0
                                  ? JSON.stringify(usedMeats)
                                  : null,
                            });
                            toast({
                              title: "레시피가 저장되었습니다! 📝",
                              description:
                                "레시피 탐색에서 저장된 레시피를 확인할 수 있습니다.",
                            });
                            // 레시피 목록 업데이트 콜백 호출
                            if (onRecipeSaved) {
                              onRecipeSaved();
                            }
                            // 저장 완료 후 모달 닫기
                            onOpenChange(false);
                          } catch (err: any) {
                            console.error("Failed to save recipe:", err);
                            toast({
                              title: "레시피 저장 실패",
                              description: err.message || "다시 시도해주세요.",
                              variant: "destructive",
                            });
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving || !recipeMarkdown}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            저장 중...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            레시피 저장
                          </>
                        )}
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1"
                    >
                      <Button
                        onClick={generateRecipes}
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary/10"
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        다른 레시피 추천받기
                      </Button>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

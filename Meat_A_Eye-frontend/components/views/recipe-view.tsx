"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Clock,
  ChefHat,
  Beef,
  TrendingUp,
  Star,
  Trash2,
  Ham,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getRecipes,
  getSavedRecipes,
  addRecipeBookmark,
  removeRecipeBookmark,
  deleteSavedRecipe,
} from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import type { Recipe } from "@/constants/mockData";
import { LLMRecipeModal } from "@/components/llm-recipe-modal";
import { PorkIcon } from "@/components/icons/pork-icon";
import { getRandomIcon } from "@/src/lib/icon-matcher";
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categories = ["전체", "돼지고기", "소고기"];
type ViewMode = "all" | "bookmarks";

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "초급":
      return "bg-green-100 text-green-700 border-green-300";
    case "중급":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "고급":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

export function RecipeView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFridgeRandomModal, setShowFridgeRandomModal] = useState(false);
  const [fridgeRecipeMeatCategory, setFridgeRecipeMeatCategory] = useState<
    "beef" | "pork" | undefined
  >(undefined);
  const [showSavedRecipeModal, setShowSavedRecipeModal] = useState(false);
  const [selectedRecipeContent, setSelectedRecipeContent] =
    useState<string>("");
  const [selectedRecipeTitle, setSelectedRecipeTitle] = useState<string>("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmRecipeId, setDeleteConfirmRecipeId] = useState<
    string | null
  >(null);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAllRecipes();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [activeCategory, viewMode, allRecipes]);

  // 레시피 목록이 바뀌면 랜덤 아이콘 배정
  useEffect(() => {
    if (allRecipes.length === 0) return;
    const loadIcons = async () => {
      const urls: Record<string, string> = {};
      await Promise.all(
        allRecipes.map(async (recipe) => {
          try {
            const cat = recipe.meatType === "돼지고기" ? "pork" : "beef";
            urls[recipe.id] = await getRandomIcon(cat);
          } catch {
            // 매칭 실패 시 기본 아이콘
          }
        }),
      );
      setIconUrls(urls);
    };
    loadIcons();
  }, [allRecipes]);

  const loadAllRecipes = async () => {
    setLoading(true);
    try {
      const data = await getRecipes(); // 전체 레시피 로드
      setAllRecipes(data);
      setRecipes(data);
    } catch (error) {
      console.error("Failed to load recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecipes = () => {
    let list = allRecipes;
    if (viewMode === "bookmarks") list = list.filter((r) => r.isBookmarked);
    if (activeCategory !== "전체")
      list = list.filter((r) => r.meatType === activeCategory);
    setRecipes(list);
  };

  const handleToggleBookmark = async (
    e: React.MouseEvent,
    recipeId: string,
    isBookmarked: boolean,
  ) => {
    e.stopPropagation();
    if (bookmarkingId) return;
    const id = parseInt(recipeId, 10);
    const nextBookmarked = !isBookmarked;
    setBookmarkingId(recipeId);
    // 낙관적 업데이트: 화면은 즉시 반영
    setAllRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, isBookmarked: nextBookmarked } : r,
      ),
    );
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, isBookmarked: nextBookmarked } : r,
      ),
    );
    try {
      if (isBookmarked) await removeRecipeBookmark(id);
      else await addRecipeBookmark(id);
      toast({
        title: isBookmarked ? "즐겨찾기 해제" : "즐겨찾기 추가",
        description: isBookmarked
          ? "즐겨찾기에서 제거되었습니다."
          : "즐겨찾기에 추가되었습니다.",
      });
    } catch (err) {
      setAllRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, isBookmarked } : r)),
      );
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, isBookmarked } : r)),
      );
      toast({
        title: "오류",
        description: "즐겨찾기 변경에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setBookmarkingId(null);
    }
  };

  const handleDeleteRecipeClick = (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeleteConfirmRecipeId(recipeId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmRecipeId) return;
    setDeletingId(deleteConfirmRecipeId);
    setDeleteConfirmRecipeId(null);
    try {
      await deleteSavedRecipe(parseInt(deleteConfirmRecipeId, 10));
      await loadAllRecipes();
    } catch (err) {
      toast({
        title: "삭제 실패",
        description: "레시피 삭제에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRecipeClick = async (recipeId: string) => {
    try {
      const response = await getSavedRecipes();
      const savedRecipe = response.recipes.find(
        (r) => String(r.id) === recipeId,
      );
      if (savedRecipe) {
        setSelectedRecipeId(recipeId);
        setSelectedRecipeContent(savedRecipe.content);
        setSelectedRecipeTitle(savedRecipe.title);
        setShowSavedRecipeModal(true);
      }
    } catch (error) {
      console.error("Failed to load recipe details:", error);
      toast({
        title: "레시피를 불러올 수 없습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    return recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 초기 로딩만 전체 화면 표시
  if (loading && allRecipes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">레시피를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card + AI 레시피 CTA */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ChefHat className="w-5 h-5" />
                레시피 탐색
              </CardTitle>
              <CardDescription>
                부위별 다양한 요리법을 찾아보세요
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2 border-primary text-primary hover:bg-primary/10 font-semibold"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span className="hidden sm:inline">냉장고 기반</span>{" "}
                      레시피 추천
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 p-1.5">
                    <DropdownMenuItem
                      onClick={() => {
                        setFridgeRecipeMeatCategory(undefined);
                        setShowFridgeRandomModal(true);
                      }}
                      className="gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                    >
                      <ChefHat className="w-4 h-4 text-[#800020]" />
                      <span className="font-medium">전체 (랜덤)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setFridgeRecipeMeatCategory("beef");
                        setShowFridgeRandomModal(true);
                      }}
                      className="gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                    >
                      <Beef className="w-4 h-4 text-red-700" />
                      <span className="font-medium">소고기로 추천</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setFridgeRecipeMeatCategory("pork");
                        setShowFridgeRandomModal(true);
                      }}
                      className="gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                    >
                      <Ham className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">돼지고기로 추천</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="레시피 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border rounded-xl h-12"
        />
      </div>

      {/* 1행: 전체 / 즐겨찾기 */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "bookmarks"] as const).map((mode) => (
          <motion.button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              viewMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80",
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {mode === "all" ? "전체" : "즐겨찾기"}
          </motion.button>
        ))}
      </div>

      {/* 2행: 전체 / 돼지고기 / 소고기 */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {categories.map((category) => (
          <motion.button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80",
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {category}
          </motion.button>
        ))}
      </div>

      {/* Recipe Grid - 반응형 카드 레이아웃 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe, index) => (
          <motion.div
            key={recipe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="bg-card border-primary/15 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col rounded-xl overflow-hidden"
              onClick={() => handleRecipeClick(recipe.id)}
            >
              {/* 카드 상단 - 아이콘 영역 (카드 세로 약 50%) */}
              <div
                className={cn(
                  "relative flex items-center justify-center py-6",
                  "min-h-[160px]",
                  recipe.meatType === "돼지고기"
                    ? "bg-gradient-to-br from-pink-50 to-pink-100/60"
                    : "bg-gradient-to-br from-primary/10 to-primary/5",
                )}
              >
                {iconUrls[recipe.id] ? (
                  <Image
                    src={iconUrls[recipe.id]}
                    alt={recipe.name}
                    width={180}
                    height={180}
                    className="object-contain drop-shadow-lg"
                    unoptimized
                  />
                ) : recipe.meatType === "돼지고기" ? (
                  <PorkIcon size={72} className="text-pink-500" />
                ) : (
                  <Beef className="w-[72px] h-[72px] text-primary/70" />
                )}
                {/* 즐겨찾기 */}
                <button
                  type="button"
                  onClick={(e) =>
                    handleToggleBookmark(e, recipe.id, !!recipe.isBookmarked)
                  }
                  disabled={bookmarkingId === recipe.id}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
                  aria-label={
                    recipe.isBookmarked ? "즐겨찾기 해제" : "즐겨찾기 추가"
                  }
                >
                  <Star
                    className={cn(
                      "w-4 h-4",
                      recipe.isBookmarked
                        ? "fill-amber-400 text-amber-500"
                        : "text-muted-foreground/60",
                    )}
                  />
                </button>
                {/* 난이도 뱃지 */}
                <Badge
                  className={cn(
                    "absolute top-2 left-2 text-[10px]",
                    getDifficultyColor(recipe.difficulty),
                  )}
                >
                  {recipe.difficulty}
                </Badge>
              </div>
              {/* 카드 하단 - 정보 */}
              <CardContent className="p-3.5 flex-1 flex flex-col">
                <h3 className="font-bold text-foreground text-sm leading-snug mb-1.5 line-clamp-2">
                  {recipe.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {recipe.meatType}
                </p>
                <div className="flex items-center justify-between mt-auto text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {recipe.cookingTime}분
                    </span>
                    {recipe.isPopular && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <TrendingUp className="w-3 h-3" />
                        인기
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e: React.MouseEvent) =>
                      handleDeleteRecipeClick(e, recipe.id)
                    }
                    disabled={deletingId === recipe.id}
                    className="h-7 px-1.5 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
                    aria-label="레시피 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">검색 결과가 없습니다</p>
        </motion.div>
      )}

      {/* 냉장고 랜덤 레시피 모달 */}
      <LLMRecipeModal
        open={showFridgeRandomModal}
        onOpenChange={setShowFridgeRandomModal}
        source="fridge_random"
        meatCategory={fridgeRecipeMeatCategory}
        onRecipeSaved={loadAllRecipes}
      />

      {/* 저장된 레시피 상세 보기 모달 */}
      <LLMRecipeModal
        open={showSavedRecipeModal}
        onOpenChange={(open) => {
          setShowSavedRecipeModal(open);
          if (!open) setSelectedRecipeId(null);
        }}
        initialContent={selectedRecipeContent}
        initialTitle={selectedRecipeTitle}
        initialIconUrl={
          selectedRecipeId ? iconUrls[selectedRecipeId] : undefined
        }
        savedRecipeId={
          selectedRecipeId ? parseInt(selectedRecipeId, 10) : undefined
        }
        onRecipeDeleted={() => {
          setShowSavedRecipeModal(false);
          setSelectedRecipeId(null);
          loadAllRecipes();
        }}
      />

      {/* 레시피 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!deleteConfirmRecipeId}
        onOpenChange={(open) => !open && setDeleteConfirmRecipeId(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">
              레시피 삭제
            </AlertDialogTitle>
            <AlertDialogDescription>
              저장 목록에서 이 레시피를 삭제합니다. 삭제된 레시피는 복구할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

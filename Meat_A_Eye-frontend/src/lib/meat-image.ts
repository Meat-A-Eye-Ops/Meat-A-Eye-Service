/**
 * 부위명(part_name) → 냉장고 카드 배경 이미지 URL 매핑
 *
 * 카테고리(Beef/Pork)에 따라 랜덤 음식 사진을 반환합니다.
 */

const BEEF_IMAGES: readonly string[] = [
  "/icons/beef/amelie123-raw-meat-597952_1920.webp",
  "/icons/beef/Beef_image1.webp",
  "/icons/beef/dbreen-steak-1083567_1920.webp",
  "/icons/beef/lisabaker-dish-6764308_1920.webp",
  "/icons/beef/muju_pixel-grilled-8042308_1920.webp",
  "/icons/beef/nickygirly-meal-5512580_1920.webp",
  "/icons/beef/publicdomainpictures-lemon-69756_1920.webp",
  "/icons/beef/videofan-having-lunch-985319_1920.webp",
  "/icons/beef/zrenate-kitchen-2071244_1920.webp",
];

const PORK_IMAGES: readonly string[] = [
  "/icons/pork/cegoh-braise-pork-1057835_1920.webp",
  "/icons/pork/frankzhang0711-twice-cooked-pork-2556634_1920.webp",
  "/icons/pork/hnbs-roast-crust-2278382_1920.webp",
  "/icons/pork/jonathanvalencia5-pork-intestine-2187512_1920.webp",
  "/icons/pork/luow-pork-4265997_1920.webp",
  "/icons/pork/ritae-schnitzel-3279045_1920.webp",
  "/icons/pork/shy_photographer-pork-tenderloin-3790406_1920.webp",
  "/icons/pork/wanwalittle-food-3861918_1920.webp",
  "/icons/pork/webandi-fillet-4846847_1920.webp",
  "/icons/pork/zizitop101-pork-skewers-7657178_1920.webp",
];

/**
 * 부위 영문명으로 랜덤 음식 이미지 URL을 반환합니다.
 * 해당 카테고리가 없으면 `null`을 반환합니다.
 */
export function getMeatCardImage(
  partName: string | null | undefined,
): string | null {
  if (!partName) return null;

  const pool = partName.startsWith("Pork") ? PORK_IMAGES : BEEF_IMAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

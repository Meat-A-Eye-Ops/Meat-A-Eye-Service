/**
 * 부위명(part_name) → 냉장고 카드 배경 이미지 URL 매핑
 *
 * 이미지 파일은 /public/back_images/{part_name}_image.png 형식으로 저장되어 있습니다.
 * part_name 은 DB meat_info.part_name(영문)과 1:1 대응합니다.
 */

/** 이미지가 존재하는 부위 목록 (실제 /public/back_images 에 있는 파일 기준) */
const AVAILABLE_IMAGES: ReadonlySet<string> = new Set([
  // 소 9부위
  "Beef_Tenderloin",
  "Beef_Ribeye",
  "Beef_Sirloin",
  "Beef_Chuck",
  "Beef_Round",
  "Beef_Brisket",
  "Beef_Shank",
  "Beef_Rib",
  "Beef_Shoulder",
  // 돼지 7부위
  "Pork_Tenderloin",
  "Pork_Loin",
  "Pork_Belly",
  "Pork_Ham",
  "Pork_Neck",
  "Pork_PicnicShoulder",
  "Pork_Ribs",
]);

/**
 * 부위 영문명으로 카드 배경 이미지 URL을 반환합니다.
 * 해당 이미지가 없으면 `null`을 반환합니다.
 */
export function getMeatCardImage(partName: string | null | undefined): string | null {
  if (!partName) return null;

  if (AVAILABLE_IMAGES.has(partName)) {
    return `/back_images/${partName}_image.png`;
  }

  return null;
}

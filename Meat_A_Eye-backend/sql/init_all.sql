-- ============================================================
-- Meat-A-Eye 전체 DB 초기화 스크립트
-- schema.sql + 모든 마이그레이션 + saved_recipes + recipe_bookmarks 통합
-- 새 AWS RDS(meat-a-eye-db)에 한 번에 실행
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 기존 테이블이 있으면 전부 삭제 (새 DB이므로 안전)
DROP TABLE IF EXISTS recipe_bookmarks;
DROP TABLE IF EXISTS saved_recipes;
DROP TABLE IF EXISTS web_notifications;
DROP TABLE IF EXISTS web_push_subscriptions;
DROP TABLE IF EXISTS market_price_history;
DROP TABLE IF EXISTS market_prices;
DROP TABLE IF EXISTS meat_nutrition;
DROP TABLE IF EXISTS fridge_items;
DROP TABLE IF EXISTS recognition_logs;
DROP TABLE IF EXISTS meat_info;
DROP TABLE IF EXISTS members;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. members
-- ============================================================
CREATE TABLE members (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NULL UNIQUE COMMENT '이메일 (게스트는 NULL)',
  password VARCHAR(255) NULL COMMENT '비밀번호 (게스트는 NULL)',
  nickname VARCHAR(50) NOT NULL COMMENT '닉네임',
  web_push_subscription TEXT NULL COMMENT 'Web Push JSON (Deprecated)',
  is_guest TINYINT(1) NOT NULL DEFAULT 0 COMMENT '게스트 여부',
  guest_id VARCHAR(36) NULL UNIQUE COMMENT '게스트 UUID',
  last_login_at DATETIME NULL COMMENT '마지막 로그인 시간',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '회원가입 일시',
  INDEX idx_member_guest_id (guest_id),
  INDEX idx_member_email (email),
  INDEX idx_member_is_guest (is_guest)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원 정보';

-- ============================================================
-- 2. meat_info
-- ============================================================
CREATE TABLE meat_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  part_name VARCHAR(100) NOT NULL COMMENT '부위명 (영문)',
  category VARCHAR(20) NOT NULL COMMENT '카테고리 (beef, pork)',
  calories INT NULL COMMENT '칼로리 (100g당)',
  protein DECIMAL(5,2) NULL COMMENT '단백질 (100g당, g)',
  fat DECIMAL(5,2) NULL COMMENT '지방 (100g당, g)',
  storage_guide TEXT NULL COMMENT '보관 가이드',
  CONSTRAINT chk_meat_category CHECK (category IN ('beef', 'pork')),
  INDEX idx_meat_part_name (part_name),
  INDEX idx_meat_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고기 부위 기본 정보';

-- ============================================================
-- 3. recognition_logs
-- ============================================================
CREATE TABLE recognition_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT NOT NULL COMMENT '회원 ID',
  image_url VARCHAR(500) NOT NULL COMMENT '분석한 이미지 URL',
  part_name VARCHAR(100) NOT NULL COMMENT '인식된 부위명',
  confidence_score DECIMAL(5,2) NOT NULL COMMENT '신뢰도',
  illuminance_status VARCHAR(20) NULL COMMENT '조도 상태',
  browser_agent VARCHAR(255) NULL COMMENT '브라우저 정보',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recognition_member FOREIGN KEY (member_id)
    REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_recognition_member (member_id),
  INDEX idx_recognition_part_name (part_name),
  INDEX idx_recognition_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 인식 로그';

-- ============================================================
-- 4. fridge_items  (migration 002, 003 반영: meat_info_id NULL허용 + custom_name)
-- ============================================================
CREATE TABLE fridge_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT NOT NULL COMMENT '회원 ID',
  meat_info_id INT NULL COMMENT '고기 정보 ID (NULL이면 부위 미선택)',
  storage_date DATE NOT NULL COMMENT '보관 시작일',
  expiry_date DATE NOT NULL COMMENT '유통기한',
  status VARCHAR(20) NOT NULL DEFAULT 'stored' COMMENT '상태 (stored/consumed)',
  alert_before INT NULL DEFAULT 3 COMMENT 'D-Day 알림 n일 전',
  use_web_push TINYINT(1) NULL DEFAULT 0 COMMENT 'Web Push 알림 사용 여부',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  slaughter_date DATE NULL COMMENT '도축일자',
  grade VARCHAR(50) NULL COMMENT '등급',
  trace_number VARCHAR(100) NULL COMMENT '이력번호',
  origin VARCHAR(100) NULL COMMENT '원산지',
  company_name VARCHAR(200) NULL COMMENT '업체명',
  custom_name VARCHAR(100) NULL COMMENT '사용자 지정 고기 이름',
  CONSTRAINT fk_fridge_member FOREIGN KEY (member_id)
    REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_fridge_meat FOREIGN KEY (meat_info_id)
    REFERENCES meat_info(id),
  CONSTRAINT chk_fridge_status CHECK (status IN ('stored', 'consumed')),
  INDEX idx_fridge_member (member_id),
  INDEX idx_fridge_expiry_date (expiry_date),
  INDEX idx_fridge_status (status),
  INDEX idx_trace_number (trace_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='냉장고 보관 목록';

-- ============================================================
-- 5. meat_nutrition
-- ============================================================
CREATE TABLE meat_nutrition (
  id INT AUTO_INCREMENT PRIMARY KEY,
  food_nm VARCHAR(255) NOT NULL COMMENT '식품명',
  calories FLOAT NULL COMMENT '에너지(kcal/100g)',
  protein FLOAT NULL COMMENT '단백질(g/100g)',
  fat FLOAT NULL COMMENT '지방(g/100g)',
  carbs FLOAT NULL COMMENT '탄수화물(g/100g)',
  INDEX idx_food_nm (food_nm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='영양정보 (전국통합식품영양성분정보 육류)';

-- ============================================================
-- 6. market_prices  (migration 001, 005 반영: unique + grade_code)
-- ============================================================
CREATE TABLE market_prices (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  part_name VARCHAR(100) NOT NULL COMMENT '부위명',
  current_price INT NOT NULL COMMENT '100g당 가격 (원)',
  price_date DATE NOT NULL COMMENT '가격 기준일',
  region VARCHAR(50) NOT NULL COMMENT '지역',
  grade_code VARCHAR(10) NOT NULL DEFAULT '' COMMENT '등급코드',
  UNIQUE KEY uq_market_price (part_name, region, price_date),
  INDEX idx_price_part_region_date (part_name, region, price_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='시세 정보';

-- ============================================================
-- 7. market_price_history
-- ============================================================
CREATE TABLE market_price_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  part_name VARCHAR(100) NOT NULL COMMENT '부위명',
  price INT NOT NULL COMMENT '가격 (원)',
  price_date DATE NOT NULL COMMENT '가격 기준일',
  region VARCHAR(50) NOT NULL COMMENT '지역',
  source VARCHAR(50) NULL DEFAULT 'KAMIS' COMMENT '데이터 출처',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_history_part_region_date (part_name, region, price_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='시세 이력';

-- ============================================================
-- 8. web_push_subscriptions
-- ============================================================
CREATE TABLE web_push_subscriptions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT NOT NULL COMMENT '회원 ID',
  endpoint VARCHAR(1024) NOT NULL COMMENT 'Push 엔드포인트 URL',
  p256dh_key TEXT NOT NULL COMMENT 'P256DH 공개키',
  auth_key TEXT NOT NULL COMMENT '인증 키',
  user_agent VARCHAR(512) NULL COMMENT '브라우저 정보',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_push_member FOREIGN KEY (member_id)
    REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE KEY uq_push_member_endpoint (member_id, endpoint(255)),
  INDEX idx_push_member (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Web Push 구독';

-- ============================================================
-- 9. web_notifications
-- ============================================================
CREATE TABLE web_notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT NOT NULL COMMENT '회원 ID',
  fridge_item_id BIGINT NULL COMMENT '냉장고 아이템 ID',
  notification_type VARCHAR(50) NOT NULL COMMENT '알림 타입',
  title VARCHAR(255) NOT NULL COMMENT '알림 제목',
  body TEXT NOT NULL COMMENT '알림 내용',
  scheduled_at DATETIME NOT NULL COMMENT '알림 예약 시간',
  sent_at DATETIME NULL COMMENT '실제 발송 시간',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '상태 (pending/sent/failed)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_member FOREIGN KEY (member_id)
    REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_fridge FOREIGN KEY (fridge_item_id)
    REFERENCES fridge_items(id) ON DELETE SET NULL,
  CONSTRAINT chk_notification_status CHECK (status IN ('pending', 'sent', 'failed')),
  INDEX idx_notification_member_scheduled (member_id, scheduled_at),
  INDEX idx_notification_status (status, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림 발송 이력';

-- ============================================================
-- 10. saved_recipes
-- ============================================================
CREATE TABLE saved_recipes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL COMMENT '레시피 제목',
  content TEXT NOT NULL COMMENT '레시피 내용 (마크다운)',
  source VARCHAR(50) NOT NULL COMMENT '레시피 출처 (ai_random, fridge_random, fridge_multi, part_specific)',
  used_meats TEXT NULL COMMENT '사용된 고기 목록 (JSON)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_saved_recipe_member FOREIGN KEY (member_id)
    REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_member_id (member_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='저장된 레시피';

-- ============================================================
-- 11. recipe_bookmarks
-- ============================================================
CREATE TABLE recipe_bookmarks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT NOT NULL,
  saved_recipe_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recipe_bookmark_member_recipe (member_id, saved_recipe_id),
  CONSTRAINT fk_recipe_bookmark_member FOREIGN KEY (member_id)
    REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_bookmark_recipe FOREIGN KEY (saved_recipe_id)
    REFERENCES saved_recipes(id) ON DELETE CASCADE,
  INDEX idx_recipe_bookmarks_member_id (member_id),
  INDEX idx_recipe_bookmarks_saved_recipe_id (saved_recipe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='레시피 즐겨찾기';

-- ============================================================
-- 초기 데이터: meat_info 17개 부위 (소 10 + 돼지 7)
-- ============================================================
INSERT INTO meat_info (part_name, category, calories, protein, fat, storage_guide) VALUES
('Beef_Tenderloin', 'beef', NULL, NULL, NULL, '냉장 5일, 냉동 6개월'),
('Beef_Ribeye', 'beef', NULL, NULL, NULL, '냉장 5일, 냉동 6개월'),
('Beef_Sirloin', 'beef', NULL, NULL, NULL, '냉장 5일, 냉동 6개월'),
('Beef_Chuck', 'beef', NULL, NULL, NULL, '냉장 3일, 냉동 6개월'),
('Beef_Round', 'beef', NULL, NULL, NULL, '냉장 5일, 냉동 6개월'),
('Beef_BottomRound', 'beef', NULL, NULL, NULL, '냉장 5일, 냉동 6개월'),
('Beef_Brisket', 'beef', NULL, NULL, NULL, '냉장 3일, 냉동 6개월'),
('Beef_Shank', 'beef', NULL, NULL, NULL, '냉장 3일, 냉동 6개월'),
('Beef_Rib', 'beef', NULL, NULL, NULL, '냉장 3일, 냉동 6개월'),
('Beef_Shoulder', 'beef', NULL, NULL, NULL, '냉장 3일, 냉동 6개월'),
('Pork_Tenderloin', 'pork', NULL, NULL, NULL, '냉장 3일, 냉동 3개월'),
('Pork_Loin', 'pork', NULL, NULL, NULL, '냉장 3일, 냉동 3개월'),
('Pork_Neck', 'pork', NULL, NULL, NULL, '냉장 3일, 냉동 3개월'),
('Pork_PicnicShoulder', 'pork', NULL, NULL, NULL, '냉장 3일, 냉동 3개월'),
('Pork_Ham', 'pork', NULL, NULL, NULL, '냉장 3일, 냉동 3개월'),
('Pork_Belly', 'pork', NULL, NULL, NULL, '냉장 3일, 냉동 3개월'),
('Pork_Ribs', 'pork', NULL, NULL, NULL, '냉장 3일, 냉동 3개월');

-- ============================================================
-- 완료: 테이블 11개 + meat_info 시드 17행
-- 이후 추가 작업:
--   python scripts/migrate_nutrition.py  (영양정보 JSON → meat_nutrition 테이블)
-- ============================================================

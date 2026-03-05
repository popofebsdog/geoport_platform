-- 創建 users 表
-- 控管資料上傳與查看權限
-- 創建時間: 2025-09-24

-- 創建 users 表
CREATE TABLE IF NOT EXISTS users (
    -- 主鍵
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本資訊
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100), -- 顯示名稱
    full_name VARCHAR(100), -- 全名
    
    -- 認證資訊
    password_hash VARCHAR(255) NOT NULL, -- 密碼雜湊
    salt VARCHAR(255), -- 密碼鹽值
    
    -- 角色和權限
    role user_role_enum NOT NULL DEFAULT 'viewer',
    permissions TEXT[], -- 額外權限陣列
    
    -- 組織資訊
    organization VARCHAR(255), -- 所屬組織
    department VARCHAR(255), -- 所屬部門
    position VARCHAR(255), -- 職位
    employee_id VARCHAR(50), -- 員工編號
    
    -- 聯絡資訊
    phone VARCHAR(20),
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Taipei',
    
    -- 偏好設定
    language VARCHAR(10) DEFAULT 'zh-TW', -- 語言偏好
    theme VARCHAR(20) DEFAULT 'light', -- 主題偏好 (light, dark, auto)
    font_size VARCHAR(10) DEFAULT 'medium', -- 字體大小 (small, medium, large)
    
    -- 帳戶狀態
    is_active BOOLEAN DEFAULT TRUE, -- 帳戶是否啟用
    is_verified BOOLEAN DEFAULT FALSE, -- 郵箱是否驗證
    is_locked BOOLEAN DEFAULT FALSE, -- 帳戶是否鎖定
    failed_login_attempts INTEGER DEFAULT 0, -- 失敗登入次數
    locked_until TIMESTAMP WITH TIME ZONE, -- 鎖定到期時間
    
    -- 最後活動
    last_login_at TIMESTAMP WITH TIME ZONE, -- 最後登入時間
    last_login_ip INET, -- 最後登入IP
    last_activity_at TIMESTAMP WITH TIME ZONE, -- 最後活動時間
    
    -- 密碼相關
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- 密碼變更時間
    password_expires_at TIMESTAMP WITH TIME ZONE, -- 密碼到期時間
    must_change_password BOOLEAN DEFAULT FALSE, -- 是否必須變更密碼
    
    -- 雙因子認證
    two_factor_enabled BOOLEAN DEFAULT FALSE, -- 是否啟用雙因子認證
    two_factor_secret VARCHAR(255), -- 雙因子認證密鑰
    backup_codes TEXT[], -- 備用代碼
    
    -- 通知設定
    email_notifications BOOLEAN DEFAULT TRUE, -- 郵件通知
    push_notifications BOOLEAN DEFAULT TRUE, -- 推播通知
    notification_preferences JSONB, -- 通知偏好設定
    
    -- 使用統計
    login_count INTEGER DEFAULT 0, -- 登入次數
    upload_count INTEGER DEFAULT 0, -- 上傳次數
    download_count INTEGER DEFAULT 0, -- 下載次數
    total_upload_size BIGINT DEFAULT 0, -- 總上傳大小
    
    -- 會話管理
    session_token VARCHAR(255), -- 會話令牌
    session_expires_at TIMESTAMP WITH TIME ZONE, -- 會話到期時間
    
    -- 元數據
    metadata JSONB, -- 額外的元數據
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_users_username_length CHECK (LENGTH(username) >= 3),
    CONSTRAINT chk_users_username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT chk_users_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_users_display_name_length CHECK (LENGTH(display_name) >= 2 OR display_name IS NULL),
    CONSTRAINT chk_users_failed_login_attempts CHECK (failed_login_attempts >= 0),
    CONSTRAINT chk_users_login_count CHECK (login_count >= 0),
    CONSTRAINT chk_users_upload_count CHECK (upload_count >= 0),
    CONSTRAINT chk_users_download_count CHECK (download_count >= 0),
    CONSTRAINT chk_users_total_upload_size CHECK (total_upload_size >= 0),
    CONSTRAINT chk_users_theme CHECK (theme IN ('light', 'dark', 'auto')),
    CONSTRAINT chk_users_font_size CHECK (font_size IN ('small', 'medium', 'large')),
    CONSTRAINT chk_users_language CHECK (language IN ('zh-TW', 'zh-CN', 'en-US', 'ja-JP'))
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_activity_at ON users(last_activity_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token) WHERE session_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING gin(permissions) WHERE permissions IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_notification_preferences ON users USING gin(notification_preferences) WHERE notification_preferences IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_metadata ON users USING gin(metadata) WHERE metadata IS NOT NULL;

-- 創建觸發器：自動更新 updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 創建觸發器：更新最後活動時間
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_update_activity
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity();

-- 創建觸發器：帳戶鎖定檢查
CREATE OR REPLACE FUNCTION check_account_lock()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果失敗登入次數達到5次，鎖定帳戶1小時
    IF NEW.failed_login_attempts >= 5 AND OLD.failed_login_attempts < 5 THEN
        NEW.is_locked = TRUE;
        NEW.locked_until = CURRENT_TIMESTAMP + INTERVAL '1 hour';
    END IF;
    
    -- 如果鎖定時間已過，解除鎖定
    IF NEW.is_locked = TRUE AND NEW.locked_until IS NOT NULL AND NEW.locked_until <= CURRENT_TIMESTAMP THEN
        NEW.is_locked = FALSE;
        NEW.locked_until = NULL;
        NEW.failed_login_attempts = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_check_account_lock
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_account_lock();

-- 創建視圖：活躍用戶
CREATE OR REPLACE VIEW active_users AS
SELECT 
    user_id,
    username,
    email,
    display_name,
    full_name,
    role,
    permissions,
    organization,
    department,
    position,
    phone,
    language,
    theme,
    font_size,
    is_active,
    is_verified,
    last_login_at,
    last_activity_at,
    login_count,
    upload_count,
    download_count,
    total_upload_size,
    created_at,
    updated_at
FROM users 
WHERE deleted_at IS NULL;

-- 創建視圖：用戶統計
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
    COUNT(*) FILTER (WHERE role = 'editor') as editor_users,
    COUNT(*) FILTER (WHERE role = 'viewer') as viewer_users,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_users,
    COUNT(*) FILTER (WHERE is_verified = TRUE) as verified_users,
    COUNT(*) FILTER (WHERE last_login_at >= CURRENT_DATE - INTERVAL '30 days') as active_last_30_days,
    COUNT(*) FILTER (WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days') as active_last_7_days,
    AVG(login_count) as avg_login_count,
    SUM(total_upload_size) as total_upload_size_all_users
FROM users 
WHERE deleted_at IS NULL;

-- 創建視圖：組織統計
CREATE OR REPLACE VIEW organization_statistics AS
SELECT 
    organization,
    COUNT(*) as user_count,
    COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
    COUNT(*) FILTER (WHERE role = 'editor') as editor_count,
    COUNT(*) FILTER (WHERE role = 'viewer') as viewer_count,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_count,
    SUM(total_upload_size) as total_upload_size
FROM users 
WHERE deleted_at IS NULL AND organization IS NOT NULL
GROUP BY organization
ORDER BY user_count DESC;

-- 創建函數：驗證用戶權限
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role_enum;
    user_permissions TEXT[];
BEGIN
    -- 獲取用戶角色和權限
    SELECT role, permissions INTO user_role, user_permissions
    FROM users 
    WHERE user_id = p_user_id AND deleted_at IS NULL AND is_active = TRUE;
    
    -- 如果用戶不存在或未啟用，返回 FALSE
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 管理員擁有所有權限
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- 檢查特定權限
    IF user_permissions IS NOT NULL AND p_permission = ANY(user_permissions) THEN
        RETURN TRUE;
    END IF;
    
    -- 根據角色檢查基本權限
    CASE user_role
        WHEN 'editor' THEN
            RETURN p_permission IN ('read', 'write', 'upload', 'download');
        WHEN 'viewer' THEN
            RETURN p_permission IN ('read', 'download');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 創建函數：更新用戶登入資訊
CREATE OR REPLACE FUNCTION update_user_login_info(
    p_user_id UUID,
    p_login_ip INET
) RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        last_login_at = CURRENT_TIMESTAMP,
        last_login_ip = p_login_ip,
        last_activity_at = CURRENT_TIMESTAMP,
        login_count = login_count + 1,
        failed_login_attempts = 0,
        is_locked = FALSE,
        locked_until = NULL
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 添加註釋
COMMENT ON TABLE users IS '用戶表，控管資料上傳與查看權限';
COMMENT ON COLUMN users.user_id IS '用戶唯一識別碼';
COMMENT ON COLUMN users.username IS '用戶名稱';
COMMENT ON COLUMN users.email IS '電子郵件';
COMMENT ON COLUMN users.display_name IS '顯示名稱';
COMMENT ON COLUMN users.full_name IS '全名';
COMMENT ON COLUMN users.password_hash IS '密碼雜湊';
COMMENT ON COLUMN users.role IS '用戶角色 (admin, editor, viewer)';
COMMENT ON COLUMN users.permissions IS '額外權限陣列';
COMMENT ON COLUMN users.organization IS '所屬組織';
COMMENT ON COLUMN users.department IS '所屬部門';
COMMENT ON COLUMN users.position IS '職位';
COMMENT ON COLUMN users.employee_id IS '員工編號';
COMMENT ON COLUMN users.phone IS '電話號碼';
COMMENT ON COLUMN users.timezone IS '時區';
COMMENT ON COLUMN users.language IS '語言偏好';
COMMENT ON COLUMN users.theme IS '主題偏好';
COMMENT ON COLUMN users.font_size IS '字體大小偏好';
COMMENT ON COLUMN users.is_active IS '帳戶是否啟用';
COMMENT ON COLUMN users.is_verified IS '郵箱是否驗證';
COMMENT ON COLUMN users.is_locked IS '帳戶是否鎖定';
COMMENT ON COLUMN users.failed_login_attempts IS '失敗登入次數';
COMMENT ON COLUMN users.locked_until IS '鎖定到期時間';
COMMENT ON COLUMN users.last_login_at IS '最後登入時間';
COMMENT ON COLUMN users.last_login_ip IS '最後登入IP';
COMMENT ON COLUMN users.last_activity_at IS '最後活動時間';
COMMENT ON COLUMN users.password_changed_at IS '密碼變更時間';
COMMENT ON COLUMN users.password_expires_at IS '密碼到期時間';
COMMENT ON COLUMN users.must_change_password IS '是否必須變更密碼';
COMMENT ON COLUMN users.two_factor_enabled IS '是否啟用雙因子認證';
COMMENT ON COLUMN users.two_factor_secret IS '雙因子認證密鑰';
COMMENT ON COLUMN users.backup_codes IS '備用代碼';
COMMENT ON COLUMN users.email_notifications IS '郵件通知';
COMMENT ON COLUMN users.push_notifications IS '推播通知';
COMMENT ON COLUMN users.notification_preferences IS '通知偏好設定 (JSON)';
COMMENT ON COLUMN users.login_count IS '登入次數';
COMMENT ON COLUMN users.upload_count IS '上傳次數';
COMMENT ON COLUMN users.download_count IS '下載次數';
COMMENT ON COLUMN users.total_upload_size IS '總上傳大小';
COMMENT ON COLUMN users.session_token IS '會話令牌';
COMMENT ON COLUMN users.session_expires_at IS '會話到期時間';
COMMENT ON COLUMN users.metadata IS '額外的元數據 (JSON)';
COMMENT ON COLUMN users.deleted_at IS '軟刪除時間戳記';

COMMENT ON VIEW active_users IS '活躍用戶視圖 (排除已刪除)';
COMMENT ON VIEW user_statistics IS '用戶統計資訊視圖';
COMMENT ON VIEW organization_statistics IS '組織統計資訊視圖';
COMMENT ON FUNCTION check_user_permission(UUID, TEXT) IS '檢查用戶權限';
COMMENT ON FUNCTION update_user_login_info(UUID, INET) IS '更新用戶登入資訊';

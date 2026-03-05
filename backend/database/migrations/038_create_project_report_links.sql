-- 038: 建立專案報告連結表
-- 用途：儲存每個母專案相關的外部報告網址

CREATE TABLE IF NOT EXISTS project_report_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引：快速查詢特定專案的報告連結
CREATE INDEX IF NOT EXISTS idx_project_report_links_project_id ON project_report_links(project_id);

-- 觸發器：自動更新 updated_at
CREATE TRIGGER update_project_report_links_updated_at
  BEFORE UPDATE ON project_report_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

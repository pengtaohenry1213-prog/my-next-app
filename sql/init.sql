-- =====================================================
-- 1. 创建 todos 表
-- =====================================================
CREATE TABLE IF NOT EXISTS public.todos (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 500),
    image_url TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);

-- =====================================================
-- 2. 启用 Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. RLS 策略
-- =====================================================

-- 策略1: 用户只能看到自己的 todos
DROP POLICY IF EXISTS "Users can view their own todos" ON public.todos;
CREATE POLICY "Users can view their own todos"
ON public.todos
FOR SELECT
USING (auth.uid() = user_id);

-- 策略2: 用户只能插入自己的 todos（必须登录）
DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
CREATE POLICY "Users can insert their own todos"
ON public.todos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 策略3: 用户只能更新自己的 todos
DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
CREATE POLICY "Users can update their own todos"
ON public.todos
FOR UPDATE
USING (auth.uid() = user_id);

-- 策略4: 用户只能删除自己的 todos
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;
CREATE POLICY "Users can delete their own todos"
ON public.todos
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 4. 自动更新 updated_at 触发器
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON public.todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Storage RLS for my-todo bucket (用户只能访问自己的图片)
-- =====================================================
-- 启用 storage 使用 RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- 允许已认证用户访问自己的 bucket
DROP POLICY IF EXISTS "Users can access their own bucket" ON storage.objects;
CREATE POLICY "Users can access their own bucket"
ON storage.objects
FOR ALL
USING (auth.uid()::text = (storage.foldername(name))[1]);

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- =====================================================
-- 7. 授予权限给 authenticated 用户角色
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.todos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.todos_id_seq TO authenticated;

-- =====================================================
-- 8. 启用 Realtime 功能
-- =====================================================
-- 启用 public.todos 表的 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Plus, Trash2, Pencil, X, Upload, LogOut, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Todo = {
  id: number;
  user_id: string;
  text: string;
  image_url: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

// 单例 Supabase 客户端，避免多次创建导致 IndexedDB 锁冲突
let supabaseInstance: ReturnType<typeof createClient> | null = null;
const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
};

// 压缩并转换为 WebP
const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [newTodoImage, setNewTodoImage] = useState<File | null>(null);
  const [newTodoImagePreview, setNewTodoImagePreview] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [user, setUser] = useState<{ id?: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingTodoId, setUploadingTodoId] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newTodoImageRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 使用单例 Supabase 客户端
  const supabase = getSupabaseClient();

  // 初始化 Effect
  useEffect(() => {
    let cancelled = false;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let authSubscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;

    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          setUser({ id: user.id, email: user.email });

          const { data: todosData } = await supabase
            .from("todos")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (cancelled) return;

          setTodos(todosData || []);
          setError(null);

          realtimeChannel = supabase
            .channel("todos-realtime")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "todos",
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                if (cancelled) return;

                if (payload.eventType === "INSERT") {
                  const newTodo = payload.new as Todo;
                  setTodos((prev) => {
                    if (prev.some((t) => t.id === newTodo.id)) return prev;
                    return [newTodo, ...prev];
                  });
                } else if (payload.eventType === "UPDATE") {
                  const updatedTodo = payload.new as Todo;
                  setTodos((prev) =>
                    prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t))
                  );
                } else if (payload.eventType === "DELETE") {
                  const oldTodo = payload.old as { id: number };
                  setTodos((prev) => prev.filter((t) => t.id !== oldTodo.id));
                }
              }
            )
            .subscribe();
        } else {
          setUser(null);
          setTodos([]);
        }
      } catch (err) {
        console.error("Load data error:", err);
        if (!cancelled) {
          setError("加载数据失败");
          setUser(null);
          setTodos([]);
        }
      }

      // 无论成功失败，都结束 loading
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    initData();

    authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });

        const { data: todosData } = await supabase
          .from("todos")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (!cancelled) {
          setTodos(todosData || []);
        }
      } else {
        if (!cancelled) {
          setUser(null);
          setTodos([]);
        }
      }
    }).data.subscription;

    return () => {
      cancelled = true;
      authSubscription?.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 关闭用户菜单点击外部
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  // 拖拽上传处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        setError("图片大小不能超过 5MB");
        return;
      }
      setNewTodoImage(file);
      setNewTodoImagePreview(URL.createObjectURL(file));
    }
  }, []);

  // 上传图片到 Supabase Storage
  const uploadImage = async (todoId: number, file: File) => {
    if (!user) return;

    try {
      setUploadingTodoId(todoId);
      setError(null);
      
      // 压缩并转换为 WebP
      const compressedFile = await compressImage(file);
      console.log(`原始大小: ${(file.size / 1024).toFixed(1)}KB -> 压缩后: ${(compressedFile.size / 1024).toFixed(1)}KB`);
      
      const fileName = `${Date.now()}.webp`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("my-todo")
        .upload(filePath, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        setError(`上传失败: ${uploadError.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("my-todo")
        .getPublicUrl(filePath);

      const { data: updateData, error: updateError } = await supabase
        .from("todos")
        .update({ image_url: publicUrl })
        .eq("id", todoId)
        .select()
        .single();

      if (updateError) {
        console.error("Update image_url error:", updateError);
        setError(`保存图片失败: ${updateError.message}`);
        return;
      }

      if (updateData) {
        setTodos(prev => prev.map(todo => todo.id === todoId ? updateData : todo));
      }
    } catch (err) {
      console.error("Upload exception:", err);
      setError("上传失败");
    } finally {
      setUploadingTodoId(null);
    }
  };

  // 删除图片
  const deleteImage = async (todoId: number, imageUrl: string) => {
    try {
      const urlParts = imageUrl.split("/my-todo/");
      const filePath = urlParts[1];

      if (filePath) {
        await supabase.storage.from("my-todo").remove([filePath]);
      }

      const { data: updateData, error: updateError } = await supabase
        .from("todos")
        .update({ image_url: null })
        .eq("id", todoId)
        .select()
        .single();

      if (updateError) {
        console.error("Delete image error:", updateError);
        setError(`删除图片失败: ${updateError.message}`);
        return;
      }

      if (updateData) {
        setTodos(prev => prev.map(todo => todo.id === todoId ? updateData : todo));
      }
    } catch (err) {
      console.error("Delete image exception:", err);
      setError("删除图片失败");
    }
  };

  // 处理文件选择
  const handleFileChange = async (todoId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      return;
    }

    await uploadImage(todoId, file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 处理新 Todo 图片选择
  const handleNewTodoImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      return;
    }

    setNewTodoImage(file);
    setNewTodoImagePreview(URL.createObjectURL(file));
  };

  // 清除新 Todo 图片
  const clearNewTodoImage = () => {
    setNewTodoImage(null);
    if (newTodoImagePreview) {
      URL.revokeObjectURL(newTodoImagePreview);
    }
    setNewTodoImagePreview(null);
    if (newTodoImageRef.current) {
      newTodoImageRef.current.value = "";
    }
  };

  // 添加 todo
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!newTodo.trim() && !newTodoImage) return;

    setIsAdding(true);
    try {
      // 先创建 todo
      const { data, error: insertError } = await supabase
        .from("todos")
        .insert({ text: newTodo.trim() || "新任务", user_id: user.id })
        .select()
        .single();

      if (insertError) {
        console.error("Add todo error:", insertError);
        setError(`添加失败: ${insertError.message}`);
        setIsAdding(false);
        return;
      }

      if (data) {
        // 如果有图片，压缩并上传
        if (newTodoImage) {
          const compressedFile = await compressImage(newTodoImage);
          console.log(`添加时: ${(newTodoImage.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`);
          const fileName = `${Date.now()}.webp`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("my-todo")
            .upload(filePath, compressedFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("my-todo")
              .getPublicUrl(filePath);

            await supabase
              .from("todos")
              .update({ image_url: publicUrl })
              .eq("id", data.id);
          }
        }

        // 重新获取完整数据
        const { data: updatedData } = await supabase
          .from("todos")
          .select("*")
          .eq("id", data.id)
          .single();

        setTodos(prev => [updatedData || { ...data, image_url: null }, ...prev]);
        setNewTodo("");
        clearNewTodoImage();
        setError(null);
      }
    } catch (err) {
      console.error("Add todo exception:", err);
      setError("添加失败");
    } finally {
      setIsAdding(false);
    }
  };

  // 删除 todo
  const deleteTodo = async (id: number, imageUrl?: string | null) => {
    try {
      if (imageUrl) {
        const urlParts = imageUrl.split("/my-todo/");
        const filePath = urlParts[1];
        if (filePath) {
          await supabase.storage.from("my-todo").remove([filePath]);
        }
      }

      const { error: deleteError } = await supabase
        .from("todos")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Delete todo error:", deleteError);
        setError(`删除失败: ${deleteError.message}`);
        return;
      }
      setTodos(prev => prev.filter(todo => todo.id !== id));
      setError(null);
    } catch (err) {
      console.error("Delete todo exception:", err);
      setError("删除失败");
    }
  };

  // 开始编辑
  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editText.trim() || !editingId) return;

    try {
      const { data, error: updateError } = await supabase
        .from("todos")
        .update({ text: editText.trim() })
        .eq("id", editingId)
        .select()
        .single();

      if (updateError) {
        console.error("Update todo error:", updateError);
        setError(`更新失败: ${updateError.message}`);
        return;
      }
      if (data) {
        setTodos(prev => prev.map(todo => todo.id === editingId ? data : todo));
        setEditingId(null);
        setEditText("");
        setError(null);
      }
    } catch (err) {
      console.error("Update todo exception:", err);
      setError("更新失败");
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // 切换完成状态
  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const { data, error: toggleError } = await supabase
        .from("todos")
        .update({ completed: !todo.completed })
        .eq("id", id)
        .select()
        .single();

      if (toggleError) {
        console.error("Toggle todo error:", toggleError);
        setError(`切换状态失败: ${toggleError.message}`);
        return;
      }
      if (data) {
        setTodos(prev => prev.map(t => t.id === id ? data : t));
        setError(null);
      }
    } catch (err) {
      console.error("Toggle todo exception:", err);
      setError("切换状态失败");
    }
  };

  // 退出登录
  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Logout failed:", error.message);
    } catch (err) {
      console.error("Logout exception:", err);
    } finally {
      window.location.replace("/auth/login");
    }
  };

  // 骨架屏组件
  const SkeletonTodoItem = () => (
    <div className="flex flex-col p-3 rounded-lg bg-white/10 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-white/20" />
        <div className="flex-1 h-5 bg-white/20 rounded" />
        <div className="flex gap-1">
          <div className="w-5 h-5 bg-white/20 rounded" />
          <div className="w-5 h-5 bg-white/20 rounded" />
        </div>
      </div>
      <div className="mt-2 ml-9">
        <div className="w-24 h-4 bg-white/20 rounded" />
      </div>
    </div>
  );

  // 未登录状态 - 落地页
  if (!isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">待办事项</h1>
            <p className="text-white/70 mb-8 leading-relaxed">
              跨设备同步 · 实时协作 · 图片附件<br />
              让你的待办事项井井有条
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-left text-white/80 text-sm p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span>实时同步，多设备无缝切换</span>
              </div>
              <div className="flex items-center gap-3 text-left text-white/80 text-sm p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-white" />
                </div>
                <span>支持图片附件，记录更丰富</span>
              </div>
              <div className="flex items-center gap-3 text-left text-white/80 text-sm p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span>安全可靠，数据私密专属</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/auth/login")}
              className="w-full py-4 px-6 rounded-xl bg-white text-purple-600 font-semibold text-lg hover:bg-white/90 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
            >
              开始使用
            </button>

            <p className="text-white/50 text-sm mt-4">
              已有账号？<button onClick={() => router.push("/auth/login")} className="text-white/80 hover:text-white underline">立即登录</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 animate-pulse" />
              <div className="h-8 bg-white/20 rounded w-1/3 mx-auto animate-pulse" />
            </div>
            <div className="space-y-3">
              <SkeletonTodoItem />
              <SkeletonTodoItem />
              <SkeletonTodoItem />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700",
        isDragging && "ring-4 ring-white/30 ring-inset"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-lg mx-auto py-2">
        {/* Header with user menu */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">待办事项</h1>
          </div>

          {/* User menu */}
          {/* {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/80 text-sm max-w-[100px] truncate">{user.email}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-lg rounded-xl shadow-2xl py-2 z-50 border border-white/10">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-white font-medium truncate">{user.email}</p>
                    <p className="text-white/50 text-xs mt-1">已登录</p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoggingOut ? "退出中..." : "退出登录"}</span>
                  </button>
                </div>
              )}
            </div>
          )} */}
        </div>

        {/* Main card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Add todo form */}
          <form onSubmit={addTodo} className="mb-6">
            <div className={cn(
              "relative rounded-xl bg-white/10 border-2 border-dashed transition-all duration-200 mb-2",
              isDragging ? "border-white/50 bg-white/5" : "border-white/20"
            )}>
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="添加新任务，按 Enter 或点击 +"
                disabled={isAdding}
                className="w-full px-4 py-3 bg-transparent text-white placeholder-white/40 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isAdding || (!newTodo.trim() && !newTodoImage)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAdding ? (
                  <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <Plus className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            {/* Image preview */}
            {newTodoImagePreview && (
              <div className="relative inline-block mb-2">
                <img
                  src={newTodoImagePreview}
                  alt="预览"
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={clearNewTodoImage}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Upload hint */}
            {!newTodoImage && (
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/50 hover:text-white/70 hover:bg-white/5 cursor-pointer transition-colors text-sm">
                <Upload className="w-4 h-4" />
                <span>拖拽图片或点击上传</span>
                <input
                  ref={newTodoImageRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewTodoImageChange}
                  className="hidden"
                  disabled={isAdding}
                />
              </label>
            )}
          </form>

          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-purple-500/20 rounded-2xl pointer-events-none">
              <div className="text-white text-lg font-medium">释放以添加图片</div>
            </div>
          )}

          {/* Todo list */}
          <div className="space-y-3">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={cn(
                  "group flex flex-col p-4 rounded-xl transition-all duration-300",
                  "bg-white/5 hover:bg-white/10",
                  todo.completed && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                      todo.completed
                        ? "bg-green-500 text-white"
                        : "border-2 border-white/30 hover:border-white/60"
                    )}
                  >
                    {todo.completed && <Check className="w-4 h-4" />}
                  </button>

                  {editingId === todo.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button onClick={saveEdit} className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={cancelEdit} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "flex-1 text-white transition-all duration-300",
                          todo.completed && "line-through opacity-60"
                        )}
                      >
                        {todo.text}
                      </span>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(todo)}
                          className="p-2 text-white/60 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id, todo.image_url)}
                          className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Image section */}
                <div className="mt-3 ml-10">
                  {todo.image_url ? (
                    <div className="relative inline-block group/image">
                      <img
                        src={todo.image_url}
                        alt="附件"
                        className="max-w-[180px] max-h-[120px] rounded-lg object-cover"
                      />
                      <button
                        onClick={() => deleteImage(todo.id, todo.image_url!)}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : uploadingTodoId === todo.id ? (
                    <span className="inline-flex items-center gap-2 text-white/60 text-sm">
                      <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      上传中...
                    </span>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 cursor-pointer transition-colors text-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>添加图片</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(todo.id, e)}
                        className="hidden"
                        disabled={uploadingTodoId !== null}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {todos.length === 0 && !error && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/50 text-lg mb-2">暂无待办事项</p>
              <p className="text-white/30 text-sm">添加你的第一个任务吧</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-sm mt-6">
          {todos.length > 0 && `${todos.length} 个任务 · `}实时同步已启用
        </p>
      </div>
    </div>
  );
}

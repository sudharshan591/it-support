'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kbApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, timeAgo } from '@/lib/utils';
import { Search, BookOpen, Eye, Plus, Edit2, Trash2, Tag, ChevronRight, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function KnowledgeBasePage() {
  const qc     = useQueryClient();
  const { user, isAgent } = useAuthStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['kb', page, search, category],
    queryFn: () => kbApi.list({ page, limit: 12, search: search || undefined, category: category || undefined }),
  });
  const { data: popular } = useQuery({ queryKey: ['kb', 'popular'], queryFn: () => kbApi.popular(5) });
  const { data: article } = useQuery({ queryKey: ['kb', 'article', selected?.id], queryFn: () => kbApi.get(selected.id), enabled: !!selected });

  const { register, handleSubmit, reset, setValue } = useForm();

  const createMutation = useMutation({
    mutationFn: (data: any) => kbApi.create(data),
    onSuccess: () => { toast.success('Article created'); qc.invalidateQueries({ queryKey: ['kb'] }); setShowCreate(false); reset(); },
    onError: () => toast.error('Failed to create article'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => kbApi.update(editItem.id, data),
    onSuccess: () => { toast.success('Article updated'); qc.invalidateQueries({ queryKey: ['kb'] }); setEditItem(null); reset(); },
    onError: () => toast.error('Failed to update article'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kbApi.delete(id),
    onSuccess: () => { toast.success('Article deleted'); qc.invalidateQueries({ queryKey: ['kb'] }); if (selected) setSelected(null); },
    onError: () => toast.error('Failed to delete article'),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setValue('title', item.title);
    setValue('content', item.content || '');
    setValue('category', item.category);
    setValue('tags', item.tags?.join(', ') || '');
    setValue('isPublished', item.isPublished);
  };

  const categoryColors = ['bg-indigo-100 text-indigo-700', 'bg-green-100 text-green-700', 'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700'];

  return (
    <div>
      <Header title="Knowledge Base" subtitle="Self-service articles and guides" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Article List */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search + Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search articles..." className="input pl-9" />
              </div>
              {(data?.categories ?? []).length > 0 && (
                <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="input w-44">
                  <option value="">All Categories</option>
                  {(data?.categories ?? []).map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {isAgent() && (
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> New Article
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data?.data ?? []).map((article: any, i: number) => (
                  <Card key={article.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(article)}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`badge text-xs ${categoryColors[i % categoryColors.length]}`}>{article.category}</span>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Eye className="w-3 h-3" />{article.viewCount}
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2">{article.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(article.tags ?? []).slice(0, 3).map((t: string) => (
                        <span key={t} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">{article.author?.firstName} {article.author?.lastName} · {formatDate(article.updatedAt)}</p>
                      {!article.isPublished && <span className="badge bg-amber-100 text-amber-700 text-xs">Draft</span>}
                    </div>
                    {isAgent() && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <button onClick={e => { e.stopPropagation(); openEdit(article); }} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={e => { e.stopPropagation(); if (confirm('Delete this article?')) deleteMutation.mutate(article.id); }} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
            {(!data?.data || data.data.length === 0) && !isLoading && (
              <div className="text-center py-12 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No articles found</p>
              </div>
            )}
          </div>

          {/* Right: Popular Articles Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900">Most Viewed</h3>
              </div>
              <div className="space-y-2">
                {(popular ?? []).map((a: any) => (
                  <button key={a.id} onClick={() => setSelected(a)} className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 line-clamp-2">{a.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{a.viewCount}</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Article Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <span className="badge bg-indigo-100 text-indigo-700 text-xs mb-1">{article?.category || selected.category}</span>
                <h2 className="text-lg font-semibold text-slate-900">{article?.title || selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-slate-700 text-sm leading-relaxed">{article?.content || 'Loading...'}</pre>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 text-xs text-slate-400">
              <span>By {article?.author?.firstName} {article?.author?.lastName}</span>
              <div className="flex items-center gap-2"><Eye className="w-3 h-3" />{article?.viewCount} views</div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showCreate || !!editItem} onClose={() => { setShowCreate(false); setEditItem(null); reset(); }} title={editItem ? 'Edit Article' : 'Create Article'} size="xl">
        <form onSubmit={handleSubmit((data) => {
          const payload = { ...data, tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [], isPublished: data.isPublished === true || data.isPublished === 'true' };
          editItem ? updateMutation.mutate(payload) : createMutation.mutate(payload);
        })} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input {...register('title', { required: true })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <input {...register('category', { required: true })} className="input" placeholder="Network, Hardware, Software..." />
            </div>
            <div>
              <label className="label">Tags</label>
              <input {...register('tags')} className="input" placeholder="vpn, password, reset (comma-separated)" />
            </div>
          </div>
          <div>
            <label className="label">Content *</label>
            <textarea {...register('content', { required: true })} rows={12} className="input resize-none font-mono text-sm" />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('isPublished')} type="checkbox" className="rounded" />
              <span className="text-sm font-medium text-slate-700">Publish immediately</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
              {editItem ? 'Update Article' : 'Create Article'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setEditItem(null); reset(); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

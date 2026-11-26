'use client';

import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Tag } from 'lucide-react';
import { Button, cn } from '@oxneer/ui';
import { PhraseSearchBar } from '@/components/common/admin/PhraseSearchBar';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { useConfirmDialog } from '@/hooks/admin';
import { CategoryCard } from './_components/CategoryCard';
import { useCategoriesList } from './_hooks/useCategoriesList';

export default function CategoriesPage() {
  const router = useRouter();
  const list = useCategoriesList();
  const { confirm, openConfirm, closeConfirm } = useConfirmDialog();
  const { subCategories } = list;

  const renderContent = () => {
    if (list.isLoading) return <LoadingBlock message="Loading categories..." />;
    if (list.categories.length === 0) {
      return list.hasSearch ? (
        <EmptyState icon={Tag} message="No categories match your search." />
      ) : (
        <EmptyState icon={Tag} message="No categories yet." hint="Add one to get started." />
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            expanded={subCategories.isExpanded(category.id)}
            loadingSubs={subCategories.isLoading(category.id)}
            subCategories={subCategories.childrenOf(category.id)}
            onToggle={() => subCategories.toggle(category.id)}
            onDelete={() =>
              openConfirm({
                title: 'Delete category?',
                description:
                  'This will permanently remove the category and all its sub-categories.',
                onConfirm: () => void list.deleteCategory(category),
              })
            }
            onDeleteSubCategory={(sub) =>
              openConfirm({
                title: 'Delete sub-category?',
                description: 'This will permanently remove the sub-category.',
                onConfirm: () => void list.deleteSubCategory(category.id, sub),
              })
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage auction item categories and sub-categories"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push('/admin/master/categories/new')}>
              <Plus className="h-4 w-4 mr-1" />
              Add category
            </Button>
            <Button variant="outline" size="sm" onClick={list.refresh} disabled={list.isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-1', list.isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      {list.error && <ErrorAlert message={list.error} />}

      <PhraseSearchBar
        phrases={list.phrases}
        onPhrasesChange={list.setPhrases}
        onSearch={list.search}
        onReset={list.reset}
        placeholder="Search categories..."
      />

      {renderContent()}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel="Delete"
        onConfirm={() => {
          confirm.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}

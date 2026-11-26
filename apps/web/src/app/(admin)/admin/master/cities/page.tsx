'use client';

import { useState } from 'react';
import type { AreaVM, CityVM } from '@oxneer/api';
import { Building2 } from 'lucide-react';
import { Button } from '@oxneer/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { PaginationBar } from '@/components/common/admin/PaginationBar';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { useConfirmDialog } from '@/hooks/admin';
import {
  AddCityPickerDialog,
  EditCityDialog,
  AddAreaDialog,
  EditAreaDialog,
} from '@/components/common/master';
import { CitiesList, type CitiesListActions } from './_components/CitiesList';
import { CITIES_PAGE_SIZE, useCitiesList } from './_hooks/useCitiesList';

export default function CitiesPage() {
  const list = useCitiesList();
  const { confirm, openConfirm, closeConfirm } = useConfirmDialog();

  const [addOpen, setAddOpen] = useState(false);
  const [editCityTarget, setEditCityTarget] = useState<CityVM | null>(null);
  const [addAreaTarget, setAddAreaTarget] = useState<CityVM | null>(null);
  const [editAreaTarget, setEditAreaTarget] = useState<AreaVM | null>(null);

  const actions: CitiesListActions = {
    onEditCity: setEditCityTarget,
    onAddArea: setAddAreaTarget,
    onDeleteCity: (city) =>
      openConfirm({
        title: 'Delete city?',
        description: `"${city.name}" and all its areas will be permanently removed.`,
        onConfirm: () => void list.deleteCity(city),
      }),
    onEditArea: (area, city) => setEditAreaTarget({ ...area, city }),
    onDeleteArea: (area, city) =>
      openConfirm({
        title: 'Delete area?',
        description: `"${area.name}" will be permanently removed.`,
        onConfirm: () => void list.deleteArea(city.id, area),
      }),
  };

  const reloadPage = () => void list.fetchPage(list.pageIndex);

  const renderContent = () => {
    if (list.isLoading) return <LoadingBlock message="Loading cities..." />;
    if (list.data.length === 0) {
      return list.search.trim() ? (
        <EmptyState icon={Building2} message="No cities match your search." />
      ) : (
        <EmptyState
          icon={Building2}
          message="No cities found."
          hint="Add a city to get started."
          action={
            <Button variant="gold" size="sm" onClick={() => setAddOpen(true)}>
              Add city
            </Button>
          }
        />
      );
    }
    return <CitiesList cities={list.data} areas={list.areas} {...actions} />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cities"
        description="All cities across every state"
        actions={
          <ListToolbarActions
            onAdd={() => setAddOpen(true)}
            addLabel="Add city"
            addDisabled={!list.states.length}
            onRefresh={list.refresh}
            refreshing={list.isLoading}
          />
        }
      />

      {list.error && <ErrorAlert message={list.error} />}

      <SearchInput
        value={list.search}
        onChange={list.setSearch}
        placeholder="Search cities or states..."
        className="max-w-sm"
      />

      {renderContent()}

      <PaginationBar
        pageIndex={list.pageIndex}
        pageCount={list.totalPages}
        pageSize={CITIES_PAGE_SIZE}
        itemCount={list.data.length}
        totalRecords={list.totalRecords}
        onPageChange={list.fetchPage}
        isLoading={list.isLoading}
      />

      <AddCityPickerDialog
        open={addOpen}
        states={list.states}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          reloadPage();
        }}
      />

      <EditCityDialog
        city={editCityTarget}
        states={list.states}
        onClose={() => setEditCityTarget(null)}
        onUpdated={reloadPage}
      />

      <AddAreaDialog
        city={addAreaTarget}
        onClose={() => setAddAreaTarget(null)}
        onCreated={(cityId, areas) => {
          list.areas.showChildren(cityId, areas);
          setAddAreaTarget(null);
        }}
      />

      <EditAreaDialog
        area={editAreaTarget}
        states={list.states}
        onClose={() => setEditAreaTarget(null)}
        onUpdated={() => {
          const cityId = editAreaTarget?.city?.id;
          if (cityId) void list.areas.reload(cityId, 'Failed to refresh areas.');
        }}
      />

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

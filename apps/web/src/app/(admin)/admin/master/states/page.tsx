'use client';

import { useState } from 'react';
import type { AreaVM, CityVM, StateVM } from '@oxneer/api';
import { MapPin } from 'lucide-react';
import { Button } from '@oxneer/ui';
import { SearchInput } from '@/components/common/admin/SearchInput';
import PageHeader from '@/components/common/admin/PageHeader';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import ConfirmDialog from '@/components/common/admin/ConfirmDialog';
import { ListToolbarActions } from '@/components/common/admin/ListToolbarActions';
import { LoadingBlock, EmptyState } from '@/components/common/admin/ListState';
import { useConfirmDialog } from '@/hooks/admin/useConfirmDialog';
import {
  AddStateDialog,
  EditStateDialog,
  AddCityDialog,
  EditCityDialog,
  AddAreaDialog,
  EditAreaDialog,
} from '@/components/common/master';
import { StatesTree, type StatesTreeActions } from './_components/StatesTree';
import { useStatesTree } from './_hooks/useStatesTree';

export default function StatesPage() {
  const tree = useStatesTree();
  const { confirm, openConfirm, closeConfirm } = useConfirmDialog();

  const [addStateOpen, setAddStateOpen] = useState(false);
  const [editStateTarget, setEditStateTarget] = useState<StateVM | null>(null);
  const [addCityTarget, setAddCityTarget] = useState<StateVM | null>(null);
  const [editCityTarget, setEditCityTarget] = useState<CityVM | null>(null);
  const [addAreaTarget, setAddAreaTarget] = useState<CityVM | null>(null);
  const [editAreaTarget, setEditAreaTarget] = useState<AreaVM | null>(null);

  const actions: StatesTreeActions = {
    onEditState: setEditStateTarget,
    onAddCity: setAddCityTarget,
    onDeleteState: (state) =>
      openConfirm({
        title: 'Delete state?',
        description: `"${state.name}" and all its cities and areas will be permanently removed.`,
        onConfirm: () => void tree.deleteState(state),
      }),
    onEditCity: (city, state) => setEditCityTarget({ ...city, state }),
    onAddArea: setAddAreaTarget,
    onDeleteCity: (city, state) =>
      openConfirm({
        title: 'Delete city?',
        description: `"${city.name}" and all its areas will be permanently removed.`,
        onConfirm: () => void tree.deleteCity(state.id, city),
      }),
    onEditArea: (area, city, state) => setEditAreaTarget({ ...area, city: { ...city, state } }),
    onDeleteArea: (area, city) =>
      openConfirm({
        title: 'Delete area?',
        description: `"${area.name}" will be permanently removed.`,
        onConfirm: () => void tree.deleteArea(city.id, area),
      }),
  };

  const renderContent = () => {
    if (tree.isLoading) return <LoadingBlock message="Loading states..." />;
    if (tree.states.length === 0) {
      return tree.search.trim() ? (
        <EmptyState icon={MapPin} message="No states match your search." />
      ) : (
        <EmptyState
          icon={MapPin}
          message="No states yet."
          hint="Add one to get started."
          action={
            <Button variant="gold" size="sm" onClick={() => setAddStateOpen(true)}>
              Add state
            </Button>
          }
        />
      );
    }
    return <StatesTree states={tree.states} cities={tree.cities} areas={tree.areas} {...actions} />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="States"
        description="Manage states, cities and areas"
        actions={
          <ListToolbarActions
            onAdd={() => setAddStateOpen(true)}
            addLabel="Add state"
            onRefresh={tree.refresh}
            refreshing={tree.isLoading}
          />
        }
      />

      {tree.error && <ErrorAlert message={tree.error} />}

      <SearchInput
        value={tree.search}
        onChange={tree.setSearch}
        placeholder="Search states..."
        className="max-w-sm"
      />

      {renderContent()}

      <AddStateDialog
        open={addStateOpen}
        onOpenChange={setAddStateOpen}
        onCreated={() => {
          setAddStateOpen(false);
          void tree.refresh();
        }}
      />

      <EditStateDialog
        state={editStateTarget}
        onClose={() => setEditStateTarget(null)}
        onUpdated={tree.refresh}
      />

      <AddCityDialog
        state={addCityTarget}
        onClose={() => setAddCityTarget(null)}
        onCreated={(stateId, cities) => {
          tree.cities.showChildren(stateId, cities);
          setAddCityTarget(null);
        }}
      />

      <EditCityDialog
        city={editCityTarget}
        states={tree.allStates}
        onClose={() => setEditCityTarget(null)}
        onUpdated={() => {
          const stateId = editCityTarget?.state?.id;
          if (stateId) void tree.cities.reload(stateId, 'Failed to refresh cities.');
        }}
      />

      <AddAreaDialog
        city={addAreaTarget}
        onClose={() => setAddAreaTarget(null)}
        onCreated={(cityId, areas) => {
          tree.areas.showChildren(cityId, areas);
          setAddAreaTarget(null);
        }}
      />

      <EditAreaDialog
        area={editAreaTarget}
        states={tree.allStates}
        onClose={() => setEditAreaTarget(null)}
        onUpdated={() => {
          const cityId = editAreaTarget?.city?.id;
          if (cityId) void tree.areas.reload(cityId, 'Failed to refresh areas.');
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

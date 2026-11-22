import type { ManagedTypeVM } from '@oxneer/api';
import { prepareManagedTypeForCreate } from '../(admin)/admin/metadata/_components/types';

type ManagedProperty = NonNullable<ManagedTypeVM['properties']>[number];
type ManagedValidator = NonNullable<ManagedProperty['validators']>[number];

describe('prepareManagedTypeForCreate', () => {
  it('serializes object-shaped data types into backend-safe strings', () => {
    const managedType: ManagedTypeVM = {
      id: 'type-1',
      name: 'Order form',
      description: 'Form description',
      type: 'CUSTOM_FORM',
      tags: ['demo'],
      properties: [
        {
          type: 'SIMPLE_PROPERTY',
          name: 'tenantName',
          label: 'Tenant name',
          dataType: { STRING: 'Text' } as unknown as ManagedProperty['dataType'],
          validators: [
            {
              type: { MAX: 'MAX' } as unknown as ManagedValidator['type'],
              max: 10,
            },
          ],
        },
      ],
    };

    expect(prepareManagedTypeForCreate(managedType)).toEqual({
      name: 'Order form',
      description: 'Form description',
      type: 'CUSTOM_FORM',
      tags: ['demo'],
      properties: [
        {
          type: 'SIMPLE_PROPERTY',
          name: 'tenantName',
          label: 'Tenant name',
          dataType: 'STRING',
          validators: [{ type: 'MAX', max: 10 }],
        },
      ],
    });
  });
});

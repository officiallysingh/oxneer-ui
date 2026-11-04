import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TooltipProvider } from '@repo/ui';
import type { PropertyDef } from '@repo/api';
import { AttrPropertySections } from '../AttrValue';
import { AttrField } from '../AttrField';

const leaf = (name: string, attributes?: Record<string, string>, dataType = 'STRING') =>
  ({ type: 'COMPLEX_PROPERTY', name, label: name, dataType, attributes }) as PropertyDef;

describe('AttrPropertySections', () => {
  it('applies list:composite.layout to top-level composites', () => {
    const defs: PropertyDef[] = [
      {
        type: 'COMPOSITE_PROPERTY',
        name: 'dims',
        label: 'Dimensions',
        dataType: 'STRING',
        attributes: { 'list:composite.layout': 'inline' },
        value: [leaf('width', { 'list:suffix': ' cm' })],
      },
    ];
    render(<AttrPropertySections defs={defs} values={{ dims: { width: '7.9' } }} />);
    const section = screen.getByRole('heading', { name: 'Dimensions' }).closest('section')!;
    // inline layout renders a paragraph, not the default definition-list table
    expect(section.querySelector('dl')).toBeNull();
    expect(within(section).getByText('width:')).toBeInTheDocument();
    expect(within(section).getByText('7.9')).toBeInTheDocument();
  });

  it('renders list items with child fields instead of [object Object]', () => {
    const defs: PropertyDef[] = [
      {
        type: 'LIST_PROPERTY',
        name: 'specs',
        label: 'Specs',
        dataType: 'STRING',
        value: [leaf('name')],
      },
    ];
    render(<AttrPropertySections defs={defs} values={{ specs: [{ name: 'A18 chip' }] }} />);
    expect(screen.getByText('A18 chip')).toBeInTheDocument();
    expect(screen.queryByText(/object Object/)).toBeNull();
  });

  it('colours badges per value and hides list:hidden fields', () => {
    const defs = [
      leaf('status', {
        'list:display': 'badge',
        'list:badge.color-map': 'active:success',
        'style:options': 'Active:active',
      }),
      leaf('secret', { 'list:hidden': 'true' }),
    ];
    render(<AttrPropertySections defs={defs} values={{ status: 'active', secret: 'x' }} />);
    expect(screen.getByText('Active').className).toMatch(/text-success/);
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('does not render javascript: links', () => {
    render(
      <AttrPropertySections
        defs={[leaf('site', { 'list:display': 'link' })]}
        values={{ site: 'javascript:alert(1)' }}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('AttrField', () => {
  it('keeps radio groups independent across list items', () => {
    const list: PropertyDef = {
      type: 'LIST_PROPERTY',
      name: 'rows',
      label: 'Row',
      dataType: 'STRING',
      value: [leaf('flag', undefined, 'BOOLEAN')],
    };
    function Harness() {
      const [v, setV] = useState<unknown>([{ flag: '' }, { flag: '' }]);
      return <AttrField prop={list} value={v} onChange={setV} />;
    }
    render(
      <TooltipProvider>
        <Harness />
      </TooltipProvider>,
    );
    const yes = screen.getAllByRole('radio', { name: 'Yes' });
    fireEvent.click(yes[0]!);
    fireEvent.click(screen.getAllByRole('radio', { name: 'No' })[1]!);
    expect(screen.getAllByRole('radio', { name: 'Yes' })[0]).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getAllByRole('radio', { name: 'No' })[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('respects form:max-items', () => {
    const list: PropertyDef = {
      type: 'LIST_PROPERTY',
      name: 'tags',
      label: 'Tag',
      dataType: 'STRING',
      attributes: { 'form:max-items': '1', 'form:add-label': 'Add tag' },
    };
    render(
      <TooltipProvider>
        <AttrField prop={list} value={['a']} onChange={() => {}} />
      </TooltipProvider>,
    );
    expect(screen.getByRole('button', { name: /Add tag/ })).toBeDisabled();
  });
});

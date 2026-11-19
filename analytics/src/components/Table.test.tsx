import { createRef } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table';

afterEach(() => {
  cleanup();
});

function Example() {
  return (
    <Table>
      <TableCaption>Top authors</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Author</TableHead>
          <TableHead>Gists</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>alice</TableCell>
          <TableCell>12</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>bob</TableCell>
          <TableCell>7</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe('Table', () => {
  it('renders valid table semantics', () => {
    render(<Example />);

    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getAllByRole('columnheader').map((el) => el.textContent)).toEqual(['Author', 'Gists']);
    expect(screen.getAllByRole('rowgroup')).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByRole('cell').map((el) => el.textContent)).toEqual(['alice', '12', 'bob', '7']);
  });

  it('renders the caption inside the table', () => {
    render(<Example />);

    const caption = screen.getByText('Top authors');
    expect(caption.tagName).toBe('CAPTION');
    expect(screen.getByRole('table').contains(caption)).toBe(true);
  });

  it('puts header cells in the thead and data cells in the tbody', () => {
    render(<Example />);

    const [head, body] = screen.getAllByRole('rowgroup');
    expect(within(head!).getAllByRole('columnheader')).toHaveLength(2);
    expect(within(body!).getAllByRole('cell')).toHaveLength(4);
  });

  it('wraps the table in a horizontally scrollable container', () => {
    const { container } = render(<Example />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('overflow-x-auto');
    expect(wrapper.querySelector('table')).not.toBeNull();
  });
});

describe('Table className handling', () => {
  it('appends a custom className to each part without dropping the base classes', () => {
    render(
      <Table className="t-extra">
        <TableCaption className="cap-extra">cap</TableCaption>
        <TableHeader className="h-extra">
          <TableRow className="r-extra">
            <TableHead className="th-extra">head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="b-extra">
          <TableRow>
            <TableCell className="td-extra">cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole('table').className).toContain('t-extra');
    expect(screen.getByRole('table').className).toContain('w-full');
    expect(screen.getByText('cap').className).toContain('cap-extra');
    expect(screen.getAllByRole('rowgroup')[0]!.className).toContain('h-extra');
    expect(screen.getAllByRole('rowgroup')[1]!.className).toContain('b-extra');
    expect(screen.getAllByRole('row')[0]!.className).toContain('r-extra');
    expect(screen.getByRole('columnheader').className).toContain('th-extra');
    expect(screen.getByRole('cell').className).toContain('td-extra');
  });
});

describe('Table prop and ref forwarding', () => {
  it('forwards native attributes to the row, header cell, cell and caption', () => {
    const onClick = vi.fn();
    render(
      <Table>
        <TableCaption id="cap">cap</TableCaption>
        <TableBody>
          <TableRow data-testid="row" onClick={onClick}>
            <TableHead scope="row">label</TableHead>
            <TableCell colSpan={2}>value</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByText('cap').id).toBe('cap');
    expect(screen.getByText('label').getAttribute('scope')).toBe('row');
    expect(screen.getByText('value').getAttribute('colspan')).toBe('2');

    fireEvent.click(screen.getByTestId('row'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards refs to the underlying elements', () => {
    const table = createRef<HTMLTableElement>();
    const header = createRef<HTMLTableSectionElement>();
    const body = createRef<HTMLTableSectionElement>();
    const row = createRef<HTMLTableRowElement>();
    const head = createRef<HTMLTableCellElement>();
    const cell = createRef<HTMLTableCellElement>();
    const caption = createRef<HTMLTableCaptionElement>();

    render(
      <Table ref={table}>
        <TableCaption ref={caption}>cap</TableCaption>
        <TableHeader ref={header}>
          <TableRow ref={row}>
            <TableHead ref={head}>h</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={body}>
          <TableRow>
            <TableCell ref={cell}>c</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(table.current?.tagName).toBe('TABLE');
    expect(caption.current?.tagName).toBe('CAPTION');
    expect(header.current?.tagName).toBe('THEAD');
    expect(body.current?.tagName).toBe('TBODY');
    expect(row.current?.tagName).toBe('TR');
    expect(head.current?.tagName).toBe('TH');
    expect(cell.current?.tagName).toBe('TD');
  });
});

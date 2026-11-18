import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card';
import { EmptyState } from './EmptyState';
import { StatCard } from './StatCard';

afterEach(() => {
  cleanup();
});

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>body text</Card>);

    expect(screen.getByText('body text')).toBeDefined();
  });

  it('renders no header when title, description and action are all absent', () => {
    const { container } = render(<Card>body</Card>);

    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the title as a heading and the description', () => {
    render(
      <Card title="Gists" description="Posted this week">
        body
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Gists' })).toBeDefined();
    expect(screen.getByText('Posted this week')).toBeDefined();
  });

  it('renders the header with only an action', () => {
    render(<Card action={<button type="button">Refresh</button>}>body</Card>);

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDefined();
  });

  it('appends a custom className and forwards the ref', () => {
    const ref = createRef<HTMLDivElement>();

    const { container } = render(
      <Card className="extra-class" ref={ref}>
        body
      </Card>,
    );

    expect((container.firstElementChild as HTMLElement).className).toContain('extra-class');
    expect(ref.current).toBe(container.firstElementChild);
  });
});

describe('Card parts', () => {
  it('compose into a card with header, title, description, content and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Title' })).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
    expect(screen.getByText('Content')).toBeDefined();
    expect(screen.getByText('Footer')).toBeDefined();
  });

  it('merge a className onto each part', () => {
    render(
      <>
        <CardHeader className="h-extra">h</CardHeader>
        <CardTitle className="t-extra">t</CardTitle>
        <CardDescription className="d-extra">d</CardDescription>
        <CardContent className="c-extra">c</CardContent>
        <CardFooter className="f-extra">f</CardFooter>
      </>,
    );

    expect(screen.getByText('h').className).toContain('h-extra');
    expect(screen.getByText('t').className).toContain('t-extra');
    expect(screen.getByText('d').className).toContain('d-extra');
    expect(screen.getByText('c').className).toContain('c-extra');
    expect(screen.getByText('f').className).toContain('f-extra');
  });
});

describe('StatCard', () => {
  it('renders the label and a string value', () => {
    render(<StatCard label="Total gists" value="1,234" />);

    expect(screen.getByText('Total gists')).toBeDefined();
    expect(screen.getByText('1,234')).toBeDefined();
  });

  it('renders a numeric value, including zero', () => {
    render(<StatCard label="Reports" value={0} />);

    expect(screen.getByText('0')).toBeDefined();
  });

  it('renders the description only when given', () => {
    const { rerender } = render(<StatCard label="Active" value={5} />);
    expect(screen.queryByText('Not hidden or expired')).toBeNull();

    rerender(<StatCard label="Active" value={5} description="Not hidden or expired" />);
    expect(screen.getByText('Not hidden or expired')).toBeDefined();
  });

  it('appends a custom className', () => {
    const { container } = render(<StatCard label="Active" value={5} className="extra-class" />);

    expect((container.firstElementChild as HTMLElement).className).toContain('extra-class');
  });
});

describe('EmptyState', () => {
  it('renders just the title by default', () => {
    const { container } = render(<EmptyState title="No gists yet" />);

    expect(screen.getByRole('heading', { name: 'No gists yet' })).toBeDefined();
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelectorAll('div')).toHaveLength(1);
  });

  it('renders the description, icon and action when given', () => {
    render(
      <EmptyState
        title="No gists yet"
        description="Try widening the date range."
        icon={<span data-testid="icon">i</span>}
        action={<button type="button">Reset filters</button>}
      />,
    );

    expect(screen.getByText('Try widening the date range.')).toBeDefined();
    expect(screen.getByTestId('icon')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDefined();
  });

  it('appends a custom className', () => {
    const { container } = render(<EmptyState title="Nothing" className="extra-class" />);

    expect((container.firstElementChild as HTMLElement).className).toContain('extra-class');
  });
});

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

type Props = {
  label: string;
  icon: ReactNode;
  children: (close: () => void) => ReactNode;
};

/**
 * A small popover menu, built from React state.
 *
 * Bootstrap's dropdown JavaScript is not used even though GROWI ships Bootstrap: a plugin
 * cannot rely on the bundle being present or initialised, and growi-plugin-datatables
 * spent a whole module (popoverFit.ts) keeping jQuery-positioned popovers inside a narrow
 * article column. Anchoring the panel to the button with plain CSS avoids all of it.
 */
export const Dropdown = ({ label, icon, children }: Props) => {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="grt-dropdown" ref={container}>
      <button
        type="button"
        className={`grt-toolbar__button${open ? ' grt-toolbar__button--active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
      >
        {icon}
      </button>
      {/*
       * The panel carries no ARIA role: it is reached through the button's
       * aria-controls, and its contents (labelled checkboxes and buttons) describe
       * themselves.
       */}
      {open && (
        <div className="grt-dropdown__panel" id={id}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import styles from './product-nav-menu.module.scss';

export type ProductNavItem =
  | { kind: 'route'; to: string; label: string; end?: boolean }
  | { kind: 'external'; href: string; label: string };

interface ProductNavMenuProps {
  label: string;
  items: ProductNavItem[];
  /** Paths that count this menu as active when open or closed. */
  activePrefixes: string[];
}

function itemIsActive(item: ProductNavItem, pathname: string): boolean {
  if (item.kind !== 'route') return false;
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function ProductNavMenu({
  label,
  items,
  activePrefixes,
}: ProductNavMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const location = useLocation();

  const sectionActive = activePrefixes.some(
    (prefix) =>
      location.pathname === prefix ||
      location.pathname.startsWith(`${prefix}/`),
  );
  const anyItemActive = items.some((item) =>
    itemIsActive(item, location.pathname),
  );
  const active = sectionActive || anyItemActive;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.menu} ref={rootRef} data-open={open ? 'true' : undefined}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        data-active={active ? 'true' : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className={styles.panel} role="menu" id={menuId}>
          {items.map((item) =>
            item.kind === 'route' ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                role="menuitem"
                className={({ isActive }) =>
                  isActive ? `${styles.item} ${styles.itemActive}` : styles.item
                }
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ) : (
              <a
                key={item.href}
                href={item.href}
                role="menuitem"
                className={styles.item}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

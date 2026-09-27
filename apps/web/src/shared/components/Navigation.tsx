import { useEffect, useId, useRef, useState } from 'react';
import { MEDIA_QUERY_TABLET_UP } from '../breakpoints';
import './Navigation.css';

export interface NavItem {
  label: string;
  href: string;
}

export interface NavigationProps {
  /** Top-level tabs — per EXPERIENCE.md's IA: Discover, My Trips, Buddies, Write-ups. */
  items: NavItem[];
  /** The currently active item's `href`, underlined per DESIGN.md > Components > Navigation. */
  activeHref?: string;
}

/**
 * DESIGN.md > Components > Navigation: uppercase, letter-spaced tab
 * labels; the active tab is underlined, never pill-highlighted or filled.
 *
 * EXPERIENCE.md > Responsive & Platform: >=1024px and 768-1023px show all
 * tabs inline; <768px collapses to a menu trigger.
 *
 * EXPERIENCE.md > Accessibility Floor: nav is a real `<nav>` landmark; the
 * mobile trigger is a real button with an accessible name and
 * `aria-expanded`, and opening it moves focus into the menu.
 */
export function Navigation({ items, activeHref }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Collapsing back to a wider viewport while the mobile menu is open
  // shouldn't leave it stuck open once the trigger that opened it is gone.
  useEffect(() => {
    const mediaQuery = window.matchMedia(MEDIA_QUERY_TABLET_UP);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setIsMenuOpen(false);
    };
    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      const firstLink = menuRef.current?.querySelector('a');
      firstLink?.focus();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <nav className="nav" aria-label="Primary">
      <button
        ref={triggerRef}
        type="button"
        className="nav__trigger"
        aria-label="Menu"
        aria-expanded={isMenuOpen}
        aria-controls={menuId}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        Menu
      </button>
      <ul
        id={menuId}
        ref={menuRef}
        className={isMenuOpen ? 'nav__menu nav__menu--open' : 'nav__menu'}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            closeMenu();
            return;
          }
          // Trap Tab focus inside the open overlay — without this, Tab past
          // the last link exits into whatever's behind the (visually)
          // still-open menu.
          if (event.key === 'Tab' && menuRef.current) {
            const links = menuRef.current.querySelectorAll('a');
            const first = links[0];
            const last = links[links.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        {items.map((item) => (
          <li key={item.href} className="nav__item">
            <a
              href={item.href}
              className={item.href === activeHref ? 'nav__link nav__link--active' : 'nav__link'}
              aria-current={item.href === activeHref ? 'page' : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

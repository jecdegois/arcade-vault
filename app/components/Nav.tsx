'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '../context';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useUser();

  const isHomeActive = pathname === '/';
  const isLibraryActive = pathname.startsWith('/games');
  const isHallActive = pathname === '/hall-of-fame';
  const isAboutActive = pathname === '/about';

  const closePanel = () => setOpen(false);

  const handleSignOut = () => {
    setUser(null);
    closePanel();
    router.push('/');
  };

  return (
    <>
      <nav className="av-nav">
        {/* Logo */}
        <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
          <div className="logo-mark" />
          <div className="logo-text">
            <span className="neon-cyan">ARCADE </span>
            <span className="neon-magenta">VAULT</span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="links">
          <Link href="/" className={isHomeActive ? 'active' : ''}>
            Inicio
          </Link>
          <Link href="/games" className={isLibraryActive ? 'active' : ''}>
            Biblioteca
          </Link>
          <Link href="/hall-of-fame" className={isHallActive ? 'active' : ''}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={isAboutActive ? 'active' : ''}>
            Sobre Nosotros
          </Link>
        </div>

        <div className="spacer" />

        {/* Coin counter */}
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>

        {/* Auth button */}
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}

        {/* Hamburger */}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      {/* Mobile backdrop */}
      <div
        className={`av-mobile-backdrop${open ? ' open' : ''}`}
        onClick={closePanel}
      />

      {/* Mobile panel */}
      <aside className={`av-mobile-panel${open ? ' open' : ''}`}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>

        <Link
          href="/"
          className={isHomeActive ? 'active' : ''}
          onClick={closePanel}
        >
          Inicio
        </Link>
        <Link
          href="/games"
          className={isLibraryActive ? 'active' : ''}
          onClick={closePanel}
        >
          Biblioteca
        </Link>
        <Link
          href="/hall-of-fame"
          className={isHallActive ? 'active' : ''}
          onClick={closePanel}
        >
          Salón de la Fama
        </Link>
        <Link
          href="/about"
          className={isAboutActive ? 'active' : ''}
          onClick={closePanel}
        >
          ABOUT
        </Link>
        <Link
          href="/auth"
          className={pathname === '/auth' ? 'active' : ''}
          onClick={closePanel}
        >
          {user ? 'Cuenta' : 'Iniciar Sesión'}
        </Link>

        <div style={{ flex: 1 }} />

        {user && (
          <button
            className="btn ghost"
            style={{ marginBottom: 12 }}
            onClick={handleSignOut}
          >
            Cerrar Sesión
          </button>
        )}

        <div
          className="pixel"
          style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.16em' }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}

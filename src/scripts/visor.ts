  document.querySelectorAll<HTMLElement>('[data-visor]').forEach((visor) => {
    const tabs = Array.from(visor.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const paneles = Array.from(visor.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    const activar = (tab: HTMLButtonElement, foco = false) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      paneles.forEach((p) => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
      if (foco) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => activar(t));
      t.addEventListener('keydown', (e) => {
        let j = -1;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        if (j >= 0) { e.preventDefault(); activar(tabs[j], true); }
      });
    });

    const btn = visor.querySelector<HTMLButtonElement>('[data-fs]')!;
    const texto = visor.querySelector<HTMLElement>('[data-fs-texto]')!;
    const estado = (on: boolean) => {
      visor.classList.toggle('pv-full', on && !document.fullscreenElement);
      document.body.classList.toggle('pv-bloqueado', on);
      btn.setAttribute('aria-pressed', String(on));
      texto.textContent = on ? 'Salir de pantalla completa' : 'Pantalla completa';
    };
    let activo = false;
    const entrar = async () => {
      activo = true; estado(true);
      if (visor.requestFullscreen) { try { await visor.requestFullscreen(); visor.classList.remove('pv-full'); } catch { visor.classList.add('pv-full'); } }
    };
    const salir = () => { activo = false; if (document.fullscreenElement) document.exitFullscreen(); estado(false); };
    btn.addEventListener('click', () => (activo ? salir() : entrar()));
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && activo) { activo = false; estado(false); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && activo) salir(); });
  });

/* Minimal i18n: EN / FR, persisted to local storage. t(key, {params}). */
const I18n = (() => {
  const KEY = 'lagrange-piscine.lang';

  const STR = {
    en: {
      tab_today: 'Today', tab_pools: 'Pools', tab_schedule: 'Schedule', tab_map: 'Map', tab_more: 'More',

      today_title: 'This week', today_sub: 'Turnover Saturday · {date}',
      arrivals_title: 'Arrivals to prep ({n})',
      arrivals_sub: 'Pools that must be checked & clean for new guests this Saturday.',
      arrivals_empty: 'No new arrivals recorded for this week.',
      midweek_title: 'Mid-week checks ({n})',
      midweek_sub: 'Occupied pools to cycle and keep balanced during the stay.',
      midweek_empty: 'Nothing mid-stay this week.',
      chem_due_title: 'Chemistry due ({n})',
      chem_due_sub: 'No reading logged in the last 4 days.',
      chem_due_empty: 'All pools have a recent reading. 🎉',
      no_reading: 'no reading', last_date: 'last {date}', never: 'never',

      pools_title: 'Pools', pools_sub: '{n} pools across {m} residences',
      to_confirm: '⚠︎ details to confirm',

      back_pools: '‹ Pools', directions: '📍 Directions', occupancy: 'Occupancy',
      log_reading: 'Log a reading',
      f_ph: 'pH', f_cl: 'Free Cl (ppm)', f_cya: 'Stabilizer (ppm)', f_temp: 'Temp (°C)', f_note: 'Note',
      f_when: 'When (optional — defaults to now)',
      status_green: 'Stable', status_orange: 'To check', status_red: 'Critical', status_grey: 'No data', status_none: '',
      note_ph: 'e.g. added 2 galets',
      targets: 'Targets — pH {phmin}–{phmax} · Cl {clmin}–{clmax}ppm · CYA {cyamin}–{cyamax}ppm',
      save_reading: 'Save reading',
      history: 'History ({n})', history_empty: 'No readings yet. Log the first one above.',
      th_when: 'When', th_ph: 'pH', th_cl: 'Cl', th_cya: 'CYA', th_temp: '°C',
      confirm_del: 'Delete this reading?', pool_not_found: 'Pool not found',

      schedule_title: 'Schedule', schedule_sub: 'Saturday turnover cycle',
      this_week: 'this week', sched_counts: '{n} active · {m} arriving',

      map_title: 'Map', map_sub: 'Open residences in Google Maps',
      n_pools: '{n} pools', open_maps: '📍 Open in Google Maps',
      map_tip: 'Residence pins marked “~” are approximate — capture GPS at a pool to drop an exact pin.',

      settings_title: 'Settings & backup',
      export_btn: '⬇︎ Backup (.json)', import_btn: '⬆︎ Import backup',
      export_csv_readings: '⬇︎ Readings (.csv)', export_csv_notes: '⬇︎ Notes (.csv)',
      reset_btn: '↺ Reset to seed data', about: 'About',
      about_text: 'Data is stored only on this device. Export regularly to back up.',
      language: 'Language',
      imported_ok: 'Backup imported.', import_fail: 'Import failed: ',
      confirm_reset: 'Discard all local changes and reload the original seed data?',

      in_date: 'in {date}', out_date: 'out {date}',

      st_arriving: 'Arriving (turnover)', st_occupied: 'Occupied', st_departing: 'Departing',
      st_owner: 'Owner (PROPRIO)', st_closed: 'Closed (FERMÉE)', st_backup: 'Backup (EN SECOURS)', st_empty: 'Empty',

      // suggested actions (qualitative — verify against your products & labels)
      advice_title: 'Suggested action',
      action_ph_high: 'pH high → add pH⁻ (pH minus), run filtration, retest after a few hours.',
      action_ph_low: 'pH low → add pH⁺ (pH plus), run filtration, retest.',
      action_cl_high: 'Chlorine high → pause dosing; let it drop before guests use the pool.',
      action_cl_low: 'Chlorine low → add tablets/galets (check the feeder/skimmer).',
      action_cl_vlow: 'Chlorine very low → shock treat; recheck before reopening.',
      action_cya_low: 'Stabiliser low → add cyanuric acid (stabilisant).',
      action_cya_high: 'Stabiliser high → partial drain & refill to dilute.',

      // service log
      pump_section: 'Pump & filter', log_backwash: '⟲ Log backwash now',
      last_backwash: 'Last backwash: {date}', sand_date: 'Filter sand changed',
      pump_notes: 'Pump notes / particularities', pump_notes_ph: 'e.g. skimmer left side off — see valve',
      mark_serviced: '✓ Mark serviced today',
      serviced_today: 'Serviced today',
      last_serviced: 'Last serviced {date}',
      service_undo: 'Undo today’s service',
      done_today_title: 'Done today ({n})',
      // day route
      nav_today: '🧭 Navigate today’s stops ({n})',
      // GPS location capture
      set_location: '📍 Set GPS here',
      update_location: '📍 Update GPS',
      geo_locating: 'Locating…',
      geo_error: 'Could not get your location. Allow location access and try again.',
      geo_unsupported: 'Geolocation isn’t available on this device/browser.',
      clear_location: 'Clear GPS',
      coords_label: '📍 {lat}, {lng}',
      // management-only (no pool) residences
      mgmt_only: 'Rental only — no pool',
      mgmt_note: 'Rental management only — no pool to maintain here. Listed so the prefix + number matches the rental papers.',
      rentals_label: 'rentals',
      // team sync
      sync_title: 'Team sync',
      sync_desc: 'Mirror chemistry logs, services and GPS pins between your team’s phones — automatically, offline-first.',
      sync_hint: 'Enter the same code on both phones to pair them.',
      team_code: 'Team code',
      team_code_ph: 'shared code',
      sync_connect: 'Turn on sync',
      sync_disconnect: 'Turn off sync',
      sync_state_off: 'Off',
      sync_state_connecting: 'Connecting…',
      sync_state_online: 'Synced ✓',
      sync_state_offline: 'Offline — will sync when back online',
      sync_state_error: 'Connection problem — check the code / internet',
      sync_on_team: 'On · team “{team}”',
      // notes / to-dos (preventive log)
      log_title: 'Notes & log',
      log_sub: 'Preventive log — to-dos and observations',
      notes_section: 'Notes',
      add_note: '+ Note',
      note_log_ph: 'e.g. check AG 8 — going green · tile to fix · skimmer broke · set to auto',
      note_todo: 'To-do (needs action)',
      note_pool: 'Pool',
      note_general: 'General',
      note_save: 'Add',
      todos_title: 'To-do ({n})',
      notes_recent: 'Recent notes',
      see_all: 'See all →',
      mark_done: 'Done',
      reopen: 'Reopen',
      notes_empty: 'No notes yet. Add the first one above.',
      done_badge: 'done',
      confirm_del_note: 'Delete this note?',
      // photos
      photos_section: 'Photos', ref_photos: 'Reference photos',
      ref_gate: 'Front gate', ref_pool: 'Pool', ref_pit: 'Pump room',
      add_photo: '＋', photo_del_confirm: 'Delete this photo?',
    },
    fr: {
      tab_today: 'Aujourd’hui', tab_pools: 'Piscines', tab_schedule: 'Planning', tab_map: 'Carte', tab_more: 'Plus',

      today_title: 'Cette semaine', today_sub: 'Rotation samedi · {date}',
      arrivals_title: 'Arrivées à préparer ({n})',
      arrivals_sub: 'Piscines à contrôler et nettoyer pour les nouveaux arrivants ce samedi.',
      arrivals_empty: 'Aucune arrivée enregistrée cette semaine.',
      midweek_title: 'Contrôles en semaine ({n})',
      midweek_sub: 'Piscines occupées à entretenir et équilibrer pendant le séjour.',
      midweek_empty: 'Aucun séjour en cours cette semaine.',
      chem_due_title: 'Analyses à faire ({n})',
      chem_due_sub: 'Aucune mesure depuis 4 jours.',
      chem_due_empty: 'Toutes les piscines ont une mesure récente. 🎉',
      no_reading: 'aucune mesure', last_date: 'dernière {date}', never: 'jamais',

      pools_title: 'Piscines', pools_sub: '{n} piscines · {m} résidences',
      to_confirm: '⚠︎ détails à confirmer',

      back_pools: '‹ Piscines', directions: '📍 Itinéraire', occupancy: 'Occupation',
      log_reading: 'Saisir une mesure',
      f_ph: 'pH', f_cl: 'Chlore libre (ppm)', f_cya: 'Stabilisant (ppm)', f_temp: 'Temp. (°C)', f_note: 'Note',
      f_when: 'Quand (optionnel — par défaut maintenant)',
      status_green: 'Stable', status_orange: 'À vérifier', status_red: 'Critique', status_grey: 'Sans donnée', status_none: '',
      note_ph: 'ex. ajout 2 galets',
      targets: 'Cibles — pH {phmin}–{phmax} · Cl {clmin}–{clmax}ppm · CYA {cyamin}–{cyamax}ppm',
      save_reading: 'Enregistrer',
      history: 'Historique ({n})', history_empty: 'Aucune mesure pour l’instant. Saisissez la première ci-dessus.',
      th_when: 'Quand', th_ph: 'pH', th_cl: 'Cl', th_cya: 'CYA', th_temp: '°C',
      confirm_del: 'Supprimer cette mesure ?', pool_not_found: 'Piscine introuvable',

      schedule_title: 'Planning', schedule_sub: 'Cycle de rotation du samedi',
      this_week: 'cette semaine', sched_counts: '{n} actives · {m} arrivées',

      map_title: 'Carte', map_sub: 'Ouvrir les résidences dans Google Maps',
      n_pools: '{n} piscines', open_maps: '📍 Ouvrir dans Google Maps',
      map_tip: 'Les repères « ~ » sont approximatifs — enregistrez le GPS à une piscine pour un repère exact.',

      settings_title: 'Réglages & sauvegarde',
      export_btn: '⬇︎ Sauvegarde (.json)', import_btn: '⬆︎ Importer une sauvegarde',
      export_csv_readings: '⬇︎ Mesures (.csv)', export_csv_notes: '⬇︎ Notes (.csv)',
      reset_btn: '↺ Réinitialiser aux données d’origine', about: 'À propos',
      about_text: 'Les données sont stockées uniquement sur cet appareil. Exportez régulièrement pour sauvegarder.',
      language: 'Langue',
      imported_ok: 'Sauvegarde importée.', import_fail: 'Échec de l’import : ',
      confirm_reset: 'Annuler toutes les modifications locales et recharger les données d’origine ?',

      in_date: 'arr. {date}', out_date: 'dép. {date}',

      st_arriving: 'Arrivée (rotation)', st_occupied: 'Occupée', st_departing: 'Départ',
      st_owner: 'Propriétaire (PROPRIO)', st_closed: 'Fermée (FERMÉE)', st_backup: 'Secours (EN SECOURS)', st_empty: 'Vide',

      // actions suggérées (indicatif — à vérifier selon vos produits et leurs notices)
      advice_title: 'Action suggérée',
      action_ph_high: 'pH élevé → ajouter du pH⁻ (pH moins), faire tourner la filtration, recontrôler après quelques heures.',
      action_ph_low: 'pH bas → ajouter du pH⁺ (pH plus), faire tourner la filtration, recontrôler.',
      action_cl_high: 'Chlore élevé → suspendre le dosage ; laisser baisser avant la baignade.',
      action_cl_low: 'Chlore bas → ajouter des galets (vérifier le diffuseur/skimmer).',
      action_cl_vlow: 'Chlore très bas → traitement choc ; recontrôler avant réouverture.',
      action_cya_low: 'Stabilisant bas → ajouter du stabilisant (acide cyanurique).',
      action_cya_high: 'Stabilisant élevé → vidange partielle puis remise à niveau pour diluer.',

      // suivi d’entretien
      pump_section: 'Gestion de pompe', log_backwash: '⟲ Enregistrer un lavage',
      last_backwash: 'Dernier lavage : {date}', sand_date: 'Sable du filtre changé',
      pump_notes: 'Notes pompe / particularités', pump_notes_ph: 'ex. skimmer côté gauche coupé — voir vanne',
      mark_serviced: '✓ Marquer entretenue aujourd’hui',
      serviced_today: 'Entretenue aujourd’hui',
      last_serviced: 'Dernier entretien {date}',
      service_undo: 'Annuler l’entretien du jour',
      done_today_title: 'Faites aujourd’hui ({n})',
      // itinéraire du jour
      nav_today: '🧭 Itinéraire des arrêts du jour ({n})',
      // capture de position GPS
      set_location: '📍 Enregistrer position GPS',
      update_location: '📍 Mettre à jour le GPS',
      geo_locating: 'Localisation…',
      geo_error: 'Position introuvable. Autorisez la localisation puis réessayez.',
      geo_unsupported: 'Géolocalisation indisponible sur cet appareil/navigateur.',
      clear_location: 'Effacer le GPS',
      coords_label: '📍 {lat}, {lng}',
      // résidences en gestion seule (sans piscine)
      mgmt_only: 'Location seule — sans piscine',
      mgmt_note: 'Gestion locative uniquement — pas de piscine à entretenir ici. Listée pour que le préfixe + numéro corresponde aux feuilles de location.',
      rentals_label: 'locations',
      // synchro équipe
      sync_title: 'Synchro équipe',
      sync_desc: 'Partage automatiquement mesures, entretiens et positions GPS entre les téléphones de l’équipe — hors-ligne d’abord.',
      sync_hint: 'Saisissez le même code sur les deux téléphones pour les appairer.',
      team_code: 'Code équipe',
      team_code_ph: 'code partagé',
      sync_connect: 'Activer la synchro',
      sync_disconnect: 'Désactiver la synchro',
      sync_state_off: 'Désactivée',
      sync_state_connecting: 'Connexion…',
      sync_state_online: 'Synchronisé ✓',
      sync_state_offline: 'Hors-ligne — synchro au retour du réseau',
      sync_state_error: 'Problème de connexion — vérifiez le code / internet',
      sync_on_team: 'Activée · équipe « {team} »',
      // notes / à‑faire (journal préventif)
      log_title: 'Notes & journal',
      log_sub: 'Journal préventif — à‑faire et observations',
      notes_section: 'Notes',
      add_note: '+ Note',
      note_log_ph: 'ex. vérifier AG 8 — verdit · carreau à réparer · skimmer cassé · mettre en auto',
      note_todo: 'À faire (action requise)',
      note_pool: 'Piscine',
      note_general: 'Général',
      note_save: 'Ajouter',
      todos_title: 'À faire ({n})',
      notes_recent: 'Notes récentes',
      see_all: 'Tout voir →',
      mark_done: 'Fait',
      reopen: 'Rouvrir',
      notes_empty: 'Aucune note. Ajoutez la première ci-dessus.',
      done_badge: 'fait',
      confirm_del_note: 'Supprimer cette note ?',
      // photos
      photos_section: 'Photos', ref_photos: 'Photos de référence',
      ref_gate: 'Portail', ref_pool: 'Piscine', ref_pit: 'Local technique',
      add_photo: '＋', photo_del_confirm: 'Supprimer cette photo ?',
    },
  };

  // Default to French (colleagues use FR); English is opt-in via Settings.
  let lang = localStorage.getItem(KEY) || 'fr';
  if (!STR[lang]) lang = 'fr';

  function t(key, params) {
    let s = (STR[lang] && STR[lang][key]) ?? (STR.en[key] ?? key);
    if (params) for (const k in params) s = s.replaceAll('{' + k + '}', params[k]);
    return s;
  }
  const get = () => lang;
  const set = (l) => { if (STR[l]) { lang = l; localStorage.setItem(KEY, l); } };
  const toggle = () => { set(lang === 'fr' ? 'en' : 'fr'); return lang; };
  const locale = () => (lang === 'fr' ? 'fr-FR' : 'en-GB');

  return { t, get, set, toggle, locale };
})();
window.I18n = I18n;

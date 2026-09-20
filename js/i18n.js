/* Minimal i18n: EN / FR, persisted to local storage. t(key, {params}). */
const I18n = (() => {
  const KEY = 'lagrange-piscine.lang';

  const STR = {
    en: {
      tab_today: 'Overview', tab_pools: 'Pools', tab_more: 'Settings',
      wx_loading_short: 'weather…', map_list: 'Residences',
      weather_title: 'Weather', wx_forecast: 'Forecast', wx_refresh: 'Refresh',
      wx_loading: 'Loading weather… (needs a connection the first time)',
      wx_updated: 'Updated {time}',
      wx_clear: 'Clear', wx_cloud: 'Cloudy', wx_fog: 'Fog', wx_rain: 'Rain', wx_snow: 'Snow', wx_storm: 'Storm', wx_unknown: '—',

      today_title: 'Overview', today_sub: 'Turnover Saturday · {date}',
      
      
      
      
      revisit_title: 'To revisit ({n})',
      revisit_sub: 'Longest not seen first — blind spots on top.',
      revisit_empty: 'Every pool seen today. 🎉',
      seen_never: 'never seen',
      seen_ago: 'seen {d}d ago',
      no_reading: 'no reading', never: 'never',

      pools_title: 'Pools', pools_sub: '{n} pools across {m} residences',
      pools_word: 'pools', zone_due: '{n} to see', vu_on: 'seen {date}', per_week: '/wk',
      weekday_letters: 'SMTWTFS',
      leg_stable: 'stable zone', leg_product: 'product',
      rythme_title: 'Passage rhythm', rythme_total: '{n} passages total',
      rythme_passages: 'passages', rythme_7d: 'last 7 days', rythme_worked: '{n} days worked',
      rythme_perday: 'pools/day', rythme_mean: 'average', rythme_perworked: 'per day worked',
      rythme_prev: 'prev. week',
      prod_title: 'Products added', prod_count: '{n} products', prod_since: 'since {date}',

      back_pools: '‹ Pools', directions: '📍 Directions', occupancy: 'Occupancy',
      log_reading: 'Log a reading',
      f_ph: 'pH', f_cl: 'Free Cl (ppm)', f_cya: 'Stabilizer (ppm)', f_note: 'Note',
      f_when: 'When (optional — defaults to now)',
      status_green: 'Stable', status_orange: 'To check', status_red: 'Critical', status_grey: 'No data', status_none: '',
      leg_treated: 'In progress', leg_todo: 'To see',
      note_ph: 'e.g. added 2 galets',
      targets: 'Targets — pH {phmin}–{phmax} · Cl {clmin}–{clmax}ppm · CYA {cyamin}–{cyamax}ppm',
      save_reading: 'Save reading',
      history: 'History ({n})', history_empty: 'No readings yet. Log the first one above.',
      th_when: 'When', th_ph: 'pH', th_cl: 'Cl', th_cya: 'CYA', 
      confirm_del: 'Delete this reading?', pool_not_found: 'Pool not found',

      plan_photos: 'Planning sheets', plan_wk1: 'This week', plan_wk2: 'Next week',
      
      
      
      

      map_title: 'Map', map_sub: 'Open residences in Google Maps',
      n_pools: '{n} pools', open_maps: '📍 Open in Google Maps',
      map_tip: 'Residence pins marked “~” are approximate — capture GPS at a pool to drop an exact pin.',

      settings_title: 'Settings & backup',
      export_btn: '⬇︎ Backup (.json)', export_data_btn: '⬇︎ Data only (no photos)', import_btn: '⬆︎ Import backup',
      export_csv_readings: '⬇︎ Readings (.csv)', export_csv_notes: '⬇︎ Notes (.csv)',
      reset_btn: '↺ Reset to seed data', about: 'About',
      about_text: 'Data is stored only on this device. Export regularly to back up.',
      language: 'Language',
      update_app: 'Update app (clear cache)', updating: 'Updating…',
      imported_ok: 'Backup imported.', import_fail: 'Import Discard all local changes and reload the original seed data?',


      

      // suggested actions (qualitative — verify against your products & labels)
      
      
      
      

      // chemistry panel (advisory)
      chem_title: 'Chemistry',
      
      
      
      
      
      
      
      
      chem_dose: 'To reach target',
      
      chem_dose_novol: 'set the volume',
      chem_dose_novol_h: 'add pool size below',
      dose_title: 'Doses',
      dose_phminus: 'pH‑',
      dose_phplus: 'pH+',
      dose_choc: 'Shock',
      dose_maint: 'Upkeep',
      dose_ph_h: '−{drop} pH/step · ~{n}× → {target} · retest',
      dose_phplus_h: '+{rise} pH/step · ~{n}× → {target} · retest',
      dose_choc_h: '+{d} ppm · shock only',
      
      dose_maint_galet_h: 'builds CYA · {d}d · or sticks',
      dose_maint_stick_h: 'CYA in band, no CYA · {d}d · or galets',
      status_treated: 'treated — recheck',
      status_retest: 'reconfirm (dosed, not re-tested)',
      salt_pool: 'Salt pool',

      // pool volume
      vol_section: 'Pool volume',
      vol_sub: 'length × width × average depth',
      vol_len: 'Length (m)',
      vol_wid: 'Width (m)',
      vol_dmin: 'Shallow (m)',
      vol_dmax: 'Deep (m)',
      vol_result: '≈ {v} m³',
      vol_hint: 'enter the dimensions',
      vol_presets: 'Estimated size',
      vol_measure: 'Measure',
      size_small: 'Small', size_medium: 'Medium', 
      estimated: 'estimate',
      f_salt: 'Salt (g/L)',
      target_salt: 'salt {min}–{max} g/L',
      cya_test_tip: 'CyA test: zero with the sample; if cloudy/green, filter it first (else reads high). Test chlorine at once, no swirling.',

      // products applied
      treat_section: 'Products added',
      treat_qty: 'Qty',
      edit_time: 'Tap to edit the time',
      validate: 'Validate',
      modify: 'Modify',
      set: 'Set',
      done: 'Done',
      unknown: 'Unknown',
      edit_note: 'Edit',
      depot: 'Depot',

      // service log
      watering_section: 'Filling / watering', watering_today: '💧 Filling now ({n})',
      start_watering: '💧 Start filling', stop_watering: '■ Stop filling',
      watering_since: 'Filling since {time} · {mins} min',
      reminder: 'Reminder', reminder_none: 'None',
      reminder_in: '⏳ Reminder in {mins} min', reminder_overdue: '⏰ Turn off — reminder passed!',
      turn_off_short: '⏰ turn off',
      pump_section: 'Pump & filter', log_backwash: '⟲ Log backwash now',
      last_backwash: 'Last backwash: {date}', sand_date: 'Filter sand changed',
      pump_notes_ph: 'e.g. skimmer left side off — see valve',
      last_serviced: 'Last serviced {date}',
      clean_title: 'Cleaning', task_balai: 'Balai', task_robot: 'Robot', task_skimmer: 'Skimmer',
      task_hivernage: 'Winterised', task_remise: 'Back in service',
      log_full: 'whole season ({n}) ▸', log_recent: '◂ recent only',
      winter_btn: 'Winterise', winter_confirm: 'Put {pool} into winter mode? It leaves the daily lists until you bring it back.',
      winter_since: '❄️ Winterised since {date}', winter_reopen: 'Back in service', winter_reopen_confirm: 'Bring {pool} back into service?',
      winter_fold: 'Winterised ({n})', 
      season_title: 'Season', season_all_data: 'All data shown (no season boundary).', season_since: 'Season since {date}',
      season_all_lens: 'Show all seasons', season_new: '🌱 New season', season_close: '❄️ Close the season', season_bilan: '📊 Season report',
      season_new_confirm: 'Start a new season today? Chemistry, doses and passages logged before today leave the live views (kept in the archive and in exports). Notes and pool cards carry over.',
      season_close_confirm: 'Close the season — winterise all {n} open pools?', season_closed_done: '{n} pools winterised.', season_reset: 'Remove the boundary',
      bilan_title: 'Season report', bilan_sub: '{from} → {to}', bilan_passages: 'passages', bilan_cl: 'chlorine', bilan_wash: 'backwashes', bilan_readings: 'readings',
      bilan_export: '⬇︎ Export report (.json)', bilan_empty: 'Nothing logged in this season yet.', 
      // day route
      // GPS location capture
      
      pick_on_map: '🗺️ Place on map', map_save: 'Save here',
      layer_sat: 'Satellite', layer_map: 'Map',
      geo_error: 'Could not get your location. Allow location access and try again.',
      clear_location: 'Clear GPS',
      coords_label: '📍 {lat}, {lng}',
      // management-only (no pool) residences
      mgmt_only: 'Rental only — no pool',
      mgmt_note: 'Rental management only — no pool to maintain here. Listed so the prefix + number matches the rental papers.',
      // team sync
      op_title: 'Username',
      
      
      op_ph: 'e.g. Loki',
      op_save: 'Save name',
      sync_title: 'Sync',
      sync_desc: 'Data sync + team connection.',
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
      
      note_log_ph: 'e.g. check AG 8 — going green · tile to fix · skimmer broke · set to auto',
      note_pool_ph: 'quick note…', water_word: 'watering',
      note_todo: 'To-do (needs action)',
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
      
      add_photo: '＋', photo_del_confirm: 'Delete this photo?',
    },
    fr: {
      tab_today: 'Aperçu', tab_pools: 'Piscines', tab_more: 'Réglages',
      wx_loading_short: 'météo…', map_list: 'Résidences',
      weather_title: 'Météo', wx_forecast: 'Prévisions', wx_refresh: 'Actualiser',
      wx_loading: 'Chargement météo… (connexion requise la première fois)',
      wx_updated: 'Mis à jour {time}',
      wx_clear: 'Dégagé', wx_cloud: 'Nuageux', wx_fog: 'Brouillard', wx_rain: 'Pluie', wx_snow: 'Neige', wx_storm: 'Orage', wx_unknown: '—',

      today_title: 'Aperçu', today_sub: 'Rotation samedi · {date}',
      
      
      
      
      revisit_title: 'À revoir ({n})',
      revisit_sub: 'Pas vue depuis le plus longtemps en premier — angles morts en haut.',
      revisit_empty: 'Toutes les piscines vues aujourd’hui. 🎉',
      seen_never: 'jamais vue',
      seen_ago: 'vue il y a {d} j',
      no_reading: 'aucune mesure', never: 'jamais',

      pools_title: 'Piscines', pools_sub: '{n} piscines · {m} résidences',
      pools_word: 'piscines', zone_due: '{n} à voir', vu_on: 'vu {date}', per_week: '/sem',
      weekday_letters: 'DLMMJVS',
      leg_stable: 'zone stable', leg_product: 'produit',
      rythme_title: 'Rythme de passage', rythme_total: '{n} passages en tout',
      rythme_passages: 'passages', rythme_7d: '7 derniers jours', rythme_worked: '{n} jours travaillés',
      rythme_perday: 'piscines/jour', rythme_mean: 'moyenne', rythme_perworked: 'par jour travaillé',
      rythme_prev: 'semaine −1',
      prod_title: 'Produits ajoutés', prod_count: '{n} produits', prod_since: 'depuis {date}',

      back_pools: '‹ Piscines', directions: '📍 Itinéraire', occupancy: 'Occupation',
      log_reading: 'Saisir une mesure',
      f_ph: 'pH', f_cl: 'Chlore libre (ppm)', f_cya: 'Stabilisant (ppm)', f_note: 'Note',
      f_when: 'Quand (optionnel — par défaut maintenant)',
      status_green: 'Stable', status_orange: 'À vérifier', status_red: 'Critique', status_grey: 'Sans donnée', status_none: '',
      leg_treated: 'En cours', leg_todo: 'À voir',
      note_ph: 'ex. ajout 2 galets',
      targets: 'Cibles — pH {phmin}–{phmax} · Cl {clmin}–{clmax}ppm · CYA {cyamin}–{cyamax}ppm',
      save_reading: 'Enregistrer',
      history: 'Historique ({n})', history_empty: 'Aucune mesure pour l’instant. Saisissez la première ci-dessus.',
      th_when: 'Quand', th_ph: 'pH', th_cl: 'Cl', th_cya: 'CYA', 
      confirm_del: 'Supprimer cette mesure ?', pool_not_found: 'Piscine introuvable',

      plan_photos: 'Feuilles de planning', plan_wk1: 'Cette semaine', plan_wk2: 'Semaine suivante',
      
      
      
      

      map_title: 'Carte', map_sub: 'Ouvrir les résidences dans Google Maps',
      n_pools: '{n} piscines', open_maps: '📍 Ouvrir dans Google Maps',
      map_tip: 'Les repères « ~ » sont approximatifs — enregistrez le GPS à une piscine pour un repère exact.',

      settings_title: 'Réglages & sauvegarde',
      export_btn: '⬇︎ Sauvegarde (.json)', export_data_btn: '⬇︎ Données seules (sans photos)', import_btn: '⬆︎ Importer une sauvegarde',
      export_csv_readings: '⬇︎ Mesures (.csv)', export_csv_notes: '⬇︎ Notes (.csv)',
      reset_btn: '↺ Réinitialiser aux données d’origine', about: 'À propos',
      about_text: 'Les données sont stockées uniquement sur cet appareil. Exportez régulièrement pour sauvegarder.',
      language: 'Langue',
      update_app: 'Mettre à jour (vider le cache)', updating: 'Mise à jour…',
      imported_ok: 'Sauvegarde importée.', import_fail: 'Échec de l’import : ',
      confirm_reset: 'Annuler toutes les modifications locales et recharger les données d’origine ?',


      

      // actions suggérées (indicatif — à vérifier selon vos produits et leurs notices)
      
      
      
      

      // panneau chimie (indicatif)
      chem_title: 'Chimie',
      
      
      
      
      
      
      
      
      chem_dose: 'Pour la cible',
      
      chem_dose_novol: 'saisir le volume',
      chem_dose_novol_h: 'ajouter la taille ci-dessous',
      dose_title: 'Doses',
      dose_phminus: 'pH‑',
      dose_phplus: 'pH+',
      dose_choc: 'Choc',
      dose_maint: 'Entretien',
      dose_ph_h: '−{drop} pH/palier · ~{n}× → {target} · retester',
      dose_phplus_h: '+{rise} pH/palier · ~{n}× → {target} · retester',
      dose_choc_h: '+{d} ppm · choc seul',
      
      dose_maint_galet_h: 'monte le CYA · {d}j · ou sticks',
      dose_maint_stick_h: 'CYA en zone, sans CYA · {d}j · ou galets',
      status_treated: 'traité — à revérifier',
      status_retest: 'à reconfirmer (traité, pas retesté)',
      salt_pool: 'Piscine au sel',

      // volume du bassin
      vol_section: 'Volume du bassin',
      vol_sub: 'longueur × largeur × profondeur moyenne',
      vol_len: 'Longueur (m)',
      vol_wid: 'Largeur (m)',
      vol_dmin: 'Petit bain (m)',
      vol_dmax: 'Grand bain (m)',
      vol_result: '≈ {v} m³',
      vol_hint: 'saisir les dimensions',
      vol_presets: 'Taille estimée',
      vol_measure: 'Mesurer',
      size_small: 'Petite', size_medium: 'Moyenne', 
      estimated: 'estimé',
      f_salt: 'Sel (g/L)',
      target_salt: 'sel {min}–{max} g/L',
      cya_test_tip: 'Test stab : zéro avec l’échantillon ; si trouble/verte, filtrer d’abord (sinon lit trop haut). Chlore : tester tout de suite, sans remuer.',

      // produits ajoutés
      treat_section: 'Produits ajoutés',
      treat_qty: 'Qté',
      edit_time: 'Toucher pour modifier l’heure',
      validate: 'Valider',
      modify: 'Modifier',
      set: 'Définir',
      done: 'Terminé',
      unknown: 'Inconnue',
      edit_note: 'Modifier',
      depot: 'Dépôt',

      // suivi d’entretien
      watering_section: 'Remplissage', watering_today: '💧 En remplissage ({n})',
      start_watering: '💧 Démarrer le remplissage', stop_watering: '■ Arrêter',
      watering_since: 'En remplissage depuis {time} · {mins} min',
      reminder: 'Rappel', reminder_none: 'Aucun',
      reminder_in: '⏳ Rappel dans {mins} min', reminder_overdue: '⏰ À couper — rappel dépassé !',
      turn_off_short: '⏰ à couper',
      pump_section: 'Gestion de pompe', log_backwash: '⟲ Enregistrer un lavage',
      last_backwash: 'Dernier lavage : {date}', sand_date: 'Sable du filtre changé',
      pump_notes_ph: 'ex. skimmer côté gauche coupé — voir vanne',
      last_serviced: 'Dernier entretien {date}',
      clean_title: 'Nettoyage', task_balai: 'Balai', task_robot: 'Robot', task_skimmer: 'Skimmer',
      task_hivernage: 'Hivernage', task_remise: 'Remise en service',
      log_full: 'toute la saison ({n}) ▸', log_recent: '◂ récents seulement',
      winter_btn: 'Hivernage', winter_confirm: 'Mettre {pool} en hivernage ? Elle quitte les listes du jour jusqu’à la remise en service.',
      winter_since: '❄️ En hivernage depuis le {date}', winter_reopen: 'Remettre en service', winter_reopen_confirm: 'Remettre {pool} en service ?',
      winter_fold: 'Hivernage ({n})', 
      season_title: 'Saison', season_all_data: 'Toutes les données affichées (pas de limite de saison).', season_since: 'Saison depuis le {date}',
      season_all_lens: 'Voir toutes les saisons', season_new: '🌱 Nouvelle saison', season_close: '❄️ Fermer la saison', season_bilan: '📊 Bilan de saison',
      season_new_confirm: 'Commencer une nouvelle saison aujourd’hui ? Chimie, doses et passages d’avant aujourd’hui quittent les vues (conservés dans l’archive et les exports). Notes et fiches piscine restent.',
      season_close_confirm: 'Fermer la saison — mettre les {n} piscines ouvertes en hivernage ?', season_closed_done: '{n} piscines en hivernage.', season_reset: 'Retirer la limite',
      bilan_title: 'Bilan de saison', bilan_sub: '{from} → {to}', bilan_passages: 'passages', bilan_cl: 'chlore', bilan_wash: 'lavages', bilan_readings: 'mesures',
      bilan_export: '⬇︎ Exporter le bilan (.json)', bilan_empty: 'Rien de saisi sur cette saison pour l’instant.', 
      // itinéraire du jour
      // capture de position GPS
      
      pick_on_map: '🗺️ Placer sur la carte', map_save: 'Enregistrer ici',
      layer_sat: 'Satellite', layer_map: 'Plan',
      geo_error: 'Position introuvable. Autorisez la localisation puis réessayez.',
      clear_location: 'Effacer le GPS',
      coords_label: '📍 {lat}, {lng}',
      // résidences en gestion seule (sans piscine)
      mgmt_only: 'Location seule — sans piscine',
      mgmt_note: 'Gestion locative uniquement — pas de piscine à entretenir ici. Listée pour que le préfixe + numéro corresponde aux feuilles de location.',
      // synchro équipe
      op_title: 'Nom d’utilisateur',
      
      
      op_ph: 'ex. Loki',
      op_save: 'Enregistrer',
      sync_title: 'Synchro',
      sync_desc: 'Synchronisation de données + connexion équipe.',
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
      
      note_log_ph: 'ex. vérifier AG 8 — verdit · carreau à réparer · skimmer cassé · mettre en auto',
      note_pool_ph: 'note rapide…', water_word: 'arrosage',
      note_todo: 'À faire (action requise)',
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

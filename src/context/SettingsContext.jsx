import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settings as settingsApi } from '../services/api';

const SettingsContext = createContext({});

const DEFAULTS = {
  company_name:      'Kortahun United',
  company_address:   'Freetown, Sierra Leone',
  company_phone:     '+232 76 000 000',
  company_email:     'info@kortahun.com',
  currency:          'NLe',
  water_unit_price:  '1700',
  sewage_unit_price: '2000',
  bank_name:         '',
  bank_account:      '',
  bank_bban:         '',
  tin_number:        '',
  app_version:       '2.0.0',
};

export function SettingsProvider({ children }) {
  const [data, setData] = useState(DEFAULTS);

  const load = useCallback(async () => {
    try {
      const res = await settingsApi.get();
      if (res?.data) setData(s => ({ ...s, ...res.data }));
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSettings = async (patch) => {
    try {
      await settingsApi.update(patch);
      setData(s => ({ ...s, ...patch }));
    } catch (e) { throw e; }
  };

  const fmt = (amount) => {
    const sym = data.currency || 'NLe';
    return `${sym} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <SettingsContext.Provider value={{ settings: data, updateSettings, reloadSettings: load, fmt }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

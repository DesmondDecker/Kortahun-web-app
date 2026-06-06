import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, HStack, Text, Button, Input, Divider, Heading, useToast,
} from '@chakra-ui/react';

const PROMPT = 'kortahun@system:~$';

const HELP_TEXT = `
KORTAHUN UNITED — Web Terminal v2.0
====================================
  System:
    help           Show this help
    clear          Clear terminal
    sys:info       Show environment info
    version        Show app version

  Data (requires auth):
    stats          Show database summary stats
    customers      List customer stats
    deliveries     Show delivery summary

  Navigation:
    go <page>      Navigate to a page
    Pages: dashboard, customers, billing, appointments, deliveries,
           vehicles, drivers, payments, expenses, reports,
           gis-pricing, terminal, manual, audit-logs, settings

  Shortcuts:
    ? or help      Show this help
    ↑ / ↓          Cycle command history
`;

const ROUTES = {
  dashboard:    '/',
  customers:    '/customers',
  billing:      '/billing',
  appointments: '/appointments',
  deliveries:   '/deliveries',
  vehicles:     '/vehicles',
  drivers:      '/drivers',
  payments:     '/payments',
  expenses:     '/expenses',
  reports:      '/reports',
  'gis-pricing':'/gis-pricing',
  terminal:     '/terminal',
  manual:       '/manual',
  'audit-logs': '/audit-logs',
  settings:     '/settings',
};

async function runCommand(cmd, navigateFn) {
  const c = cmd.trim().toLowerCase();
  if (!c) return null;
  if (c === 'help' || c === '?') return { type: 'info',    text: HELP_TEXT };
  if (c === 'clear')              return { type: 'clear' };
  if (c === 'version')            return { type: 'success', text: 'Kortahun United v2.0 — React + Vite + Netlify + MongoDB Atlas' };

  if (c === 'sys:info') return { type: 'info', text:
    `Environment : ${import.meta.env.MODE}\n` +
    `Origin      : ${window.location.origin}\n` +
    `Timestamp   : ${new Date().toISOString()}\n` +
    `UA          : ${navigator.userAgent.substring(0, 80)}…`
  };

  if (c === 'stats') {
    try {
      const authHeader = { Authorization: `Bearer ${localStorage.getItem('ku_token')}` };
      const [cRes, dRes, pRes] = await Promise.all([
        fetch('/api/customers/stats',  { headers: authHeader }),
        fetch('/api/deliveries/stats', { headers: authHeader }),
        fetch('/api/payments/stats',   { headers: authHeader }),
      ]);
      const [c, d, p] = await Promise.all([cRes.json(), dRes.json(), pRes.json()]);
      return { type: 'success', text:
        `=== DATABASE STATS ===\n` +
        `Customers : ${c.data?.total ?? '?'} total  |  ${c.data?.active ?? '?'} active\n` +
        `Deliveries: ${d.data?.total ?? '?'} total  |  NLe ${(d.data?.totalRevenue || 0).toLocaleString()} revenue\n` +
        `Payments  : ${p.data?.total ?? '?'} total  |  NLe ${(p.data?.totalRevenue || 0).toLocaleString()} collected`
      };
    } catch (e) { return { type: 'error', text: `Error fetching stats: ${e.message}` }; }
  }

  if (c === 'customers') {
    try {
      const res  = await fetch('/api/customers/stats', { headers: { Authorization: `Bearer ${localStorage.getItem('ku_token')}` } });
      const data = await res.json();
      const d    = data.data || {};
      return { type: 'success', text:
        `=== CUSTOMERS ===\n` +
        `Total     : ${d.total ?? 0}\n` +
        `Active    : ${d.active ?? 0}\n` +
        `Inactive  : ${d.inactive ?? 0}\n` +
        `Suspended : ${d.suspended ?? 0}\n` +
        `Water     : ${d.water ?? 0}   Sewage: ${d.sewage ?? 0}`
      };
    } catch (e) { return { type: 'error', text: `Error: ${e.message}` }; }
  }

  if (c === 'deliveries') {
    try {
      const res  = await fetch('/api/deliveries/stats', { headers: { Authorization: `Bearer ${localStorage.getItem('ku_token')}` } });
      const data = await res.json();
      const d    = data.data || {};
      return { type: 'success', text:
        `=== DELIVERIES ===\n` +
        `Total      : ${d.total ?? 0}\n` +
        `Paid       : ${d.paid ?? 0}\n` +
        `Partial    : ${d.partial ?? 0}\n` +
        `Unpaid     : ${d.unpaid ?? 0}\n` +
        `Revenue    : NLe ${(d.totalRevenue || 0).toLocaleString()}\n` +
        `Outstanding: NLe ${(d.totalOutstanding || 0).toLocaleString()}`
      };
    } catch (e) { return { type: 'error', text: `Error: ${e.message}` }; }
  }

  if (c.startsWith('go ')) {
    const page = c.replace('go ', '').trim();
    if (ROUTES[page]) {
      navigateFn(ROUTES[page]);
      return { type: 'success', text: `Navigated to /${page}` };
    }
    return { type: 'error', text: `Unknown page: "${page}"\nAvailable: ${Object.keys(ROUTES).join(', ')}` };
  }

  return { type: 'error', text: `Unknown command: ${cmd}\nType 'help' for available commands.` };
}

export default function Terminal() {
  const [history, setHistory] = useState([{
    type: 'system',
    text: `╔═══════════════════════════════════════════════════╗
║  KORTAHUN UNITED — WEB TERMINAL v2.0              ║
║  Developed by Summit Technologies                 ║
║  Lead Developer: Desmond Decker                   ║
╚═══════════════════════════════════════════════════╝

Welcome! Type 'help' for all available commands.
Backend: MongoDB Atlas via Netlify Functions.`,
    ts: new Date().toLocaleTimeString(),
  }]);
  const [input,   setInput]   = useState('');
  const [running, setRunning] = useState(false);
  const [cmdHist, setCmdHist] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const navigate   = useNavigate();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const run = async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory(h => [...h, { type: 'input', text: `${PROMPT} ${trimmed}`, ts: new Date().toLocaleTimeString() }]);
    setCmdHist(h => [trimmed, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput('');
    setRunning(true);

    const result = await runCommand(trimmed, navigate);
    setRunning(false);

    if (!result) return;
    if (result.type === 'clear') { setHistory([]); return; }
    setHistory(h => [...h, { ...result, ts: new Date().toLocaleTimeString() }]);
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { run(input); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, cmdHist.length - 1);
      setHistIdx(idx);
      setInput(cmdHist[idx] || '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx < 0 ? '' : cmdHist[idx] || '');
    }
  };

  const COLORS = {
    system:  'blue.300',
    success: 'green.300',
    error:   'red.400',
    info:    'yellow.200',
    input:   'gray.300',
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md" color="gray.800">🖥️ System Terminal</Heading>
        <HStack spacing={2} flexWrap="wrap">
          {['stats', 'customers', 'deliveries', 'help', 'clear'].map(cmd => (
            <Button key={cmd} size="xs" variant="outline" colorScheme="gray" onClick={() => run(cmd)}>
              {cmd}
            </Button>
          ))}
        </HStack>
      </Flex>

      <Box
        bg="gray.900"
        borderRadius="16px"
        p={4}
        minH="520px"
        maxH="70vh"
        display="flex"
        flexDirection="column"
        fontFamily="'Courier New', Courier, monospace"
        fontSize="sm"
        boxShadow="inset 0 2px 12px rgba(0,0,0,0.6)"
        cursor="text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Output area */}
        <Box flex={1} overflowY="auto" mb={3} pr={1}>
          {history.map((entry, i) => (
            <Box key={i} mb={0.5}>
              <Text
                color={COLORS[entry.type] || 'gray.300'}
                whiteSpace="pre-wrap"
                lineHeight="1.6"
                fontSize="sm"
              >
                {entry.text}
              </Text>
            </Box>
          ))}
          <div ref={bottomRef} />
        </Box>

        <Divider borderColor="gray.600" mb={3} />

        {/* Input row */}
        <HStack spacing={2}>
          <Text color="green.400" fontFamily="monospace" fontSize="sm" whiteSpace="nowrap" flexShrink={0}>
            {PROMPT}
          </Text>
          <Input
            ref={inputRef}
            variant="unstyled"
            color="white"
            fontFamily="monospace"
            fontSize="sm"
            flex={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={running ? 'Running…' : ''}
            isDisabled={running}
            autoFocus
            _placeholder={{ color: 'gray.600' }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
          />
          {running && <Text color="yellow.400" fontSize="xs" flexShrink={0}>●</Text>}
        </HStack>
      </Box>
    </Box>
  );
}

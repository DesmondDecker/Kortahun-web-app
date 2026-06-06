import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Flex, VStack, HStack, Text, Button, Avatar, Badge,
  IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, useDisclosure, useBreakpointValue,
  Spinner, Center, Tooltip, Divider,
} from '@chakra-ui/react';
import { HamburgerIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AuthPage       from './pages/AuthPage';
import Dashboard      from './pages/Dashboard';
import Customers      from './pages/Customers';
import Billing        from './pages/Billing';
import Appointments   from './pages/Appointments';
import AuditLogs      from './pages/AuditLogs';
import Vehicles       from './pages/Vehicles';
import Drivers        from './pages/Drivers';
import Deliveries     from './pages/Deliveries';
import Payments       from './pages/Payments';
import Expenses       from './pages/Expenses';
import Reports        from './pages/Reports';
import GISPricing     from './pages/GISPricing';
import Terminal       from './pages/Terminal';
import UserManual     from './pages/UserManual';
import Settings       from './pages/Settings';

const NAV = [
  { path: '/',            label: 'Dashboard',    icon: '📊' },
  { path: '/customers',   label: 'Customers',    icon: '👥' },
  { path: '/billing',     label: 'Billing',      icon: '💰' },
  { path: '/appointments',label: 'Appointments', icon: '📅' },
  { path: '/deliveries',  label: 'Deliveries',   icon: '🚚' },
  { path: '/vehicles',    label: 'Vehicles',     icon: '🚛' },
  { path: '/drivers',     label: 'Drivers',      icon: '👤' },
  { path: '/payments',    label: 'Payments',     icon: '💳' },
  { path: '/expenses',    label: 'Expenses',     icon: '📉' },
  { path: '/reports',     label: 'Reports',      icon: '📈' },
  { path: '/gis-pricing', label: 'GIS Pricing',  icon: '🗺️' },
  { path: '/terminal',    label: 'Terminal',     icon: '🖥️' },
  { path: '/manual',      label: 'User Manual',  icon: '📖' },
  { path: '/audit-logs',  label: 'Audit Logs',   icon: '📋' },
  { path: '/settings',    label: 'Settings',     icon: '⚙️' },
];

function Sidebar({ collapsed, onNavigate }) {
  const { user, logout, connStatus } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleNav = (path) => { navigate(path); onNavigate?.(); };
  const handleLogout = () => { logout(); navigate('/'); onNavigate?.(); };

  return (
    <VStack h="full" spacing={0} align="stretch" overflow="hidden">
      {/* Logo */}
      <Box px={collapsed ? 2 : 5} py={4} borderBottom="1px solid rgba(255,255,255,0.1)">
        <HStack spacing={3} justify={collapsed ? 'center' : 'flex-start'}>
          <Text fontSize="2xl">💧</Text>
          {!collapsed && (
            <VStack align="start" spacing={0}>
              <Text fontWeight="800" fontSize="sm" color="white" lineHeight={1}>KORTAHUN</Text>
              <Text fontSize="10px" color="blue.300" letterSpacing="wider">UNITED</Text>
            </VStack>
          )}
        </HStack>
      </Box>

      {/* User */}
      {!collapsed && (
        <Box px={4} py={3} borderBottom="1px solid rgba(255,255,255,0.1)">
          <HStack>
            <Avatar size="sm" name={user?.username} bg="blue.400" />
            <VStack align="start" spacing={0} flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="600" color="white" noOfLines={1}>{user?.username}</Text>
              <Badge size="xs" colorScheme={connStatus === 'connected' ? 'green' : 'red'} fontSize="0.6rem">
                {connStatus === 'connected' ? '● Online' : '● Offline'}
              </Badge>
            </VStack>
          </HStack>
        </Box>
      )}

      {/* Nav */}
      <VStack flex={1} py={3} spacing={0.5} align="stretch" px={collapsed ? 1 : 3} overflowY="auto">
        {NAV.map(item => {
          const active = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <Tooltip key={item.path} label={collapsed ? item.label : ''} placement="right" hasArrow>
              <Button
                onClick={() => handleNav(item.path)}
                variant="ghost"
                justifyContent={collapsed ? 'center' : 'flex-start'}
                size="sm"
                h="36px"
                borderRadius="8px"
                bg={active ? 'rgba(255,255,255,0.15)' : 'transparent'}
                color={active ? 'white' : 'blue.200'}
                _hover={{ bg: 'rgba(255,255,255,0.1)', color: 'white' }}
                fontWeight={active ? '700' : '400'}
                px={collapsed ? 0 : 3}
              >
                <HStack spacing={collapsed ? 0 : 3}>
                  <Text fontSize="sm">{item.icon}</Text>
                  {!collapsed && <Text fontSize="sm">{item.label}</Text>}
                </HStack>
              </Button>
            </Tooltip>
          );
        })}
      </VStack>

      <Divider borderColor="rgba(255,255,255,0.1)" />
      <Box px={collapsed ? 1 : 3} py={3}>
        <Tooltip label={collapsed ? 'Logout' : ''} placement="right" hasArrow>
          <Button
            variant="ghost" w="full" onClick={handleLogout} size="sm"
            color="red.300" _hover={{ bg: 'rgba(255,100,100,0.15)', color: 'red.200' }}
            justifyContent={collapsed ? 'center' : 'flex-start'}
            px={collapsed ? 0 : 3}
          >
            <HStack spacing={collapsed ? 0 : 3}>
              <Text>🚪</Text>
              {!collapsed && <Text fontSize="sm">Logout</Text>}
            </HStack>
          </Button>
        </Tooltip>
      </Box>
    </VStack>
  );
}

function Layout({ children }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [collapsed, setCollapsed] = useState(false);
  const isMd = useBreakpointValue({ base: false, md: true });
  const sidebarW = collapsed ? '72px' : '240px';

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Desktop Sidebar */}
      {isMd && (
        <Box
          w={sidebarW} minW={sidebarW} flexShrink={0}
          bg="linear-gradient(180deg, #0F172A 0%, #1E3A8A 40%, #1D4ED8 100%)"
          display="flex" flexDirection="column"
          transition="width 0.2s ease"
          boxShadow="4px 0 24px rgba(15,23,42,0.4)"
          position="relative" zIndex={10}
        >
          <Sidebar collapsed={collapsed} />
          {/* Collapse toggle */}
          <Box position="absolute" top="50%" right="-12px" transform="translateY(-50%)" zIndex={20}>
            <IconButton
              size="xs" borderRadius="full"
              bg="white" shadow="md" color="gray.600"
              icon={collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              onClick={() => setCollapsed(c => !c)}
              aria-label="Toggle sidebar"
              _hover={{ bg: 'gray.100' }}
            />
          </Box>
        </Box>
      )}

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="240px" bg="linear-gradient(180deg, #0F172A 0%, #1E3A8A 40%, #1D4ED8 100%)">
          <DrawerCloseButton color="white" />
          <DrawerHeader borderBottom="1px solid rgba(255,255,255,0.1)" py={3}>
            <Text fontSize="sm" fontWeight="bold" color="white">KORTAHUN UNITED</Text>
          </DrawerHeader>
          <DrawerBody p={0}>
            <Sidebar collapsed={false} onNavigate={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <Flex flex={1} direction="column" overflow="hidden">
        {!isMd && (
          <HStack px={4} py={3} bg="white" borderBottom="1px" borderColor="gray.200" shadow="sm">
            <IconButton icon={<HamburgerIcon />} variant="ghost" onClick={onOpen} size="sm" aria-label="Menu" />
            <HStack>
              <Text fontSize="lg">💧</Text>
              <Text fontWeight="bold" color="blue.700" fontSize="sm">Kortahun United</Text>
            </HStack>
          </HStack>
        )}
        <Box flex={1} overflowY="auto" bg="gray.50" p={{ base: 3, md: 6 }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <VStack>
          <Text fontSize="4xl">💧</Text>
          <Spinner size="xl" color="blue.500" thickness="3px" />
          <Text color="gray.500" fontWeight="500">Loading Kortahun United...</Text>
        </VStack>
      </Center>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/customers"   element={<Customers />} />
        <Route path="/billing"     element={<Billing />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/deliveries"  element={<Deliveries />} />
        <Route path="/vehicles"    element={<Vehicles />} />
        <Route path="/drivers"     element={<Drivers />} />
        <Route path="/payments"    element={<Payments />} />
        <Route path="/expenses"    element={<Expenses />} />
        <Route path="/reports"     element={<Reports />} />
        <Route path="/gis-pricing" element={<GISPricing />} />
        <Route path="/terminal"    element={<Terminal />} />
        <Route path="/manual"      element={<UserManual />} />
        <Route path="/audit-logs"  element={<AuditLogs />} />
        <Route path="/settings"    element={<Settings />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

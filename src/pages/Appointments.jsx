// src/pages/Appointments.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Heading, Text, Button, Input, Select, HStack, VStack, Card, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, FormErrorMessage, Textarea, Grid,
  useDisclosure, useToast, Spinner, Center, SimpleGrid, Flex, Tooltip,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Alert, AlertIcon, Divider, Tag, TagLabel,
} from '@chakra-ui/react';
import {
  AddIcon, DeleteIcon, EditIcon, CheckIcon, TimeIcon, CloseIcon,
  ArrowForwardIcon,
} from '@chakra-ui/icons';
import { appointments, vehicles as vehApi, drivers as drvApi, settings as settingsApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const SERVICES = [
  'water-supply', 'sewage-disposal', 'pipe-repair',
  'meter-installation', 'leak-detection', 'water-quality-test',
  'maintenance', 'emergency-repair',
];
const SERVICE_LABELS = {
  'water-supply':        '💧 Water Supply',
  'sewage-disposal':     '🚽 Sewage Disposal',
  'pipe-repair':         '🔧 Pipe Repair',
  'meter-installation':  '📏 Meter Installation',
  'leak-detection':      '🔍 Leak Detection',
  'water-quality-test':  '🧪 Water Quality Test',
  'maintenance':         '⚙️ Maintenance',
  'emergency-repair':    '🚨 Emergency Repair',
};
const SERVICE_TYPE_MAP = {
  'water-supply':       'Water Supply',
  'sewage-disposal':    'Sewage Disposal',
  'pipe-repair':        'Water Supply',
  'meter-installation': 'Water Supply',
  'leak-detection':     'Water Supply',
  'water-quality-test': 'Water Supply',
  'maintenance':        'Water Supply',
  'emergency-repair':   'Water Supply',
};
const PRIORITIES        = ['low', 'medium', 'high'];
const PRIORITY_COLORS   = { low: 'gray', medium: 'yellow', high: 'red' };
const STATUS_COLORS     = { scheduled: 'blue', 'in-progress': 'orange', completed: 'green', cancelled: 'gray' };
const STATUS_ICONS      = { scheduled: '📅', 'in-progress': '⏳', completed: '✅', cancelled: '❌' };

const emptyForm = {
  customerName: '', customerPhone: '', address: '',
  service: 'water-supply', date: '', time: '09:00',
  technician: '', priority: 'medium', status: 'scheduled',
  totalCost: 0, notes: '',
};

const emptyCompleteForm = {
  unit_price: 1700, trips: 1, quantity_litres: 5000,
  cash_received: 0, vehicle_id: '', driver_id: '', extra_notes: '',
};

// ── Appointment Form ────────────────────────────────────────────────────────
function AppointmentForm({ initial, onSave, onCancel, loading }) {
  const [form,   setForm]   = useState(initial || emptyForm);
  const [errors, setErrors] = useState({});
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const validate = () => {
    const e = {};
    if (!form.customerName.trim())  e.customerName  = 'Customer name required';
    if (!form.customerPhone.trim()) e.customerPhone = 'Phone required';
    if (!form.service)              e.service       = 'Service required';
    if (!form.date)                 e.date          = 'Date required';
    if (!form.time)                 e.time          = 'Time required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <VStack spacing={4} align="stretch">
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
        <FormControl isInvalid={!!errors.customerName} isRequired>
          <FormLabel fontSize="sm">Customer Name</FormLabel>
          <Input value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="Full name" />
          <FormErrorMessage>{errors.customerName}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.customerPhone} isRequired>
          <FormLabel fontSize="sm">Phone</FormLabel>
          <Input value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} placeholder="+232 76 000 000" />
          <FormErrorMessage>{errors.customerPhone}</FormErrorMessage>
        </FormControl>

        <FormControl gridColumn={{ md: '1 / -1' }}>
          <FormLabel fontSize="sm">Address</FormLabel>
          <Input value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Service location" />
        </FormControl>

        <FormControl isInvalid={!!errors.service} isRequired>
          <FormLabel fontSize="sm">Service Type</FormLabel>
          <Select value={form.service} onChange={e => set('service', e.target.value)}>
            {SERVICES.map(s => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
          </Select>
          <FormErrorMessage>{errors.service}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Technician</FormLabel>
          <Input value={form.technician || ''} onChange={e => set('technician', e.target.value)} placeholder="Assigned technician" />
        </FormControl>

        <FormControl isInvalid={!!errors.date} isRequired>
          <FormLabel fontSize="sm">Date</FormLabel>
          <Input type="date" value={form.date?.split('T')[0] || ''} onChange={e => set('date', e.target.value)} />
          <FormErrorMessage>{errors.date}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.time} isRequired>
          <FormLabel fontSize="sm">Time</FormLabel>
          <Input type="time" value={form.time || '09:00'} onChange={e => set('time', e.target.value)} />
          <FormErrorMessage>{errors.time}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Priority</FormLabel>
          <Select value={form.priority || 'medium'} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Estimated Cost (NLe)</FormLabel>
          <Input type="number" min="0" value={form.totalCost || 0}
            onChange={e => set('totalCost', parseFloat(e.target.value) || 0)} />
        </FormControl>
      </Grid>

      <FormControl>
        <FormLabel fontSize="sm">Notes</FormLabel>
        <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Additional details…" />
      </FormControl>

      <HStack justify="flex-end" pt={2}>
        <Button variant="ghost" onClick={onCancel} isDisabled={loading}>Cancel</Button>
        <Button colorScheme="blue" onClick={() => { if (validate()) onSave(form); }} isLoading={loading}>
          Save Appointment
        </Button>
      </HStack>
    </VStack>
  );
}

// ── Complete Appointment Modal ───────────────────────────────────────────────
function CompleteModal({ appointment, isOpen, onClose, onComplete, loading }) {
  const [form,     setForm]     = useState(emptyCompleteForm);
  const [vehicles, setVehicles] = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const { fmt, settings }       = useSettings();

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...emptyCompleteForm,
      unit_price: Number(settings?.water_unit_price) || 1700,
    });
    Promise.all([vehApi.list(), drvApi.list()])
      .then(([vr, dr]) => { setVehicles(vr.data || []); setDrivers(dr.data || []); })
      .catch(() => {});
  }, [isOpen, settings]);

  const hc     = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const total  = (form.unit_price || 0) * (form.trips || 1);
  const outstanding = Math.max(0, total - (form.cash_received || 0));
  const payStatus   = form.cash_received >= total && total > 0 ? 'Paid'
                    : form.cash_received > 0 ? 'Partial' : 'Unpaid';

  if (!appointment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent borderRadius="16px">
        <ModalHeader>
          <HStack>
            <Text fontSize="xl">✅</Text>
            <Box>
              <Text>Complete Appointment</Text>
              <Text fontSize="sm" color="gray.500" fontWeight="400">
                {appointment.customerName} — {SERVICE_LABELS[appointment.service] || appointment.service}
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Alert status="info" borderRadius="8px" mb={4} fontSize="sm">
            <AlertIcon />
            Completing this appointment will automatically create a <b>Delivery record</b> with the details below.
          </Alert>

          <Grid templateColumns="1fr 1fr" gap={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Unit Price (NLe per trip)</FormLabel>
              <Input type="number" value={form.unit_price}
                onChange={e => hc('unit_price', Number(e.target.value))} />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm">Number of Trips</FormLabel>
              <Input type="number" min={1} value={form.trips}
                onChange={e => hc('trips', Number(e.target.value))} />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Quantity Delivered (Litres)</FormLabel>
              <Input type="number" value={form.quantity_litres}
                onChange={e => hc('quantity_litres', Number(e.target.value))} />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Cash Received (NLe)</FormLabel>
              <Input type="number" min={0} value={form.cash_received}
                onChange={e => hc('cash_received', Number(e.target.value))} />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Vehicle (optional)</FormLabel>
              <Select value={form.vehicle_id} onChange={e => hc('vehicle_id', e.target.value)}>
                <option value="">— No vehicle —</option>
                {vehicles.filter(v => v.status === 'Active').map(v =>
                  <option key={v._id} value={v._id}>{v.vehicle_number} — {v.vehicle_type}</option>
                )}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Driver (optional)</FormLabel>
              <Select value={form.driver_id} onChange={e => hc('driver_id', e.target.value)}>
                <option value="">— No driver —</option>
                {drivers.filter(d => d.status !== 'Off Duty').map(d =>
                  <option key={d._id} value={d._id}>{d.full_name}</option>
                )}
              </Select>
            </FormControl>

            <FormControl gridColumn="1 / -1">
              <FormLabel fontSize="sm">Additional Notes</FormLabel>
              <Textarea rows={2} value={form.extra_notes}
                onChange={e => hc('extra_notes', e.target.value)}
                placeholder="Any extra notes for the delivery record…" />
            </FormControl>
          </Grid>

          {/* Summary box */}
          <Box mt={4} p={4} bg="green.50" borderRadius="10px" borderLeft="4px solid" borderLeftColor="green.400">
            <Text fontSize="xs" fontWeight="700" color="green.700" mb={2} textTransform="uppercase" letterSpacing="wider">
              Delivery Summary
            </Text>
            <Grid templateColumns="1fr 1fr" gap={2}>
              {[
                ['Service Type', SERVICE_TYPE_MAP[appointment.service] || 'Water Supply'],
                ['Delivery Date', appointment.date ? new Date(appointment.date).toLocaleDateString('en-GB') : '—'],
                ['Total Amount', fmt(total)],
                ['Cash Received', fmt(form.cash_received)],
                ['Outstanding', fmt(outstanding)],
                ['Payment Status', payStatus],
              ].map(([l, v]) => (
                <HStack key={l} justify="space-between">
                  <Text fontSize="xs" color="green.600">{l}:</Text>
                  <Text fontSize="xs" fontWeight="700" color="green.800">{v}</Text>
                </HStack>
              ))}
            </Grid>
          </Box>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            colorScheme="green"
            leftIcon={<CheckIcon />}
            onClick={() => onComplete(form)}
            isLoading={loading}
          >
            Complete & Create Delivery
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ── Status Action Buttons ───────────────────────────────────────────────────
function StatusButtons({ apt, onStatusChange, onComplete, loadingId }) {
  const isLoading = loadingId === apt._id;
  const s         = apt.status;

  if (s === 'completed' || s === 'cancelled') return null;

  return (
    <HStack spacing={1} flexWrap="wrap">
      {s === 'scheduled' && (
        <Tooltip label="Mark In Progress">
          <Button
            size="xs" colorScheme="orange" variant="outline"
            leftIcon={<TimeIcon />}
            isLoading={isLoading}
            onClick={() => onStatusChange(apt._id, 'in-progress')}
          >
            Start
          </Button>
        </Tooltip>
      )}
      {(s === 'scheduled' || s === 'in-progress') && (
        <Tooltip label="Mark Completed — creates a Delivery">
          <Button
            size="xs" colorScheme="green" variant="solid"
            leftIcon={<CheckIcon />}
            isLoading={isLoading}
            onClick={() => onComplete(apt)}
          >
            Complete
          </Button>
        </Tooltip>
      )}
      <Tooltip label="Cancel Appointment">
        <Button
          size="xs" colorScheme="red" variant="ghost"
          leftIcon={<CloseIcon boxSize={2} />}
          isLoading={isLoading}
          onClick={() => onStatusChange(apt._id, 'cancelled')}
        >
          Cancel
        </Button>
      </Tooltip>
    </HStack>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function Appointments() {
  const [list,          setList]          = useState([]);
  const [completedList, setCompletedList] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [completing,    setCompleting]    = useState(false);
  const [loadingId,     setLoadingId]     = useState(null);
  const [selected,      setSelected]      = useState(null);    // editing
  const [toComplete,    setToComplete]    = useState(null);    // completing
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterService, setFilterService] = useState('');
  const [tabIndex,      setTabIndex]      = useState(0);
  const [lastDelivery,  setLastDelivery]  = useState(null);   // result of complete

  const { isOpen: isFormOpen,     onOpen: openForm,     onClose: closeForm     } = useDisclosure();
  const { isOpen: isCompleteOpen, onOpen: openComplete, onClose: closeComplete } = useDisclosure();
  const { isOpen: isResultOpen,   onOpen: openResult,   onClose: closeResult   } = useDisclosure();
  const cancelRef = useRef();
  const toast     = useToast();
  const { fmt }   = useSettings();

  const loadActive = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus)  params.status  = filterStatus;
      if (filterService) params.service = filterService;
      const res = await appointments.list(params);
      setList(res.data || []);
    } catch (e) {
      toast({ title: 'Error loading appointments', description: e.message, status: 'error', duration: 3000 });
    } finally { setLoading(false); }
  }, [filterStatus, filterService]);

  const loadCompleted = useCallback(async () => {
    try {
      const res = await appointments.listAll();
      setCompletedList((res.data || []).filter(a => a.status === 'completed' || a.status === 'cancelled'));
    } catch {}
  }, []);

  useEffect(() => { loadActive(); }, [loadActive]);
  useEffect(() => { if (tabIndex === 1) loadCompleted(); }, [tabIndex, loadCompleted]);

  // ── Save (create / edit) ──────────────────────────────────────────────────
  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (selected) {
        await appointments.update(selected._id, form);
        toast({ title: 'Appointment updated', status: 'success', duration: 2000 });
      } else {
        await appointments.create(form);
        toast({ title: 'Appointment created', status: 'success', duration: 2000 });
      }
      closeForm(); setSelected(null); loadActive();
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, status: 'error', duration: 4000 });
    } finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await appointments.remove(id);
      toast({ title: 'Appointment deleted', status: 'info', duration: 2000 });
      loadActive();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, status: 'error', duration: 3000 });
    }
  };

  // ── Status change (scheduled → in-progress, or cancel) ───────────────────
  const handleStatusChange = async (id, newStatus) => {
    setLoadingId(id);
    try {
      await appointments.updateStatus(id, newStatus);
      toast({
        title: newStatus === 'cancelled' ? 'Appointment cancelled' : 'Status updated',
        status: newStatus === 'cancelled' ? 'warning' : 'success',
        duration: 2000,
      });
      loadActive();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, status: 'error', duration: 3000 });
    } finally { setLoadingId(null); }
  };

  // ── Open Complete modal ───────────────────────────────────────────────────
  const handleOpenComplete = (apt) => {
    setToComplete(apt);
    openComplete();
  };

  // ── Complete + auto-create delivery ──────────────────────────────────────
  const handleComplete = async (deliveryForm) => {
    if (!toComplete) return;
    setCompleting(true);
    try {
      const res = await appointments.complete(toComplete._id, deliveryForm);
      setLastDelivery(res.data);
      toast({
        title:       '✅ Appointment completed!',
        description: res.data?.message || 'Delivery record created.',
        status:      'success',
        duration:    4000,
      });
      closeComplete();
      setToComplete(null);
      openResult();
      loadActive();
      if (tabIndex === 1) loadCompleted();
    } catch (e) {
      toast({ title: 'Complete failed', description: e.message, status: 'error', duration: 5000 });
    } finally { setCompleting(false); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const counts = {
    scheduled:  list.filter(a => a.status === 'scheduled').length,
    inProgress: list.filter(a => a.status === 'in-progress').length,
    total:      list.length,
  };

  // ── Row renderer ──────────────────────────────────────────────────────────
  const renderRow = (a) => (
    <Tr key={a._id} _hover={{ bg: 'gray.50' }}>
      <Td>
        <VStack align="start" spacing={0}>
          <Text fontWeight="700" fontSize="sm">{a.customerName}</Text>
          <Text fontSize="xs" color="gray.500">{a.customerPhone}</Text>
          {a.address && <Text fontSize="xs" color="gray.400" noOfLines={1}>{a.address}</Text>}
        </VStack>
      </Td>
      <Td fontSize="sm">{SERVICE_LABELS[a.service] || a.service}</Td>
      <Td>
        <VStack align="start" spacing={0}>
          <Text fontSize="sm">{a.date ? new Date(a.date).toLocaleDateString('en-GB') : '—'}</Text>
          <Text fontSize="xs" color="gray.500">{a.time}</Text>
        </VStack>
      </Td>
      <Td fontSize="sm" color="gray.600">{a.technician || '—'}</Td>
      <Td>
        <Badge colorScheme={PRIORITY_COLORS[a.priority] || 'gray'} borderRadius="full" fontSize="xs">
          {a.priority}
        </Badge>
      </Td>
      <Td>
        <Badge
          colorScheme={STATUS_COLORS[a.status] || 'gray'}
          borderRadius="full" px={2} py={0.5}
        >
          {STATUS_ICONS[a.status]} {a.status.replace('-', ' ')}
        </Badge>
      </Td>
      <Td>
        <VStack align="start" spacing={1}>
          <StatusButtons
            apt={a}
            onStatusChange={handleStatusChange}
            onComplete={handleOpenComplete}
            loadingId={loadingId}
          />
          <HStack spacing={1} mt={1}>
            <Tooltip label="Edit">
              <IconButton
                icon={<EditIcon />} size="xs" variant="ghost" colorScheme="blue"
                onClick={() => { setSelected(a); openForm(); }}
                aria-label="Edit"
              />
            </Tooltip>
            <Tooltip label="Delete">
              <IconButton
                icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red"
                onClick={() => handleDelete(a._id)}
                aria-label="Delete"
              />
            </Tooltip>
          </HStack>
        </VStack>
      </Td>
    </Tr>
  );

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Box>
          <Heading size="md" color="gray.800">📅 Appointments</Heading>
          <Text color="gray.500" fontSize="sm">
            {counts.total} active · {counts.inProgress} in progress
          </Text>
        </Box>
        <Button colorScheme="blue" size="sm" leftIcon={<AddIcon />}
          onClick={() => { setSelected(null); openForm(); }}>
          New Appointment
        </Button>
      </Flex>

      {/* Stat cards */}
      <SimpleGrid columns={3} spacing={4} mb={6}>
        {[
          { label: 'Scheduled',   val: counts.scheduled,  color: 'blue',   icon: '📅' },
          { label: 'In Progress', val: counts.inProgress, color: 'orange', icon: '⏳' },
          { label: 'Active Total',val: counts.total,       color: 'purple', icon: '📋' },
        ].map(s => (
          <Card key={s.label} shadow="sm" borderRadius="16px"
            borderLeft="4px solid" borderLeftColor={`${s.color}.400`}>
            <CardBody py={3}>
              <HStack>
                <Text fontSize="xl">{s.icon}</Text>
                <Box>
                  <Text fontSize="2xl" fontWeight="800" color={`${s.color}.500`} lineHeight={1}>{s.val}</Text>
                  <Text fontSize="xs" color="gray.500">{s.label}</Text>
                </Box>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Tabs: Active / History */}
      <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed">
        <TabList>
          <Tab>Active Appointments</Tab>
          <Tab>Completed & Cancelled</Tab>
        </TabList>

        <TabPanels>
          {/* ── Active Tab ─────────────────────────────────────────────── */}
          <TabPanel p={0} pt={4}>
            {/* Filters */}
            <HStack mb={4} wrap="wrap" gap={3}>
              <Select
                bg="white" size="sm" borderRadius="8px" w="160px"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
              </Select>
              <Select
                bg="white" size="sm" borderRadius="8px" w="200px"
                value={filterService}
                onChange={e => setFilterService(e.target.value)}
              >
                <option value="">All Services</option>
                {SERVICES.map(s => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
              </Select>
            </HStack>

            {loading ? (
              <Center h="40vh"><Spinner size="xl" color="blue.500" /></Center>
            ) : list.length === 0 ? (
              <Center py={16}>
                <VStack>
                  <Text fontSize="4xl">📅</Text>
                  <Text color="gray.400" fontWeight="600">No active appointments</Text>
                  <Text color="gray.400" fontSize="sm">Create one to get started</Text>
                </VStack>
              </Center>
            ) : (
              <Box bg="white" borderRadius="16px" shadow="sm" overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Customer</Th>
                      <Th>Service</Th>
                      <Th>Date / Time</Th>
                      <Th>Technician</Th>
                      <Th>Priority</Th>
                      <Th>Status</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>{list.map(renderRow)}</Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>

          {/* ── History Tab ────────────────────────────────────────────── */}
          <TabPanel p={0} pt={4}>
            {completedList.length === 0 ? (
              <Center py={16}>
                <VStack>
                  <Text fontSize="4xl">✅</Text>
                  <Text color="gray.400">No completed or cancelled appointments yet</Text>
                </VStack>
              </Center>
            ) : (
              <Box bg="white" borderRadius="16px" shadow="sm" overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Customer</Th>
                      <Th>Service</Th>
                      <Th>Date / Time</Th>
                      <Th>Technician</Th>
                      <Th>Priority</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {completedList.map(a => (
                      <Tr key={a._id} opacity={0.7}>
                        <Td>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="600" fontSize="sm">{a.customerName}</Text>
                            <Text fontSize="xs" color="gray.500">{a.customerPhone}</Text>
                          </VStack>
                        </Td>
                        <Td fontSize="sm">{SERVICE_LABELS[a.service] || a.service}</Td>
                        <Td fontSize="sm">{a.date ? new Date(a.date).toLocaleDateString('en-GB') : '—'} · {a.time}</Td>
                        <Td fontSize="sm" color="gray.500">{a.technician || '—'}</Td>
                        <Td><Badge colorScheme={PRIORITY_COLORS[a.priority] || 'gray'} fontSize="xs">{a.priority}</Badge></Td>
                        <Td>
                          <Badge colorScheme={STATUS_COLORS[a.status] || 'gray'} borderRadius="full" px={2}>
                            {STATUS_ICONS[a.status]} {a.status.replace('-', ' ')}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => { closeForm(); setSelected(null); }}
        size="2xl" scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader>{selected ? 'Edit Appointment' : 'New Appointment'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <AppointmentForm
              initial={selected || emptyForm}
              onSave={handleSave}
              onCancel={() => { closeForm(); setSelected(null); }}
              loading={saving}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ── Complete Modal ──────────────────────────────────────────────── */}
      <CompleteModal
        appointment={toComplete}
        isOpen={isCompleteOpen}
        onClose={() => { closeComplete(); setToComplete(null); }}
        onComplete={handleComplete}
        loading={completing}
      />

      {/* ── Result Modal (shows delivery created) ──────────────────────── */}
      <Modal isOpen={isResultOpen} onClose={closeResult} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="16px">
          <ModalHeader>
            <HStack><Text fontSize="xl">🎉</Text><Text>Delivery Created!</Text></HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {lastDelivery && (
              <VStack align="stretch" spacing={3}>
                <Alert status="success" borderRadius="8px" fontSize="sm">
                  <AlertIcon />
                  {lastDelivery.message}
                </Alert>
                <Box p={4} bg="gray.50" borderRadius="10px">
                  <Text fontSize="xs" color="gray.500" fontWeight="600" mb={2} textTransform="uppercase">Delivery Record</Text>
                  {[
                    ['Customer Linked', lastDelivery.customerLinked ? '✅ Yes — linked to existing record' : '⚠️ No matching customer found'],
                    ['Service', lastDelivery.delivery?.service_type],
                    ['Trips', lastDelivery.delivery?.trips],
                    ['Total Amount', `NLe ${(lastDelivery.delivery?.total_amount || 0).toLocaleString()}`],
                    ['Cash Received', `NLe ${(lastDelivery.delivery?.cash_received || 0).toLocaleString()}`],
                    ['Outstanding', `NLe ${(lastDelivery.delivery?.outstanding_balance || 0).toLocaleString()}`],
                    ['Payment Status', lastDelivery.delivery?.payment_status],
                  ].map(([l, v]) => (
                    <HStack key={l} justify="space-between" py={1} borderBottom="1px solid" borderColor="gray.100">
                      <Text fontSize="xs" color="gray.500">{l}</Text>
                      <Text fontSize="xs" fontWeight="700">{v}</Text>
                    </HStack>
                  ))}
                </Box>
                {!lastDelivery.customerLinked && (
                  <Alert status="warning" borderRadius="8px" fontSize="sm">
                    <AlertIcon />
                    The delivery was created but could not be linked to a customer record. Go to <b>Customers</b> to add this person, then update the delivery.
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={closeResult}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

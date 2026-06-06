// src/pages/Customers.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Heading, Text, Button, Input, InputGroup, InputLeftElement,
  Select, HStack, VStack, Card, CardBody, Table, Thead, Tbody, Tr, Th, Td,
  Badge, IconButton, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, FormControl, FormLabel,
  FormErrorMessage, Checkbox, CheckboxGroup, Stack, Textarea,
  useDisclosure, useToast, Spinner, Center, Alert, AlertIcon,
  SimpleGrid, Stat, StatLabel, StatNumber, Flex, Tooltip,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, EditIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import { customers } from '../services/api';

const SERVICES = ['water', 'sewage'];
const STATUSES = ['active', 'inactive', 'suspended'];
const SLE = n => `SLE ${Number(n||0).toLocaleString()}`;

const emptyForm = {
  name: '', email: '', phone: '', address: '',
  services: ['water'], status: 'active', meterNumber: '',
  emergencyContact: '', emergencyPhone: '', notes: '',
  connectionDate: new Date().toISOString().split('T')[0],
};

function CustomerForm({ initial = emptyForm, onSave, onCancel, loading }) {
  const [form,   setForm]   = useState(initial);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Name is required';
    if (!form.email.trim())   e.email   = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim())   e.phone   = 'Phone is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.services.length) e.services = 'Select at least one service';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <VStack spacing={4} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isInvalid={!!errors.name} isRequired>
          <FormLabel fontSize="sm">Full Name</FormLabel>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Customer name" />
          <FormErrorMessage>{errors.name}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.email} isRequired>
          <FormLabel fontSize="sm">Email</FormLabel>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
          <FormErrorMessage>{errors.email}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.phone} isRequired>
          <FormLabel fontSize="sm">Phone</FormLabel>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+232 76 000 000" />
          <FormErrorMessage>{errors.phone}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Status</FormLabel>
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </Select>
        </FormControl>
      </SimpleGrid>

      <FormControl isInvalid={!!errors.address} isRequired>
        <FormLabel fontSize="sm">Address</FormLabel>
        <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
        <FormErrorMessage>{errors.address}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={!!errors.services} isRequired>
        <FormLabel fontSize="sm">Services</FormLabel>
        <CheckboxGroup value={form.services} onChange={vals => set('services', vals)}>
          <Stack direction="row">
            {SERVICES.map(s => (
              <Checkbox key={s} value={s} colorScheme="brand">
                {s.charAt(0).toUpperCase()+s.slice(1)} Supply
              </Checkbox>
            ))}
          </Stack>
        </CheckboxGroup>
        <FormErrorMessage>{errors.services}</FormErrorMessage>
      </FormControl>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">Meter Number</FormLabel>
          <Input value={form.meterNumber} onChange={e => set('meterNumber', e.target.value)} placeholder="Auto-generated if blank" />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Connection Date</FormLabel>
          <Input type="date" value={form.connectionDate?.split('T')[0] || ''} onChange={e => set('connectionDate', e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Emergency Contact</FormLabel>
          <Input value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="Contact name" />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Emergency Phone</FormLabel>
          <Input value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="+232 ..." />
        </FormControl>
      </SimpleGrid>

      <FormControl>
        <FormLabel fontSize="sm">Notes</FormLabel>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Any additional notes..." />
      </FormControl>

      <HStack justify="flex-end" pt={2}>
        <Button variant="ghost" onClick={onCancel} isDisabled={loading}>Cancel</Button>
        <Button colorScheme="brand" onClick={handleSave} isLoading={loading}>Save Customer</Button>
      </HStack>
    </VStack>
  );
}

function CustomerDetailModal({ customer, isOpen, onClose }) {
  if (!customer) return null;
  const rows = [
    ['Email',     customer.email],
    ['Phone',     customer.phone],
    ['Address',   customer.address],
    ['Services',  customer.services?.join(', ')],
    ['Status',    customer.status],
    ['Meter #',   customer.meterNumber || '—'],
    ['Joined',    customer.connectionDate ? new Date(customer.connectionDate).toLocaleDateString('en-GB') : '—'],
    ['Emergency', customer.emergencyContact || '—'],
    ['Em. Phone', customer.emergencyPhone || '—'],
    ['Notes',     customer.notes || '—'],
  ];
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent borderRadius="xl">
        <ModalHeader>
          <HStack>
            <Text fontSize="2xl">👤</Text>
            <Text>{customer.name}</Text>
            <Badge colorScheme={customer.status==='active'?'green':customer.status==='suspended'?'red':'gray'} ml={2}>
              {customer.status}
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Table size="sm">
            <Tbody>
              {rows.map(([label, value]) => (
                <Tr key={label}>
                  <Td fontWeight="semibold" color="gray.600" w="140px">{label}</Td>
                  <Td>{value}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function Customers() {
  const [list,     setList]     = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);   // for edit
  const [viewing,  setViewing]  = useState(null);   // for detail
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const { isOpen: isFormOpen, onOpen: openForm, onClose: closeForm } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: openView, onClose: closeView } = useDisclosure();
  const toast = useToast();
  const limit = 20;

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (search)      params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await customers.list(params);
      setList(res.customers || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await customers.stats();
      setStats(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (selected) {
        await customers.update(selected._id, form);
        toast({ title: 'Customer updated', status: 'success', duration: 2000 });
      } else {
        await customers.create(form);
        toast({ title: 'Customer created', status: 'success', duration: 2000 });
      }
      closeForm();
      setSelected(null);
      loadCustomers();
      loadStats();
    } catch (e) {
      toast({ title: 'Error', description: e.message, status: 'error', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await customers.remove(id);
      toast({ title: 'Customer deleted', status: 'info', duration: 2000 });
      loadCustomers();
      loadStats();
    } catch (e) {
      toast({ title: 'Error', description: e.message, status: 'error', duration: 4000 });
    }
  };

  const handleSearch = () => { setPage(1); loadCustomers(); };

  const exportCSV = () => {
    const headers = ['Name','Email','Phone','Address','Services','Status','Meter #','Joined'];
    const rows = list.map(c => [
      c.name, c.email, c.phone, c.address,
      (c.services||[]).join(';'), c.status, c.meterNumber||'',
      c.connectionDate ? new Date(c.connectionDate).toLocaleDateString('en-GB') : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv'}));
    a.download = 'customers.csv';
    a.click();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Box p={{ base: 4, md: 6 }}>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">Customers</Heading>
          <Text color="gray.500" fontSize="sm">{total} total customers</Text>
        </Box>
        <HStack>
          <Button size="sm" variant="outline" onClick={exportCSV}>📥 Export CSV</Button>
          <Button colorScheme="brand" size="sm" leftIcon={<AddIcon />}
            onClick={() => { setSelected(null); openForm(); }}>
            Add Customer
          </Button>
        </HStack>
      </Flex>

      {/* Stats */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={5}>
          {[
            { label:'Total', val: stats.total, color:'brand' },
            { label:'Active', val: stats.active, color:'green' },
            { label:'Water', val: stats.water, color:'blue' },
            { label:'Sewage', val: stats.sewage, color:'purple' },
          ].map(s => (
            <Card key={s.label} shadow="sm" borderRadius="lg">
              <CardBody py={3}>
                <Stat>
                  <StatLabel fontSize="xs" color="gray.500">{s.label}</StatLabel>
                  <StatNumber fontSize="xl" color={`${s.color}.500`}>{s.val}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Filters */}
      <Card shadow="sm" borderRadius="xl" mb={5}>
        <CardBody>
          <HStack wrap="wrap" gap={3}>
            <InputGroup maxW="300px">
              <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
              <Input placeholder="Search name, email, phone..."
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleSearch()} />
            </InputGroup>
            <Select maxW="150px" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </Select>
            <Button colorScheme="brand" variant="outline" size="md" onClick={handleSearch}>Search</Button>
          </HStack>
        </CardBody>
      </Card>

      {/* Table */}
      <Card shadow="md" borderRadius="xl" overflowX="auto">
        <CardBody p={0}>
          {loading ? (
            <Center py={12}><Spinner color="brand.500" size="xl" /></Center>
          ) : error ? (
            <Alert status="error" m={4} borderRadius="lg"><AlertIcon />{error}</Alert>
          ) : list.length === 0 ? (
            <Center py={12}><VStack><Text fontSize="4xl">👥</Text><Text color="gray.400">No customers found</Text></VStack></Center>
          ) : (
            <Table>
              <Thead bg="gray.50">
                <Tr>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Services</Th>
                  <Th>Status</Th>
                  <Th>Meter #</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {list.map(c => (
                  <Tr key={c._id} _hover={{ bg:'gray.50' }}>
                    <Td fontWeight="semibold">{c.name}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm">{c.email}</Text>
                        <Text fontSize="xs" color="gray.500">{c.phone}</Text>
                      </VStack>
                    </Td>
                    <Td>
                      <HStack>
                        {(c.services||[]).map(s => (
                          <Badge key={s} colorScheme={s==='water'?'blue':'purple'} size="sm">{s}</Badge>
                        ))}
                      </HStack>
                    </Td>
                    <Td>
                      <Badge colorScheme={c.status==='active'?'green':c.status==='suspended'?'red':'gray'} borderRadius="full">
                        {c.status}
                      </Badge>
                    </Td>
                    <Td fontSize="xs" fontFamily="mono">{c.meterNumber || '—'}</Td>
                    <Td>
                      <HStack>
                        <Tooltip label="View details">
                          <IconButton icon={<ViewIcon />} size="sm" variant="ghost" colorScheme="blue"
                            onClick={() => { setViewing(c); openView(); }} aria-label="View" />
                        </Tooltip>
                        <Tooltip label="Edit">
                          <IconButton icon={<EditIcon />} size="sm" variant="ghost" colorScheme="brand"
                            onClick={() => { setSelected(c); openForm(); }} aria-label="Edit" />
                        </Tooltip>
                        <Tooltip label="Delete">
                          <IconButton icon={<DeleteIcon />} size="sm" variant="ghost" colorScheme="red"
                            onClick={() => handleDelete(c._id, c.name)} aria-label="Delete" />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <HStack justify="center" mt={4}>
          <Button size="sm" isDisabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</Button>
          <Text fontSize="sm" color="gray.600">Page {page} of {totalPages}</Text>
          <Button size="sm" isDisabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</Button>
        </HStack>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={isFormOpen} onClose={() => { closeForm(); setSelected(null); }} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>{selected ? 'Edit Customer' : 'New Customer'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <CustomerForm
              initial={selected || emptyForm}
              onSave={handleSave}
              onCancel={() => { closeForm(); setSelected(null); }}
              loading={saving}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* View Detail Modal */}
      <CustomerDetailModal customer={viewing} isOpen={isViewOpen} onClose={closeView} />
    </Box>
  );
}

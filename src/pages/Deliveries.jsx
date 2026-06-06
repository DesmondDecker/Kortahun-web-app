import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Button, Badge, Grid,
  Table, Thead, Tbody, Tr, Th, Td, Input, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Textarea,
  useDisclosure, useToast, Stat, StatLabel, StatNumber, Card, CardBody,
  SimpleGrid, Spinner, Center, Heading, IconButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon } from '@chakra-ui/icons';
import { deliveries as api, customers as custApi, vehicles as vehApi, drivers as drvApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const EMPTY = { customer_id:'', vehicle_id:'', driver_id:'', service_type:'Water Supply', quantity_litres:5000, unit_price:1700, trips:1, delivery_date: new Date().toISOString().split('T')[0], cash_received:0, payment_status:'Unpaid', notes:'' };
const PAY_STATUSES = ['Unpaid','Partial','Paid'];
const PAY_COLORS   = { Paid:'green', Partial:'yellow', Unpaid:'red' };
const SERVICE_TYPES = ['Water Supply','Sewage Disposal'];

export default function Deliveries() {
  const [items,     setItems]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [drivers,   setDrivers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState(EMPTY);
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [filterPay, setFilterPay] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onClose: onDelClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();
  const { fmt, settings } = useSettings();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in one go from the deliveries list endpoint
      const res = await api.list({ search, payment_status: filterPay }); // This now returns 'customers', 'vehicles', 'drivers'
      const body = res.success !== undefined ? res : res.data; // Handle service-wrapped response

      setItems(body.data || []);
      setCustomers(body.customers || []);
      setVehicles(body.vehicles || []);
      setDrivers(body.drivers || []);
    } catch(e) { 
      toast({ title: 'Error loading deliveries', description: e.message, status:'error', duration:3000 }); 
    }
    setLoading(false);
  }, [search, filterPay]);
  useEffect(() => { load(); }, [load]);

  const hc = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, unit_price: settings.water_unit_price || 1700, delivery_date: new Date().toISOString().split('T')[0] });
    onOpen();
  };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ customer_id: d.customer?._id||d.customer||'', vehicle_id: d.vehicle?._id||d.vehicle||'', driver_id: d.driver?._id||d.driver||'', service_type: d.service_type, quantity_litres: d.quantity_litres, unit_price: d.unit_price, trips: d.trips||1, delivery_date: d.delivery_date?.split('T')[0]||'', cash_received: d.cash_received||0, payment_status: d.payment_status, notes: d.notes||'' });
    onOpen();
  };

  const totalAmount = () => Number(form.unit_price || 0) * Number(form.trips || 1);
  const outstanding = () => totalAmount() - Number(form.cash_received || 0);

  const save = async () => {
    if (!form.customer_id) { toast({ title:'Customer required', status:'warning', duration:2000 }); return; }
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        customer: form.customer_id,
        vehicle:  form.vehicle_id || null,
        driver:   form.driver_id || null,
        total_amount: totalAmount(), 
        outstanding_balance: outstanding() 
      };
      editing ? await api.update(editing._id, payload) : await api.create(payload);
      toast({ title: editing ? 'Delivery updated' : 'Delivery recorded', status:'success', duration:2000 });
      onClose(); load();
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setSaving(false);
  };

  const doDelete = async () => {
    try { await api.remove(deleting._id); toast({ title:'Delivery deleted', status:'info', duration:2000 }); onDelClose(); load(); }
    catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
  };

  const stats = {
    total: items.length,
    paid: items.filter(d=>d.payment_status==='Paid').length,
    revenue: items.reduce((s,d) => s+(d.total_amount||0), 0),
    outstanding: items.reduce((s,d) => s+(d.outstanding_balance||0), 0),
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md" color="gray.800">🚚 Deliveries</Heading>
        <Button leftIcon={<AddIcon/>} colorScheme="blue" size="sm" onClick={openAdd}>New Delivery</Button>
      </Flex>

      <SimpleGrid columns={{ base:2, md:4 }} spacing={4} mb={6}>
        {[['Total',stats.total,'blue'],['Paid',stats.paid,'green'],['Revenue',fmt(stats.revenue),'purple'],['Outstanding',fmt(stats.outstanding),'red']].map(([l,v,c])=>(
          <Card key={l}><CardBody><Stat><StatLabel color="gray.500" fontSize="xs">{l}</StatLabel><StatNumber color={`${c}.500`} fontSize="lg">{v}</StatNumber></Stat></CardBody></Card>
        ))}
      </SimpleGrid>

      <Flex gap={3} mb={4} wrap="wrap">
        <HStack bg="white" borderRadius="8px" border="1px solid" borderColor="gray.200" px={3} flex={1} minW="200px">
          <SearchIcon color="gray.400" fontSize="sm"/>
          <Input variant="unstyled" placeholder="Search deliveries..." value={search} onChange={e=>setSearch(e.target.value)} size="sm" py={2}/>
        </HStack>
        <Select bg="white" size="sm" borderRadius="8px" w="160px" value={filterPay} onChange={e=>setFilterPay(e.target.value)}>
          <option value="">All Statuses</option>
          {PAY_STATUSES.map(s=><option key={s}>{s}</option>)}
        </Select>
      </Flex>

      {loading ? <Center h="40vh"><Spinner size="xl" color="blue.500"/></Center> : (
        <Box bg="white" borderRadius="16px" shadow="sm" overflow="hidden">
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Date</Th><Th>Customer</Th><Th>Service</Th><Th>Qty (L)</Th><Th>Total</Th><Th>Received</Th><Th>Outstanding</Th><Th>Status</Th><Th></Th></Tr></Thead>
            <Tbody>
              {items.map(d => (
                <Tr key={d._id} _hover={{ bg:'gray.50' }}>
                  <Td color="gray.500" fontSize="xs">{d.delivery_date?.split('T')[0]}</Td>
                  <Td fontWeight="600" color="gray.800">{d.customer?.name||'—'}</Td>
                  <Td><Badge colorScheme={d.service_type?.includes('Water') ? 'blue' : 'teal'} fontSize="xs">{d.service_type}</Badge></Td>
                  <Td>{(d.quantity_litres||0).toLocaleString()}</Td>
                  <Td fontWeight="600">{fmt(d.total_amount)}</Td>
                  <Td color="green.600">{fmt(d.cash_received)}</Td>
                  <Td color={d.outstanding_balance>0?'red.500':'gray.500'}>{fmt(d.outstanding_balance)}</Td>
                  <Td><Badge colorScheme={PAY_COLORS[d.payment_status]||'gray'}>{d.payment_status}</Badge></Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton size="xs" icon={<EditIcon/>} onClick={()=>openEdit(d)} variant="ghost" colorScheme="blue" aria-label="Edit"/>
                      <IconButton size="xs" icon={<DeleteIcon/>} onClick={()=>{setDeleting(d);onDelOpen();}} variant="ghost" colorScheme="red" aria-label="Delete"/>
                    </HStack>
                  </Td>
                </Tr>
              ))}
              {!items.length && <Tr><Td colSpan={9} textAlign="center" py={8} color="gray.400">No deliveries found</Td></Tr>}
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay/>
        <ModalContent borderRadius="16px">
          <ModalHeader>{editing ? 'Edit Delivery' : 'New Delivery'}</ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl isRequired gridColumn="1/-1"><FormLabel fontSize="sm">Customer</FormLabel>
                <Select value={form.customer_id} onChange={e=>hc('customer_id',e.target.value)}>
                  <option value="">Select customer...</option>
                  {customers.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              </FormControl>
              <FormControl><FormLabel fontSize="sm">Vehicle</FormLabel>
                <Select value={form.vehicle_id} onChange={e=>hc('vehicle_id',e.target.value)}>
                  <option value="">No vehicle</option>
                  {vehicles.map(v=><option key={v._id} value={v._id}>{v.vehicle_number} — {v.vehicle_type}</option>)}
                </Select>
              </FormControl>
              <FormControl><FormLabel fontSize="sm">Driver</FormLabel>
                <Select value={form.driver_id} onChange={e=>hc('driver_id',e.target.value)}>
                  <option value="">No driver</option>
                  {drivers.map(d=><option key={d._id} value={d._id}>{d.full_name}</option>)}
                </Select>
              </FormControl>
              <FormControl><FormLabel fontSize="sm">Service Type</FormLabel>
                <Select value={form.service_type} onChange={e=>{ hc('service_type',e.target.value); hc('unit_price', e.target.value.includes('Water') ? (settings.water_unit_price||1700) : (settings.sewage_unit_price||2000)); }}>
                  {SERVICE_TYPES.map(s=><option key={s}>{s}</option>)}
                </Select>
              </FormControl>
              <FormControl><FormLabel fontSize="sm">Delivery Date</FormLabel><Input type="date" value={form.delivery_date} onChange={e=>hc('delivery_date',e.target.value)}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Trips</FormLabel><Input type="number" min={1} value={form.trips} onChange={e=>hc('trips',Number(e.target.value))}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Unit Price (NLe)</FormLabel><Input type="number" value={form.unit_price} onChange={e=>hc('unit_price',Number(e.target.value))}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Quantity (Litres)</FormLabel><Input type="number" value={form.quantity_litres} onChange={e=>hc('quantity_litres',Number(e.target.value))}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Cash Received</FormLabel><Input type="number" value={form.cash_received} onChange={e=>hc('cash_received',Number(e.target.value))}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Payment Status</FormLabel>
                <Select value={form.payment_status} onChange={e=>hc('payment_status',e.target.value)}>
                  {PAY_STATUSES.map(s=><option key={s}>{s}</option>)}
                </Select>
              </FormControl>
            </Grid>
            <Box mt={4} p={3} bg="blue.50" borderRadius="8px">
              <HStack justify="space-between">
                <Text fontSize="sm" color="blue.700">Total Amount: <b>{fmt(totalAmount())}</b></Text>
                <Text fontSize="sm" color={outstanding()>0?'red.600':'green.600'}>Outstanding: <b>{fmt(outstanding())}</b></Text>
              </HStack>
            </Box>
            <FormControl mt={3}><FormLabel fontSize="sm">Notes</FormLabel><Textarea rows={2} value={form.notes} onChange={e=>hc('notes',e.target.value)}/></FormControl>
          </ModalBody>
          <ModalFooter gap={3}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button colorScheme="blue" onClick={save} isLoading={saving}>{editing?'Update':'Save'}</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelRef} onClose={onDelClose}>
        <AlertDialogOverlay><AlertDialogContent borderRadius="16px">
          <AlertDialogHeader>Delete Delivery</AlertDialogHeader>
          <AlertDialogBody>Delete this delivery record? This cannot be undone.</AlertDialogBody>
          <AlertDialogFooter gap={3}><Button ref={cancelRef} onClick={onDelClose}>Cancel</Button><Button colorScheme="red" onClick={doDelete}>Delete</Button></AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

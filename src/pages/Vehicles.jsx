import { useState, useEffect, useCallback } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Button, Badge, Grid,
  Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Select, Textarea,
  useDisclosure, useToast, Stat, StatLabel, StatNumber, Card, CardBody,
  SimpleGrid, Spinner, Center, Heading, IconButton, AlertDialog,
  AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { vehicles as api, drivers as driversApi } from '../services/api';
import { useRef } from 'react';

const EMPTY = { vehicle_number:'', vehicle_type:'Water Tanker', capacity_litres:5000, fuel_type:'Diesel', assigned_driver_id:'', status:'Active', notes:'' };
const TYPES  = ['Water Tanker','Sewage Truck','Mini Tanker','Flatbed','Other'];
const FUELS  = ['Diesel','Petrol','CNG','Electric'];
const STATUSES = ['Active','Inactive','Under Service'];
const STATUS_COLORS = { Active:'green', Inactive:'red', 'Under Service':'yellow' };

export default function Vehicles() {
  const [items,   setItems]   = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [deleting,setDeleting]= useState(null);
  const [saving,  setSaving]  = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onClose: onDelClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([api.list(), driversApi.list()]);
      setItems(vRes.data || []);
      setDrivers(dRes.data || []);
    } catch(e) { toast({ title: e.message, status:'error', duration:3000 }); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); onOpen(); };
  const openEdit = (v) => { setEditing(v); setForm({ vehicle_number:v.vehicle_number, vehicle_type:v.vehicle_type, capacity_litres:v.capacity_litres, fuel_type:v.fuel_type, assigned_driver_id:v.assigned_driver_id||'', status:v.status, notes:v.notes||'' }); onOpen(); };

  const save = async () => {
    if (!form.vehicle_number.trim()) { toast({ title:'Vehicle number required', status:'warning', duration:2000 }); return; }
    setSaving(true);
    try {
      editing ? await api.update(editing._id, form) : await api.create(form);
      toast({ title: editing ? 'Vehicle updated' : 'Vehicle added', status:'success', duration:2000 });
      onClose(); load();
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setSaving(false);
  };

  const doDelete = async () => {
    try {
      await api.remove(deleting._id);
      toast({ title:'Vehicle removed', status:'info', duration:2000 });
      onDelClose(); load();
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
  };

  const stats = { total: items.length, active: items.filter(v=>v.status==='Active').length, service: items.filter(v=>v.status==='Under Service').length };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md" color="gray.800">🚛 Vehicles</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="blue" size="sm" onClick={openAdd}>Add Vehicle</Button>
      </Flex>

      <SimpleGrid columns={{ base:2, md:3 }} spacing={4} mb={6}>
        {[['Total',stats.total,'blue'],['Active',stats.active,'green'],['In Service',stats.service,'yellow']].map(([l,v,c])=>(
          <Card key={l}><CardBody><Stat><StatLabel color="gray.500" fontSize="xs">{l}</StatLabel><StatNumber color={`${c}.500`}>{v}</StatNumber></Stat></CardBody></Card>
        ))}
      </SimpleGrid>

      {loading ? <Center h="40vh"><Spinner size="xl" color="blue.500"/></Center> : (
        <Box bg="white" borderRadius="16px" shadow="sm" overflow="hidden">
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Vehicle #</Th><Th>Type</Th><Th>Capacity</Th><Th>Fuel</Th><Th>Driver</Th><Th>Status</Th><Th></Th></Tr></Thead>
            <Tbody>
              {items.map(v => {
                const driver = drivers.find(d => d._id === v.assigned_driver_id);
                return (
                  <Tr key={v._id} _hover={{ bg:'gray.50' }}>
                    <Td fontWeight="600" color="blue.700">{v.vehicle_number}</Td>
                    <Td>{v.vehicle_type}</Td>
                    <Td>{(v.capacity_litres||0).toLocaleString()} L</Td>
                    <Td>{v.fuel_type}</Td>
                    <Td color="gray.600">{driver?.full_name || '—'}</Td>
                    <Td><Badge colorScheme={STATUS_COLORS[v.status]||'gray'}>{v.status}</Badge></Td>
                    <Td>
                      <HStack spacing={1}>
                        <IconButton size="xs" icon={<EditIcon/>} onClick={()=>openEdit(v)} variant="ghost" colorScheme="blue" aria-label="Edit"/>
                        <IconButton size="xs" icon={<DeleteIcon/>} onClick={()=>{setDeleting(v);onDelOpen();}} variant="ghost" colorScheme="red" aria-label="Delete"/>
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
              {!items.length && <Tr><Td colSpan={7} textAlign="center" py={8} color="gray.400">No vehicles found</Td></Tr>}
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay/>
        <ModalContent borderRadius="16px">
          <ModalHeader>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl isRequired><FormLabel fontSize="sm">Vehicle Number / Plate</FormLabel><Input value={form.vehicle_number} onChange={e=>setForm(f=>({...f,vehicle_number:e.target.value}))} placeholder="e.g. SL-2024-A"/></FormControl>
              <FormControl><FormLabel fontSize="sm">Type</FormLabel><Select value={form.vehicle_type} onChange={e=>setForm(f=>({...f,vehicle_type:e.target.value}))}>{TYPES.map(t=><option key={t}>{t}</option>)}</Select></FormControl>
              <FormControl><FormLabel fontSize="sm">Capacity (Litres)</FormLabel><Input type="number" value={form.capacity_litres} onChange={e=>setForm(f=>({...f,capacity_litres:Number(e.target.value)}))}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Fuel Type</FormLabel><Select value={form.fuel_type} onChange={e=>setForm(f=>({...f,fuel_type:e.target.value}))}>{FUELS.map(t=><option key={t}>{t}</option>)}</Select></FormControl>
              <FormControl><FormLabel fontSize="sm">Assigned Driver</FormLabel><Select value={form.assigned_driver_id} onChange={e=>setForm(f=>({...f,assigned_driver_id:e.target.value}))}><option value="">— No Driver —</option>{drivers.map(d=><option key={d._id} value={d._id}>{d.full_name}</option>)}</Select></FormControl>
              <FormControl><FormLabel fontSize="sm">Status</FormLabel><Select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{STATUSES.map(s=><option key={s}>{s}</option>)}</Select></FormControl>
              <FormControl gridColumn="1/-1"><FormLabel fontSize="sm">Notes</FormLabel><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={save} isLoading={saving}>{editing ? 'Update' : 'Add'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelRef} onClose={onDelClose}>
        <AlertDialogOverlay><AlertDialogContent borderRadius="16px">
          <AlertDialogHeader>Delete Vehicle</AlertDialogHeader>
          <AlertDialogBody>Remove <b>{deleting?.vehicle_number}</b>? This cannot be undone.</AlertDialogBody>
          <AlertDialogFooter gap={3}><Button ref={cancelRef} onClick={onDelClose}>Cancel</Button><Button colorScheme="red" onClick={doDelete}>Delete</Button></AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

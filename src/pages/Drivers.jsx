import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Flex, HStack, Text, Button, Badge, Grid,
  Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Select, Textarea,
  useDisclosure, useToast, Stat, StatLabel, StatNumber, Card, CardBody,
  SimpleGrid, Spinner, Center, Heading, IconButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { drivers as api, vehicles as vehiclesApi } from '../services/api';

const EMPTY = { full_name:'', phone:'', license_number:'', assigned_vehicle_id:'', status:'Available', notes:'' };
const STATUSES = ['Available','On Delivery','Off Duty'];
const STATUS_COLORS = { Available:'green', 'On Delivery':'blue', 'Off Duty':'gray' };

export default function Drivers() {
  const [items,    setItems]    = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState(EMPTY);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onClose: onDelClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, vRes] = await Promise.all([api.list(), vehiclesApi.list()]);
      setItems(dRes.data || []);
      setVehicles(vRes.data || []);
    } catch(e) { toast({ title: e.message, status:'error', duration:3000 }); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); onOpen(); };
  const openEdit = (d) => { setEditing(d); setForm({ full_name:d.full_name, phone:d.phone||'', license_number:d.license_number||'', assigned_vehicle_id:d.assigned_vehicle_id||'', status:d.status, notes:d.notes||'' }); onOpen(); };

  const save = async () => {
    if (!form.full_name.trim()) { toast({ title:'Name required', status:'warning', duration:2000 }); return; }
    setSaving(true);
    try {
      editing ? await api.update(editing._id, form) : await api.create(form);
      toast({ title: editing ? 'Driver updated' : 'Driver added', status:'success', duration:2000 });
      onClose(); load();
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setSaving(false);
  };

  const doDelete = async () => {
    try { await api.remove(deleting._id); toast({ title:'Driver removed', status:'info', duration:2000 }); onDelClose(); load(); }
    catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
  };

  const stats = { total: items.length, available: items.filter(d=>d.status==='Available').length, onDelivery: items.filter(d=>d.status==='On Delivery').length };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md" color="gray.800">👤 Drivers</Heading>
        <Button leftIcon={<AddIcon/>} colorScheme="blue" size="sm" onClick={openAdd}>Add Driver</Button>
      </Flex>

      <SimpleGrid columns={{ base:2, md:3 }} spacing={4} mb={6}>
        {[['Total',stats.total,'blue'],['Available',stats.available,'green'],['On Delivery',stats.onDelivery,'orange']].map(([l,v,c])=>(
          <Card key={l}><CardBody><Stat><StatLabel color="gray.500" fontSize="xs">{l}</StatLabel><StatNumber color={`${c}.500`}>{v}</StatNumber></Stat></CardBody></Card>
        ))}
      </SimpleGrid>

      {loading ? <Center h="40vh"><Spinner size="xl" color="blue.500"/></Center> : (
        <Box bg="white" borderRadius="16px" shadow="sm" overflow="hidden">
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Name</Th><Th>Phone</Th><Th>License</Th><Th>Vehicle</Th><Th>Status</Th><Th></Th></Tr></Thead>
            <Tbody>
              {items.map(d => {
                const veh = vehicles.find(v => v._id === d.assigned_vehicle_id);
                return (
                  <Tr key={d._id} _hover={{ bg:'gray.50' }}>
                    <Td fontWeight="600">{d.full_name}</Td>
                    <Td color="gray.600">{d.phone||'—'}</Td>
                    <Td color="gray.600">{d.license_number||'—'}</Td>
                    <Td color="gray.600">{veh?.vehicle_number||'—'}</Td>
                    <Td><Badge colorScheme={STATUS_COLORS[d.status]||'gray'}>{d.status}</Badge></Td>
                    <Td>
                      <HStack spacing={1}>
                        <IconButton size="xs" icon={<EditIcon/>} onClick={()=>openEdit(d)} variant="ghost" colorScheme="blue" aria-label="Edit"/>
                        <IconButton size="xs" icon={<DeleteIcon/>} onClick={()=>{setDeleting(d);onDelOpen();}} variant="ghost" colorScheme="red" aria-label="Delete"/>
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
              {!items.length && <Tr><Td colSpan={6} textAlign="center" py={8} color="gray.400">No drivers found</Td></Tr>}
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay/>
        <ModalContent borderRadius="16px">
          <ModalHeader>{editing ? 'Edit Driver' : 'Add Driver'}</ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl gridColumn="1/-1" isRequired><FormLabel fontSize="sm">Full Name</FormLabel><Input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Driver full name"/></FormControl>
              <FormControl><FormLabel fontSize="sm">Phone</FormLabel><Input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+232 76 000 000"/></FormControl>
              <FormControl><FormLabel fontSize="sm">License Number</FormLabel><Input value={form.license_number} onChange={e=>setForm(f=>({...f,license_number:e.target.value}))} placeholder="e.g. DL-2024-001"/></FormControl>
              <FormControl><FormLabel fontSize="sm">Assigned Vehicle</FormLabel><Select value={form.assigned_vehicle_id} onChange={e=>setForm(f=>({...f,assigned_vehicle_id:e.target.value}))}><option value="">— No Vehicle —</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.vehicle_number} — {v.vehicle_type}</option>)}</Select></FormControl>
              <FormControl><FormLabel fontSize="sm">Status</FormLabel><Select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{STATUSES.map(s=><option key={s}>{s}</option>)}</Select></FormControl>
              <FormControl gridColumn="1/-1"><FormLabel fontSize="sm">Notes</FormLabel><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter gap={3}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button colorScheme="blue" onClick={save} isLoading={saving}>{editing?'Update':'Add'}</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelRef} onClose={onDelClose}>
        <AlertDialogOverlay><AlertDialogContent borderRadius="16px">
          <AlertDialogHeader>Delete Driver</AlertDialogHeader>
          <AlertDialogBody>Remove <b>{deleting?.full_name}</b>? This cannot be undone.</AlertDialogBody>
          <AlertDialogFooter gap={3}><Button ref={cancelRef} onClick={onDelClose}>Cancel</Button><Button colorScheme="red" onClick={doDelete}>Delete</Button></AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

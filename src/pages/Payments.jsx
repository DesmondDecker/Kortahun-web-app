import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Flex, HStack, Text, Button, Badge, Grid,
  Table, Thead, Tbody, Tr, Th, Td, Input, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Textarea,
  useDisclosure, useToast, Stat, StatLabel, StatNumber, Card, CardBody,
  SimpleGrid, Spinner, Center, Heading, IconButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon } from '@chakra-ui/icons';
import { payments as api, customers as custApi, deliveries as delApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const METHODS = ['Cash','Bank Transfer','Mobile Money'];
const EMPTY = { customer_id:'', delivery_id:'', amount:'', method:'Cash', date: new Date().toISOString().split('T')[0], notes:'' };

export default function Payments() {
  const [items,     setItems]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveries,setDeliveries]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState(EMPTY);
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [filterMethod,setFilterMethod] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onClose: onDelClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();
  const { fmt } = useSettings();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pRes = await api.list({ search, method: filterMethod });
      setItems(pRes.data || []);
      setCustomers(pRes.customers || []);
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setLoading(false);
  }, [search, filterMethod]);
  useEffect(() => { load(); }, [load]);

  const loadDeliveries = async (custId) => {
    if (!custId) { setDeliveries([]); return; }
    try { const res = await delApi.list({ customer_id: custId }); setDeliveries(res.data||[]); } catch {}
  };

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0] }); onOpen(); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ customer_id: p.customer?._id||p.customer||'', delivery_id: p.delivery||'', amount: p.amount, method: p.method, date: p.date?.split('T')[0]||'', notes: p.notes||'' });
    onOpen();
  };

  const save = async () => {
    if (!form.customer_id || !form.amount) { toast({ title:'Customer and amount required', status:'warning', duration:2000 }); return; }
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        customer: form.customer_id, 
        delivery: form.delivery_id || null 
      };
      editing ? await api.update(editing._id, payload) : await api.create(payload);
      toast({ title: editing ? 'Payment updated' : 'Payment recorded', status:'success', duration:2000 });
      onClose(); load();
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setSaving(false);
  };

  const doDelete = async () => {
    try { await api.remove(deleting._id); toast({ title:'Payment deleted', status:'info', duration:2000 }); onDelClose(); load(); }
    catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
  };

  const totalRevenue = items.reduce((s,p)=>s+(p.amount||0),0);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md" color="gray.800">💳 Payments</Heading>
        <Button leftIcon={<AddIcon/>} colorScheme="blue" size="sm" onClick={openAdd}>Record Payment</Button>
      </Flex>

      <SimpleGrid columns={{ base:2, md:3 }} spacing={4} mb={6}>
        {[['Total Payments',items.length,'blue'],['Total Revenue',fmt(totalRevenue),'green'],['Methods',METHODS.length,'purple']].map(([l,v,c])=>(
          <Card key={l}><CardBody><Stat><StatLabel color="gray.500" fontSize="xs">{l}</StatLabel><StatNumber color={`${c}.500`} fontSize="lg">{v}</StatNumber></Stat></CardBody></Card>
        ))}
      </SimpleGrid>

      <Flex gap={3} mb={4} wrap="wrap">
        <HStack bg="white" borderRadius="8px" border="1px solid" borderColor="gray.200" px={3} flex={1} minW="200px">
          <SearchIcon color="gray.400" fontSize="sm"/>
          <Input variant="unstyled" placeholder="Search payments..." value={search} onChange={e=>setSearch(e.target.value)} size="sm" py={2}/>
        </HStack>
        <Select bg="white" size="sm" borderRadius="8px" w="160px" value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}>
          <option value="">All Methods</option>
          {METHODS.map(m=><option key={m}>{m}</option>)}
        </Select>
      </Flex>

      {loading ? <Center h="40vh"><Spinner size="xl" color="blue.500"/></Center> : (
        <Box bg="white" borderRadius="16px" shadow="sm" overflow="hidden">
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Date</Th><Th>Customer</Th><Th>Amount</Th><Th>Method</Th><Th>Notes</Th><Th></Th></Tr></Thead>
            <Tbody>
              {items.map(p => (
                <Tr key={p._id} _hover={{ bg:'gray.50' }}>
                  <Td color="gray.500" fontSize="xs">{p.date?.split('T')[0]}</Td>
                  <Td fontWeight="600">{p.customer?.name||'—'}</Td>
                  <Td fontWeight="700" color="green.600">{fmt(p.amount)}</Td>
                  <Td><Badge colorScheme={p.method==='Cash'?'green':p.method==='Mobile Money'?'purple':'blue'}>{p.method}</Badge></Td>
                  <Td color="gray.500" fontSize="xs" maxW="200px" noOfLines={1}>{p.notes||'—'}</Td>
                  <Td>
                    <HStack spacing={1}>
                      <IconButton size="xs" icon={<EditIcon/>} onClick={()=>openEdit(p)} variant="ghost" colorScheme="blue" aria-label="Edit"/>
                      <IconButton size="xs" icon={<DeleteIcon/>} onClick={()=>{setDeleting(p);onDelOpen();}} variant="ghost" colorScheme="red" aria-label="Delete"/>
                    </HStack>
                  </Td>
                </Tr>
              ))}
              {!items.length && <Tr><Td colSpan={6} textAlign="center" py={8} color="gray.400">No payments found</Td></Tr>}
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay/>
        <ModalContent borderRadius="16px">
          <ModalHeader>{editing ? 'Edit Payment' : 'Record Payment'}</ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl isRequired gridColumn="1/-1"><FormLabel fontSize="sm">Customer</FormLabel>
                <Select value={form.customer_id} onChange={e=>{ setForm(f=>({...f,customer_id:e.target.value,delivery_id:''})); loadDeliveries(e.target.value); }}>
                  <option value="">Select customer…</option>
                  {customers.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              </FormControl>
              <FormControl gridColumn="1/-1"><FormLabel fontSize="sm">Linked Delivery (optional)</FormLabel>
                <Select value={form.delivery_id} onChange={e=>setForm(f=>({...f,delivery_id:e.target.value}))}>
                  <option value="">— General Payment —</option>
                  {deliveries.map(d=><option key={d._id} value={d._id}>{d.delivery_date?.split('T')[0]} — {fmt(d.outstanding_balance)} outstanding</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired><FormLabel fontSize="sm">Amount (NLe)</FormLabel><Input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:Number(e.target.value)}))}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Method</FormLabel><Select value={form.method} onChange={e=>setForm(f=>({...f,method:e.target.value}))}>{METHODS.map(m=><option key={m}>{m}</option>)}</Select></FormControl>
              <FormControl><FormLabel fontSize="sm">Date</FormLabel><Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></FormControl>
              <FormControl gridColumn="1/-1"><FormLabel fontSize="sm">Notes</FormLabel><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter gap={3}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button colorScheme="blue" onClick={save} isLoading={saving}>{editing?'Update':'Save'}</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelRef} onClose={onDelClose}>
        <AlertDialogOverlay><AlertDialogContent borderRadius="16px">
          <AlertDialogHeader>Delete Payment</AlertDialogHeader>
          <AlertDialogBody>Delete this payment of <b>{fmt(deleting?.amount)}</b>? This cannot be undone.</AlertDialogBody>
          <AlertDialogFooter gap={3}><Button ref={cancelRef} onClick={onDelClose}>Cancel</Button><Button colorScheme="red" onClick={doDelete}>Delete</Button></AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
